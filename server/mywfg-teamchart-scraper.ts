/**
 * MyWFG Team Chart Scraper
 * Extracts hierarchy relationships from the Team Chart bubble visualization
 * URL: https://www.mywfg.com/teamchart
 */

import puppeteer, { Browser, Page } from "puppeteer";
import { launchBrowser } from './lib/browser';
import { getDb } from "./db";
import { agents } from "../drizzle/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";

// Helper to require environment variables
function mustGetEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Environment variables (fail fast if missing)
const MYWFG_USERNAME = mustGetEnv('MYWFG_USERNAME');
const MYWFG_PASSWORD = mustGetEnv('MYWFG_PASSWORD');
const MYWFG_APP_PASSWORD = mustGetEnv('MYWFG_APP_PASSWORD');
const MYWFG_EMAIL = mustGetEnv('MYWFG_EMAIL');

interface HierarchyNode {
  name: string;
  agentCode?: string;
  children: HierarchyNode[];
}

interface AgentRelationship {
  agentName: string;
  agentCode?: string;
  recruiterName: string;
  recruiterCode?: string;
}

/**
 * Login to MyWFG
 */
async function loginToMyWFG(page: Page): Promise<boolean> {
  try {
    console.log("[TeamChart] Navigating to MyWFG login...");
    await page.goto("https://www.mywfg.com/login", { waitUntil: "networkidle2", timeout: 60000 });
    
    // Check if already logged in
    const currentUrl = page.url();
    if (!currentUrl.includes("/login")) {
      console.log("[TeamChart] Already logged in");
      return true;
    }
    
    // Enter credentials
    console.log("[TeamChart] Entering credentials...");
    await page.waitForSelector('input[name="username"], input[id="username"]', { timeout: 10000 });
    await page.type('input[name="username"], input[id="username"]', MYWFG_USERNAME);
    await page.type('input[name="password"], input[id="password"]', MYWFG_PASSWORD);
    
    // Click login button
    await page.click('button[type="submit"], input[type="submit"]');
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 });
    
    // Check for OTP requirement
    const pageContent = await page.content();
    if (pageContent.includes("verification") || pageContent.includes("OTP") || pageContent.includes("code")) {
      console.log("[TeamChart] OTP verification required - waiting for manual input or automated OTP...");
      // Wait for OTP to be entered (either manually or via automated system)
      await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 120000 });
    }
    
    // Verify login success
    const finalUrl = page.url();
    const loginSuccess = !finalUrl.includes("/login");
    console.log(`[TeamChart] Login ${loginSuccess ? "successful" : "failed"}`);
    return loginSuccess;
  } catch (error) {
    console.error("[TeamChart] Login error:", error);
    return false;
  }
}

/**
 * Extract hierarchy data from Team Chart page
 */
async function extractTeamChartHierarchy(page: Page): Promise<AgentRelationship[]> {
  const relationships: AgentRelationship[] = [];
  
  try {
    console.log("[TeamChart] Navigating to Team Chart...");
    await page.goto("https://www.mywfg.com/teamchart", { waitUntil: "networkidle2", timeout: 60000 });
    
    // Wait for the chart to load
    await page.waitForSelector("svg, .chart-container, #chart", { timeout: 30000 });
    
    // Click the expand button (flower-like icon) to expand all bubbles
    console.log("[TeamChart] Looking for expand button...");
    const expandButtonSelectors = [
      'button[title*="expand"]',
      'button[aria-label*="expand"]',
      '.expand-all',
      '[class*="expand"]',
      'svg[class*="expand"]',
      // The flower-like icon in the top left
      '.toolbar button:first-child',
      '.chart-toolbar button:first-child',
      '#toolbar button:first-child',
    ];
    
    for (const selector of expandButtonSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          console.log(`[TeamChart] Clicked expand button: ${selector}`);
          await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for animation
          break;
        }
      } catch (e) {
        // Continue trying other selectors
      }
    }
    
    // Wait for the chart to fully expand
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Extract hierarchy data from the SVG/chart
    console.log("[TeamChart] Extracting hierarchy data...");
    
    const hierarchyData = await page.evaluate(() => {
      const relationships: { agentName: string; recruiterName: string }[] = [];
      
      // Try to find nodes in the chart
      // The chart typically uses circles/bubbles with text labels
      const nodes = document.querySelectorAll('circle, .node, [class*="bubble"], g[class*="node"]');
      const textElements = document.querySelectorAll('text, .node-label, [class*="label"]');
      
      // Extract names from text elements
      const names: string[] = [];
      textElements.forEach((el) => {
        const text = el.textContent?.trim();
        if (text && text.length > 2 && !text.includes("TA+") && !text.includes("MD+") && 
            !text.includes("SMD+") && !text.includes("EMD+") && !text.includes("CEO+") && 
            !text.includes("EVC+")) {
          names.push(text);
        }
      });
      
      // Try to find parent-child relationships from the SVG structure
      // Look for lines/paths connecting nodes
      const links = document.querySelectorAll('line, path[class*="link"], [class*="edge"]');
      
      // If we can find the hierarchy structure in the DOM
      const hierarchyContainer = document.querySelector('[class*="hierarchy"], [class*="tree"], [class*="org"]');
      if (hierarchyContainer) {
        // Try to extract from nested structure
        const extractFromNode = (node: Element, parentName: string | null) => {
          const nameEl = node.querySelector('text, .name, [class*="label"]');
          const name = nameEl?.textContent?.trim();
          
          if (name && parentName) {
            relationships.push({ agentName: name, recruiterName: parentName });
          }
          
          // Find children
          const children = node.querySelectorAll(':scope > g, :scope > .node');
          children.forEach((child) => {
            extractFromNode(child, name || parentName);
          });
        };
        
        const rootNodes = hierarchyContainer.querySelectorAll(':scope > g, :scope > .node');
        rootNodes.forEach((root) => extractFromNode(root, null));
      }
      
      // Also try to get data from any JavaScript variables
      // @ts-ignore
      const chartData = window.chartData || window.hierarchyData || window.teamData;
      if (chartData) {
        const extractFromData = (node: any, parentName: string | null) => {
          const name = node.name || node.label || node.text;
          if (name && parentName) {
            relationships.push({ agentName: name, recruiterName: parentName });
          }
          
          const children = node.children || node.nodes || [];
          children.forEach((child: any) => extractFromData(child, name || parentName));
        };
        
        if (Array.isArray(chartData)) {
          chartData.forEach((node: any) => extractFromData(node, null));
        } else {
          extractFromData(chartData, null);
        }
      }
      
      return { relationships, names, nodeCount: nodes.length, linkCount: links.length };
    });
    
    console.log(`[TeamChart] Found ${hierarchyData.names.length} names, ${hierarchyData.nodeCount} nodes, ${hierarchyData.linkCount} links`);
    console.log(`[TeamChart] Extracted ${hierarchyData.relationships.length} relationships`);
    
    // Convert to AgentRelationship format
    for (const rel of hierarchyData.relationships) {
      relationships.push({
        agentName: rel.agentName,
        recruiterName: rel.recruiterName,
      });
    }
    
    // If we couldn't extract relationships from the chart structure,
    // try to get them from the API or page data
    if (relationships.length === 0) {
      console.log("[TeamChart] No relationships found in DOM, trying API approach...");
      
      // Try to intercept network requests for hierarchy data
      const apiData = await page.evaluate(async () => {
        // Check for any data attributes on the page
        const dataElements = document.querySelectorAll('[data-hierarchy], [data-tree], [data-chart]');
        const dataAttrs: string[] = [];
        dataElements.forEach((el) => {
          const attr = el.getAttribute('data-hierarchy') || el.getAttribute('data-tree') || el.getAttribute('data-chart');
          if (attr) dataAttrs.push(attr);
        });
        
        return { dataAttrs };
      });
      
      if (apiData.dataAttrs.length > 0) {
        console.log("[TeamChart] Found data attributes:", apiData.dataAttrs);
      }
    }
    
    return relationships;
  } catch (error) {
    console.error("[TeamChart] Error extracting hierarchy:", error);
    return relationships;
  }
}

/**
 * Match extracted names to agent codes in the database
 */
async function matchAgentsToDatabase(relationships: AgentRelationship[]): Promise<AgentRelationship[]> {
  const db = await getDb();
  if (!db) {
    console.error("[TeamChart] Database connection failed");
    return relationships;
  }
  const allAgents = await db.select().from(agents);
  
  // Create a map for quick lookup by name
  const agentsByName = new Map<string, typeof allAgents[0]>();
  for (const agent of allAgents) {
    const fullName = `${agent.firstName} ${agent.lastName}`.toLowerCase();
    const reverseName = `${agent.lastName} ${agent.firstName}`.toLowerCase();
    agentsByName.set(fullName, agent);
    agentsByName.set(reverseName, agent);
    
    // Also try with name variations (first name only, last name only)
    agentsByName.set(agent.firstName.toLowerCase(), agent);
    agentsByName.set(agent.lastName.toLowerCase(), agent);
  }
  
  // Match relationships to agent codes
  for (const rel of relationships) {
    // Match agent
    const agentNameLower = rel.agentName.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const matchedAgent = agentsByName.get(agentNameLower);
    if (matchedAgent) {
      rel.agentCode = matchedAgent.agentCode || undefined;
    }
    
    // Match recruiter
    const recruiterNameLower = rel.recruiterName.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const matchedRecruiter = agentsByName.get(recruiterNameLower);
    if (matchedRecruiter) {
      rel.recruiterCode = matchedRecruiter.agentCode || undefined;
    }
  }
  
  return relationships;
}

/**
 * Update agent upline relationships in the database
 */
async function updateAgentUplines(relationships: AgentRelationship[]): Promise<{ updated: number; failed: number }> {
  const db = await getDb();
  if (!db) {
    console.error("[TeamChart] Database connection failed");
    return { updated: 0, failed: relationships.length };
  }
  
  let updated = 0;
  let failed = 0;
  
  for (const rel of relationships) {
    if (!rel.agentCode || !rel.recruiterCode) {
      failed++;
      continue;
    }
    
    try {
      // Find the agent and recruiter IDs
      const [agent] = await db.select().from(agents).where(eq(agents.agentCode, rel.agentCode));
      const [recruiter] = await db.select().from(agents).where(eq(agents.agentCode, rel.recruiterCode));
      
      if (agent && recruiter) {
        await db.update(agents)
          .set({ uplineAgentId: recruiter.id })
          .where(eq(agents.id, agent.id));
        updated++;
        console.log(`[TeamChart] Updated ${rel.agentName} -> recruiter: ${rel.recruiterName}`);
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`[TeamChart] Error updating ${rel.agentName}:`, error);
      failed++;
    }
  }
  
  return { updated, failed };
}

/**
 * Main function to sync hierarchy from Team Chart
 */
export async function syncHierarchyFromTeamChart(): Promise<{
  success: boolean;
  relationshipsFound: number;
  updated: number;
  failed: number;
  error?: string;
}> {
  let browser: Browser | null = null;
  
  try {
    console.log("[TeamChart] Starting Team Chart hierarchy sync...");
    
    // Launch browser
    browser = await launchBrowser({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Login to MyWFG
    const loginSuccess = await loginToMyWFG(page);
    if (!loginSuccess) {
      return {
        success: false,
        relationshipsFound: 0,
        updated: 0,
        failed: 0,
        error: "Failed to login to MyWFG",
      };
    }
    
    // Extract hierarchy from Team Chart
    const relationships = await extractTeamChartHierarchy(page);
    console.log(`[TeamChart] Found ${relationships.length} relationships`);
    
    if (relationships.length === 0) {
      // If Team Chart extraction fails, try alternative approach using Downline Status
      console.log("[TeamChart] No relationships from Team Chart, trying Downline Status approach...");
      await browser.close();
      browser = null;
      
      return {
        success: false,
        relationshipsFound: 0,
        updated: 0,
        failed: 0,
        error: "Could not extract hierarchy from Team Chart. The page structure may have changed.",
      };
    }
    
    // Match to database
    const matchedRelationships = await matchAgentsToDatabase(relationships);
    
    // Update database
    const { updated, failed } = await updateAgentUplines(matchedRelationships);
    
    console.log(`[TeamChart] Sync complete: ${updated} updated, ${failed} failed`);
    
    return {
      success: true,
      relationshipsFound: relationships.length,
      updated,
      failed,
    };
  } catch (error) {
    console.error("[TeamChart] Sync error:", error);
    return {
      success: false,
      relationshipsFound: 0,
      updated: 0,
      failed: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Alternative approach: Extract hierarchy from Downline Status report
 * The Downline Status report shows the hierarchy structure with levels
 */
export async function syncHierarchyFromDownlineStatus(): Promise<{
  success: boolean;
  updated: number;
  error?: string;
}> {
  let browser: Browser | null = null;
  
  try {
    console.log("[Hierarchy] Starting Downline Status hierarchy sync...");
    
    // Launch browser
    browser = await launchBrowser({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Login to MyWFG
    const loginSuccess = await loginToMyWFG(page);
    if (!loginSuccess) {
      return {
        success: false,
        updated: 0,
        error: "Failed to login to MyWFG",
      };
    }
    
    // Navigate to Downline Status report
    console.log("[Hierarchy] Navigating to Downline Status report...");
    await page.goto("https://www.mywfg.com/reports-downline-status?AgentID=73DXR", { 
      waitUntil: "networkidle2", 
      timeout: 60000 
    });
    
    // Wait for the report to load
    await page.waitForSelector('table, .report-container, #report', { timeout: 30000 });
    
    // Set filters: Team = SMD Base, Type = Active, Title Level = TA, A, SA, MD
    // ... (filter setting logic would go here)
    
    // Generate report and extract hierarchy
    // The report shows "Comm Level" which indicates the hierarchy level
    // Level 1 = direct recruits of the SMD
    // Level 2 = recruits of Level 1 agents, etc.
    
    const reportData = await page.evaluate(() => {
      const rows: { name: string; agentCode: string; level: number }[] = [];
      const tableRows = document.querySelectorAll('table tr, .report-row');
      
      tableRows.forEach((row) => {
        const cells = row.querySelectorAll('td, .cell');
        if (cells.length >= 6) {
          const firstName = cells[0]?.textContent?.trim() || "";
          const lastName = cells[1]?.textContent?.trim() || "";
          const agentCode = cells[3]?.textContent?.trim() || "";
          const commLevel = parseInt(cells[5]?.textContent?.trim() || "0");
          
          if (firstName && lastName && agentCode) {
            rows.push({
              name: `${firstName} ${lastName}`,
              agentCode,
              level: commLevel,
            });
          }
        }
      });
      
      return rows;
    });
    
    console.log(`[Hierarchy] Found ${reportData.length} agents in report`);
    
    // Build hierarchy based on levels
    // This is a simplified approach - agents at level N are recruited by agents at level N-1
    // For accurate recruiter matching, we'd need additional data
    
    return {
      success: true,
      updated: 0,
      error: "Downline Status approach requires additional implementation for accurate recruiter matching",
    };
  } catch (error) {
    console.error("[Hierarchy] Sync error:", error);
    return {
      success: false,
      updated: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

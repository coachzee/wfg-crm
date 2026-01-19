/**
 * MyWFG Hierarchy Scraper
 * Extracts upline relationships from the Upline Leaders report
 * to populate the agent hierarchy for org chart visualization
 */

import type { Page } from "playwright";

export interface UplineInfo {
  agentCode: string;
  agentName: string;
  directUplineCode: string | null;
  directUplineName: string | null;
  directUplineTitle: string | null;
}

export interface HierarchyResult {
  success: boolean;
  uplineData: UplineInfo[];
  errors: string[];
  summary: {
    totalAgents: number;
    agentsWithUpline: number;
    agentsWithoutUpline: number;
    rootAgents: string[];
  };
}

/**
 * Extract upline information for a single agent from the Upline Leaders report
 */
export async function extractUplineForAgent(
  page: Page,
  agentCode: string
): Promise<UplineInfo | null> {
  try {
    // Navigate to the Upline Leaders report for this agent
    const reportUrl = `https://www.mywfg.com/reports-UplineLeaders?AgentID=${agentCode}`;
    await page.goto(reportUrl, { waitUntil: "networkidle", timeout: 30000 });

    // Wait for the report form to load
    await page.waitForSelector("#AgentID", { timeout: 10000 });

    // Click Generate Report button
    const generateBtn = await page.$("#passVariablesToIFrameButton84937");
    if (generateBtn) {
      await generateBtn.click();
      // Wait for the report iframe to load
      await page.waitForTimeout(3000);
    }

    // Try to find the Leader row in the report
    // The report is in an iframe, so we need to access it
    const reportFrame = page.frameLocator("#ReportViewer1_ctl09");

    // Look for the Leader row - it contains the direct upline
    // The structure is: Relation | Name | Associate ID | Title Level
    const leaderData = await page.evaluate(() => {
      // Try to find the report content
      const iframe = document.querySelector(
        "#ReportViewer1_ctl09"
      ) as HTMLIFrameElement;
      if (!iframe || !iframe.contentDocument) {
        // Try direct page content
        const tables = Array.from(document.querySelectorAll("table"));
        for (const table of tables) {
          const text = table.textContent || "";
          if (text.includes("Leader") && text.includes("Associate ID")) {
            // Found the report table
            const rows = Array.from(table.querySelectorAll("tr"));
            for (const row of rows) {
              const cells = row.querySelectorAll("td");
              if (cells.length >= 4) {
                const relation = cells[0]?.textContent?.trim();
                if (relation === "Leader") {
                  return {
                    name: cells[1]?.textContent?.trim() || null,
                    code: cells[2]?.textContent?.trim() || null,
                    title: cells[3]?.textContent?.trim() || null,
                  };
                }
              }
            }
          }
        }
      }
      return null;
    });

    // Alternative: Try to extract from the visible report viewer
    if (!leaderData) {
      // Wait for report content to render
      await page.waitForTimeout(2000);

      // Look for the text pattern in the page
      const pageContent = await page.content();

      // Parse the Leader row from the HTML
      // Pattern: Leader | Name | Code | Title
      const leaderMatch = pageContent.match(
        /Leader<\/[^>]+>\s*<[^>]+>([^<]+)<\/[^>]+>\s*<[^>]+>([A-Z0-9]+)<\/[^>]+>\s*<[^>]+>([^<]+)</i
      );

      if (leaderMatch) {
        return {
          agentCode,
          agentName: "", // Will be filled from database
          directUplineCode: leaderMatch[2],
          directUplineName: leaderMatch[1],
          directUplineTitle: leaderMatch[3],
        };
      }
    }

    if (leaderData && leaderData.code) {
      return {
        agentCode,
        agentName: "",
        directUplineCode: leaderData.code,
        directUplineName: leaderData.name,
        directUplineTitle: leaderData.title,
      };
    }

    // No upline found - this agent might be at the top of the hierarchy
    return {
      agentCode,
      agentName: "",
      directUplineCode: null,
      directUplineName: null,
      directUplineTitle: null,
    };
  } catch (error) {
    console.error(`Error extracting upline for agent ${agentCode}:`, error);
    return null;
  }
}

/**
 * Extract hierarchy data for all agents in the database
 */
export async function extractHierarchyForAllAgents(
  page: Page,
  agentCodes: string[]
): Promise<HierarchyResult> {
  const uplineData: UplineInfo[] = [];
  const errors: string[] = [];
  const rootAgents: string[] = [];

  console.log(`\n📊 Starting hierarchy extraction for ${agentCodes.length} agents...`);

  for (let i = 0; i < agentCodes.length; i++) {
    const agentCode = agentCodes[i];
    console.log(`  [${i + 1}/${agentCodes.length}] Processing ${agentCode}...`);

    try {
      const uplineInfo = await extractUplineForAgent(page, agentCode);

      if (uplineInfo) {
        uplineData.push(uplineInfo);

        if (!uplineInfo.directUplineCode) {
          rootAgents.push(agentCode);
          console.log(`    → Root agent (no upline)`);
        } else {
          console.log(`    → Upline: ${uplineInfo.directUplineCode} (${uplineInfo.directUplineName})`);
        }
      } else {
        errors.push(`Failed to extract upline for ${agentCode}`);
      }

      // Small delay between requests to avoid rate limiting
      await page.waitForTimeout(1000);
    } catch (error) {
      const errorMsg = `Error processing ${agentCode}: ${error}`;
      errors.push(errorMsg);
      console.error(`    ✗ ${errorMsg}`);
    }
  }

  const agentsWithUpline = uplineData.filter((u) => u.directUplineCode).length;
  const agentsWithoutUpline = uplineData.filter((u) => !u.directUplineCode).length;

  console.log(`\n📊 Hierarchy Extraction Summary:`);
  console.log(`   Total agents processed: ${uplineData.length}`);
  console.log(`   Agents with upline: ${agentsWithUpline}`);
  console.log(`   Root agents (no upline): ${agentsWithoutUpline}`);
  console.log(`   Errors: ${errors.length}`);

  return {
    success: errors.length === 0,
    uplineData,
    errors,
    summary: {
      totalAgents: uplineData.length,
      agentsWithUpline,
      agentsWithoutUpline,
      rootAgents,
    },
  };
}

/**
 * Alternative approach: Extract hierarchy from the Downline Status report
 * which already has the data we scraped
 * 
 * The Downline Status report shows agents in a hierarchical order,
 * and we can infer relationships from the SMD Base / Super Base structure
 */
export async function inferHierarchyFromDownlineReport(
  page: Page
): Promise<Map<string, string>> {
  // This is a simpler approach that uses the existing Downline Status data
  // The report shows agents grouped by their SMD leg
  
  const hierarchyMap = new Map<string, string>();
  
  // Navigate to Downline Status report
  await page.goto("https://www.mywfg.com/reports-DownlineStatus", {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  // The hierarchy is implicit in the report structure
  // Agents are listed under their SMD/MD leaders
  
  // For now, we'll use the Upline Leaders report approach
  // which gives us explicit upline information
  
  return hierarchyMap;
}

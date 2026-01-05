/**
 * MyWFG Downline Status Scraper
 * 
 * Automatically fetches agent data from MyWFG Downline Status report.
 * This replaces the need for CSV imports.
 * 
 * Data extracted:
 * - Agent name (first, last)
 * - Agent code
 * - Title level (01=TA, 10=MD, 17=SMD, 20=SMD, etc.)
 * - Commission level
 * - Life Licensed status (LL Flag)
 * - License end date
 * - Resident state
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { waitForOTP } from './gmail-otp.js';

// Get MyWFG login credentials from environment
function getMyWFGLoginCredentials() {
  return {
    username: process.env.MYWFG_USERNAME || '',
    password: process.env.MYWFG_PASSWORD || '',
  };
}

// Get Gmail credentials for OTP
function getGmailCredentials() {
  return {
    email: process.env.MYWFG_EMAIL || '',
    appPassword: process.env.MYWFG_APP_PASSWORD || '',
  };
}

// MyWFG Title Level to WFG Rank mapping
const TITLE_LEVEL_TO_RANK: Record<string, string> = {
  '01': 'TRAINING_ASSOCIATE',
  '1': 'TRAINING_ASSOCIATE',
  '10': 'MARKETING_DIRECTOR',
  '15': 'SENIOR_MARKETING_DIRECTOR',
  '17': 'SENIOR_MARKETING_DIRECTOR',
  '20': 'SENIOR_MARKETING_DIRECTOR',
  '65': 'EXECUTIVE_MARKETING_DIRECTOR',
  '75': 'CEO_MARKETING_DIRECTOR',
  '87': 'EXECUTIVE_VICE_CHAIRMAN',
  '90': 'SENIOR_EXECUTIVE_VICE_CHAIRMAN',
  '95': 'FIELD_CHAIRMAN',
  '99': 'EXECUTIVE_CHAIRMAN',
};

export interface DownlineAgent {
  firstName: string;
  lastName: string;
  bulletinName: string;
  agentCode: string;
  titleLevel: string;
  commLevel: string;
  llFlag: boolean;
  llEndDate: string | null;
  securities: string | null;
  downlinePercent: string | null;
  residentState: string | null;
  mdApprovalDate: string | null;
  terminateDate: string | null;
  country: string;
  // Computed fields
  wfgRank: string;
  isLifeLicensed: boolean;
}

export interface DownlineStatusResult {
  success: boolean;
  agents: DownlineAgent[];
  runDate: string;
  reportInfo: string;
  error?: string;
}

/**
 * Login to MyWFG with OTP handling
 */
async function loginToMyWFG(page: Page): Promise<boolean> {
  const creds = getMyWFGLoginCredentials();
  
  console.log('[Downline Scraper] Navigating to MyWFG...');
  await page.goto('https://www.mywfg.com', { waitUntil: 'networkidle2', timeout: 60000 });
  
  // Wait for login form
  await page.waitForSelector('input[id="myWfgUsernameDisplay"], input[name="username"]', { timeout: 30000 });
  
  // Find and fill username
  const usernameInput = await page.$('input[id="myWfgUsernameDisplay"]') || await page.$('input[name="username"]');
  if (!usernameInput) throw new Error('Username input not found');
  
  await usernameInput.click({ clickCount: 3 });
  await usernameInput.type(creds.username);
  
  // Find and fill password
  const passwordInput = await page.$('input[id="myWfgPasswordDisplay"]') || await page.$('input[name="password"]');
  if (!passwordInput) throw new Error('Password input not found');
  
  await passwordInput.click({ clickCount: 3 });
  await passwordInput.type(creds.password);
  
  // Click login button
  const loginButton = await page.$('button[id="mywfgTheyLive"]') || await page.$('button[type="submit"]');
  if (loginButton) {
    await Promise.all([
      loginButton.click(),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {}),
    ]);
  }
  
  await new Promise(r => setTimeout(r, 5000));
  
  // Check for OTP requirement
  const pageContent = await page.content();
  const pageText = await page.evaluate(() => document.body.innerText);
  
  // Check for error page
  if (pageText.includes('ERROR OCCURRED') || pageText.includes('Bad Request')) {
    console.log('[Downline Scraper] Error page detected, retrying...');
    await page.goto('https://www.mywfg.com', { waitUntil: 'networkidle2', timeout: 60000 });
    return loginToMyWFG(page);
  }
  
  const otpRequired = pageContent.includes('mywfgOtppswd') || 
                      pageText.includes('One-Time Password') ||
                      pageText.includes('Security Code') ||
                      pageText.includes('Validation Code');
  
  if (otpRequired) {
    console.log('[Downline Scraper] OTP required, waiting for email...');
    
    const gmailCreds = getGmailCredentials();
    const otpResult = await waitForOTP(gmailCreds, 'transamerica', 60, 3);
    
    if (!otpResult.success || !otpResult.otp) {
      throw new Error(`Failed to get OTP: ${otpResult.error}`);
    }
    
    console.log(`[Downline Scraper] ✓ OTP received: ${otpResult.otp}`);
    
    // Enter OTP
    const otpInput = await page.$('input[id="mywfgOtppswd"]') || 
                     await page.$('input[name="otp"]') ||
                     await page.$('input[type="password"]:not([id="myWfgPasswordDisplay"])');
    
    if (otpInput) {
      await otpInput.click({ clickCount: 3 });
      await otpInput.type(otpResult.otp);
      
      // Submit OTP
      const submitBtn = await page.$('button[id="mywfgTheylive"]') || await page.$('button[type="submit"]');
      if (submitBtn) {
        await Promise.all([
          submitBtn.click(),
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {}),
        ]);
      }
      
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  // Verify login success
  const currentUrl = page.url();
  const isLoggedIn = currentUrl.includes('mywfg.com') && 
                     !currentUrl.includes('login') && 
                     !currentUrl.includes('signin');
  
  console.log(`[Downline Scraper] Login ${isLoggedIn ? 'successful' : 'failed'}`);
  return isLoggedIn;
}

/**
 * Helper function to extract agents from the current page
 */
async function extractAgentsFromPage(page: Page): Promise<any[]> {
  const reportData = await page.evaluate(() => {
    const agents: any[] = [];
    
    // Find the data table - look for table with agent data
    const tables = Array.from(document.querySelectorAll('table'));
    for (const table of tables) {
      const rows = table.querySelectorAll('tr');
      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('td');
        if (cells.length >= 8) {
          const firstName = cells[0]?.textContent?.trim() || '';
          const lastName = cells[1]?.textContent?.trim() || '';
          const bulletinName = cells[2]?.textContent?.trim() || '';
          const agentCode = cells[3]?.textContent?.trim() || '';
          const titleLevel = cells[4]?.textContent?.trim() || '';
          const commLevel = cells[5]?.textContent?.trim() || '';
          const llFlag = cells[6]?.textContent?.trim() || '';
          const llEndDate = cells[7]?.textContent?.trim() || '';
          
          // Skip header rows
          if (firstName === 'First_Name' || firstName === 'First Name' || !firstName || !agentCode) {
            continue;
          }
          
          // Skip if it looks like a header
          if (titleLevel === 'Title_Level' || titleLevel === 'Title Level') {
            continue;
          }
          
          agents.push({
            firstName,
            lastName,
            bulletinName,
            agentCode,
            titleLevel,
            commLevel,
            llFlag: llFlag.toLowerCase() === 'yes',
            llEndDate: llEndDate || null,
            securities: cells[8]?.textContent?.trim() || null,
            downlinePercent: cells[9]?.textContent?.trim() || null,
            residentState: cells[10]?.textContent?.trim() || null,
            mdApprovalDate: cells[11]?.textContent?.trim() || null,
            terminateDate: cells[12]?.textContent?.trim() || null,
            country: cells[13]?.textContent?.trim() || 'US',
          });
        }
      }
    }
    
    return agents;
  });
  
  // If no agents found in table, try parsing from text content
  if (reportData.length === 0) {
    const pageText = await page.evaluate(() => document.body.innerText);
    const lines = pageText.split('\n');
    
    for (const line of lines) {
      const parts = line.split(/\s{2,}|\t/);
      if (parts.length >= 8 && parts[3]?.match(/^[A-Z0-9]{5}$/)) {
        const firstName = parts[0]?.trim();
        const lastName = parts[1]?.trim();
        const bulletinName = parts[2]?.trim();
        const agentCode = parts[3]?.trim();
        const titleLevel = parts[4]?.trim();
        const commLevel = parts[5]?.trim();
        const llFlag = parts[6]?.trim();
        const llEndDate = parts[7]?.trim();
        
        if (firstName && lastName && agentCode && !firstName.includes('First')) {
          reportData.push({
            firstName,
            lastName,
            bulletinName,
            agentCode,
            titleLevel,
            commLevel,
            llFlag: llFlag?.toLowerCase() === 'yes',
            llEndDate: llEndDate || null,
            securities: parts[8]?.trim() || null,
            downlinePercent: parts[9]?.trim() || null,
            residentState: parts[10]?.trim() || null,
            mdApprovalDate: parts[11]?.trim() || null,
            terminateDate: parts[12]?.trim() || null,
            country: parts[13]?.trim() || 'US',
          });
        }
      }
    }
  }
  
  return reportData;
}

/**
 * Navigate to Downline Status report and extract data for ALL title levels
 */
async function extractDownlineStatus(page: Page, agentId: string): Promise<DownlineStatusResult> {
  const reportUrl = `https://www.mywfg.com/reports-downline-status?AgentID=${agentId}`;
  
  console.log(`[Downline Scraper] Navigating to Downline Status report...`);
  await page.goto(reportUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Wait for report to load
  await page.waitForSelector('#ReportViewer1_ctl09', { timeout: 30000 }).catch(() => {});
  
  // Title levels to iterate through: TA, A, SA, MD, SMD
  const titleLevels = ['TA', 'A', 'SA', 'MD', 'SMD'];
  const allAgents: any[] = [];
  const seenAgentCodes = new Set<string>();
  let runDate = '';
  let reportInfo = '';
  
  for (const titleLevel of titleLevels) {
    console.log(`[Downline Scraper] Fetching agents with title level: ${titleLevel}`);
    
    // Set the title level dropdown
    const levelSet = await page.evaluate((targetLevel) => {
      const selects = Array.from(document.querySelectorAll('select'));
      
      for (const select of selects) {
        const options = Array.from(select.options);
        const optionTexts = options.map(o => o.text.trim());
        
        // Check if this looks like a title level dropdown (has TA and MD options)
        const hasTitleLevelOptions = optionTexts.includes('TA') && optionTexts.includes('MD');
        
        if (hasTitleLevelOptions) {
          // Find and select the target level
          const targetOption = options.find(o => o.text.trim() === targetLevel);
          if (targetOption) {
            select.value = targetOption.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            return { success: true, selectedLevel: targetLevel };
          }
        }
      }
      return { success: false };
    }, titleLevel);
    
    if (!levelSet.success) {
      console.log(`[Downline Scraper] Could not set title level to ${titleLevel}, skipping...`);
      continue;
    }
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Click "Generate Report" button
    const generateClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('input[type="button"], button'));
      const generateBtn = buttons.find(el => 
        el.textContent?.includes('Generate Report') || 
        (el as HTMLInputElement).value?.includes('Generate Report')
      );
      if (generateBtn) {
        (generateBtn as HTMLElement).click();
        return true;
      }
      return false;
    });
    
    if (generateClicked) {
      // Wait for report to load
      await new Promise(r => setTimeout(r, 5000));
    }
    
    // Extract header info (only once)
    if (!runDate) {
      const headerInfo = await page.evaluate(() => {
        const headerText = document.body.innerText;
        const runDateMatch = headerText.match(/Run Date and Time:\s*([^\n]+)/);
        const infoMatch = headerText.match(/Shopeju,\s*Zaid[^\n]+/);
        return {
          runDate: runDateMatch ? runDateMatch[1].trim() : '',
          reportInfo: infoMatch ? infoMatch[0].trim() : '',
        };
      });
      runDate = headerInfo.runDate;
      reportInfo = headerInfo.reportInfo;
    }
    
    // Extract agents from this title level
    const agents = await extractAgentsFromPage(page);
    console.log(`[Downline Scraper] Found ${agents.length} agents at title level ${titleLevel}`);
    
    // Add unique agents to the list
    for (const agent of agents) {
      if (!seenAgentCodes.has(agent.agentCode)) {
        seenAgentCodes.add(agent.agentCode);
        allAgents.push(agent);
      }
    }
  }
  
  console.log(`[Downline Scraper] Total unique agents extracted: ${allAgents.length}`);
  
  // Save screenshot for debugging
  try {
    await page.screenshot({ path: '/tmp/mywfg-report-final.png', fullPage: true });
    console.log('[Downline Scraper] Screenshot saved: /tmp/mywfg-report-final.png');
  } catch (e) {}
  
  // Map title levels to WFG ranks using the collected agents from all title levels
  const agents: DownlineAgent[] = allAgents.map((agent: any) => ({
    ...agent,
    wfgRank: TITLE_LEVEL_TO_RANK[agent.titleLevel] || 'TRAINING_ASSOCIATE',
    isLifeLicensed: agent.llFlag === true || agent.llFlag === 'Yes' || agent.llFlag === 'yes',
  }));
  
  console.log(`[Downline Scraper] Extracted ${agents.length} agents from report`);
  
  return {
    success: agents.length > 0,
    agents,
    runDate,
    reportInfo,
  };
}

/**
 * Main function to fetch downline status from MyWFG
 */
export async function fetchDownlineStatus(agentId: string = '73DXR'): Promise<DownlineStatusResult> {
  let browser: Browser | null = null;
  
  try {
    console.log('[Downline Scraper] Starting downline status extraction...');
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Login to MyWFG
    const loggedIn = await loginToMyWFG(page);
    if (!loggedIn) {
      throw new Error('Failed to login to MyWFG');
    }
    
    // Extract downline status
    const result = await extractDownlineStatus(page, agentId);
    
    await browser.close();
    browser = null;
    
    return result;
    
  } catch (error) {
    console.error('[Downline Scraper] Error:', error);
    
    if (browser) {
      await browser.close();
    }
    
    return {
      success: false,
      agents: [],
      runDate: '',
      reportInfo: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sync agents from MyWFG Downline Status to database
 */
export async function syncAgentsFromDownlineStatus(db: any, schema: any): Promise<{
  success: boolean;
  added: number;
  updated: number;
  error?: string;
}> {
  try {
    const result = await fetchDownlineStatus();
    
    if (!result.success) {
      return { success: false, added: 0, updated: 0, error: result.error };
    }
    
    let added = 0;
    let updated = 0;
    
    for (const agent of result.agents) {
      // Check if agent exists
      const existing = await db.select()
        .from(schema.agents)
        .where(schema.eq(schema.agents.agentCode, agent.agentCode))
        .limit(1);
      
      if (existing.length > 0) {
        // Update existing agent
        await db.update(schema.agents)
          .set({
            firstName: agent.firstName,
            lastName: agent.lastName,
            currentRank: agent.wfgRank,
            isLifeLicensed: agent.isLifeLicensed,
            licenseExpirationDate: agent.llEndDate ? new Date(agent.llEndDate) : null,
            currentStage: agent.isLifeLicensed ? 'LICENSED' : 'EXAM_PREP',
          })
          .where(schema.eq(schema.agents.agentCode, agent.agentCode));
        updated++;
      } else {
        // Insert new agent
        await db.insert(schema.agents).values({
          firstName: agent.firstName,
          lastName: agent.lastName,
          agentCode: agent.agentCode,
          currentRank: agent.wfgRank,
          isLifeLicensed: agent.isLifeLicensed,
          licenseExpirationDate: agent.llEndDate ? new Date(agent.llEndDate) : null,
          currentStage: agent.isLifeLicensed ? 'LICENSED' : 'EXAM_PREP',
        });
        added++;
      }
    }
    
    console.log(`[Downline Scraper] Sync complete: ${added} added, ${updated} updated`);
    
    return { success: true, added, updated };
    
  } catch (error) {
    console.error('[Downline Scraper] Sync error:', error);
    return {
      success: false,
      added: 0,
      updated: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

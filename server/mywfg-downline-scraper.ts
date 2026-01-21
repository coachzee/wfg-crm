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
import { startOTPSession, waitForOTPWithSession, clearUsedOTPs } from './gmail-otp-v2';
import { eq } from 'drizzle-orm';

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
// Correct mapping: 01=TA, 10=A, 15=SA, 17=MD, 20=SMD
const TITLE_LEVEL_TO_RANK: Record<string, string> = {
  '01': 'TRAINING_ASSOCIATE',
  '1': 'TRAINING_ASSOCIATE',
  '10': 'ASSOCIATE',
  '15': 'SENIOR_ASSOCIATE',
  '17': 'MARKETING_DIRECTOR',
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
  homeAddress: string | null; // From Hierarchy Tool
  // Computed fields
  wfgRank: string;
  isLifeLicensed: boolean;
}

export interface ReportSummary {
  totalAgents: number;
  byTitleLevel: {
    TA: number;
    A: number;
    SA: number;
    MD: number;
    SMD: number;
    other: number;
  };
  licensedCount: number;
  unlicensedCount: number;
}

export interface DownlineStatusResult {
  success: boolean;
  agents: DownlineAgent[];
  runDate: string;
  reportInfo: string;
  summary?: ReportSummary;
  error?: string;
}

/**
 * Login to MyWFG with OTP handling (V2 - session-based)
 */
async function loginToMyWFG(page: Page): Promise<boolean> {
  const creds = getMyWFGLoginCredentials();
  const gmailCreds = getGmailCredentials();
  
  console.log('[Downline Scraper] Navigating to MyWFG...');
  await page.goto('https://www.mywfg.com', { waitUntil: 'networkidle2', timeout: 60000 });
  
  // Wait for login form
  await page.waitForSelector('input[id="myWfgUsernameDisplay"], input[name="username"]', { timeout: 30000 });
  
  // START OTP SESSION BEFORE TRIGGERING LOGIN
  // This ensures we only accept OTPs that arrive AFTER this point
  console.log('[Downline Scraper] Starting OTP session before login...');
  const otpSessionId = startOTPSession('mywfg');
  
  // Find and fill username
  const usernameInput = await page.$('input[id="myWfgUsernameDisplay"]') || await page.$('input[name="username"]');
  if (!usernameInput) throw new Error('Username input not found');
  
  await usernameInput.click({ clickCount: 3 });
  await usernameInput.type(creds.username, { delay: 30 });
  
  // Find and fill password
  const passwordInput = await page.$('input[id="myWfgPasswordDisplay"]') || await page.$('input[name="password"]');
  if (!passwordInput) throw new Error('Password input not found');
  
  await passwordInput.click({ clickCount: 3 });
  await passwordInput.type(creds.password, { delay: 30 });
  
  // Click login button - this triggers the OTP email
  console.log('[Downline Scraper] Clicking login button (this triggers OTP)...');
  const loginButton = await page.$('button[id="mywfgTheyLive"]') || await page.$('button[type="submit"]');
  if (loginButton) {
    await Promise.all([
      loginButton.click(),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {}),
    ]);
  }
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Check for OTP requirement
  const pageContent = await page.content();
  const pageText = await page.evaluate(() => document.body.innerText);
  
  // Check for error page
  if (pageText.includes('ERROR OCCURRED') || pageText.includes('Bad Request')) {
    console.log('[Downline Scraper] Error page detected, retrying...');
    clearUsedOTPs();
    await page.goto('https://www.mywfg.com', { waitUntil: 'networkidle2', timeout: 60000 });
    return loginToMyWFG(page);
  }
  
  const otpRequired = pageContent.includes('mywfgOtppswd') || 
                      pageText.includes('One-Time Password') ||
                      pageText.includes('Security Code') ||
                      pageText.includes('Validation Code');
  
  if (otpRequired) {
    console.log('[Downline Scraper] OTP required, waiting for email (session-based, 180s timeout)...');
    
    // Get the prefix shown on the page - REQUIRED for verification
    const pagePrefix = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const prefixMatch = bodyText.match(/(\d{4})\s*-/);
      return prefixMatch ? prefixMatch[1] : null;
    });
    if (pagePrefix) {
      console.log(`[Downline Scraper] Page shows OTP prefix: ${pagePrefix}`);
    } else {
      console.log('[Downline Scraper] Warning: Could not extract OTP prefix from page');
    }
    
    // Wait for OTP using the session we started BEFORE login
    // Pass the expected prefix to ensure we get the correct OTP
    const otpResult = await waitForOTPWithSession(gmailCreds, otpSessionId, 180, 3, pagePrefix || undefined);
    
    if (!otpResult?.success || !otpResult?.otp) {
      throw new Error(`Failed to get OTP: ${otpResult?.error}`);
    }
    
    console.log(`[Downline Scraper] ✓ OTP received: ${otpResult.otp}`);
    
    // The OTP from email is already just the 6 digits we need to enter
    const fullOtp = otpResult.otp;
    const otpToEnter = fullOtp.length > 6 ? fullOtp.slice(-6) : fullOtp;
    console.log(`[Downline Scraper] Entering OTP digits: ${otpToEnter}`);
    
    // Find OTP input - try multiple selectors
    // The input is a text field next to the prefix display
    let otpInput = await page.$('input[id="mywfgOtppswd"]');
    if (!otpInput) otpInput = await page.$('input[name="otp"]');
    if (!otpInput) otpInput = await page.$('input[name="otpCode"]');
    if (!otpInput) otpInput = await page.$('input[placeholder*="code" i]');
    
    // Try to find any text input that's not the username/password fields
    if (!otpInput) {
      const inputs = await page.$$('input');
      for (const input of inputs) {
        const type = await input.evaluate(el => el.getAttribute('type'));
        const id = await input.evaluate(el => el.id);
        const isVisible = await input.isVisible();
        
        // Skip hidden inputs and username/password fields
        if (!isVisible) continue;
        if (id?.toLowerCase().includes('username')) continue;
        if (id?.toLowerCase().includes('password')) continue;
        if (type === 'hidden' || type === 'password') continue;
        
        // This should be the OTP input
        if (type === 'text' || type === 'tel' || type === null) {
          otpInput = input;
          console.log(`[Downline Scraper] Found OTP input: type=${type}, id=${id}`);
          break;
        }
      }
    }
    
    if (otpInput) {
      // Clear any existing value and enter the OTP
      await otpInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await otpInput.type(otpToEnter, { delay: 50 });
      console.log('[Downline Scraper] OTP entered');
      
      await new Promise(r => setTimeout(r, 500));
      
      // Take screenshot before submit
      await page.screenshot({ path: '/tmp/mywfg-otp-entered.png', fullPage: true });
      
      // Submit OTP - find the Submit button
      let submitBtn: any = await page.$('button[id="mywfgTheylive"]');
      if (!submitBtn) submitBtn = await page.$('button[id="mywfgTheyLive"]');
      if (!submitBtn) {
        // Find button by text content
        const buttons = await page.$$('button');
        for (const btn of buttons) {
          const text = await btn.evaluate(el => el.textContent?.trim().toLowerCase());
          if (text === 'submit') {
            submitBtn = btn;
            break;
          }
        }
      }
      if (!submitBtn) submitBtn = await page.$('button[type="submit"]');
      if (!submitBtn) submitBtn = await page.$('input[type="submit"]');
      
      if (submitBtn) {
        console.log('[Downline Scraper] Clicking submit button...');
        await submitBtn.click();
        
        // Wait for navigation
        try {
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        } catch (e) {
          console.log('[Downline Scraper] Navigation wait completed or timed out');
        }
      } else {
        console.log('[Downline Scraper] Warning: Submit button not found');
      }
      
      await new Promise(r => setTimeout(r, 3000));
      try {
        await page.screenshot({ path: '/tmp/mywfg-after-otp-submit.png', fullPage: true });
      } catch (e) {
        console.log('[Downline Scraper] Screenshot skipped (window may be minimized)');
      }
    } else {
      console.log('[Downline Scraper] Warning: OTP input not found');
      try {
        await page.screenshot({ path: '/tmp/mywfg-otp-input-not-found.png', fullPage: true });
      } catch (e) {
        console.log('[Downline Scraper] Screenshot skipped');
      }
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
 * Helper function to extract agents from a frame
 */
async function extractAgentsFromFrame(frame: any): Promise<any[]> {
  const reportData = await frame.evaluate(() => {
    const agents: any[] = [];
    
    // Find the data table - look for table with agent data
    const tables = Array.from(document.querySelectorAll('table'));
    for (const table of tables) {
      const rows = table.querySelectorAll('tr');
      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('td');
        if (cells.length >= 6) {
          const firstName = cells[0]?.textContent?.trim() || '';
          const lastName = cells[1]?.textContent?.trim() || '';
          const bulletinName = cells[2]?.textContent?.trim() || '';
          const agentCode = cells[3]?.textContent?.trim() || '';
          const titleLevel = cells[4]?.textContent?.trim() || '';
          const commLevel = cells[5]?.textContent?.trim() || '';
          const col6 = cells[6]?.textContent?.trim() || '';
          const col7 = cells[7]?.textContent?.trim() || '';
          
          // Determine if col6/col7 are LL Flag or Downline %/MD Approval
          const isLLFlag = col6.toLowerCase() === 'yes' || col6.toLowerCase() === 'no';
          const llFlag = isLLFlag ? col6 : '';
          const llEndDate = isLLFlag ? col7 : '';
          
          // Skip header rows
          if (firstName === 'First_Name' || firstName === 'First Name' || !firstName || !agentCode) {
            continue;
          }
          
          // Skip if it looks like a header
          if (titleLevel === 'Title_Level' || titleLevel === 'Title Level') {
            continue;
          }
          
          // Validate agent code format
          if (!agentCode.match(/^[A-Z0-9]{5}$/i)) {
            continue;
          }
          
          let isLicensed = false;
          if (llFlag) {
            isLicensed = llFlag.toLowerCase() === 'yes';
          } else if (commLevel && parseInt(commLevel) > 0) {
            isLicensed = true;
          }
          
          agents.push({
            firstName,
            lastName,
            bulletinName,
            agentCode,
            titleLevel,
            commLevel,
            llFlag: isLicensed,
            llEndDate: llEndDate || null,
            securities: null,
            downlinePercent: null,
            residentState: null,
            mdApprovalDate: null,
            terminateDate: null,
            country: 'US',
          });
        }
      }
    }
    
    return agents;
  });
  
  return reportData;
}

/**
 * Helper function to extract agents from the current page
 */
async function extractAgentsFromPage(page: Page): Promise<any[]> {
  // First, debug the page structure
  const debugInfo = await page.evaluate(() => {
    const tables = Array.from(document.querySelectorAll('table'));
    const iframes = Array.from(document.querySelectorAll('iframe'));
    const allTds = document.querySelectorAll('td');
    const allTrs = document.querySelectorAll('tr');
    
    // Check for any table-like structures
    const divTables = Array.from(document.querySelectorAll('[class*="table"], [class*="grid"], [role="table"]'));
    
    // Get sample of first table's HTML
    let firstTableHtml = '';
    if (tables.length > 0) {
      firstTableHtml = tables[0].outerHTML.substring(0, 1000);
    }
    
    // Get iframe sources
    const iframeSrcs = iframes.map(f => f.src || f.getAttribute('src') || 'no-src');
    
    return {
      tableCount: tables.length,
      iframeCount: iframes.length,
      totalTds: allTds.length,
      totalTrs: allTrs.length,
      divTableCount: divTables.length,
      firstTableHtml,
      iframeSrcs,
      bodyTextSample: document.body.innerText.substring(0, 500)
    };
  });
  
  console.log('[Extraction Debug] Page structure:', JSON.stringify(debugInfo, null, 2));
  
  // If main page has no data, try to find data in iframes
  if (debugInfo.totalTds === 0 && debugInfo.iframeCount > 0) {
    console.log('[Extraction Debug] Main page has no table data, checking iframes...');
    
    // Get all frames
    const frames = page.frames();
    console.log(`[Extraction Debug] Found ${frames.length} frames`);
    
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      try {
        const frameData = await frame.evaluate(() => {
          const tables = Array.from(document.querySelectorAll('table'));
          const allTds = document.querySelectorAll('td');
          return {
            tableCount: tables.length,
            tdCount: allTds.length,
            bodyText: document.body?.innerText?.substring(0, 200) || ''
          };
        });
        console.log(`[Extraction Debug] Frame ${i}: ${JSON.stringify(frameData)}`);
        
        // If this frame has table data, extract from it
        if (frameData.tdCount > 0) {
          console.log(`[Extraction Debug] Found data in frame ${i}, extracting...`);
          const agents = await extractAgentsFromFrame(frame);
          if (agents.length > 0) {
            return agents;
          }
        }
      } catch (e) {
        console.log(`[Extraction Debug] Frame ${i} error: ${e}`);
      }
    }
  }
  
  const reportData = await page.evaluate(() => {
    const agents: any[] = [];
    
    // Find the data table - look for table with agent data
    const tables = Array.from(document.querySelectorAll('table'));
    for (const table of tables) {
      const rows = table.querySelectorAll('tr');
      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('td');
        // The table may have different column structures depending on the report view
        // Minimum columns: First Name, Last Name, Bulletin Name, Associate ID, Title Level, Comm Level, Downline %, MD Approval
        if (cells.length >= 6) {
          const firstName = cells[0]?.textContent?.trim() || '';
          const lastName = cells[1]?.textContent?.trim() || '';
          const bulletinName = cells[2]?.textContent?.trim() || '';
          const agentCode = cells[3]?.textContent?.trim() || '';
          const titleLevel = cells[4]?.textContent?.trim() || '';
          const commLevel = cells[5]?.textContent?.trim() || '';
          // Columns 6 and 7 may be Downline % and MD Approval (not LL Flag and LL End Date)
          const col6 = cells[6]?.textContent?.trim() || '';
          const col7 = cells[7]?.textContent?.trim() || '';
          
          // Determine if col6/col7 are LL Flag or Downline %/MD Approval
          // LL Flag is typically "Yes" or "No", Downline % is a number like "100"
          const isLLFlag = col6.toLowerCase() === 'yes' || col6.toLowerCase() === 'no';
          const llFlag = isLLFlag ? col6 : '';
          const llEndDate = isLLFlag ? col7 : '';
          const downlinePercent = !isLLFlag ? col6 : (cells[8]?.textContent?.trim() || '');
          const mdApprovalDate = !isLLFlag ? col7 : (cells[9]?.textContent?.trim() || '');
          
          // Skip header rows
          if (firstName === 'First_Name' || firstName === 'First Name' || !firstName || !agentCode) {
            continue;
          }
          
          // Skip if it looks like a header
          if (titleLevel === 'Title_Level' || titleLevel === 'Title Level') {
            continue;
          }
          
          // Validate agent code format (should be 5 alphanumeric characters)
          if (!agentCode.match(/^[A-Z0-9]{5}$/i)) {
            continue;
          }
          
          // Determine if licensed:
          // 1. If llFlag column exists and is "Yes", agent is licensed
          // 2. If MD Approval date exists, agent is likely licensed
          // 3. If comm level > 0, agent is likely licensed
          let isLicensed = false;
          if (llFlag) {
            isLicensed = llFlag.toLowerCase() === 'yes';
          } else if (mdApprovalDate && mdApprovalDate.match(/\d{2}\/\d{2}\/\d{2}/)) {
            // Has an MD approval date, likely licensed
            isLicensed = true;
          } else if (commLevel && parseInt(commLevel) > 0) {
            // Has a commission level > 0, likely licensed
            isLicensed = true;
          }
          
          agents.push({
            firstName,
            lastName,
            bulletinName,
            agentCode,
            titleLevel,
            commLevel,
            llFlag: isLicensed,
            llEndDate: llEndDate || null,
            securities: null,
            downlinePercent: downlinePercent || null,
            residentState: null,
            mdApprovalDate: mdApprovalDate || null,
            terminateDate: null,
            country: 'US',
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
 * @param teamType - 'BASE_SHOP' or 'SUPER_TEAM' to filter by downline type
 */
async function extractDownlineStatus(page: Page, agentId: string, teamType: 'BASE_SHOP' | 'SUPER_TEAM' = 'BASE_SHOP'): Promise<DownlineStatusResult> {
  const reportUrl = `https://www.mywfg.com/reports-downline-status?AgentID=${agentId}`;
  
  console.log(`[Downline Scraper] Navigating to Downline Status report (${teamType})...`);
  await page.goto(reportUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Take initial screenshot
  await page.screenshot({ path: '/tmp/mywfg-report-initial.png', fullPage: true });
  console.log('[Downline Scraper] Initial screenshot saved');
  
  // Set up the correct filters:
  // 1. Type: "Active" (to show all active agents)
  // 2. Team: "SMD Base" (to show SMD base team)
  // 3. Title Level: Multi-select TA, A, SA, MD
  
  console.log('[Downline Scraper] Setting up report filters...');
  
  // Set Type to "Active"
  const typeSet = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    for (const select of selects) {
      const options = Array.from(select.options);
      // Look for Type dropdown (has options like Active, Life Licensed, etc.)
      const hasActive = options.some(o => o.text.toLowerCase() === 'active');
      if (hasActive) {
        const targetOption = options.find(o => o.text.toLowerCase() === 'active');
        if (targetOption) {
          select.value = targetOption.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return { success: true, value: targetOption.text };
        }
      }
    }
    return { success: false };
  });
  
  if (typeSet.success) {
    console.log(`[Downline Scraper] Set Type to: ${typeSet.value}`);
  } else {
    console.log('[Downline Scraper] Could not find Type dropdown');
  }
  
  await new Promise(r => setTimeout(r, 500));
  
  // Set Team to "SMD Base"
  const teamSet = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    for (const select of selects) {
      const options = Array.from(select.options);
      // Look for Team dropdown (has options like SMD Base, Super Base, etc.)
      const hasSMDBase = options.some(o => o.text.toLowerCase().includes('smd base'));
      if (hasSMDBase) {
        const targetOption = options.find(o => o.text.toLowerCase().includes('smd base'));
        if (targetOption) {
          select.value = targetOption.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return { success: true, value: targetOption.text };
        }
      }
    }
    return { success: false };
  });
  
  if (teamSet.success) {
    console.log(`[Downline Scraper] Set Team to: ${teamSet.value}`);
  } else {
    console.log('[Downline Scraper] Could not find Team dropdown with SMD Base option');
  }
  
  await new Promise(r => setTimeout(r, 500));
  
  // Set Title Level to multi-select TA, A, SA, MD
  const titleLevelSet = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    for (const select of selects) {
      const options = Array.from(select.options);
      // Look for Title Level dropdown (has options like TA, A, SA, MD, SMD)
      const hasTitleLevels = options.some(o => ['TA', 'A', 'SA', 'MD', 'SMD'].includes(o.text.trim()));
      if (hasTitleLevels) {
        // Check if it's a multi-select
        if (select.multiple) {
          // Multi-select: select TA, A, SA, MD
          const targetLevels = ['TA', 'A', 'SA', 'MD'];
          const selected: string[] = [];
          for (const option of options) {
            if (targetLevels.includes(option.text.trim())) {
              option.selected = true;
              selected.push(option.text.trim());
            }
          }
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return { success: true, multiple: true, values: selected };
        } else {
          // Single select - just select TA for now
          const targetOption = options.find(o => o.text.trim() === 'TA');
          if (targetOption) {
            select.value = targetOption.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            return { success: true, multiple: false, values: ['TA'] };
          }
        }
      }
    }
    return { success: false };
  });
  
  if (titleLevelSet.success) {
    console.log(`[Downline Scraper] Set Title Level to: ${titleLevelSet.values?.join(', ')} (multi-select: ${titleLevelSet.multiple})`);
  } else {
    console.log('[Downline Scraper] Could not find Title Level dropdown');
  }
  
  await new Promise(r => setTimeout(r, 500));
  
  // Take screenshot after setting filters
  await page.screenshot({ path: '/tmp/mywfg-report-filters-set.png', fullPage: true });
  console.log('[Downline Scraper] Filters set, screenshot saved');
  
  // Now click "Generate Report"
  console.log('[Downline Scraper] Clicking Generate Report button...');
  
  const generateClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('input[type="button"], button'));
    for (const btn of buttons) {
      const text = (btn.textContent || (btn as HTMLInputElement).value || '').toLowerCase();
      // Look for the red "Generate Report" button, not "Generate Full View"
      if (text === 'generate report' || (text.includes('generate') && !text.includes('full'))) {
        (btn as HTMLElement).click();
        return { clicked: true, text };
      }
    }
    return { clicked: false };
  });
  
  if (generateClicked.clicked) {
    console.log(`[Downline Scraper] Clicked: ${generateClicked.text}`);
    // Wait for report to load - the table takes time to appear
    await new Promise(r => setTimeout(r, 5000));
    
    // Wait for the table to actually have data rows
    try {
      await page.waitForFunction(() => {
        const tables = Array.from(document.querySelectorAll('table'));
        for (const table of tables) {
          const rows = table.querySelectorAll('tr td');
          if (rows.length > 0) return true;
        }
        return false;
      }, { timeout: 15000 });
      console.log('[Downline Scraper] Table data loaded');
    } catch (e) {
      console.log('[Downline Scraper] Timeout waiting for table data, proceeding anyway...');
    }
    
    // Additional wait for any dynamic content
    await new Promise(r => setTimeout(r, 2000));
  }
  
  await page.screenshot({ path: '/tmp/mywfg-report-after-generate.png', fullPage: true });
  
  // Extract header info
  const headerInfo = await page.evaluate(() => {
    const headerText = document.body.innerText;
    const runDateMatch = headerText.match(/Run Date and Time:\s*([^\n]+)/);
    const infoMatch = headerText.match(/Shopeju,\s*Zaid[^\n]+/);
    return {
      runDate: runDateMatch ? runDateMatch[1].trim() : '',
      reportInfo: infoMatch ? infoMatch[0].trim() : '',
    };
  });
  const runDate = headerInfo.runDate;
  const reportInfo = headerInfo.reportInfo;
  
  // Extract all agents from the generated report
  // Since we set the filters to Life Licensed + Super Base + TA/A/SA/MD, 
  // all licensed agents should be in the report
  const seenAgentCodes = new Set<string>();
  let allAgents: any[] = [];
  
  // Extract agents from the current page
  const initialAgents = await extractAgentsFromPage(page);
  console.log(`[Downline Scraper] Found ${initialAgents.length} agents in initial report`);
  
  // Add unique agents to the list
  for (const agent of initialAgents) {
    if (agent.agentCode && !seenAgentCodes.has(agent.agentCode)) {
      seenAgentCodes.add(agent.agentCode);
      allAgents.push(agent);
    }
  }
  
  // If the title level dropdown is NOT multi-select, we need to iterate through each level
  if (!titleLevelSet.multiple && titleLevelSet.success) {
    const titleLevels = ['A', 'SA', 'MD']; // We already got TA above
    
    for (const titleLevel of titleLevels) {
      console.log(`[Downline Scraper] Fetching agents with title level: ${titleLevel}`);
      
      // Set the title level
      const levelSet = await page.evaluate((level) => {
        const selects = Array.from(document.querySelectorAll('select'));
        for (const select of selects) {
          const options = Array.from(select.options);
          const hasTitleLevels = options.some(o => ['TA', 'A', 'SA', 'MD', 'SMD'].includes(o.text.trim()));
          if (hasTitleLevels) {
            const targetOption = options.find(o => o.text.trim() === level);
            if (targetOption) {
              select.value = targetOption.value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              return { success: true };
            }
          }
        }
        return { success: false };
      }, titleLevel);
      
      if (!levelSet.success) {
        console.log(`[Downline Scraper] Could not set title level to ${titleLevel}, skipping...`);
        continue;
      }
      
      await new Promise(r => setTimeout(r, 500));
      
      // Click Generate Report
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('input[type="button"], button'));
        for (const btn of buttons) {
          const text = (btn.textContent || (btn as HTMLInputElement).value || '').toLowerCase();
          if (text === 'generate report' || (text.includes('generate') && !text.includes('full'))) {
            (btn as HTMLElement).click();
            return true;
          }
        }
        return false;
      });
      
      // Wait for report to load
      await new Promise(r => setTimeout(r, 5000));
      
      // Take screenshot for this title level
      await page.screenshot({ path: `/tmp/mywfg-report-${titleLevel}.png`, fullPage: true });
      
      // Extract agents from this title level
      const levelAgents = await extractAgentsFromPage(page);
      console.log(`[Downline Scraper] Found ${levelAgents.length} agents at title level ${titleLevel}`);
      
      // Add unique agents to the list
      for (const agent of levelAgents) {
        if (agent.agentCode && !seenAgentCodes.has(agent.agentCode)) {
          seenAgentCodes.add(agent.agentCode);
          allAgents.push(agent);
        }
      }
    }
  }
  
  console.log(`[Downline Scraper] Total unique agents extracted: ${allAgents.length}`);
  
  // Save final screenshot
  try {
    await page.screenshot({ path: '/tmp/mywfg-report-final.png', fullPage: true });
    console.log('[Downline Scraper] Final screenshot saved: /tmp/mywfg-report-final.png');
  } catch (e) {}
  
  // Map title levels to WFG ranks using the collected agents from all title levels
  const agents: DownlineAgent[] = allAgents.map((agent: any) => ({
    ...agent,
    homeAddress: null, // Will be populated by fetchAgentAddresses
    wfgRank: TITLE_LEVEL_TO_RANK[agent.titleLevel] || 'TRAINING_ASSOCIATE',
    isLifeLicensed: agent.llFlag === true || agent.llFlag === 'Yes' || agent.llFlag === 'yes',
  }));
  
  // Generate summary section
  const summary: ReportSummary = {
    totalAgents: agents.length,
    byTitleLevel: {
      TA: agents.filter(a => a.titleLevel === '01' || a.titleLevel === '1').length,
      A: agents.filter(a => a.titleLevel === '10').length,
      SA: agents.filter(a => a.titleLevel === '15').length,
      MD: agents.filter(a => a.titleLevel === '17').length,
      SMD: agents.filter(a => a.titleLevel === '20').length,
      other: agents.filter(a => !['01', '1', '10', '15', '17', '20'].includes(a.titleLevel)).length,
    },
    licensedCount: agents.filter(a => a.isLifeLicensed).length,
    unlicensedCount: agents.filter(a => !a.isLifeLicensed).length,
  };
  
  // Log summary report
  console.log('\n========================================');
  console.log('       DOWNLINE STATUS REPORT SUMMARY');
  console.log('========================================');
  console.log(`Run Date: ${runDate}`);
  console.log(`Report Info: ${reportInfo}`);
  console.log('----------------------------------------');
  console.log(`Total Agents: ${summary.totalAgents}`);
  console.log('----------------------------------------');
  console.log('By Title Level:');
  console.log(`  TA (Training Associate): ${summary.byTitleLevel.TA}`);
  console.log(`  A  (Associate):          ${summary.byTitleLevel.A}`);
  console.log(`  SA (Senior Associate):   ${summary.byTitleLevel.SA}`);
  console.log(`  MD (Marketing Director): ${summary.byTitleLevel.MD}`);
  console.log(`  SMD (Senior MD):         ${summary.byTitleLevel.SMD}`);
  if (summary.byTitleLevel.other > 0) {
    console.log(`  Other:                   ${summary.byTitleLevel.other}`);
  }
  console.log('----------------------------------------');
  console.log(`Licensed:   ${summary.licensedCount}`);
  console.log(`Unlicensed: ${summary.unlicensedCount}`);
  console.log('========================================\n');
  
  console.log(`[Downline Scraper] Extracted ${agents.length} agents from report`);
  
  return {
    success: agents.length > 0,
    agents,
    runDate,
    reportInfo,
    summary,
  };
}

/**
 * Main function to fetch downline status from MyWFG
 * @param agentId - Agent ID to fetch downline for (default: 73DXR)
 * @param teamType - 'BASE_SHOP' or 'SUPER_TEAM' to filter by downline type
 * @param cachedCookies - Optional cached session cookies to skip login
 */
export async function fetchDownlineStatus(
  agentId: string = '73DXR', 
  teamType: 'BASE_SHOP' | 'SUPER_TEAM' = 'BASE_SHOP',
  cachedCookies?: any[]
): Promise<DownlineStatusResult> {
  let browser: Browser | null = null;
  
  try {
    console.log('[Downline Scraper] Starting downline status extraction...');
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Use cached cookies if provided, otherwise login fresh
    if (cachedCookies && cachedCookies.length > 0) {
      console.log('[Downline Scraper] Using cached session cookies...');
      await page.setCookie(...cachedCookies);
      
      // Navigate directly to the downline status report to verify session
      const reportUrl = `https://www.mywfg.com/reports-downline-status?AgentID=${agentId}`;
      await page.goto(reportUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Check if we got redirected to login
      const currentUrl = page.url();
      if (currentUrl.includes('login')) {
        console.log('[Downline Scraper] Session expired, need fresh login');
        throw new Error('Session expired - need fresh login');
      }
      
      console.log('[Downline Scraper] Cached session valid, on downline page');
    } else {
      // Login to MyWFG fresh
      const loggedIn = await loginToMyWFG(page);
      if (!loggedIn) {
        throw new Error('Failed to login to MyWFG');
      }
    }
    
    // Extract downline status
    const result = await extractDownlineStatus(page, agentId, teamType);
    
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
 * @param db - Database instance
 * @param schema - Database schema
 * @param prefetchedResult - Optional pre-fetched downline status result (to avoid duplicate fetches)
 * @param teamType - 'BASE_SHOP' or 'SUPER_TEAM' to filter by downline type
 */
export async function syncAgentsFromDownlineStatus(
  db: any, 
  schema: any, 
  prefetchedResult?: DownlineStatusResult,
  teamType: 'BASE_SHOP' | 'SUPER_TEAM' = 'BASE_SHOP'
): Promise<{
  success: boolean;
  added: number;
  updated: number;
  deactivated: number;
  reactivated: number;
  error?: string;
}> {
  try {
    // Use pre-fetched result if provided, otherwise fetch fresh
    const result = prefetchedResult || await fetchDownlineStatus('73DXR', teamType);
    
    if (!result.success) {
      return { success: false, added: 0, updated: 0, deactivated: 0, reactivated: 0, error: result.error };
    }
    
    let added = 0;
    let updated = 0;
    let deactivated = 0;
    let reactivated = 0;
    
    // Get all agent codes from the MyWFG report
    const activeAgentCodes = new Set(result.agents.map(a => a.agentCode));
    
    // First, mark all agents NOT in the report as inactive
    const allAgents = await db.select()
      .from(schema.agents)
      .where(eq(schema.agents.teamType, teamType));
    
    for (const existingAgent of allAgents) {
      if (existingAgent.agentCode && !activeAgentCodes.has(existingAgent.agentCode)) {
        // Agent is not in the active report - mark as inactive
        if (existingAgent.isActive) {
          await db.update(schema.agents)
            .set({ isActive: false })
            .where(eq(schema.agents.id, existingAgent.id));
          deactivated++;
          console.log(`[Downline Scraper] Marked agent ${existingAgent.firstName} ${existingAgent.lastName} (${existingAgent.agentCode}) as INACTIVE`);
        }
      }
    }
    
    // Now process agents from the report
    for (const agent of result.agents) {
      // Check if agent exists
      const existing = await db.select()
        .from(schema.agents)
        .where(eq(schema.agents.agentCode, agent.agentCode))
        .limit(1);
      
      if (existing.length > 0) {
        // Update existing agent - mark as active and update fields
        const wasInactive = !existing[0].isActive;
        const updateData: any = {
          firstName: agent.firstName,
          lastName: agent.lastName,
          currentRank: agent.wfgRank,
          isLifeLicensed: agent.isLifeLicensed,
          licenseExpirationDate: agent.llEndDate ? new Date(agent.llEndDate) : null,
          currentStage: agent.isLifeLicensed ? 'LICENSED' : 'EXAM_PREP',
          isActive: true, // Mark as active since they're in the report
        };
        if (agent.homeAddress) {
          updateData.homeAddress = agent.homeAddress;
        }
        await db.update(schema.agents)
          .set(updateData)
          .where(eq(schema.agents.agentCode, agent.agentCode));
        updated++;
        if (wasInactive) {
          reactivated++;
          console.log(`[Downline Scraper] Reactivated agent ${agent.firstName} ${agent.lastName} (${agent.agentCode})`);
        }
      } else {
        // Insert new agent (active by default)
        await db.insert(schema.agents).values({
          firstName: agent.firstName,
          lastName: agent.lastName,
          agentCode: agent.agentCode,
          currentRank: agent.wfgRank,
          isLifeLicensed: agent.isLifeLicensed,
          homeAddress: agent.homeAddress,
          licenseExpirationDate: agent.llEndDate ? new Date(agent.llEndDate) : null,
          currentStage: agent.isLifeLicensed ? 'LICENSED' : 'EXAM_PREP',
          teamType: teamType,
          isActive: true,
        });
        added++;
      }
    }
    
    console.log(`[Downline Scraper] Sync complete: ${added} added, ${updated} updated, ${deactivated} deactivated, ${reactivated} reactivated`);
    
    return { success: true, added, updated, deactivated, reactivated };
    
  } catch (error) {
    console.error('[Downline Scraper] Sync error:', error);
    return {
      success: false,
      added: 0,
      updated: 0,
      deactivated: 0,
      reactivated: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}


/**
 * Contact info extracted from Associate Details page
 */
export interface AgentContactInfo {
  phone: string | null;
  email: string | null;
  homeAddress: string | null;
}

/**
 * Fetch contact info (phone, email, address) for a single agent from MyWFG Hierarchy Tool
 */
export async function fetchAgentContactInfo(page: Page, agentCode: string): Promise<AgentContactInfo> {
  try {
    console.log(`[Hierarchy Tool] Fetching contact info for agent ${agentCode}...`);
    
    const url = `https://www.mywfg.com/Wfg.HierarchyTool/HierarchyDetails/LoadHierarchyToolMain?agentcodenumber=${agentCode}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for the page to load initially
    await new Promise(r => setTimeout(r, 2000));
    
    // Click on ASSOCIATE DETAILS tab explicitly to trigger content load
    try {
      // Find and click the Associate Details tab
      const clicked = await page.evaluate(() => {
        // Look for the tab by text content
        const allElements = Array.from(document.querySelectorAll('a, div, span, button, li'));
        for (const el of allElements) {
          const text = el.textContent?.trim().toUpperCase() || '';
          if (text === 'ASSOCIATE DETAILS' || text.includes('ASSOCIATE DETAILS')) {
            console.log('Found Associate Details tab:', el.tagName, el.className);
            (el as HTMLElement).click();
            return { found: true, tag: el.tagName, class: el.className };
          }
        }
        return { found: false };
      });
      
      console.log(`[Hierarchy Tool] Tab click result:`, clicked);
      
      // Wait for content to load (up to 20 seconds)
      await new Promise(r => setTimeout(r, 3000));
      
      // Wait for phone/email content to appear OR timeout
      let contentLoaded = false;
      for (let i = 0; i < 10; i++) {
        const hasContent = await page.evaluate(() => {
          const text = document.body.innerText;
          // Check if we have phone-like content or email-like content
          const hasPhone = /\(?\d{3}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{4}/.test(text);
          const hasEmail = /@/.test(text) && !text.includes('wfg.com');
          const hasAddress = /\d+\s+\w+\s+(St|Street|Ave|Avenue|Blvd|Dr|Drive|Rd|Road|Ln|Lane)/i.test(text);
          const hasLabels = /Mobile|Cell|Phone|Email|Address/i.test(text);
          return hasPhone || hasEmail || hasAddress || hasLabels;
        });
        
        if (hasContent) {
          contentLoaded = true;
          console.log(`[Hierarchy Tool] Content loaded after ${(i + 1) * 2} seconds`);
          break;
        }
        
        await new Promise(r => setTimeout(r, 2000));
      }
      
      if (!contentLoaded) {
        console.log('[Hierarchy Tool] Content did not load after 20 seconds, proceeding anyway...');
      }
    } catch (e) {
      console.log('[Hierarchy Tool] Error clicking tab:', e);
    }
    
    // Extract all contact info with improved patterns
    const contactInfo = await page.evaluate(() => {
      const result: { phone: string | null; email: string | null; homeAddress: string | null } = {
        phone: null,
        email: null,
        homeAddress: null
      };
      
      const pageText = document.body.innerText;
      const pageHtml = document.body.innerHTML;
      
      // Method 1: Look for labeled phone numbers
      const phonePatterns = [
        /(?:Mobile|Cell|Phone|Tel|Primary Phone|Home Phone|Work Phone)[:\s]*(\(?\d{3}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{4})/i,
        /(?:Mobile|Cell)[:\s]*([\d\(\)\-\s\.]+)/i,
      ];
      
      for (const pattern of phonePatterns) {
        const match = pageText.match(pattern);
        if (match) {
          const phone = match[1] || match[0];
          const cleaned = phone.replace(/[^\d]/g, '');
          if (cleaned.length >= 10) {
            result.phone = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
            break;
          }
        }
      }
      
      // Method 2: If no labeled phone found, look for any phone pattern
      if (!result.phone) {
        const allPhones = pageText.match(/\(?\d{3}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{4}/g);
        if (allPhones && allPhones.length > 0) {
          // Take the first one that looks like a mobile number (not a fax)
          for (const phone of allPhones) {
            const cleaned = phone.replace(/[^\d]/g, '');
            if (cleaned.length >= 10) {
              // Skip if it looks like a date or ID
              if (!pageText.includes(`ID: ${phone}`) && !pageText.includes(`Date: ${phone}`)) {
                result.phone = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
                break;
              }
            }
          }
        }
      }
      
      // Extract email - look for email pattern (excluding system emails)
      const emailMatches = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi);
      if (emailMatches) {
        for (const email of emailMatches) {
          const lowerEmail = email.toLowerCase();
          // Skip system emails
          if (!lowerEmail.includes('wfg.com') && 
              !lowerEmail.includes('transamerica') && 
              !lowerEmail.includes('noreply') &&
              !lowerEmail.includes('support')) {
            result.email = lowerEmail;
            break;
          }
        }
      }
      
      // Extract home address - look for address patterns
      const addressPatterns = [
        /Home Address[:\s]*([^\n]+(?:\n[^\n]+)?)/i,
        /Address[:\s]*([^\n]+(?:,\s*[A-Z]{2}\s*\d{5}))/i,
        /([\d]+\s+[\w\s]+(?:St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Rd|Road|Ln|Lane|Way|Ct|Court)[\s,]+[\w\s]+,\s*[A-Z]{2}\s*\d{5})/i
      ];
      
      for (const pattern of addressPatterns) {
        const match = pageText.match(pattern);
        if (match) {
          result.homeAddress = match[1].replace(/\s+/g, ' ').trim();
          break;
        }
      }
      
      return result;
    });
    
    if (contactInfo.phone) {
      console.log(`[Hierarchy Tool] Found phone for ${agentCode}: ${contactInfo.phone}`);
    }
    if (contactInfo.email) {
      console.log(`[Hierarchy Tool] Found email for ${agentCode}: ${contactInfo.email}`);
    }
    if (contactInfo.homeAddress) {
      console.log(`[Hierarchy Tool] Found address for ${agentCode}: ${contactInfo.homeAddress.substring(0, 50)}...`);
    }
    
    return contactInfo;
  } catch (error) {
    console.error(`[Hierarchy Tool] Error fetching contact info for ${agentCode}:`, error);
    return { phone: null, email: null, homeAddress: null };
  }
}

/**
 * Fetch contact info for multiple agents (with rate limiting and batch processing)
 */
export async function fetchAgentContactInfoBatch(
  page: Page, 
  agentCodes: string[],
  onProgress?: (current: number, total: number, agentCode: string) => void
): Promise<Map<string, AgentContactInfo>> {
  const contacts = new Map<string, AgentContactInfo>();
  
  console.log(`[Hierarchy Tool] Fetching contact info for ${agentCodes.length} agents...`);
  
  for (let i = 0; i < agentCodes.length; i++) {
    const agentCode = agentCodes[i];
    
    if (onProgress) {
      onProgress(i + 1, agentCodes.length, agentCode);
    }
    
    const contactInfo = await fetchAgentContactInfo(page, agentCode);
    if (contactInfo.phone || contactInfo.email || contactInfo.homeAddress) {
      contacts.set(agentCode, contactInfo);
    }
    
    // Rate limiting: wait 1 second between requests
    if (i < agentCodes.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  console.log(`[Hierarchy Tool] Successfully fetched contact info for ${contacts.size} agents out of ${agentCodes.length}`);
  
  return contacts;
}

/**
 * Fetch home address for a single agent from MyWFG Hierarchy Tool
 */
export async function fetchAgentAddress(page: Page, agentCode: string): Promise<string | null> {
  try {
    console.log(`[Hierarchy Tool] Fetching address for agent ${agentCode}...`);
    
    const url = `https://www.mywfg.com/Wfg.HierarchyTool/HierarchyDetails/LoadHierarchyToolMain?agentcodenumber=${agentCode}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for the page to load
    await new Promise(r => setTimeout(r, 2000));
    
    // Click on Associate Details tab if available
    try {
      const associateDetailsLink = await page.$('a[id="AgentDetailsLink"], a:has-text("Associate Details")');
      if (associateDetailsLink) {
        await associateDetailsLink.click();
        await new Promise(r => setTimeout(r, 1500));
      }
    } catch (e) {
      // Tab might already be open or not exist
    }
    
    // Extract home address
    const address = await page.evaluate(() => {
      // Look for Home Address label and its value
      const labels = Array.from(document.querySelectorAll('label, div, span, td'));
      let foundHomeAddress = false;
      
      for (const el of labels) {
        const text = el.textContent?.trim() || '';
        
        if (text.includes('Home Address') || text === 'Home Address:') {
          foundHomeAddress = true;
          continue;
        }
        
        // If we found the label, the next element with substantial text is the address
        if (foundHomeAddress && text.length > 10 && !text.includes('Address')) {
          // Clean up the address - remove extra whitespace
          return text.replace(/\s+/g, ' ').trim();
        }
      }
      
      // Alternative: Look for address pattern in the page
      const pageText = document.body.innerText;
      const addressMatch = pageText.match(/Home Address[:\s]*([^\n]+(?:\n[^\n]+)?)/i);
      if (addressMatch) {
        return addressMatch[1].replace(/\s+/g, ' ').trim();
      }
      
      return null;
    });
    
    if (address) {
      console.log(`[Hierarchy Tool] Found address for ${agentCode}: ${address.substring(0, 50)}...`);
    } else {
      console.log(`[Hierarchy Tool] No address found for ${agentCode}`);
    }
    
    return address;
  } catch (error) {
    console.error(`[Hierarchy Tool] Error fetching address for ${agentCode}:`, error);
    return null;
  }
}

/**
 * Fetch addresses for multiple agents (with rate limiting)
 */
export async function fetchAgentAddresses(
  page: Page, 
  agentCodes: string[],
  onProgress?: (current: number, total: number, agentCode: string) => void
): Promise<Map<string, string>> {
  const addresses = new Map<string, string>();
  
  console.log(`[Hierarchy Tool] Fetching addresses for ${agentCodes.length} agents...`);
  
  for (let i = 0; i < agentCodes.length; i++) {
    const agentCode = agentCodes[i];
    
    if (onProgress) {
      onProgress(i + 1, agentCodes.length, agentCode);
    }
    
    const address = await fetchAgentAddress(page, agentCode);
    if (address) {
      addresses.set(agentCode, address);
    }
    
    // Rate limiting: wait 1.5 seconds between requests to avoid overwhelming the server
    if (i < agentCodes.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  
  console.log(`[Hierarchy Tool] Successfully fetched ${addresses.size} addresses out of ${agentCodes.length} agents`);
  
  return addresses;
}

/**
 * Fetch downline status with addresses from Hierarchy Tool
 * @param teamType - 'BASE_SHOP' or 'SUPER_TEAM' to filter by downline type
 */
export async function fetchDownlineStatusWithAddresses(agentId: string = '73DXR', teamType: 'BASE_SHOP' | 'SUPER_TEAM' = 'BASE_SHOP'): Promise<DownlineStatusResult> {
  let browser: Browser | null = null;
  
  try {
    console.log('[Downline Scraper] Starting downline status extraction with addresses...');
    
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
    const result = await extractDownlineStatus(page, agentId, teamType);
    
    if (result.success && result.agents.length > 0) {
      // Fetch addresses for all agents
      console.log('[Downline Scraper] Fetching addresses from Hierarchy Tool...');
      const agentCodes = result.agents.map(a => a.agentCode);
      const addresses = await fetchAgentAddresses(page, agentCodes);
      
      // Update agents with addresses
      for (const agent of result.agents) {
        const address = addresses.get(agent.agentCode);
        if (address) {
          agent.homeAddress = address;
        }
      }
      
      console.log(`[Downline Scraper] Updated ${addresses.size} agents with addresses`);
    }
    
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
 * Fetch upline information for a single agent from MyWFG Hierarchy Tool Associate Details
 */
export async function fetchAgentUpline(page: Page, agentCode: string): Promise<{ uplineCode: string | null; uplineName: string | null }> {
  try {
    console.log(`[Hierarchy Tool] Fetching upline for agent ${agentCode}...`);
    
    // Navigate to Hierarchy Tool for this agent
    const url = `https://www.mywfg.com/Wfg.HierarchyTool/HierarchyDetails/LoadHierarchyToolMain?agentcodenumber=${agentCode}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for the page to load
    await new Promise(r => setTimeout(r, 2000));
    
    // Click on Associate Details tab
    const detailsClicked = await page.evaluate(() => {
      const link = document.querySelector('#AgentDetailsLink') as HTMLElement;
      if (link) {
        link.click();
        return true;
      }
      // Fallback to text search
      const links = Array.from(document.querySelectorAll('a'));
      for (const l of links) {
        const text = l.textContent?.trim().toUpperCase() || '';
        if (text === 'ASSOCIATE DETAILS' || text.includes('ASSOCIATE DETAILS')) {
          (l as HTMLElement).click();
          return true;
        }
      }
      return false;
    });
    
    if (detailsClicked) {
      // Wait longer for the tab content to load (AJAX content)
      await new Promise(r => setTimeout(r, 4000));
    }
    
    // Scroll down to ensure Recruiter field is loaded
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(r => setTimeout(r, 1000));
    
    // Extract the Recruiter name from the page
    const uplineData = await page.evaluate(() => {
      // Method 1: Look for the specific page structure with label:value pairs
      const pageText = document.body.innerText;
      
      // Use regex to find "Recruiter:" followed by a name
      const recruiterMatch = pageText.match(/Recruiter:\s*([A-Z][A-Za-z\s]+)/i);
      if (recruiterMatch && recruiterMatch[1]) {
        const name = recruiterMatch[1].trim();
        // Make sure it's not another label
        if (name.length > 2 && !name.includes(':') && !name.match(/^(Upline|SMD|CEO|Spouse)/i)) {
          return { name, code: null };
        }
      }
      
      // Method 2: Look for Recruiter in the lines
      const lines = pageText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line === 'Recruiter:') {
          // The recruiter name is on the next line
          const nextLine = lines[i + 1];
          if (nextLine && nextLine.length > 2 && !nextLine.includes(':') && !nextLine.match(/^(Upline|SMD|CEO|Spouse)/i)) {
            return { name: nextLine, code: null };
          }
        }
      }
      
      // Method 3: Look for table rows with Recruiter label
      const rows = Array.from(document.querySelectorAll('tr, div.row, div'));
      for (const row of rows) {
        const text = row.textContent || '';
        if (text.includes('Recruiter:')) {
          // Extract the value after Recruiter:
          const match = text.match(/Recruiter:\s*([A-Z][A-Za-z\s]+?)(?=Upline|Spouse|$)/i);
          if (match && match[1]) {
            const name = match[1].trim();
            if (name.length > 2) {
              return { name, code: null };
            }
          }
        }
      }
      
      return { name: null, code: null };
    });
    
    if (uplineData && uplineData.name) {
      // Clean up the name - remove 'Upline SMD', 'Upline CEO', newlines, etc.
      let cleanName = uplineData.name
        .replace(/\n/g, ' ')  // Replace newlines with spaces
        .replace(/Upline\s*(SMD|CEO|EVC|NSD|RVP)?/gi, '')  // Remove Upline labels
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .trim();
      
      console.log(`[Hierarchy Tool] Found recruiter for ${agentCode}: ${cleanName}`);
      return { uplineCode: null, uplineName: cleanName };
    }
    
    console.log(`[Hierarchy Tool] No recruiter found for ${agentCode} (root agent)`);
    return { uplineCode: null, uplineName: null };
    
  } catch (error) {
    console.error(`[Hierarchy Tool] Error fetching upline for ${agentCode}:`, error);
    return { uplineCode: null, uplineName: null };
  }
}

/**
 * Fetch upline information for multiple agents
 */
export async function fetchAgentUplines(
  page: Page,
  agentCodes: string[],
  onProgress?: (current: number, total: number, agentCode: string) => void
): Promise<Map<string, { uplineCode: string; uplineName: string | null }>> {
  const uplines = new Map<string, { uplineCode: string; uplineName: string | null }>();
  
  console.log(`[Upline Leaders] Fetching uplines for ${agentCodes.length} agents...`);
  
  for (let i = 0; i < agentCodes.length; i++) {
    const agentCode = agentCodes[i];
    
    if (onProgress) {
      onProgress(i + 1, agentCodes.length, agentCode);
    }
    
    const upline = await fetchAgentUpline(page, agentCode);
    // Store upline if we have either code or name
    if (upline.uplineCode || upline.uplineName) {
      uplines.set(agentCode, { uplineCode: upline.uplineCode || '', uplineName: upline.uplineName });
    }
    
    // Rate limiting: wait 1 second between requests
    if (i < agentCodes.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  console.log(`[Upline Leaders] Successfully fetched ${uplines.size} uplines out of ${agentCodes.length} agents`);
  
  return uplines;
}

/**
 * Fetch downline status with hierarchy (upline relationships)
 */
export async function fetchDownlineStatusWithHierarchy(agentId: string = '73DXR', teamType: 'BASE_SHOP' | 'SUPER_TEAM' = 'BASE_SHOP'): Promise<DownlineStatusResult & { uplines: Map<string, { uplineCode: string; uplineName: string | null }> }> {
  let browser: Browser | null = null;
  
  try {
    console.log('[Downline Scraper] Starting downline status extraction with hierarchy...');
    
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
    const result = await extractDownlineStatus(page, agentId, teamType);
    
    let uplines = new Map<string, { uplineCode: string; uplineName: string | null }>();
    
    if (result.success && result.agents.length > 0) {
      // Fetch uplines for all agents
      console.log('[Downline Scraper] Fetching hierarchy from Upline Leaders report...');
      const agentCodes = result.agents.map(a => a.agentCode);
      uplines = await fetchAgentUplines(page, agentCodes);
      
      console.log(`[Downline Scraper] Found uplines for ${uplines.size} agents`);
    }
    
    await browser.close();
    browser = null;
    
    return { ...result, uplines };
    
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
      uplines: new Map(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sync hierarchy (upline relationships) from MyWFG to database
 * Processes agents in batches with session refresh between batches
 */
export async function syncHierarchyFromMyWFG(db: any, schema: any, batchSize: number = 15): Promise<{
  success: boolean;
  updated: number;
  error?: string;
}> {
  
  try {
    console.log('[Hierarchy Sync] Starting hierarchy sync from MyWFG...');
    console.log(`[Hierarchy Sync] Using batch size: ${batchSize}`);
    
    // Get all agents from database
    const { eq, isNotNull } = await import('drizzle-orm');
    const allAgents = await db
      .select({
        id: schema.agents.id,
        agentCode: schema.agents.agentCode,
        firstName: schema.agents.firstName,
        lastName: schema.agents.lastName,
      })
      .from(schema.agents)
      .where(isNotNull(schema.agents.agentCode));
    
    if (allAgents.length === 0) {
      console.log('[Hierarchy Sync] No agents found in database');
      return { success: true, updated: 0 };
    }
    
    console.log(`[Hierarchy Sync] Found ${allAgents.length} agents in database`);
    
    // Create agent code to ID map and name to ID map
    const agentCodeToId = new Map<string, number>();
    const agentNameToId = new Map<string, number>();
    const agentNameToCode = new Map<string, string>();
    for (const agent of allAgents) {
      if (agent.agentCode) {
        agentCodeToId.set(agent.agentCode, agent.id);
      }
      // Create name-based lookup (normalize: uppercase, remove extra spaces)
      const fullName = `${agent.firstName || ''} ${agent.lastName || ''}`.trim().toUpperCase();
      const reverseName = `${agent.lastName || ''} ${agent.firstName || ''}`.trim().toUpperCase();
      const lastFirst = `${agent.lastName || ''}, ${agent.firstName || ''}`.trim().toUpperCase();
      if (fullName.length > 2) {
        agentNameToId.set(fullName, agent.id);
        agentNameToId.set(reverseName, agent.id);
        agentNameToId.set(lastFirst, agent.id);
        if (agent.agentCode) {
          agentNameToCode.set(fullName, agent.agentCode);
          agentNameToCode.set(reverseName, agent.agentCode);
          agentNameToCode.set(lastFirst, agent.agentCode);
        }
      }
    }
    
    // Get all agent codes and split into batches
    const agentCodes = allAgents.map((a: any) => a.agentCode).filter(Boolean);
    const batches: string[][] = [];
    for (let i = 0; i < agentCodes.length; i += batchSize) {
      batches.push(agentCodes.slice(i, i + batchSize));
    }
    
    console.log(`[Hierarchy Sync] Processing ${agentCodes.length} agents in ${batches.length} batches of ${batchSize}`);
    
    // Process each batch with a fresh browser session
    const allUplines = new Map<string, { uplineCode: string; uplineName: string | null }>();
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\n[Hierarchy Sync] ========== BATCH ${batchIndex + 1}/${batches.length} (${batch.length} agents) ==========`);
      
      let browser: Browser | null = null;
      
      try {
        // Launch fresh browser for this batch
        browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Login to MyWFG
        console.log(`[Hierarchy Sync] Batch ${batchIndex + 1}: Logging in to MyWFG...`);
        const loggedIn = await loginToMyWFG(page);
        if (!loggedIn) {
          console.error(`[Hierarchy Sync] Batch ${batchIndex + 1}: Login failed, skipping batch`);
          await browser.close();
          continue;
        }
        
        console.log(`[Hierarchy Sync] Batch ${batchIndex + 1}: Login successful, processing agents...`);
        
        // Fetch uplines for this batch
        const batchUplines = await fetchAgentUplines(page, batch, (current, total, code) => {
          const overallCurrent = batchIndex * batchSize + current;
          console.log(`[Hierarchy Sync] Processing ${overallCurrent}/${agentCodes.length}: ${code}`);
        });
        
        // Merge batch results into all uplines
        for (const [code, upline] of Array.from(batchUplines.entries())) {
          allUplines.set(code, upline);
        }
        
        console.log(`[Hierarchy Sync] Batch ${batchIndex + 1}: Found ${batchUplines.size} uplines`);
        
        // Close browser after batch
        await browser.close();
        browser = null;
        
        // Wait between batches to avoid rate limiting
        if (batchIndex < batches.length - 1) {
          console.log(`[Hierarchy Sync] Waiting 5 seconds before next batch...`);
          await new Promise(r => setTimeout(r, 5000));
        }
        
      } catch (batchError) {
        console.error(`[Hierarchy Sync] Batch ${batchIndex + 1} error:`, batchError);
        if (browser) {
          await browser.close();
        }
        // Continue with next batch even if this one fails
        continue;
      }
    }
    
    console.log(`\n[Hierarchy Sync] All batches complete. Found ${allUplines.size} total uplines.`);
    
    // Update database with upline relationships
    let updated = 0;
    for (const [agentCode, uplineData] of Array.from(allUplines.entries())) {
      const agentId = agentCodeToId.get(agentCode);
      
      // Try to find upline by code first, then by name
      let uplineAgentId: number | undefined;
      let uplineIdentifier = '';
      
      if (uplineData.uplineCode) {
        uplineAgentId = agentCodeToId.get(uplineData.uplineCode);
        uplineIdentifier = uplineData.uplineCode;
      }
      
      if (!uplineAgentId && uplineData.uplineName) {
        // Try to match by name (normalize: uppercase)
        const normalizedName = uplineData.uplineName.trim().toUpperCase();
        uplineAgentId = agentNameToId.get(normalizedName);
        uplineIdentifier = uplineData.uplineName;
        
        // Also try with "LASTNAME FIRSTNAME" format if not found
        if (!uplineAgentId) {
          // Try splitting and reversing
          const parts = normalizedName.split(/[\s,]+/).filter(p => p.length > 0);
          if (parts.length >= 2) {
            const reversed = parts.slice(1).join(' ') + ' ' + parts[0];
            uplineAgentId = agentNameToId.get(reversed);
          }
        }
      }
      
      if (agentId && uplineAgentId) {
        await db
          .update(schema.agents)
          .set({ uplineAgentId: uplineAgentId })
          .where(eq(schema.agents.id, agentId));
        updated++;
        console.log(`[Hierarchy Sync] Updated ${agentCode} -> upline: ${uplineIdentifier}`);
      } else if (agentId && uplineIdentifier) {
        console.log(`[Hierarchy Sync] Upline "${uplineIdentifier}" not found in database for ${agentCode}`);
      }
    }
    
    console.log(`[Hierarchy Sync] Sync complete: ${updated} agents updated with upline relationships`);
    
    return { success: true, updated };
    
  } catch (error) {
    console.error('[Hierarchy Sync] Error:', error);
    
    return {
      success: false,
      updated: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}


/**
 * Sync contact info (phone, email, address) from MyWFG for agents with missing data
 * Processes agents in batches with session refresh between batches
 */
export async function syncContactInfoFromMyWFG(db: any, schema: any, batchSize: number = 15): Promise<{
  success: boolean;
  updated: number;
  error?: string;
}> {
  
  try {
    console.log('[Contact Sync] Starting contact info sync from MyWFG...');
    console.log(`[Contact Sync] Using batch size: ${batchSize}`);
    
    // Get all agents with missing phone numbers
    const { isNull, or, eq } = await import('drizzle-orm');
    const allAgents = await db
      .select({
        id: schema.agents.id,
        agentCode: schema.agents.agentCode,
        firstName: schema.agents.firstName,
        lastName: schema.agents.lastName,
        phone: schema.agents.phone,
        email: schema.agents.email,
      })
      .from(schema.agents);
    
    // Filter to agents with missing phone
    const agentsWithMissingPhone = allAgents.filter((a: any) => 
      a.agentCode && (!a.phone || a.phone.trim() === '')
    );
    
    if (agentsWithMissingPhone.length === 0) {
      console.log('[Contact Sync] No agents with missing phone numbers');
      return { success: true, updated: 0 };
    }
    
    console.log(`[Contact Sync] Found ${agentsWithMissingPhone.length} agents with missing phone numbers`);
    
    // Split into batches
    const batches: any[][] = [];
    for (let i = 0; i < agentsWithMissingPhone.length; i += batchSize) {
      batches.push(agentsWithMissingPhone.slice(i, i + batchSize));
    }
    
    console.log(`[Contact Sync] Processing ${agentsWithMissingPhone.length} agents in ${batches.length} batches of ${batchSize}`);
    
    let totalUpdated = 0;
    
    // Process each batch with a fresh browser session
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\n[Contact Sync] ========== BATCH ${batchIndex + 1}/${batches.length} (${batch.length} agents) ==========`);
      
      let browser: Browser | null = null;
      
      try {
        // Launch fresh browser for this batch
        browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Login to MyWFG
        console.log(`[Contact Sync] Batch ${batchIndex + 1}: Logging in to MyWFG...`);
        const loggedIn = await loginToMyWFG(page);
        
        if (!loggedIn) {
          console.error(`[Contact Sync] Batch ${batchIndex + 1}: Login failed, skipping batch`);
          await browser.close();
          continue;
        }
        
        console.log(`[Contact Sync] Batch ${batchIndex + 1}: Login successful, fetching contact info...`);
        
        // Fetch contact info for each agent in this batch
        for (let i = 0; i < batch.length; i++) {
          const agent = batch[i];
          const overallIndex = batchIndex * batchSize + i + 1;
          
          console.log(`[${overallIndex}/${agentsWithMissingPhone.length}] Fetching contact for ${agent.firstName} ${agent.lastName} (${agent.agentCode})...`);
          
          try {
            const contactInfo = await fetchAgentContactInfo(page, agent.agentCode);
            
            // Update database if we found any contact info
            if (contactInfo.phone || contactInfo.email || contactInfo.homeAddress) {
              const updateData: any = {};
              if (contactInfo.phone) updateData.phone = contactInfo.phone;
              if (contactInfo.email && !agent.email) updateData.email = contactInfo.email;
              if (contactInfo.homeAddress) updateData.homeAddress = contactInfo.homeAddress;
              
              if (Object.keys(updateData).length > 0) {
                await db
                  .update(schema.agents)
                  .set(updateData)
                  .where(eq(schema.agents.id, agent.id));
                totalUpdated++;
                console.log(`  → Updated: phone=${contactInfo.phone || 'N/A'}, email=${contactInfo.email || 'N/A'}`);
              }
            } else {
              console.log(`  → No contact info found`);
            }
            
            // Rate limiting
            await new Promise(r => setTimeout(r, 500));
            
          } catch (agentError) {
            console.error(`  → Error: ${agentError}`);
          }
        }
        
        await browser.close();
        browser = null;
        
        console.log(`[Contact Sync] Batch ${batchIndex + 1} complete`);
        
        // Delay between batches
        if (batchIndex < batches.length - 1) {
          console.log(`[Contact Sync] Waiting 5 seconds before next batch...`);
          await new Promise(r => setTimeout(r, 5000));
        }
        
      } catch (batchError) {
        console.error(`[Contact Sync] Batch ${batchIndex + 1} error:`, batchError);
        if (browser) {
          await browser.close();
        }
        // Continue with next batch even if this one fails
        continue;
      }
    }
    
    console.log(`\n[Contact Sync] Sync complete: ${totalUpdated} agents updated with contact info`);
    
    return { success: true, updated: totalUpdated };
    
  } catch (error) {
    console.error('[Contact Sync] Error:', error);
    
    return {
      success: false,
      updated: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

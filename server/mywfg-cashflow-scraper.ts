import puppeteer, { Browser, Page } from 'puppeteer';
import { launchBrowser } from './lib/browser';
import { startOTPSession, waitForOTPWithSession, getMyWFGCredentials, clearUsedOTPs } from './gmail-otp-v2';

export interface AgentCashFlow {
  rank: number;
  name: string;
  code: string;
  titleLevel: string;
  totalCashFlow: number;
  uplineSMD: string;
  isNetLicensed: boolean; // >= $1,000
}

export interface CashFlowReportResult {
  success: boolean;
  error?: string;
  agents: AgentCashFlow[];
  lastUpdated: string;
  reportPeriod: string;
}

// Helper to require environment variables
function mustGetEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Get MyWFG login credentials from environment (fail fast if missing)
function getMyWFGLoginCredentials() {
  return {
    username: mustGetEnv('MYWFG_USERNAME'),
    password: mustGetEnv('MYWFG_PASSWORD'),
  };
}

// Parse currency string to number
function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[$,]/g, '')) || 0;
}

// Scrape Custom Reports Cash Flow YTD data
export async function scrapeMyWFGCashFlow(): Promise<CashFlowReportResult> {
  let browser: Browser | null = null;
  let page: Page;
  
  try {
    console.log('[MyWFG Scraper] Starting Cash Flow report extraction...');
    
    // Send email alert that credentials are being used
    try {
      const { alertCredentialsUsed } = await import('./email-alert');
      await alertCredentialsUsed('MyWFG');
    } catch (e) {
      console.error('[MyWFG Scraper] Failed to send credentials alert:', e);
    }
    
    // Launch browser
    ({ browser, page } = await launchBrowser());
    
    // Navigate to MyWFG login page
    console.log('[MyWFG Scraper] Navigating to login page...');
    await page.goto('https://www.mywfg.com/login', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Get credentials
    const credentials = getMyWFGLoginCredentials();
    if (!credentials.username || !credentials.password) {
      return { success: false, error: 'MyWFG credentials not configured', agents: [], lastUpdated: '', reportPeriod: '' };
    }
    
    // Fill in username
    console.log('[MyWFG Scraper] Entering username...');
    await page.waitForSelector('input[name="username"], input[type="text"], #AgentID', { timeout: 10000 });
    await page.type('input[name="username"], input[type="text"], #AgentID', credentials.username, { delay: 50 });
    
    // Fill in password
    console.log('[MyWFG Scraper] Entering password...');
    await page.type('input[name="password"], input[type="password"]', credentials.password, { delay: 50 });
    
    // Click login button
    console.log('[MyWFG Scraper] Clicking login button...');
    await page.click('button[type="submit"], input[type="submit"], .btn-login');
    
    // Wait for page to load after login
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // START OTP SESSION BEFORE CHECKING
    const gmailCreds = getMyWFGCredentials();
    const otpSessionId = startOTPSession('mywfg');
    
    // Check if OTP is required
    const pageContent = await page.content();
    const otpRequired = pageContent.toLowerCase().includes('verification') || 
                        pageContent.toLowerCase().includes('security code') ||
                        pageContent.toLowerCase().includes('one time') ||
                        pageContent.includes('mywfgOtppswd');
    
    if (otpRequired) {
      console.log('[MyWFG Scraper] OTP verification required, waiting for email (session-based, 180s timeout)...');
      
      // Wait for OTP using the session we started BEFORE login
      const otpResult = await waitForOTPWithSession(gmailCreds, otpSessionId, 180, 3);
      
      if (!otpResult.success || !otpResult.otp) {
        return { success: false, error: `Failed to get OTP: ${otpResult.error}`, agents: [], lastUpdated: '', reportPeriod: '' };
      }
      
      console.log(`[MyWFG Scraper] OTP received: ${otpResult.otp}`);
      const otpToEnter = otpResult.otp.length > 6 ? otpResult.otp.slice(-6) : otpResult.otp;
      
      // Enter OTP
      const otpInput = await page.$('input[id="mywfgOtppswd"]') || 
                       await page.$('input[name="SecurityCode"]') || 
                       await page.$('input[type="text"]');
      if (otpInput) {
        await otpInput.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        await otpInput.type(otpToEnter, { delay: 50 });
      }
      
      // Submit OTP
      await page.click('button[type="submit"], input[type="submit"]');
      
      // Wait for successful login
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Navigate to MY BUSINESS
    console.log('[MyWFG Scraper] Navigating to MY BUSINESS...');
    await page.goto('https://www.mywfg.com/my-business', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Navigate to Custom Reports
    console.log('[MyWFG Scraper] Navigating to Custom Reports...');
    await page.goto('https://www.mywfg.com/reports-Custom?AgentID=' + credentials.username, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for report to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Set report parameters for YTD Cash Flow
    // Change TOP to 1000 to get all agents
    const topDropdown = await page.$('#Top, select[name="Top"]');
    if (topDropdown) {
      await page.select('#Top, select[name="Top"]', '1000');
    }
    
    // Set report type to Cash Flow
    const totalDropdown = await page.$('#Total, select[name="Total"]');
    if (totalDropdown) {
      await page.select('#Total, select[name="Total"]', 'Cash Flow');
    }
    
    // Set FROM to January of current year
    const currentYear = new Date().getFullYear();
    const fromDropdown = await page.$('#From, select[name="From"]');
    if (fromDropdown) {
      await page.select('#From, select[name="From"]', `January ${currentYear}`);
    }
    
    // Click Generate Report
    console.log('[MyWFG Scraper] Generating report...');
    await page.click('#prepareReportButton, button:has-text("Generate Report")');
    
    // Wait for report to generate
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Extract data from the report table
    console.log('[MyWFG Scraper] Extracting report data...');
    
    const agents: AgentCashFlow[] = await page.evaluate(() => {
      const results: AgentCashFlow[] = [];
      
      // Find all table rows in the report
      const rows = document.querySelectorAll('table tr, .report-row');
      
      rows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 5) {
          const rank = parseInt(cells[0]?.textContent?.trim() || '0');
          const name = cells[1]?.textContent?.trim() || '';
          const code = cells[2]?.textContent?.trim() || '';
          const titleLevel = cells[3]?.textContent?.trim() || '';
          const cashFlowStr = cells[4]?.textContent?.trim() || '$0';
          const uplineSMD = cells[5]?.textContent?.trim() || '';
          
          // Parse cash flow amount
          const totalCashFlow = parseFloat(cashFlowStr.replace(/[$,]/g, '')) || 0;
          
          if (rank > 0 && name) {
            results.push({
              rank,
              name,
              code,
              titleLevel,
              totalCashFlow,
              uplineSMD,
              isNetLicensed: totalCashFlow >= 1000
            });
          }
        }
      });
      
      return results;
    });
    
    // Get last updated date
    const lastUpdated = await page.evaluate(() => {
      const dateElement = document.querySelector('.last-updated, [class*="updated"]');
      return dateElement?.textContent?.trim() || new Date().toISOString().split('T')[0];
    });
    
    console.log(`[MyWFG Scraper] Extracted ${agents.length} agents`);
    
    // Send email alert with results
    try {
      const { sendEmailAlert } = await import('./email-alert');
      const netLicensedCount = agents.filter(a => a.isNetLicensed).length;
      await sendEmailAlert({
        subject: 'MyWFG Cash Flow Sync Complete',
        message: `Successfully extracted Cash Flow data for ${agents.length} agents.\n\nNet Licensed Agents (>=$1,000): ${netLicensedCount}`
      });
    } catch (e) {
      console.error('[MyWFG Scraper] Failed to send completion alert:', e);
    }
    
    return {
      success: true,
      agents,
      lastUpdated,
      reportPeriod: `January ${currentYear} - December ${currentYear}`
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MyWFG Scraper] Scraping failed:', errorMessage);
    return { success: false, error: errorMessage, agents: [], lastUpdated: '', reportPeriod: '' };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Hardcoded data for when scraping is not available (e.g., in Manus environment)
export function getHardcodedCashFlowData(): CashFlowReportResult {
  const agents: AgentCashFlow[] = [
    // Note: SMD (Senior Marketing Director) and above are excluded from Net Licensed count
    // Only TA (Training Associate) and A (Associate) with $1,000+ qualify as Net Licensed
    { rank: 1, name: 'Zaid Shopeju', code: '73DXR', titleLevel: 'SMD', totalCashFlow: 189931.39, uplineSMD: 'Adewale Adeleke', isNetLicensed: false }, // SMD - excluded
    { rank: 2, name: 'Augustina Armstrong-Ogbonna', code: 'D0T7M', titleLevel: 'SMD', totalCashFlow: 57655.48, uplineSMD: 'Zaid Shopeju', isNetLicensed: false }, // SMD - excluded
    { rank: 3, name: 'Chinonyerem Nkemere', code: 'E0D89', titleLevel: 'A', totalCashFlow: 15071.31, uplineSMD: 'Augustina Armstrong-Ogbonna', isNetLicensed: true }, // A with $1,000+ = Net Licensed
    { rank: 4, name: 'Oluwatosin Adetona', code: 'C9U9S', titleLevel: 'A', totalCashFlow: 6488.12, uplineSMD: 'Zaid Shopeju', isNetLicensed: true }, // A with $1,000+ = Net Licensed
    { rank: 5, name: 'Nonso Humphrey', code: 'D6W3S', titleLevel: 'A', totalCashFlow: 4993.62, uplineSMD: 'Zaid Shopeju', isNetLicensed: true }, // A with $1,000+ = Net Licensed
    { rank: 6, name: 'Odion Imasuen', code: 'D3Y16', titleLevel: 'A', totalCashFlow: 3361.35, uplineSMD: 'Zaid Shopeju', isNetLicensed: true }, // A with $1,000+ = Net Licensed
    { rank: 7, name: 'Francis Ogunlolu', code: '49AEA', titleLevel: 'A', totalCashFlow: 1802.15, uplineSMD: 'Zaid Shopeju', isNetLicensed: true }, // A with $1,000+ = Net Licensed
    { rank: 8, name: 'Renata Jeroe', code: 'D3Z8L', titleLevel: 'A', totalCashFlow: 1245.17, uplineSMD: 'Augustina Armstrong-Ogbonna', isNetLicensed: true }, // A with $1,000+ = Net Licensed
    { rank: 9, name: 'Mercy Okonofua', code: 'C9F3Z', titleLevel: 'A', totalCashFlow: 755.76, uplineSMD: 'Zaid Shopeju', isNetLicensed: false }, // Under $1,000
    { rank: 10, name: 'Ese Moses', code: 'D3U63', titleLevel: 'TA', totalCashFlow: 155.96, uplineSMD: 'Zaid Shopeju', isNetLicensed: false },
    { rank: 11, name: 'Clive Henry', code: '42EBU', titleLevel: 'A', totalCashFlow: 9.84, uplineSMD: 'Zaid Shopeju', isNetLicensed: false },
    { rank: 12, name: 'Folashade Olaiya', code: '16CKG', titleLevel: 'A', totalCashFlow: 0.64, uplineSMD: 'Zaid Shopeju', isNetLicensed: false },
  ];
  
  return {
    success: true,
    agents,
    lastUpdated: '2025-12-30',
    reportPeriod: 'January 2025 - December 2025'
  };
}

// Get Net Licensed agents (those with >= $1,000 cash flow AND title level TA or A)
// Excludes SA (Senior Associate) and above
export function getNetLicensedAgents(data: CashFlowReportResult): AgentCashFlow[] {
  return data.agents.filter(agent => agent.isNetLicensed);
}

// Helper to check if title level qualifies for Net Licensed tracking
export function isEligibleForNetLicensed(titleLevel: string): boolean {
  const eligibleTitles = ['TA', 'A']; // Training Associate and Associate only
  return eligibleTitles.includes(titleLevel.toUpperCase());
}

// Calculate Net Licensed status based on cash flow and title
export function calculateNetLicensedStatus(totalCashFlow: number, titleLevel: string): boolean {
  return totalCashFlow >= 1000 && isEligibleForNetLicensed(titleLevel);
}

// Get agents not yet Net Licensed
export function getNotNetLicensedAgents(data: CashFlowReportResult): AgentCashFlow[] {
  return data.agents.filter(agent => !agent.isNetLicensed);
}

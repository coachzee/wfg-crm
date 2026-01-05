/**
 * Test script for MyWFG Downline Status Scraper
 * 
 * This script tests the automated fetching of agent data from MyWFG.
 */

import puppeteer from 'puppeteer';
import { waitForOTP } from '../server/gmail-otp.js';

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
const TITLE_LEVEL_TO_RANK = {
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

async function loginToMyWFG(page) {
  const creds = getMyWFGLoginCredentials();
  
  console.log('[Downline Scraper] Navigating to MyWFG...');
  await page.goto('https://www.mywfg.com', { waitUntil: 'networkidle2', timeout: 60000 });
  
  // Wait for login form
  await page.waitForSelector('input[id="myWfgUsernameDisplay"], input[name="username"]', { timeout: 30000 });
  console.log('[Downline Scraper] Found login form');
  
  // Find and fill username
  const usernameInput = await page.$('input[id="myWfgUsernameDisplay"]') || await page.$('input[name="username"]');
  if (!usernameInput) throw new Error('Username input not found');
  
  await usernameInput.click({ clickCount: 3 });
  await usernameInput.type(creds.username);
  console.log('[Downline Scraper] Entered username');
  
  // Find and fill password
  const passwordInput = await page.$('input[id="myWfgPasswordDisplay"]') || await page.$('input[name="password"]');
  if (!passwordInput) throw new Error('Password input not found');
  
  await passwordInput.click({ clickCount: 3 });
  await passwordInput.type(creds.password);
  console.log('[Downline Scraper] Entered password');
  
  // Click login button
  const loginButton = await page.$('button[id="mywfgTheyLive"]') || await page.$('button[type="submit"]');
  if (loginButton) {
    await Promise.all([
      loginButton.click(),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {}),
    ]);
    console.log('[Downline Scraper] Clicked login button');
  }
  
  await new Promise(r => setTimeout(r, 5000));
  
  // Check for OTP requirement
  const pageContent = await page.content();
  const pageText = await page.evaluate(() => document.body.innerText);
  
  // Check for error page
  if (pageText.includes('ERROR OCCURRED') || pageText.includes('Bad Request')) {
    console.log('[Downline Scraper] Error page detected, waiting before retry...');
    // Take screenshot for debugging
    await page.screenshot({ path: '/tmp/mywfg-error-page.png' });
    
    // Wait longer before retry
    await new Promise(r => setTimeout(r, 5000));
    
    // Clear cookies and retry
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    
    await page.goto('https://www.mywfg.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));
    
    // Check if we're on the login page now
    const newPageContent = await page.content();
    if (!newPageContent.includes('myWfgUsernameDisplay') && !newPageContent.includes('username')) {
      console.log('[Downline Scraper] Still not on login page, taking screenshot...');
      await page.screenshot({ path: '/tmp/mywfg-retry-page.png' });
      throw new Error('Could not reach login page after error');
    }
    
    // Don't recurse - just continue with the login flow
    console.log('[Downline Scraper] Retry successful, continuing login...');
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
      console.log('[Downline Scraper] Entered OTP');
      
      // Submit OTP
      const submitBtn = await page.$('button[id="mywfgTheylive"]') || await page.$('button[type="submit"]');
      if (submitBtn) {
        await Promise.all([
          submitBtn.click(),
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {}),
        ]);
        console.log('[Downline Scraper] Submitted OTP');
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

async function extractDownlineStatus(page, agentId) {
  const reportUrl = `https://www.mywfg.com/reports-downline-status?AgentID=${agentId}`;
  
  console.log(`[Downline Scraper] Navigating to Downline Status report...`);
  await page.goto(reportUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  
  await new Promise(r => setTimeout(r, 5000));
  
  // Take a screenshot for debugging
  await page.screenshot({ path: '/tmp/downline-report.png', fullPage: true });
  console.log('[Downline Scraper] Screenshot saved to /tmp/downline-report.png');
  
  // Click "Generate Report" button if present
  const generateBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('input[type="button"], button'));
    return buttons.find(el => el.textContent?.includes('Generate Report') || el.value?.includes('Generate Report'));
  });
  
  if (generateBtn) {
    try {
      await generateBtn.click();
      console.log('[Downline Scraper] Clicked Generate Report button');
      await new Promise(r => setTimeout(r, 8000));
      await page.screenshot({ path: '/tmp/downline-report-after-generate.png', fullPage: true });
    } catch (e) {
      console.log('[Downline Scraper] No Generate Report button found or click failed');
    }
  }
  
  // Extract report data from the page
  const reportData = await page.evaluate(() => {
    const result = {
      runDate: '',
      reportInfo: '',
      agents: [],
    };
    
    // Try to find report header info
    const headerText = document.body.innerText;
    const runDateMatch = headerText.match(/Run Date and Time:\s*([^\n]+)/);
    if (runDateMatch) {
      result.runDate = runDateMatch[1].trim();
    }
    
    // Try to find report info line
    const infoMatch = headerText.match(/Shopeju,\s*Zaid[^\n]+/);
    if (infoMatch) {
      result.reportInfo = infoMatch[0].trim();
    }
    
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
          
          result.agents.push({
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
    
    return result;
  });
  
  console.log(`[Downline Scraper] Found ${reportData.agents.length} agents in table`);
  
  // If no agents found in table, try parsing from text content
  if (reportData.agents.length === 0) {
    console.log('[Downline Scraper] No table data found, trying text parsing...');
    
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('[Downline Scraper] Page text sample:', pageText.substring(0, 500));
    
    // Save full page text for debugging
    const fs = await import('fs');
    fs.writeFileSync('/tmp/downline-page-text.txt', pageText);
    console.log('[Downline Scraper] Full page text saved to /tmp/downline-page-text.txt');
  }
  
  // Map title levels to WFG ranks
  const agents = reportData.agents.map(agent => ({
    ...agent,
    wfgRank: TITLE_LEVEL_TO_RANK[agent.titleLevel] || 'TRAINING_ASSOCIATE',
    isLifeLicensed: agent.llFlag === true || agent.llFlag === 'Yes' || agent.llFlag === 'yes',
  }));
  
  return {
    success: agents.length > 0,
    agents,
    runDate: reportData.runDate,
    reportInfo: reportData.reportInfo,
  };
}

async function main() {
  console.log('=== MyWFG Downline Status Scraper Test ===\n');
  
  // Validate credentials
  const creds = getMyWFGLoginCredentials();
  if (!creds.username || !creds.password) {
    console.error('Error: MYWFG_USERNAME and MYWFG_PASSWORD must be set');
    process.exit(1);
  }
  
  const gmailCreds = getGmailCredentials();
  if (!gmailCreds.email || !gmailCreds.appPassword) {
    console.error('Error: MYWFG_EMAIL and MYWFG_APP_PASSWORD must be set');
    process.exit(1);
  }
  
  console.log(`MyWFG Username: ${creds.username}`);
  console.log(`Gmail for OTP: ${gmailCreds.email}\n`);
  
  let browser = null;
  
  try {
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
    const result = await extractDownlineStatus(page, '73DXR');
    
    console.log('\n=== Results ===');
    console.log(`Run Date: ${result.runDate}`);
    console.log(`Report Info: ${result.reportInfo}`);
    console.log(`Total Agents: ${result.agents.length}`);
    
    if (result.agents.length > 0) {
      console.log('\nAgent List:');
      for (const agent of result.agents) {
        console.log(`  ${agent.firstName} ${agent.lastName} (${agent.agentCode}) - ${agent.wfgRank} - Licensed: ${agent.isLifeLicensed}`);
      }
    }
    
    await browser.close();
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('Error:', error);
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
}

main();

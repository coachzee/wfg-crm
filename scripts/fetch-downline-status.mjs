/**
 * Fetch Downline Status from MyWFG
 * Based on the working contact extraction pattern
 */

import puppeteer from 'puppeteer';
import { waitForOTP } from '../server/gmail-otp.js';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq } from 'drizzle-orm';
import * as schema from '../drizzle/schema.js';

// Get credentials
function getMyWFGLoginCredentials() {
  return {
    username: process.env.MYWFG_USERNAME || '',
    password: process.env.MYWFG_PASSWORD || '',
  };
}

function getGmailCredentials() {
  return {
    email: process.env.MYWFG_EMAIL || '',
    appPassword: process.env.MYWFG_APP_PASSWORD || '',
  };
}

// Title Level to WFG Rank mapping
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
  
  console.log('[Downline] Navigating to MyWFG...');
  await page.goto('https://www.mywfg.com', { waitUntil: 'networkidle0', timeout: 60000 });
  
  // Wait for login form with longer timeout
  try {
    await page.waitForSelector('input[id="myWfgUsernameDisplay"]', { timeout: 15000 });
  } catch (e) {
    // Try alternative selector
    await page.waitForSelector('input[name="username"]', { timeout: 15000 });
  }
  
  console.log('[Downline] Found login form, entering credentials...');
  
  // Enter username
  const usernameInput = await page.$('input[id="myWfgUsernameDisplay"]') || await page.$('input[name="username"]');
  await usernameInput.click({ clickCount: 3 });
  await usernameInput.type(creds.username, { delay: 50 });
  
  // Enter password
  const passwordInput = await page.$('input[id="myWfgPasswordDisplay"]') || await page.$('input[name="password"]');
  await passwordInput.click({ clickCount: 3 });
  await passwordInput.type(creds.password, { delay: 50 });
  
  console.log('[Downline] Clicking login...');
  
  // Click login
  const loginButton = await page.$('button[id="mywfgTheyLive"]') || await page.$('button[type="submit"]');
  if (loginButton) {
    await loginButton.click();
  }
  
  // Wait for navigation
  await new Promise(r => setTimeout(r, 8000));
  
  // Check page state
  const pageText = await page.evaluate(() => document.body.innerText);
  const pageContent = await page.content();
  
  // Check for OTP
  const otpRequired = pageContent.includes('mywfgOtppswd') || 
                      pageText.includes('One-Time Password') ||
                      pageText.includes('Validation Code');
  
  if (otpRequired) {
    console.log('[Downline] OTP required, waiting for email...');
    
    const gmailCreds = getGmailCredentials();
    const otpResult = await waitForOTP(gmailCreds, 'transamerica', 60, 3);
    
    if (!otpResult.success || !otpResult.otp) {
      throw new Error(`Failed to get OTP: ${otpResult.error}`);
    }
    
    console.log(`[Downline] ✓ OTP received: ${otpResult.otp}`);
    
    // Enter OTP
    const otpInput = await page.$('input[id="mywfgOtppswd"]');
    if (otpInput) {
      await otpInput.click({ clickCount: 3 });
      await otpInput.type(otpResult.otp, { delay: 50 });
      
      // Submit
      const submitBtn = await page.$('button[id="mywfgTheylive"]');
      if (submitBtn) {
        await submitBtn.click();
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }
  
  console.log('[Downline] ✓ Login successful');
  return true;
}

async function fetchDownlineReport(page, agentId) {
  const reportUrl = `https://www.mywfg.com/reports-downline-status?AgentID=${agentId}`;
  
  console.log('[Downline] Navigating to Downline Status report...');
  await page.goto(reportUrl, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(r => setTimeout(r, 5000));
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/downline-initial.png', fullPage: true });
  console.log('[Downline] Screenshot saved: /tmp/downline-initial.png');
  
  // Try to click Generate Report button
  try {
    const generateBtn = await page.evaluateHandle(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="button"], input[type="submit"]'));
      return inputs.find(el => el.value && el.value.includes('Generate'));
    });
    
    if (generateBtn) {
      await generateBtn.click();
      console.log('[Downline] Clicked Generate Report');
      await new Promise(r => setTimeout(r, 10000));
      await page.screenshot({ path: '/tmp/downline-after-generate.png', fullPage: true });
    }
  } catch (e) {
    console.log('[Downline] Generate button not found or click failed');
  }
  
  // Extract data from the report viewer
  const agents = await page.evaluate(() => {
    const result = [];
    
    // Look for report viewer content
    const reportContent = document.body.innerText;
    const lines = reportContent.split('\n');
    
    // Find lines that look like agent data
    // Format: FirstName LastName BulletinName AgentCode TitleLevel CommLevel LLFlag LLEndDate ...
    for (const line of lines) {
      // Skip empty lines and headers
      if (!line.trim() || line.includes('First_Name') || line.includes('Run Date')) continue;
      
      // Try to match agent code pattern (5 alphanumeric characters)
      const agentCodeMatch = line.match(/\b([A-Z0-9]{5})\b/);
      if (!agentCodeMatch) continue;
      
      // Try to parse the line
      const parts = line.split(/\s{2,}|\t/).filter(p => p.trim());
      if (parts.length >= 7) {
        const firstName = parts[0]?.trim();
        const lastName = parts[1]?.trim();
        const agentCode = agentCodeMatch[1];
        
        // Find title level (usually 01, 10, 17, 20, etc.)
        const titleMatch = line.match(/\b(01|10|15|17|20|65|75|87|90|95|99)\b/);
        const titleLevel = titleMatch ? titleMatch[1] : '01';
        
        // Check for Yes/No for LL Flag
        const llFlag = line.toLowerCase().includes('yes');
        
        // Find date pattern for LL End Date
        const dateMatch = line.match(/(\d{2}-\d{2}-\d{4})/);
        const llEndDate = dateMatch ? dateMatch[1] : null;
        
        if (firstName && lastName && agentCode && !firstName.includes('First')) {
          result.push({
            firstName,
            lastName,
            agentCode,
            titleLevel,
            llFlag,
            llEndDate,
          });
        }
      }
    }
    
    return result;
  });
  
  console.log(`[Downline] Extracted ${agents.length} agents from report`);
  
  // If no agents found, try alternative extraction
  if (agents.length === 0) {
    console.log('[Downline] Trying alternative extraction method...');
    
    // Save page content for debugging
    const pageText = await page.evaluate(() => document.body.innerText);
    const fs = await import('fs');
    fs.writeFileSync('/tmp/downline-page-content.txt', pageText);
    console.log('[Downline] Page content saved to /tmp/downline-page-content.txt');
    
    // Try to find iframe content
    const frames = page.frames();
    for (const frame of frames) {
      try {
        const frameContent = await frame.evaluate(() => document.body.innerText);
        if (frameContent.includes('Agent_ID') || frameContent.includes('Title_Level')) {
          console.log('[Downline] Found report data in iframe');
          fs.writeFileSync('/tmp/downline-iframe-content.txt', frameContent);
        }
      } catch (e) {
        // Frame not accessible
      }
    }
  }
  
  return agents.map(agent => ({
    ...agent,
    wfgRank: TITLE_LEVEL_TO_RANK[agent.titleLevel] || 'TRAINING_ASSOCIATE',
    isLifeLicensed: agent.llFlag,
  }));
}

async function updateDatabase(agents) {
  console.log('[Database] Connecting...');
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection, { schema, mode: 'default' });
  
  let updated = 0;
  let added = 0;
  
  for (const agent of agents) {
    // Check if agent exists
    const existing = await db.select()
      .from(schema.agents)
      .where(eq(schema.agents.agentCode, agent.agentCode))
      .limit(1);
    
    if (existing.length > 0) {
      // Update existing agent
      await db.update(schema.agents)
        .set({
          firstName: agent.firstName,
          lastName: agent.lastName,
          currentRank: agent.wfgRank,
          isLifeLicensed: agent.isLifeLicensed,
          currentStage: agent.isLifeLicensed ? 'LICENSED' : 'EXAM_PREP',
        })
        .where(eq(schema.agents.agentCode, agent.agentCode));
      console.log(`  ✓ Updated: ${agent.firstName} ${agent.lastName} (${agent.agentCode}) -> ${agent.wfgRank}`);
      updated++;
    } else {
      // Insert new agent
      await db.insert(schema.agents).values({
        firstName: agent.firstName,
        lastName: agent.lastName,
        agentCode: agent.agentCode,
        currentRank: agent.wfgRank,
        isLifeLicensed: agent.isLifeLicensed,
        currentStage: agent.isLifeLicensed ? 'LICENSED' : 'EXAM_PREP',
      });
      console.log(`  ✓ Added: ${agent.firstName} ${agent.lastName} (${agent.agentCode}) -> ${agent.wfgRank}`);
      added++;
    }
  }
  
  await connection.end();
  return { updated, added };
}

async function main() {
  console.log('=== MyWFG Downline Status Sync ===\n');
  
  let browser = null;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    
    const page = await browser.newPage();
    
    // Set realistic user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Add extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });
    
    // Login
    await loginToMyWFG(page);
    
    // Fetch downline report
    const agents = await fetchDownlineReport(page, '73DXR');
    
    await browser.close();
    browser = null;
    
    if (agents.length > 0) {
      console.log(`\n[Downline] Found ${agents.length} agents, updating database...`);
      const result = await updateDatabase(agents);
      console.log(`\n✓ Sync complete: ${result.added} added, ${result.updated} updated`);
    } else {
      console.log('\n⚠ No agents extracted from report');
      console.log('Check /tmp/downline-*.png and /tmp/downline-*.txt for debugging');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (browser) await browser.close();
    process.exit(1);
  }
}

main();

/**
 * Comprehensive MyWFG Agent Data Sync
 * 
 * Fetches both contact information and downline status in a single session.
 * Uses the proven login flow from the working contact scraper.
 */

import puppeteer from 'puppeteer';
import { waitForOTP, getMyWFGCredentials } from '../server/gmail-otp.ts';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq } from 'drizzle-orm';
import * as schema from '../drizzle/schema.js';

// Helper to require environment variables
function mustGetEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    console.error(`❌ Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const credentials = {
  username: mustGetEnv('MYWFG_USERNAME'),
  password: mustGetEnv('MYWFG_PASSWORD'),
};

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
  console.log('[Sync] Navigating to MyWFG...');
  
  // Set user agent first
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  try {
    await page.goto('https://www.mywfg.com', { 
      waitUntil: 'networkidle0',
      timeout: 45000 
    });
  } catch (e) {
    console.log('[Sync] Navigation timeout, continuing...');
  }
  
  await new Promise(r => setTimeout(r, 5000));

  // Wait for login form
  console.log('[Sync] Waiting for login form...');
  const usernameSelectors = [
    'input[id="myWfgUsernameDisplay"]',
    'input[name="username"]',
    'input[placeholder*="User"]',
  ];
  
  let usernameInput = null;
  for (const selector of usernameSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      usernameInput = await page.$(selector);
      if (usernameInput) {
        console.log(`[Sync] Found username input: ${selector}`);
        break;
      }
    } catch (e) {
      // Try next selector
    }
  }
  
  if (!usernameInput) {
    await page.screenshot({ path: '/tmp/sync-login-debug.png', fullPage: true });
    throw new Error('Could not find username input field');
  }

  // Enter credentials
  console.log('[Sync] Entering credentials...');
  await usernameInput.type(credentials.username, { delay: 100 });
  
  const passwordInput = await page.$('input[id="myWfgPassword"]') ||
                        await page.$('input[type="password"]') ||
                        await page.$('input[name="password"]');
  if (passwordInput) {
    await passwordInput.type(credentials.password, { delay: 100 });
  }

  await new Promise(r => setTimeout(r, 500));

  // Click login button - use the correct MyWFG button ID
  console.log('[Sync] Clicking login...');
  
  // Try clicking the button using page.click which is more reliable
  try {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
      page.click('button#mywfgTheyLive').catch(() => 
        page.click('button[type="submit"]').catch(() =>
          page.click('input[type="submit"]')
        )
      )
    ]);
  } catch (e) {
    console.log('[Sync] Click failed, trying evaluate click...');
    await page.evaluate(() => {
      const btn = document.querySelector('button#mywfgTheyLive') || 
                  document.querySelector('button[type="submit"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 8000));
  }
  
  await new Promise(r => setTimeout(r, 5000));
  
  // Check if OTP is required
  const pageContent = await page.content();
  const pageText = await page.evaluate(() => document.body.innerText);
  const otpRequired = pageContent.includes('mywfgOtppswd') || 
                      pageText.includes('One-Time Password') ||
                      pageText.includes('Validation Code');
  
  if (otpRequired) {
    console.log('[Sync] OTP required, waiting for email...');
    
    const gmailCreds = getMyWFGCredentials();
    const otpResult = await waitForOTP(gmailCreds, 'transamerica', 60, 3);
    
    if (!otpResult.success || !otpResult.otp) {
      throw new Error(`Failed to get OTP: ${otpResult.error}`);
    }
    
    console.log(`[Sync] ✓ OTP received: ${otpResult.otp}`);
    
    // Enter OTP
    const otpInput = await page.$('input[id="mywfgOtppswd"]');
    if (otpInput) {
      await otpInput.type(otpResult.otp, { delay: 100 });
      
      const submitBtn = await page.$('button[id="mywfgTheylive"]') || 
                        await page.$('button[type="submit"]');
      if (submitBtn) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
          submitBtn.click()
        ]);
      }
      
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  console.log('[Sync] ✓ Login successful');
  return true;
}

async function handleOTPIfPresent(page) {
  const pageContent = await page.content();
  const pageText = await page.evaluate(() => document.body.innerText);
  
  const otpRequired = pageContent.includes('SECURITY VALIDATION CODE') || 
                      pageText.includes('ONE TIME SECURITY VALIDATION CODE') ||
                      pageText.includes('Validation code expires');
  
  if (otpRequired) {
    console.log('[Sync] OTP page detected, waiting for email...');
    
    const gmailCreds = getMyWFGCredentials();
    const otpResult = await waitForOTP(gmailCreds, 'transamerica', 60, 3);
    
    if (!otpResult.success || !otpResult.otp) {
      throw new Error(`Failed to get OTP: ${otpResult.error}`);
    }
    
    console.log(`[Sync] ✓ OTP received: ${otpResult.otp}`);
    
    // Find and fill the OTP input (it's the input after the "5706 -" prefix)
    const otpInput = await page.$('input[type="text"]') || 
                     await page.$('input[type="password"]') ||
                     await page.$('input[name="SecurityCode"]');
    
    if (otpInput) {
      await otpInput.click({ clickCount: 3 });
      await otpInput.type(otpResult.otp, { delay: 100 });
      
      // Click Submit button
      const submitBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(b => b.textContent.includes('Submit'));
      });
      
      if (submitBtn) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
          submitBtn.click()
        ]);
      }
      
      await new Promise(r => setTimeout(r, 5000));
      console.log('[Sync] ✓ OTP submitted');
      return true;
    }
  }
  return false;
}

async function fetchDownlineStatus(page, agentId) {
  console.log('[Sync] Fetching Downline Status report...');
  
  const reportUrl = `https://www.mywfg.com/reports-downline-status?AgentID=${agentId}`;
  
  try {
    await page.goto(reportUrl, { waitUntil: 'networkidle0', timeout: 60000 });
  } catch (e) {
    console.log('[Sync] Navigation timeout, continuing...');
  }
  
  await new Promise(r => setTimeout(r, 5000));
  
  // Check if OTP page appeared during navigation
  const otpHandled = await handleOTPIfPresent(page);
  if (otpHandled) {
    // Navigate to report again after OTP
    try {
      await page.goto(reportUrl, { waitUntil: 'networkidle0', timeout: 60000 });
    } catch (e) {
      console.log('[Sync] Navigation timeout after OTP, continuing...');
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  
  await page.screenshot({ path: '/tmp/sync-downline-initial.png', fullPage: true });
  console.log('[Sync] Screenshot saved: /tmp/sync-downline-initial.png');
  
  // Configure report filters
  console.log('[Sync] Configuring report filters...');
  
  // The dropdowns are custom multi-select components, need to handle them specially
  // Based on screenshot: TITLE LEVEL = "TA, A, SA, MD, SMD", TEAM = "Super Base(Base - 1st)", TYPE = "Active"
  
  // Try to configure via page evaluation
  await page.evaluate(() => {
    // Find all select elements
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
      const label = select.closest('.form-group')?.querySelector('label')?.textContent || '';
      const options = Array.from(select.options);
      
      // TEAM dropdown - select "Super Base(Base - 1st)"
      if (label.includes('TEAM') || select.id?.includes('team')) {
        const superBaseOpt = options.find(o => o.text.includes('Super Base') || o.text.includes('Base - 1st'));
        if (superBaseOpt) select.value = superBaseOpt.value;
      }
      
      // TYPE dropdown - select "Active"
      if (label.includes('TYPE') || select.id?.includes('type')) {
        const activeOpt = options.find(o => o.text.includes('Active'));
        if (activeOpt) select.value = activeOpt.value;
      }
    });
  });
  
  console.log('[Sync] Filters configured');
  await new Promise(r => setTimeout(r, 1000));
  
  // Click Generate Report button
  console.log('[Sync] Clicking Generate Report...');
  try {
    // Try multiple methods to find and click the button
    const clicked = await page.evaluate(() => {
      // Method 1: Find by text content
      const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
      const genBtn = buttons.find(b => {
        const text = b.textContent || b.value || '';
        return text.includes('Generate Report');
      });
      if (genBtn) {
        genBtn.click();
        return true;
      }
      
      // Method 2: Find by class or ID
      const btn2 = document.querySelector('.btn-primary, #generateReport, [onclick*="Generate"]');
      if (btn2) {
        btn2.click();
        return true;
      }
      
      return false;
    });
    
    if (clicked) {
      console.log('[Sync] Clicked Generate Report button');
      // Wait for report to load
      await new Promise(r => setTimeout(r, 15000));
      await page.screenshot({ path: '/tmp/sync-downline-generated.png', fullPage: true });
      console.log('[Sync] Screenshot after generate: /tmp/sync-downline-generated.png');
    } else {
      // Try clicking by selector
      await page.click('button:has-text("Generate Report")').catch(() => {});
      await page.click('input[value="Generate Report"]').catch(() => {});
      await new Promise(r => setTimeout(r, 15000));
    }
  } catch (e) {
    console.log('[Sync] Generate button click failed:', e.message);
  }
  
  // The report is rendered in an iframe - need to access it
  console.log('[Sync] Looking for report iframe...');
  
  let agents = [];
  
  // Try to find and switch to iframe
  const frames = page.frames();
  console.log(`[Sync] Found ${frames.length} frames`);
  
  for (const frame of frames) {
    try {
      const frameContent = await frame.content();
      if (frameContent.includes('First Name') || frameContent.includes('Associate ID') || frameContent.includes('E7X0L')) {
        console.log('[Sync] Found report frame, extracting data...');
        
        const frameAgents = await frame.evaluate(() => {
          const result = [];
          const tables = document.querySelectorAll('table');
          
          for (const table of tables) {
            const rows = table.querySelectorAll('tr');
            for (const row of rows) {
              const cells = row.querySelectorAll('td');
              if (cells.length >= 5) {
                const firstName = cells[0]?.textContent?.trim();
                const lastName = cells[1]?.textContent?.trim();
                const agentCode = cells[3]?.textContent?.trim();
                const titleLevel = cells[4]?.textContent?.trim();
                
                if (firstName && lastName && agentCode && /^[A-Z0-9]{5}$/i.test(agentCode)) {
                  result.push({ firstName, lastName, agentCode, titleLevel });
                }
              }
            }
          }
          return result;
        });
        
        agents = agents.concat(frameAgents);
      }
    } catch (e) {
      // Frame access error, continue
    }
  }
  
  // If no agents found in frames, try main page with different approach
  if (agents.length === 0) {
    console.log('[Sync] Trying main page extraction...');
    
    // Wait a bit more for the report to fully render
    await new Promise(r => setTimeout(r, 5000));
    
    // Take another screenshot
    await page.screenshot({ path: '/tmp/sync-downline-final.png', fullPage: true });
    
    // Try to extract from the visible table using XPath or other methods
    agents = await page.evaluate(() => {
      const result = [];
      
      // Look for all table cells and try to identify agent data patterns
      const allCells = document.querySelectorAll('td, div[class*="cell"], span[class*="cell"]');
      const cellTexts = Array.from(allCells).map(c => c.textContent?.trim());
      
      // Find agent codes (5 alphanumeric chars)
      const agentCodePattern = /^[A-Z0-9]{5}$/i;
      
      for (let i = 0; i < cellTexts.length; i++) {
        if (agentCodePattern.test(cellTexts[i])) {
          // Found an agent code, look for surrounding data
          // Typical pattern: FirstName, LastName, BulletinName, AgentCode, TitleLevel
          const agentCode = cellTexts[i];
          const firstName = cellTexts[i - 3] || '';
          const lastName = cellTexts[i - 2] || '';
          const titleLevel = cellTexts[i + 1] || '01';
          
          if (firstName && lastName && !firstName.includes('First') && !firstName.includes('Name')) {
            result.push({ firstName, lastName, agentCode, titleLevel });
          }
        }
      }
      
      return result;
    });
  }
  
  console.log(`[Sync] Extracted ${agents.length} agents from Downline Status`);
  
  // Save page content for debugging
  const pageText = await page.evaluate(() => document.body.innerText);
  const fs = await import('fs');
  fs.writeFileSync('/tmp/sync-downline-content.txt', pageText);
  
  return agents.map(a => ({
    ...a,
    wfgRank: TITLE_LEVEL_TO_RANK[a.titleLevel] || 'TRAINING_ASSOCIATE',
    isLifeLicensed: a.llFlag,
  }));
}

async function fetchContactInfo(page, agentCode) {
  const detailsUrl = `https://www.mywfg.com/Wfg.HierarchyTool/HierarchyDetails/AgentDetails?agentcodenumber=${agentCode}`;
  
  try {
    await page.goto(detailsUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  } catch (e) {
    // Continue even on timeout
  }
  
  await new Promise(r => setTimeout(r, 2000));
  
  const contactInfo = await page.evaluate(() => {
    const text = document.body.innerText;
    
    // Extract email
    const emailMatch = text.match(/Personal Email[:\s]*([^\s\n]+@[^\s\n]+)/i) ||
                       text.match(/Email[:\s]*([^\s\n]+@[^\s\n]+)/i);
    
    // Extract phone
    const phoneMatch = text.match(/Mobile Phone[:\s]*([\d\-\(\)\s]+)/i) ||
                       text.match(/Phone[:\s]*([\d\-\(\)\s]+)/i);
    
    return {
      email: emailMatch ? emailMatch[1].trim() : null,
      phone: phoneMatch ? phoneMatch[1].trim().replace(/\D/g, '') : null,
    };
  });
  
  return contactInfo;
}

async function updateDatabase(agents) {
  console.log('[Database] Connecting...');
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection, { schema, mode: 'default' });
  
  let updated = 0;
  
  for (const agent of agents) {
    const existing = await db.select()
      .from(schema.agents)
      .where(eq(schema.agents.agentCode, agent.agentCode))
      .limit(1);
    
    if (existing.length > 0) {
      const updateData = {
        firstName: agent.firstName,
        lastName: agent.lastName,
        currentRank: agent.wfgRank,
        isLifeLicensed: agent.isLifeLicensed,
        currentStage: agent.isLifeLicensed ? 'LICENSED' : 'EXAM_PREP',
      };
      
      if (agent.email) updateData.email = agent.email;
      if (agent.phone) updateData.phone = agent.phone;
      
      await db.update(schema.agents)
        .set(updateData)
        .where(eq(schema.agents.agentCode, agent.agentCode));
      
      console.log(`  ✓ Updated: ${agent.firstName} ${agent.lastName} (${agent.agentCode}) -> ${agent.wfgRank}`);
      updated++;
    }
  }
  
  await connection.end();
  return { updated };
}

async function main() {
  console.log('=== MyWFG Comprehensive Agent Data Sync ===\n');
  
  if (!credentials.username || !credentials.password) {
    console.error('Missing MYWFG_USERNAME or MYWFG_PASSWORD');
    process.exit(1);
  }
  
  let browser = null;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      protocolTimeout: 120000, // 2 minute timeout
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage',
        '--window-size=1920,1080',
        '--disable-gpu'
      ],
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Login
    await loginToMyWFG(page);
    
    // Fetch downline status
    const agents = await fetchDownlineStatus(page, '73DXR');
    
    if (agents.length > 0) {
      // First update database with downline status data (names, ranks, etc.)
      console.log('\n[Sync] Updating database with downline status...');
      const result = await updateDatabase(agents);
      console.log(`✓ Updated ${result.updated} agents from downline status`);
      
      // Now fetch contact info for agents that exist in our database
      // Only fetch for agents we care about (limit to avoid rate limiting)
      const agentsToFetchContacts = agents.slice(0, 50); // Limit to first 50 for now
      
      console.log(`\n[Sync] Fetching contact information for ${agentsToFetchContacts.length} agents...`);
      let contactsUpdated = 0;
      
      for (let i = 0; i < agentsToFetchContacts.length; i++) {
        const agent = agentsToFetchContacts[i];
        console.log(`  Processing ${i + 1}/${agentsToFetchContacts.length}: ${agent.firstName} ${agent.lastName}...`);
        
        try {
          const contactInfo = await fetchContactInfo(page, agent.agentCode);
          
          if (contactInfo.email || contactInfo.phone) {
            // Update database with contact info
            const connection = await mysql.createConnection(process.env.DATABASE_URL);
            const db = drizzle(connection, { schema, mode: 'default' });
            
            const updateData = {};
            if (contactInfo.email) updateData.email = contactInfo.email;
            if (contactInfo.phone) updateData.phone = contactInfo.phone;
            
            if (Object.keys(updateData).length > 0) {
              await db.update(schema.agents)
                .set(updateData)
                .where(eq(schema.agents.agentCode, agent.agentCode));
              contactsUpdated++;
              console.log(`    ✓ Contact updated: ${contactInfo.email || 'no email'}, ${contactInfo.phone || 'no phone'}`);
            }
            
            await connection.end();
          }
        } catch (e) {
          console.log(`    ⚠ Error fetching contact: ${e.message}`);
        }
        
        // Small delay between requests
        await new Promise(r => setTimeout(r, 1500));
      }
      
      console.log(`\n✓ Sync complete: ${result.updated} agents updated, ${contactsUpdated} contacts fetched`);
    } else {
      console.log('\n⚠ No agents extracted from Downline Status report');
    }
    
    await browser.close();
    
  } catch (error) {
    console.error('Error:', error.message);
    if (browser) await browser.close();
    process.exit(1);
  }
}

main();

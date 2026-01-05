import puppeteer from 'puppeteer';
import { waitForOTP, getMyWFGCredentials } from '../server/gmail-otp.ts';
import { getDb } from '../server/db.ts';
import { agents } from '../drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const credentials = {
  username: process.env.MYWFG_USERNAME || '',
  password: process.env.MYWFG_PASSWORD || '',
};

// Map MyWFG title levels to WFG ranks
const TITLE_LEVEL_TO_RANK = {
  '01': 'TRAINING_ASSOCIATE',
  '10': 'MARKETING_DIRECTOR',
  '15': 'SENIOR_MARKETING_DIRECTOR',
  '17': 'SENIOR_MARKETING_DIRECTOR',
  '20': 'SENIOR_MARKETING_DIRECTOR',
  '25': 'EXECUTIVE_MARKETING_DIRECTOR',
  '30': 'SENIOR_EXECUTIVE_MARKETING_DIRECTOR',
  '35': 'CEO_MARKETING_DIRECTOR',
  '40': 'EXECUTIVE_VICE_CHAIRMAN',
  '45': 'SENIOR_EXECUTIVE_VICE_CHAIRMAN',
  '50': 'CHAIRMAN',
};

console.log('[Full Sync] Validating credentials...');
if (!credentials.username || !credentials.password) {
  console.error('[Full Sync] Missing MYWFG_USERNAME or MYWFG_PASSWORD');
  process.exit(1);
}

async function loginToMyWFG(page) {
  console.log('[Full Sync] Navigating to MyWFG...');
  try {
    await page.goto('https://www.mywfg.com', { 
      waitUntil: 'networkidle0',
      timeout: 45000 
    });
  } catch (e) {
    console.log('[Full Sync] Navigation timeout, continuing...');
  }
  
  await new Promise(r => setTimeout(r, 5000));

  console.log('[Full Sync] Waiting for login form...');
  const usernameSelectors = [
    'input[id="myWfgUsernameDisplay"]',
    'input[name="username"]',
    'input[placeholder*="User"]',
    'input[type="text"]:first-of-type'
  ];
  
  let usernameInput = null;
  for (const selector of usernameSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      usernameInput = await page.$(selector);
      if (usernameInput) {
        console.log(`[Full Sync] Found username input: ${selector}`);
        break;
      }
    } catch (e) {}
  }
  
  if (!usernameInput) {
    throw new Error('Could not find username input field');
  }

  console.log('[Full Sync] Entering credentials...');
  await usernameInput.type(credentials.username, { delay: 100 });
  
  const passwordInput = await page.$('input[id="myWfgPassword"]') ||
                        await page.$('input[type="password"]');
  if (passwordInput) {
    await passwordInput.type(credentials.password, { delay: 100 });
  }

  await new Promise(r => setTimeout(r, 500));

  console.log('[Full Sync] Clicking login...');
  const loginButton = await page.$('button[id="btnLogin"]') ||
                      await page.$('button[type="submit"]');
  
  if (loginButton) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
      loginButton.click()
    ]);
  }
  
  await new Promise(r => setTimeout(r, 5000));
  
  const pageContent = await page.content();
  const pageText = await page.evaluate(() => document.body.innerText);
  const otpRequired = pageContent.includes('mywfgOtppswd') || 
                      pageText.includes('Validation Code') ||
                      pageText.includes('One-Time');

  if (otpRequired) {
    console.log('[Full Sync] OTP required, waiting for email...');
    
    const gmailCreds = getMyWFGCredentials();
    const otpResult = await waitForOTP(gmailCreds, 'transamerica', 60, 3);
    
    if (!otpResult.success || !otpResult.otp) {
      throw new Error(`Failed to get OTP: ${otpResult.error}`);
    }
    
    console.log(`[Full Sync] ✓ OTP received: ${otpResult.otp}`);
    
    const otpInput = await page.$('input[id="mywfgOtppswd"]') ||
                     await page.$('input[name="otp"]') ||
                     await page.$('input[type="tel"]');
    
    if (!otpInput) {
      throw new Error('Could not find OTP input field');
    }
    
    await otpInput.type(otpResult.otp, { delay: 100 });
    
    const submitButton = await page.$('button[id="mywfgTheylive"]') ||
                         await page.$('button[type="submit"]');
    
    if (submitButton) {
      await submitButton.click();
    }
    
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  }

  console.log('[Full Sync] ✓ Login successful');
}

async function fetchDownlineStatus(page, agentId) {
  console.log('[Full Sync] Fetching Downline Status report...');
  
  const reportUrl = `https://www.mywfg.com/reports-downline-status?AgentID=${agentId}`;
  
  try {
    await page.goto(reportUrl, { waitUntil: 'networkidle0', timeout: 45000 });
  } catch (e) {
    console.log('[Full Sync] Report page timeout, continuing...');
  }
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Check if OTP page appeared during navigation
  const pageText = await page.evaluate(() => document.body.innerText);
  if (pageText.includes('Validation Code') || pageText.includes('One-Time')) {
    console.log('[Full Sync] OTP page detected during navigation...');
    
    const gmailCreds = getMyWFGCredentials();
    const otpResult = await waitForOTP(gmailCreds, 'transamerica', 60, 3);
    
    if (otpResult.success && otpResult.otp) {
      console.log(`[Full Sync] ✓ OTP received: ${otpResult.otp}`);
      
      const otpInput = await page.$('input[id="mywfgOtppswd"]') ||
                       await page.$('input[type="tel"]');
      if (otpInput) {
        await otpInput.type(otpResult.otp, { delay: 100 });
        const submitBtn = await page.$('button[id="mywfgTheylive"]');
        if (submitBtn) await submitBtn.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }
  
  await page.screenshot({ path: '/tmp/downline-initial.png', fullPage: true });
  
  // Configure filters - click on dropdowns and select options
  // Order: Title Level -> Team -> Type -> Generate Report
  console.log('[Full Sync] Configuring report filters...');
  
  // Step 1: Select Title Levels: TA, A, SA, MD, SMD
  console.log('[Full Sync] Step 1: Selecting Title Levels (TA, A, SA, MD, SMD)...');
  try {
    // Click on the title level dropdown to open it
    await page.evaluate(() => {
      const titleDropdown = document.querySelector('#TitleLevelDropDownList') ||
                           document.querySelector('[id*="TitleLevel"]') ||
                           document.querySelector('select[name*="title"]');
      if (titleDropdown) titleDropdown.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    
    // Select the title levels
    await page.evaluate(() => {
      const targetLevels = ['TA', 'A', 'SA', 'MD', 'SMD'];
      
      // Try checkboxes first (multi-select dropdown)
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      for (const cb of checkboxes) {
        const label = cb.parentElement?.textContent || cb.nextSibling?.textContent || cb.id || '';
        if (targetLevels.some(level => label.trim() === level || label.includes(level))) {
          if (!cb.checked) {
            cb.click();
          }
        }
      }
      
      // Also try list items
      const listItems = document.querySelectorAll('li, .dropdown-item, [role="option"]');
      for (const item of listItems) {
        const text = item.textContent?.trim();
        if (targetLevels.includes(text)) {
          item.click();
        }
      }
    });
    await new Promise(r => setTimeout(r, 500));
    
    // Close dropdown by clicking elsewhere
    await page.evaluate(() => document.body.click());
    console.log('[Full Sync] Title levels selected');
  } catch (e) {
    console.log('[Full Sync] Title level selection error:', e.message);
  }
  
  await new Promise(r => setTimeout(r, 500));
  
  // Step 2: Select Team: Super Base (Base - 1st)
  console.log('[Full Sync] Step 2: Selecting Team (Super Base - Base 1st)...');
  try {
    await page.evaluate(() => {
      const teamSelect = document.querySelector('#TeamDropDownList') ||
                        document.querySelector('select[id*="Team"]') ||
                        document.querySelector('select[name*="team"]');
      if (teamSelect) {
        for (const opt of teamSelect.options) {
          if (opt.textContent.includes('Super Base') || opt.textContent.includes('Base - 1st')) {
            opt.selected = true;
            teamSelect.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('Selected team:', opt.textContent);
            break;
          }
        }
      }
    });
    console.log('[Full Sync] Team selected');
  } catch (e) {
    console.log('[Full Sync] Team selection error:', e.message);
  }
  
  await new Promise(r => setTimeout(r, 500));
  
  // Step 3: Select Type: Active
  console.log('[Full Sync] Step 3: Selecting Type (Active)...');
  try {
    await page.evaluate(() => {
      const typeSelect = document.querySelector('#TypeDropDownList') ||
                        document.querySelector('select[id*="Type"]') ||
                        document.querySelector('select[name*="type"]');
      if (typeSelect) {
        for (const opt of typeSelect.options) {
          if (opt.textContent.includes('Active')) {
            opt.selected = true;
            typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('Selected type:', opt.textContent);
            break;
          }
        }
      }
    });
    console.log('[Full Sync] Type selected');
  } catch (e) {
    console.log('[Full Sync] Type selection error:', e.message);
  }
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Click Generate Report
  console.log('[Full Sync] Clicking Generate Report...');
  try {
    // Use evaluate to find and click the button
    await page.evaluate(() => {
      // Try multiple approaches to find the Generate Report button
      const inputs = document.querySelectorAll('input[type="button"], input[type="submit"]');
      for (const input of inputs) {
        if (input.value && input.value.includes('Generate Report')) {
          input.click();
          return;
        }
      }
      
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent && btn.textContent.includes('Generate Report')) {
          btn.click();
          return;
        }
      }
      
      // Try by ID or class
      const genBtn = document.querySelector('#btnGenerateReport') ||
                     document.querySelector('.generate-report-btn') ||
                     document.querySelector('[onclick*="Generate"]');
      if (genBtn) genBtn.click();
    });
    console.log('[Full Sync] Generate Report button clicked');
  } catch (e) {
    console.log('[Full Sync] Generate button click failed:', e.message);
  }
  
  // Wait for report to load
  await new Promise(r => setTimeout(r, 8000));
  await page.screenshot({ path: '/tmp/downline-generated.png', fullPage: true });
  
  // Extract data from iframes
  console.log('[Full Sync] Extracting agent data...');
  let allAgents = [];
  
  const frames = page.frames();
  console.log(`[Full Sync] Found ${frames.length} frames`);
  
  for (const frame of frames) {
    try {
      const frameContent = await frame.content();
      if (frameContent.includes('First Name') || frameContent.includes('Associate ID')) {
        console.log('[Full Sync] Found report frame, extracting...');
        
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
        
        allAgents = allAgents.concat(frameAgents);
      }
    } catch (e) {}
  }
  
  console.log(`[Full Sync] Extracted ${allAgents.length} agents from Downline Status`);
  
  return allAgents.map(a => ({
    ...a,
    wfgRank: TITLE_LEVEL_TO_RANK[a.titleLevel] || 'TRAINING_ASSOCIATE',
  }));
}

async function getAgentContactInfo(page, agentCode) {
  try {
    await page.goto(`https://www.mywfg.com/Wfg.HierarchyTool/HierarchyDetails/AgentDetails?agentcodenumber=${agentCode}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
  } catch (e) {}
  
  await new Promise(r => setTimeout(r, 2000));
  
  const contactInfo = await page.evaluate(() => {
    const text = document.body.innerText;
    
    const emailMatch = text.match(/Personal Email[:\s]*([^\s\n]+@[^\s\n]+)/i) ||
                       text.match(/Email[:\s]*([^\s\n]+@[^\s\n]+)/i);
    
    const phoneMatch = text.match(/Mobile Phone[:\s]*([\d\-\(\)\s]+)/i) ||
                       text.match(/Phone[:\s]*([\d\-\(\)\s]+)/i);
    
    return {
      email: emailMatch ? emailMatch[1].trim() : null,
      phone: phoneMatch ? phoneMatch[1].trim() : null,
    };
  });
  
  return contactInfo;
}

async function main() {
  console.log('=== MyWFG Full Agent Data Sync ===\n');
  
  let browser = null;
  
  try {
    console.log('[Full Sync] Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Login
    await loginToMyWFG(page);
    
    // Fetch downline status
    const downlineAgents = await fetchDownlineStatus(page, '73DXR');
    
    // Get database connection
    const db = await getDb();
    
    if (downlineAgents.length > 0) {
      console.log(`\n[Full Sync] Updating ${downlineAgents.length} agents from Downline Status...`);
      
      let updated = 0;
      for (const agent of downlineAgents) {
        const existing = await db.select()
          .from(agents)
          .where(eq(agents.agentCode, agent.agentCode))
          .limit(1);
        
        if (existing.length > 0) {
          await db.update(agents)
            .set({
              firstName: agent.firstName,
              lastName: agent.lastName,
              currentRank: agent.wfgRank,
            })
            .where(eq(agents.agentCode, agent.agentCode));
          
          console.log(`  ✓ ${agent.firstName} ${agent.lastName} (${agent.agentCode}) -> ${agent.wfgRank}`);
          updated++;
        }
      }
      
      console.log(`\n[Full Sync] Updated ${updated} agents from Downline Status`);
    }
    
    // Fetch contact info for agents in our database
    const dbAgents = await db.select().from(agents);
    console.log(`\n[Full Sync] Fetching contact info for ${dbAgents.length} agents...`);
    
    let contactsUpdated = 0;
    for (let i = 0; i < dbAgents.length; i++) {
      const agent = dbAgents[i];
      console.log(`  Processing ${i + 1}/${dbAgents.length}: ${agent.firstName} ${agent.lastName}...`);
      
      try {
        const contactInfo = await getAgentContactInfo(page, agent.agentCode);
        
        if (contactInfo.email || contactInfo.phone) {
          const updateData = {};
          if (contactInfo.email) updateData.email = contactInfo.email;
          if (contactInfo.phone) updateData.phone = contactInfo.phone;
          
          await db.update(agents)
            .set(updateData)
            .where(eq(agents.agentCode, agent.agentCode));
          
          contactsUpdated++;
          console.log(`    ✓ ${contactInfo.email || 'no email'}, ${contactInfo.phone || 'no phone'}`);
        }
      } catch (e) {
        console.log(`    ⚠ Error: ${e.message}`);
      }
      
      await new Promise(r => setTimeout(r, 1500));
    }
    
    console.log(`\n✓ Full Sync Complete: ${contactsUpdated} contacts updated`);
    
    await browser.close();
    console.log('[Full Sync] Browser closed');
    
  } catch (error) {
    console.error('Error:', error.message);
    if (browser) await browser.close();
    process.exit(1);
  }
}

main();

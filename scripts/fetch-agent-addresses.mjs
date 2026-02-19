import puppeteer from 'puppeteer';
import { getDb } from '../server/db.ts';
import { agents } from '../drizzle/schema.ts';
import { eq, isNull } from 'drizzle-orm';
import { waitForOTP, getMyWFGCredentials } from '../server/gmail-otp.ts';

// --- Auto Chrome Discovery ---
import { existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';
function findChrome() {
  // Check Puppeteer cache directories
  for (const base of [resolve(homedir(), '.cache/puppeteer/chrome'), '/root/.cache/puppeteer/chrome']) {
    if (existsSync(base)) {
      try {
        const vers = readdirSync(base).sort().reverse();
        for (const v of vers) {
          const bin = resolve(base, v, 'chrome-linux64', 'chrome');
          if (existsSync(bin)) return bin;
        }
      } catch {}
    }
  }
  // System Chromium fallbacks
  for (const p of ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome-stable', '/usr/bin/google-chrome']) {
    if (existsSync(p)) return p;
  }
  return undefined;
}
const __chromePath = findChrome();
// --- End Auto Chrome Discovery ---


const credentials = getMyWFGCredentials();

async function login(page) {
  console.log('[MyWFG] Logging in...');
  await page.goto('https://www.mywfg.com', { waitUntil: 'networkidle2' });

  // Enter credentials
  await page.type('input[id="myWfgUsernameDisplay"]', credentials.email);
  await page.type('input[id="myWfgPassword"]', credentials.appPassword);
  await page.click('button[id="btnLogin"]');

  // Wait for OTP page or dashboard
  await Promise.race([
    page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
    page.waitForSelector('input[id="mywfgOtppswd"]', { timeout: 10000 }).catch(() => {}),
  ]);

  // Check if OTP is needed
  const otpInput = await page.$('input[id="mywfgOtppswd"]');
  if (otpInput) {
    console.log('[MyWFG] OTP required, fetching from Gmail...');
    const otp = await waitForOTP(credentials, 'wfg', 120, 10);
    if (!otp.success || !otp.otp) {
      throw new Error('Failed to retrieve OTP: ' + otp.error);
    }
    console.log(`[MyWFG] Got OTP: ${otp.otp}`);
    await page.type('input[id="mywfgOtppswd"]', otp.otp);
    await page.click('button[id="mywfgTheylive"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
  }

  console.log('[MyWFG] Login successful');
}

async function getAgentAddress(page, agentCode) {
  const url = `https://www.mywfg.com/Wfg.HierarchyTool/HierarchyDetails/LoadHierarchyToolMain?agentcodenumber=${agentCode}`;
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for page to load
    await new Promise(r => setTimeout(r, 2000));
    
    // Try to click on Associate Details tab if it exists
    try {
      const detailsLink = await page.$('a[id="AgentDetailsLink"]');
      if (detailsLink) {
        await detailsLink.click();
        await new Promise(r => setTimeout(r, 1500));
      }
    } catch (e) {
      // Tab might not exist or already open
    }
    
    // Extract address from page
    const address = await page.evaluate(() => {
      // Look for Home Address label and get the value
      const allText = document.body.innerText;
      const lines = allText.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Home Address')) {
          // The address is usually in the next few lines
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            const line = lines[j].trim();
            // Check if it looks like an address (has numbers and letters)
            if (line.length > 10 && /\d/.test(line) && /[a-zA-Z]/.test(line)) {
              return line;
            }
          }
        }
      }
      
      // Alternative: look for address pattern in the page
      const addressMatch = allText.match(/\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Court|Ct|Circle|Cir|Place|Pl)[\s,]+[\w\s]+,?\s*[A-Z]{2}\s*\d{5}/i);
      if (addressMatch) {
        return addressMatch[0];
      }
      
      return null;
    });
    
    return address;
  } catch (error) {
    console.error(`[MyWFG] Error fetching address for ${agentCode}:`, error.message);
    return null;
  }
}

async function main() {
  const db = await getDb();
  
  // Get all agents without addresses
  const agentsWithoutAddress = await db.select()
    .from(agents)
    .where(isNull(agents.homeAddress));
  
  console.log(`Found ${agentsWithoutAddress.length} agents without addresses`);
  
  if (agentsWithoutAddress.length === 0) {
    console.log('All agents already have addresses');
    return;
  }
  
  // Launch browser
  const browser = await puppeteer.launch({
    executablePath: __chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  try {
    // Login to MyWFG
    await login(page);
    
    let updated = 0;
    let failed = 0;
    
    // Fetch address for each agent
    for (const agent of agentsWithoutAddress) {
      console.log(`\nFetching address for ${agent.firstName} ${agent.lastName} (${agent.agentCode})...`);
      
      const address = await getAgentAddress(page, agent.agentCode);
      
      if (address) {
        console.log(`  Found address: ${address}`);
        await db.update(agents)
          .set({ homeAddress: address })
          .where(eq(agents.id, agent.id));
        updated++;
      } else {
        console.log(`  No address found`);
        failed++;
      }
      
      // Delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 2000));
    }
    
    console.log(`\n=== Summary ===`);
    console.log(`Updated: ${updated}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${agentsWithoutAddress.length}`);
    
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

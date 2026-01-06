import puppeteer from 'puppeteer';
import { waitForOTP, getMyWFGCredentials } from '../server/gmail-otp.ts';
import fs from 'fs';

const credentials = getMyWFGCredentials();

async function login(page) {
  console.log('[MyWFG] Logging in...');
  await page.goto('https://www.mywfg.com', { waitUntil: 'networkidle2' });

  await page.type('input[id="myWfgUsernameDisplay"]', credentials.email);
  await page.type('input[id="myWfgPassword"]', credentials.appPassword);
  await page.click('button[id="btnLogin"]');

  await Promise.race([
    page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
    page.waitForSelector('input[id="mywfgOtppswd"]', { timeout: 10000 }).catch(() => {}),
  ]);

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

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  try {
    await login(page);
    
    // Navigate to Hierarchy Tool for a specific agent
    const agentCode = 'D0T7M'; // Armstrong
    const url = `https://www.mywfg.com/Wfg.HierarchyTool/HierarchyDetails/LoadHierarchyToolMain?agentcodenumber=${agentCode}`;
    
    console.log(`\nNavigating to Hierarchy Tool for ${agentCode}...`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for page to load
    await new Promise(r => setTimeout(r, 3000));
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/hierarchy-tool-1.png', fullPage: true });
    console.log('Screenshot saved to /tmp/hierarchy-tool-1.png');
    
    // Try to click on Associate Details tab
    try {
      const tabs = await page.$$('a[role="tab"], .nav-link, a.tab');
      console.log(`Found ${tabs.length} tab elements`);
      
      const detailsLink = await page.$('a[id="AgentDetailsLink"]');
      if (detailsLink) {
        console.log('Found AgentDetailsLink, clicking...');
        await detailsLink.click();
        await new Promise(r => setTimeout(r, 2000));
      } else {
        console.log('AgentDetailsLink not found, looking for other tabs...');
        
        // Look for any clickable element with "Details" or "Contact" text
        const allLinks = await page.$$('a');
        for (const link of allLinks) {
          const text = await link.evaluate(el => el.textContent);
          if (text && (text.includes('Details') || text.includes('Contact') || text.includes('Associate'))) {
            console.log(`Found link: ${text.trim()}`);
          }
        }
      }
    } catch (e) {
      console.log('Error clicking tab:', e.message);
    }
    
    // Take another screenshot
    await page.screenshot({ path: '/tmp/hierarchy-tool-2.png', fullPage: true });
    console.log('Screenshot saved to /tmp/hierarchy-tool-2.png');
    
    // Get page HTML
    const html = await page.content();
    fs.writeFileSync('/tmp/hierarchy-tool.html', html);
    console.log('HTML saved to /tmp/hierarchy-tool.html');
    
    // Get all text content
    const text = await page.evaluate(() => document.body.innerText);
    fs.writeFileSync('/tmp/hierarchy-tool.txt', text);
    console.log('Text content saved to /tmp/hierarchy-tool.txt');
    
    // Look for address-related content
    console.log('\n=== Looking for address content ===');
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.toLowerCase().includes('address') || 
          line.toLowerCase().includes('street') ||
          line.toLowerCase().includes('city') ||
          line.match(/\d{5}/)) {
        console.log(`Line ${i}: ${line}`);
      }
    }
    
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

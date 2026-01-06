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
    
    // After login, navigate to the main dashboard
    console.log('\nNavigating to MyWFG dashboard...');
    await page.goto('https://www.mywfg.com/dashboard', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    
    await page.screenshot({ path: '/tmp/mywfg-dashboard.png', fullPage: true });
    console.log('Dashboard screenshot saved');
    
    // Look for Hierarchy Tool link in the navigation
    console.log('\nLooking for Hierarchy Tool link...');
    const links = await page.$$('a');
    for (const link of links) {
      const href = await link.evaluate(el => el.href);
      const text = await link.evaluate(el => el.textContent);
      if (href && (href.toLowerCase().includes('hierarchy') || 
                   (text && text.toLowerCase().includes('hierarchy')))) {
        console.log(`Found: ${text?.trim()} -> ${href}`);
      }
    }
    
    // Try navigating to hierarchy tool via menu
    console.log('\nTrying to find Hierarchy Tool in menu...');
    
    // Look for menu items
    const menuItems = await page.$$('[class*="menu"], [class*="nav"], [role="menu"], [role="navigation"]');
    console.log(`Found ${menuItems.length} menu/nav elements`);
    
    // Try direct URL to hierarchy tool from within session
    console.log('\nTrying direct URL to Hierarchy Tool...');
    await page.goto('https://www.mywfg.com/hierarchy-tool', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: '/tmp/hierarchy-attempt-1.png', fullPage: true });
    console.log('Hierarchy attempt 1 screenshot saved');
    
    // Try another URL pattern
    await page.goto('https://www.mywfg.com/tools/hierarchy', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: '/tmp/hierarchy-attempt-2.png', fullPage: true });
    console.log('Hierarchy attempt 2 screenshot saved');
    
    // Try the reports section
    console.log('\nNavigating to reports section...');
    await page.goto('https://www.mywfg.com/reports', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: '/tmp/mywfg-reports.png', fullPage: true });
    console.log('Reports screenshot saved');
    
    // Get all links on reports page
    const reportLinks = await page.$$('a');
    console.log('\nLinks on reports page:');
    for (const link of reportLinks) {
      const href = await link.evaluate(el => el.href);
      const text = await link.evaluate(el => el.textContent?.trim());
      if (href && text && text.length > 0 && text.length < 50) {
        console.log(`  ${text} -> ${href}`);
      }
    }
    
    // Save page text
    const text = await page.evaluate(() => document.body.innerText);
    fs.writeFileSync('/tmp/mywfg-reports.txt', text);
    
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

import puppeteer from 'puppeteer';
import { waitForOTP } from '../server/gmail-otp.js';
import fs from 'fs';

const MYWFG_USERNAME = process.env.MYWFG_USERNAME;
const MYWFG_PASSWORD = process.env.MYWFG_PASSWORD;
const MYWFG_EMAIL = process.env.MYWFG_EMAIL;
const MYWFG_APP_PASSWORD = process.env.MYWFG_APP_PASSWORD;

async function main() {
  console.log('Debug: Capturing MyWFG Downline Status page...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Login to MyWFG
    console.log('Step 1: Logging in to MyWFG...');
    await page.goto('https://www.mywfg.com/login', { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Fill login form
    await page.type('#Username', MYWFG_USERNAME);
    await page.type('#Password', MYWFG_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for OTP page
    await new Promise(r => setTimeout(r, 3000));
    
    // Check if OTP is required
    const otpInput = await page.$('#Code, #code, input[name="Code"], input[name="code"]');
    if (otpInput) {
      console.log('OTP required, waiting for email...');
      const otp = await waitForOTP(MYWFG_EMAIL, MYWFG_APP_PASSWORD, 'transamerica');
      console.log(`OTP received: ${otp}`);
      
      await page.type('#Code, #code, input[name="Code"], input[name="code"]', otp);
      await page.click('button[type="submit"]');
      await new Promise(r => setTimeout(r, 5000));
    }
    
    console.log('Login complete, current URL:', page.url());
    
    // Navigate to Downline Status report
    console.log('\nStep 2: Navigating to Downline Status report...');
    const reportUrl = 'https://www.mywfg.com/reports-downline-status?AgentID=73DXR';
    await page.goto(reportUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for page to load
    await new Promise(r => setTimeout(r, 5000));
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/mywfg-downline-1.png', fullPage: true });
    console.log('Screenshot 1 saved: /tmp/mywfg-downline-1.png');
    
    // Check for Generate Report button
    const generateBtn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('input[type="button"], button, input[type="submit"]'));
      const btn = buttons.find(el => {
        const text = el.textContent || el.value || '';
        return text.toLowerCase().includes('generate') || text.toLowerCase().includes('run report');
      });
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    
    if (generateBtn) {
      console.log('Clicked Generate Report button');
      await new Promise(r => setTimeout(r, 10000));
      await page.screenshot({ path: '/tmp/mywfg-downline-2.png', fullPage: true });
      console.log('Screenshot 2 saved: /tmp/mywfg-downline-2.png');
    }
    
    // Wait more for report to load
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: '/tmp/mywfg-downline-3.png', fullPage: true });
    console.log('Screenshot 3 saved: /tmp/mywfg-downline-3.png');
    
    // Get page content
    const pageText = await page.evaluate(() => document.body.innerText);
    fs.writeFileSync('/tmp/mywfg-downline-text.txt', pageText);
    console.log('\nPage text saved: /tmp/mywfg-downline-text.txt');
    
    // Get HTML structure
    const html = await page.content();
    fs.writeFileSync('/tmp/mywfg-downline-html.html', html);
    console.log('Page HTML saved: /tmp/mywfg-downline-html.html');
    
    // Check for tables
    const tableInfo = await page.evaluate(() => {
      const tables = Array.from(document.querySelectorAll('table'));
      return tables.map((t, i) => ({
        index: i,
        rows: t.querySelectorAll('tr').length,
        cols: t.querySelector('tr')?.querySelectorAll('td, th').length || 0,
        firstRowText: t.querySelector('tr')?.textContent?.substring(0, 200) || '',
      }));
    });
    
    console.log('\n=== TABLES FOUND ===');
    console.log(JSON.stringify(tableInfo, null, 2));
    
    // Check for iframes
    const iframes = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('iframe')).map(f => ({
        id: f.id,
        src: f.src,
        name: f.name,
      }));
    });
    
    console.log('\n=== IFRAMES FOUND ===');
    console.log(JSON.stringify(iframes, null, 2));
    
    // If there's an iframe, try to access it
    if (iframes.length > 0) {
      console.log('\nTrying to access iframe content...');
      const frames = page.frames();
      for (const frame of frames) {
        if (frame !== page.mainFrame()) {
          try {
            const frameText = await frame.evaluate(() => document.body?.innerText?.substring(0, 1000) || 'No content');
            console.log(`Frame content preview: ${frameText.substring(0, 500)}`);
            
            // Check for tables in iframe
            const frameTables = await frame.evaluate(() => {
              const tables = Array.from(document.querySelectorAll('table'));
              return tables.map((t, i) => ({
                index: i,
                rows: t.querySelectorAll('tr').length,
                cols: t.querySelector('tr')?.querySelectorAll('td, th').length || 0,
              }));
            });
            console.log('Tables in iframe:', JSON.stringify(frameTables));
          } catch (e) {
            console.log('Could not access frame:', e.message);
          }
        }
      }
    }
    
    console.log('\nDebug complete!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

main();

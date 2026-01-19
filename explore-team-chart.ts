/**
 * Explore MyWFG Team Chart to understand hierarchy structure
 */

import puppeteer from 'puppeteer';
import { waitForOTP } from './server/gmail-otp.js';

async function exploreTeamChart() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  console.log('Navigating to MyWFG...');
  await page.goto('https://www.mywfg.com', { waitUntil: 'networkidle2', timeout: 60000 });
  
  // Login
  const username = process.env.MYWFG_USERNAME!;
  const password = process.env.MYWFG_PASSWORD!;
  
  await page.waitForSelector('input[id="myWfgUsernameDisplay"]', { timeout: 30000 });
  await page.type('input[id="myWfgUsernameDisplay"]', username);
  await page.type('input[id="myWfgPassword"]', password);
  
  await Promise.all([
    page.click('button[id="btnLogin"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {})
  ]);
  
  await new Promise(r => setTimeout(r, 5000));
  
  // Check for OTP
  const pageText = await page.evaluate(() => document.body.innerText);
  if (pageText.includes('One-Time Password') || pageText.includes('Security Code')) {
    console.log('OTP required, waiting for email...');
    
    await new Promise(r => setTimeout(r, 5000));
    
    const gmailCreds = {
      email: process.env.MYWFG_EMAIL!,
      appPassword: process.env.MYWFG_APP_PASSWORD!
    };
    
    const otpResult = await waitForOTP(gmailCreds, 'transamerica', 120, 3);
    
    if (otpResult.success && otpResult.otp) {
      console.log('OTP received:', otpResult.otp);
      
      const otpInput = await page.$('input[id="mywfgOtppswd"]');
      if (otpInput) {
        await otpInput.type(otpResult.otp.slice(-6), { delay: 50 });
        
        const submitBtn = await page.$('button[id="mywfgTheylive"]') || await page.$('button[type="submit"]');
        if (submitBtn) {
          await submitBtn.click();
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
        }
      }
    }
  }
  
  await new Promise(r => setTimeout(r, 3000));
  console.log('Current URL:', page.url());
  
  // Navigate to Team Chart
  console.log('Navigating to Team Chart...');
  await page.goto('https://www.mywfg.com/wfg/teamchart/teamChart.do', { waitUntil: 'networkidle2', timeout: 60000 });
  
  await new Promise(r => setTimeout(r, 5000));
  await page.screenshot({ path: '/tmp/mywfg-team-chart.png', fullPage: true });
  console.log('Screenshot saved to /tmp/mywfg-team-chart.png');
  
  // Get page content
  console.log('Page title:', await page.title());
  
  // Look for hierarchy data in frames
  const frames = page.frames();
  console.log('Number of frames:', frames.length);
  
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    try {
      const frameUrl = frame.url();
      console.log(`Frame ${i}: ${frameUrl}`);
      
      // Extract hierarchy data from frame
      const hierarchyData = await frame.evaluate(() => {
        const data: any[] = [];
        
        // Look for tree structure elements
        const treeNodes = document.querySelectorAll('[class*="tree"], [class*="node"], [class*="hierarchy"]');
        console.log('Tree nodes found:', treeNodes.length);
        
        // Look for agent cards or list items
        const agentElements = document.querySelectorAll('[class*="agent"], [class*="member"], tr');
        
        agentElements.forEach((el, idx) => {
          const text = el.textContent?.trim();
          if (text && text.length < 500) {
            data.push({ index: idx, text: text.substring(0, 200) });
          }
        });
        
        return data;
      });
      
      if (hierarchyData.length > 0) {
        console.log(`Frame ${i} has ${hierarchyData.length} potential agent elements`);
        console.log('Sample data:', JSON.stringify(hierarchyData.slice(0, 3), null, 2));
      }
    } catch (e) {
      // Frame may not be accessible
    }
  }
  
  // Try to find the main content area
  const mainContent = await page.evaluate(() => {
    const body = document.body.innerText;
    return body.substring(0, 2000);
  });
  console.log('Main content preview:', mainContent);
  
  // Keep browser open for inspection
  console.log('Browser will close in 60 seconds...');
  await new Promise(r => setTimeout(r, 60000));
  
  await browser.close();
}

exploreTeamChart().catch(console.error);

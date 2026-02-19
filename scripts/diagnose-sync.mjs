/**
 * Diagnostic script to test the MyWFG Downline Status report extraction
 * This script will:
 * 1. Login to MyWFG
 * 2. Navigate to the Downline Status report page
 * 3. Take screenshots at each step
 * 4. Analyze the page structure to find dropdowns and buttons
 * 5. Try to generate the report and extract data
 */

import 'dotenv/config';
import puppeteer from 'puppeteer';
import { waitForOTP } from '../server/gmail-otp.js';

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


const MYWFG_USERNAME = process.env.MYWFG_USERNAME;
const MYWFG_PASSWORD = process.env.MYWFG_PASSWORD;
const GMAIL_EMAIL = process.env.MYWFG_EMAIL;
const GMAIL_APP_PASSWORD = process.env.MYWFG_APP_PASSWORD;

async function diagnose() {
  console.log('=== MyWFG Sync Diagnostic ===\n');
  
  const browser = await puppeteer.launch({
    executablePath: __chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  try {
    // Step 1: Navigate to MyWFG
    console.log('Step 1: Navigating to MyWFG...');
    await page.goto('https://www.mywfg.com', { waitUntil: 'networkidle2', timeout: 60000 });
    await page.screenshot({ path: '/tmp/diag-1-login-page.png', fullPage: true });
    console.log('Screenshot: /tmp/diag-1-login-page.png');
    
    // Step 2: Enter credentials
    console.log('Step 2: Entering credentials...');
    const usernameInput = await page.$('input[id*="username" i]') || await page.$('#myWfgUsernameDisplay');
    const passwordInput = await page.$('input[type="password"]');
    
    if (usernameInput && passwordInput) {
      await usernameInput.click({ clickCount: 3 });
      await usernameInput.type(MYWFG_USERNAME);
      await passwordInput.click({ clickCount: 3 });
      await passwordInput.type(MYWFG_PASSWORD);
      console.log('Credentials entered');
    } else {
      console.log('ERROR: Could not find login inputs');
      return;
    }
    
    // Step 3: Click login
    console.log('Step 3: Clicking login...');
    const loginBtn = await page.$('button[type="submit"]');
    if (loginBtn) {
      await loginBtn.click();
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      } catch (e) {}
    }
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: '/tmp/diag-2-after-login.png', fullPage: true });
    console.log('Screenshot: /tmp/diag-2-after-login.png');
    
    // Step 4: Check for OTP
    const pageContent = await page.content();
    const needsOTP = pageContent.toLowerCase().includes('validation') ||
                     pageContent.toLowerCase().includes('verification') ||
                     pageContent.toLowerCase().includes('one-time');
    
    if (needsOTP) {
      console.log('Step 4: OTP required, waiting for email...');
      const otpResult = await waitForOTP(
        { email: GMAIL_EMAIL, appPassword: GMAIL_APP_PASSWORD },
        'transamerica',
        90,
        5
      );
      
      if (otpResult.success && otpResult.otp) {
        console.log(`OTP received: ${otpResult.otp}`);
        
        // Find OTP input
        const otpInput = await page.$('input[type="text"]:not([id*="username" i])') ||
                         await page.$('input[type="tel"]');
        if (otpInput) {
          await otpInput.click({ clickCount: 3 });
          await otpInput.type(otpResult.otp);
          console.log('OTP entered');
          
          // Click submit
          const submitBtn = await page.$('button');
          if (submitBtn) {
            await submitBtn.click();
            try {
              await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
            } catch (e) {}
          }
          await new Promise(r => setTimeout(r, 3000));
        }
      } else {
        console.log('ERROR: Failed to get OTP');
        return;
      }
    }
    
    await page.screenshot({ path: '/tmp/diag-3-logged-in.png', fullPage: true });
    console.log('Screenshot: /tmp/diag-3-logged-in.png');
    
    // Step 5: Navigate to Downline Status report
    console.log('Step 5: Navigating to Downline Status report...');
    await page.goto('https://www.mywfg.com/reports-downline-status?AgentID=73DXR', { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: '/tmp/diag-4-report-page.png', fullPage: true });
    console.log('Screenshot: /tmp/diag-4-report-page.png');
    
    // Step 6: Analyze page structure
    console.log('\nStep 6: Analyzing page structure...');
    const pageAnalysis = await page.evaluate(() => {
      const analysis = {
        selects: [],
        buttons: [],
        inputs: [],
        tables: [],
        pageText: document.body.innerText.substring(0, 2000),
      };
      
      // Find all select elements
      document.querySelectorAll('select').forEach((select, idx) => {
        const options = Array.from(select.options).map(o => ({ value: o.value, text: o.text }));
        analysis.selects.push({
          index: idx,
          id: select.id,
          name: select.name,
          className: select.className,
          optionCount: options.length,
          options: options.slice(0, 10),
        });
      });
      
      // Find all buttons
      document.querySelectorAll('button, input[type="button"], input[type="submit"]').forEach((btn, idx) => {
        analysis.buttons.push({
          index: idx,
          tag: btn.tagName,
          id: btn.id,
          className: btn.className,
          text: btn.textContent?.trim() || btn.value,
        });
      });
      
      // Find all tables
      document.querySelectorAll('table').forEach((table, idx) => {
        const rows = table.querySelectorAll('tr');
        const firstRowCells = rows[0]?.querySelectorAll('td, th');
        analysis.tables.push({
          index: idx,
          rowCount: rows.length,
          firstRowCellCount: firstRowCells?.length || 0,
          firstRowText: Array.from(firstRowCells || []).map(c => c.textContent?.trim()).slice(0, 5),
        });
      });
      
      return analysis;
    });
    
    console.log('\n=== Page Analysis ===');
    console.log(`Found ${pageAnalysis.selects.length} select elements:`);
    pageAnalysis.selects.forEach(s => {
      console.log(`  - Select #${s.index}: id="${s.id}", ${s.optionCount} options`);
      console.log(`    Options: ${s.options.map(o => o.text).join(', ')}`);
    });
    
    console.log(`\nFound ${pageAnalysis.buttons.length} buttons:`);
    pageAnalysis.buttons.forEach(b => {
      console.log(`  - ${b.tag} #${b.index}: id="${b.id}", text="${b.text}"`);
    });
    
    console.log(`\nFound ${pageAnalysis.tables.length} tables:`);
    pageAnalysis.tables.forEach(t => {
      console.log(`  - Table #${t.index}: ${t.rowCount} rows, first row: ${t.firstRowText.join(' | ')}`);
    });
    
    // Step 7: Try to click Generate Report
    console.log('\nStep 7: Looking for Generate Report button...');
    const generateClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('input[type="button"], button'));
      for (const btn of buttons) {
        const text = (btn.textContent || btn.value || '').toLowerCase();
        if (text.includes('generate')) {
          console.log('Found generate button:', text);
          btn.click();
          return { found: true, text };
        }
      }
      return { found: false };
    });
    
    console.log('Generate button result:', generateClicked);
    
    if (generateClicked.found) {
      console.log('Waiting for report to load...');
      await new Promise(r => setTimeout(r, 8000));
      await page.screenshot({ path: '/tmp/diag-5-after-generate.png', fullPage: true });
      console.log('Screenshot: /tmp/diag-5-after-generate.png');
      
      // Check for data
      const tableData = await page.evaluate(() => {
        const tables = Array.from(document.querySelectorAll('table'));
        for (const table of tables) {
          const rows = table.querySelectorAll('tr');
          if (rows.length > 1) {
            const dataRows = [];
            for (let i = 0; i < Math.min(5, rows.length); i++) {
              const cells = rows[i].querySelectorAll('td, th');
              dataRows.push(Array.from(cells).map(c => c.textContent?.trim()).slice(0, 8));
            }
            return { rowCount: rows.length, sample: dataRows };
          }
        }
        return { rowCount: 0, sample: [] };
      });
      
      console.log('\n=== Table Data ===');
      console.log(`Total rows: ${tableData.rowCount}`);
      console.log('Sample rows:');
      tableData.sample.forEach((row, i) => {
        console.log(`  Row ${i}: ${row.join(' | ')}`);
      });
    }
    
    console.log('\n=== Diagnostic Complete ===');
    
  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: '/tmp/diag-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

diagnose().catch(console.error);

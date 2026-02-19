#!/usr/bin/env npx tsx
/**
 * Transamerica Pending Policies Full Sync
 * Uses the same proven Puppeteer + Gmail OTP pattern as mywfg-full-sync.mjs
 */
import puppeteer from 'puppeteer';
import { waitForOTP, getTransamericaCredentials } from '../server/gmail-otp.ts';
import { getDb } from '../server/db.ts';
import { pendingPolicies, pendingRequirements } from '../drizzle/schema.ts';
import { eq } from 'drizzle-orm';

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
  username: mustGetEnv('TRANSAMERICA_USERNAME'),
  password: mustGetEnv('TRANSAMERICA_PASSWORD'),
};

console.log('[Transamerica Sync] Credentials validated.');

async function loginToTransamerica(page) {
  console.log('[Transamerica Sync] Navigating to Transamerica...');
  try {
    await page.goto('https://secure.transamerica.com/login/sign-in/login.html', { 
      waitUntil: 'networkidle0',
      timeout: 45000 
    });
  } catch (e) {
    console.log('[Transamerica Sync] Navigation timeout, continuing...');
  }
  
  await new Promise(r => setTimeout(r, 3000));

  console.log('[Transamerica Sync] Waiting for login form...');
  const usernameSelectors = [
    'input#username',
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
        console.log(`[Transamerica Sync] Found username input: ${selector}`);
        break;
      }
    } catch (e) {}
  }
  
  if (!usernameInput) {
    throw new Error('Could not find username input field');
  }

  console.log('[Transamerica Sync] Entering credentials...');
  await usernameInput.type(credentials.username, { delay: 100 });
  
  const passwordInput = await page.$('input#password') ||
                        await page.$('input[type="password"]');
  if (passwordInput) {
    await passwordInput.type(credentials.password, { delay: 100 });
  }

  await new Promise(r => setTimeout(r, 500));

  console.log('[Transamerica Sync] Clicking login...');
  
  // Wait for any loading overlay to disappear
  await page.evaluate(() => {
    const overlay = document.querySelector('.loadingOverlay, .loading, [class*="loading"]');
    if (overlay) overlay.style.display = 'none';
  });
  
  // Click login using JavaScript to avoid overlay issues
  await page.evaluate(() => {
    const btn = document.querySelector('#formLogin') || document.querySelector('button[type="submit"]');
    if (btn) btn.click();
  });
  
  // Wait for navigation
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  
  await page.screenshot({ path: '/home/ubuntu/ta-after-login.png' });
  console.log('[Transamerica Sync] Screenshot saved: /home/ubuntu/ta-after-login.png');
  
  await new Promise(r => setTimeout(r, 5000));
  
  // Check for OTP page
  const currentUrl = page.url();
  const pageContent = await page.content();
  const pageText = await page.evaluate(() => document.body.innerText);
  
  const otpRequired = currentUrl.includes('securityCode') || 
                      currentUrl.includes('macotp') ||
                      currentUrl.includes('OTP') ||
                      pageText.includes('Extra Security') ||
                      pageText.includes('Send code to');

  if (otpRequired) {
    console.log('[Transamerica Sync] OTP required, selecting email option...');
    await page.screenshot({ path: '/home/ubuntu/ta-otp-page.png' });
    console.log('[Transamerica Sync] Screenshot saved: /home/ubuntu/ta-otp-page.png');
    
    // Select email option - click the second radio button (email)
    const emailSelected = await page.evaluate(() => {
      // Get all radio buttons
      const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
      console.log('Found', radios.length, 'radio buttons');
      
      // Find the email radio button (usually the second one)
      for (let i = 0; i < radios.length; i++) {
        const radio = radios[i];
        const label = radio.closest('label') || document.querySelector(`label[for="${radio.id}"]`);
        const parentText = radio.parentElement?.textContent || label?.textContent || '';
        console.log(`Radio ${i}:`, parentText);
        
        if (parentText.toLowerCase().includes('email')) {
          // Click the radio input directly
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
          radio.click();
          return `Selected radio ${i}: ${parentText}`;
        }
      }
      
      // Fallback: just click the second radio if there are exactly 2
      if (radios.length === 2) {
        radios[1].checked = true;
        radios[1].dispatchEvent(new Event('change', { bubbles: true }));
        radios[1].click();
        return 'Selected second radio (fallback)';
      }
      
      return null;
    });
    console.log(`[Transamerica Sync] Email selection result: ${emailSelected}`);
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Click Submit to send OTP using JavaScript
    console.log('[Transamerica Sync] Clicking Submit button...');
    const submitClicked = await page.evaluate(() => {
      // Try multiple selectors for submit button
      const selectors = [
        'button#formSubmit',
        'button[type="submit"]',
        'input[type="submit"]',
        'button.submit',
        'button[value="Submit"]'
      ];
      for (const sel of selectors) {
        const btn = document.querySelector(sel);
        if (btn) {
          console.log('Found submit button:', sel);
          btn.click();
          return sel;
        }
      }
      // Fallback: find any button with Submit text
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        if (btn.textContent?.toLowerCase().includes('submit')) {
          btn.click();
          return 'button with Submit text';
        }
      }
      return null;
    });
    console.log(`[Transamerica Sync] Submit button clicked: ${submitClicked}`);
    
    await page.screenshot({ path: '/home/ubuntu/ta-after-submit.png' });
    console.log('[Transamerica Sync] Screenshot saved: /home/ubuntu/ta-after-submit.png');
    
    console.log('[Transamerica Sync] Waiting for OTP email...');
    await new Promise(r => setTimeout(r, 10000));
    
    const gmailCreds = getTransamericaCredentials();
    const otpResult = await waitForOTP(gmailCreds, 'transamerica', 120, 5);
    
    if (!otpResult.success || !otpResult.otp) {
      throw new Error(`Failed to get OTP: ${otpResult.error}`);
    }
    
    console.log(`[Transamerica Sync] ✓ OTP received: ${otpResult.otp}`);
    
    // Find and fill OTP input
    const otpInput = await page.$('input[name="otp"]') ||
                     await page.$('input[type="tel"]') ||
                     await page.$('input[type="text"]');
    
    if (!otpInput) {
      throw new Error('Could not find OTP input field');
    }
    
    await otpInput.type(otpResult.otp, { delay: 100 });
    
    // Click verify/submit using JavaScript
    await page.evaluate(() => {
      const verifyBtn = document.querySelector('button#formSubmit') ||
                        document.querySelector('button[type="submit"]');
      if (verifyBtn) verifyBtn.click();
    });
    
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  }

  console.log('[Transamerica Sync] ✓ Login successful');
}

async function navigateToLifeAccess(page) {
  console.log('[Transamerica Sync] Looking for Life Access...');
  await new Promise(r => setTimeout(r, 3000));
  
  // Find and click Launch button for Life Access
  const buttons = await page.$$('button');
  for (const button of buttons) {
    const text = await button.evaluate(el => el.textContent);
    if (text?.includes('Launch')) {
      const parentText = await button.evaluate(el => {
        const parent = el.closest('[class*="card"], [class*="tile"], div');
        return parent?.textContent || '';
      });
      if (parentText?.includes('Life Access')) {
        console.log('[Transamerica Sync] Clicking Life Access Launch...');
        await button.click();
        break;
      }
    }
  }
  
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 5000));
  console.log('[Transamerica Sync] ✓ Life Access loaded');
}

async function navigateToMyBook(page) {
  console.log('[Transamerica Sync] Navigating to My Book...');
  
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    for (const link of links) {
      if (link.textContent?.toLowerCase().includes('my book')) {
        link.click();
        return;
      }
    }
  });
  
  await new Promise(r => setTimeout(r, 5000));
  console.log('[Transamerica Sync] ✓ My Book loaded');
}

async function extractPendingPolicies(page) {
  console.log('[Transamerica Sync] Extracting pending policies...');
  
  const policies = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tbody tr, [class*="policy-row"], [class*="list-item"]'));
    return rows.map(row => {
      const cells = row.querySelectorAll('td, [class*="cell"]');
      const getText = (el) => el?.textContent?.trim() || '';
      
      return {
        status: getText(cells[0]),
        policyNumber: getText(cells[1]),
        ownerName: getText(cells[2]),
        submittedDate: getText(cells[3]),
        productType: getText(cells[4]),
        faceAmount: getText(cells[5]),
        premium: getText(cells[6]),
      };
    }).filter(p => p.policyNumber);
  });
  
  console.log(`[Transamerica Sync] Found ${policies.length} policies`);
  return policies;
}

async function savePolicyToDatabase(policy) {
  const db = getDb();
  
  // Parse face amount
  const faceAmountStr = policy.faceAmount?.replace(/[$,]/g, '') || '0';
  const faceAmount = parseFloat(faceAmountStr) || 0;
  
  // Parse premium
  const premiumStr = policy.premium?.replace(/[$,\/MoYr]/g, '') || '0';
  const premium = parseFloat(premiumStr) || 0;
  
  // Map status
  const statusMap = {
    'Issued': 'Issued',
    'Pending': 'Pending',
    'Incomplete': 'Incomplete',
    'Post Approval': 'Post Approval Processing',
    'Post Approval Processing': 'Post Approval Processing',
    'Declined': 'Declined',
    'Withdrawn': 'Withdrawn',
  };
  const status = statusMap[policy.status] || 'Pending';
  
  await db.insert(pendingPolicies).values({
    policyNumber: policy.policyNumber,
    ownerName: policy.ownerName,
    productType: policy.productType || 'Financial Foundation IUL',
    faceAmount: faceAmount,
    premium: premium,
    status: status,
    submittedDate: policy.submittedDate ? new Date(policy.submittedDate) : new Date(),
    syncedAt: new Date(),
  }).onDuplicateKeyUpdate({
    set: {
      ownerName: policy.ownerName,
      faceAmount: faceAmount,
      premium: premium,
      status: status,
      syncedAt: new Date(),
    }
  });
}

async function main() {
  console.log('=== Transamerica Pending Policies Full Sync ===');
  console.log(`Started at: ${new Date().toISOString()}`);
  
  const browser = await puppeteer.launch({
    executablePath: __chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Login
    await loginToTransamerica(page);
    
    // Navigate to Life Access
    await navigateToLifeAccess(page);
    
    // Navigate to My Book
    await navigateToMyBook(page);
    
    // Extract policies
    const policies = await extractPendingPolicies(page);
    
    // Save to database
    let savedCount = 0;
    for (const policy of policies) {
      try {
        await savePolicyToDatabase(policy);
        savedCount++;
      } catch (e) {
        console.error(`[Transamerica Sync] Failed to save ${policy.policyNumber}:`, e.message);
      }
    }
    
    console.log(`\n=== Sync Complete ===`);
    console.log(`Policies found: ${policies.length}`);
    console.log(`Policies saved: ${savedCount}`);
    console.log(`Finished at: ${new Date().toISOString()}`);
    
  } catch (error) {
    console.error('[Transamerica Sync] Error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();

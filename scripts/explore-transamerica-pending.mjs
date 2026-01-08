/**
 * Explore Transamerica Life Access portal to extract pending policy data
 * Navigation: Transamerica > Life Access > Launch > My Book > Pending > View My Book
 */

import puppeteer from 'puppeteer';
import { waitForOTP } from '../server/gmail-otp.ts';
import fs from 'fs';

// Get Transamerica login credentials from environment
function getTransamericaCredentials() {
  return {
    username: process.env.TRANSAMERICA_USERNAME || '',
    password: process.env.TRANSAMERICA_PASSWORD || '',
    email: process.env.TRANSAMERICA_EMAIL || '',
    appPassword: process.env.TRANSAMERICA_APP_PASSWORD || '',
  };
}

async function loginToTransamerica(page) {
  const creds = getTransamericaCredentials();
  
  console.log('[Transamerica] Navigating to login page...');
  await page.goto('https://www.transamerica.com/login', { waitUntil: 'networkidle2', timeout: 60000 });
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Take screenshot of login page
  await page.screenshot({ path: '/tmp/ta-login-page.png', fullPage: true });
  console.log('[Transamerica] Screenshot saved: /tmp/ta-login-page.png');
  
  // Look for login form
  const pageContent = await page.content();
  const pageText = await page.evaluate(() => document.body.innerText);
  
  console.log('[Transamerica] Page title:', await page.title());
  console.log('[Transamerica] Looking for login form...');
  
  // Try to find and fill username
  const usernameSelectors = [
    'input[name="username"]',
    'input[id="username"]',
    'input[type="email"]',
    'input[placeholder*="email"]',
    'input[placeholder*="username"]',
    'input[aria-label*="email"]',
    'input[aria-label*="username"]',
  ];
  
  let usernameInput = null;
  for (const selector of usernameSelectors) {
    usernameInput = await page.$(selector);
    if (usernameInput) {
      console.log(`[Transamerica] Found username input: ${selector}`);
      break;
    }
  }
  
  if (!usernameInput) {
    // Log all input fields for debugging
    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input')).map(i => ({
        type: i.type,
        name: i.name,
        id: i.id,
        placeholder: i.placeholder,
        ariaLabel: i.getAttribute('aria-label'),
      }));
    });
    console.log('[Transamerica] Available inputs:', JSON.stringify(inputs, null, 2));
    
    // Check if there's a different login flow
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({
        text: a.textContent?.trim(),
        href: a.href,
      })).filter(l => l.text?.toLowerCase().includes('login') || l.text?.toLowerCase().includes('sign in'));
    });
    console.log('[Transamerica] Login links:', JSON.stringify(links, null, 2));
    
    return false;
  }
  
  await usernameInput.click({ clickCount: 3 });
  await usernameInput.type(creds.username);
  
  // Find password input
  const passwordInput = await page.$('input[type="password"]');
  if (passwordInput) {
    await passwordInput.click({ clickCount: 3 });
    await passwordInput.type(creds.password);
  }
  
  // Find and click submit button
  const submitButton = await page.$('button[type="submit"]') || await page.$('input[type="submit"]');
  if (submitButton) {
    await Promise.all([
      submitButton.click(),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {}),
    ]);
  }
  
  await new Promise(r => setTimeout(r, 5000));
  
  // Check for OTP requirement
  const afterLoginContent = await page.content();
  const afterLoginText = await page.evaluate(() => document.body.innerText);
  
  if (afterLoginText.includes('verification') || afterLoginText.includes('code') || afterLoginText.includes('OTP')) {
    console.log('[Transamerica] OTP verification required...');
    
    const gmailCreds = {
      email: creds.email,
      appPassword: creds.appPassword,
    };
    
    const otpResult = await waitForOTP(gmailCreds, 'transamerica', 60, 5);
    
    if (otpResult.success && otpResult.otp) {
      console.log(`[Transamerica] OTP received: ${otpResult.otp}`);
      
      // Find OTP input and enter code
      const otpInput = await page.$('input[type="text"]') || await page.$('input[name="code"]');
      if (otpInput) {
        await otpInput.click({ clickCount: 3 });
        await otpInput.type(otpResult.otp);
        
        const verifyButton = await page.$('button[type="submit"]');
        if (verifyButton) {
          await Promise.all([
            verifyButton.click(),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {}),
          ]);
        }
      }
    }
  }
  
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: '/tmp/ta-after-login.png', fullPage: true });
  console.log('[Transamerica] Screenshot saved: /tmp/ta-after-login.png');
  
  return true;
}

async function navigateToLifeAccess(page) {
  console.log('[Transamerica] Looking for Life Access link...');
  
  // Take screenshot of current page
  await page.screenshot({ path: '/tmp/ta-dashboard.png', fullPage: true });
  
  // Look for "Transamerica Life Access" link
  const clicked = await page.evaluate(() => {
    const links = document.querySelectorAll('a, button, div[role="button"]');
    for (const link of links) {
      const text = link.textContent?.toLowerCase() || '';
      if (text.includes('life access') || text.includes('lifeaccess')) {
        link.click();
        return true;
      }
    }
    return false;
  });
  
  if (clicked) {
    console.log('[Transamerica] Clicked Life Access link');
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: '/tmp/ta-life-access.png', fullPage: true });
  } else {
    console.log('[Transamerica] Life Access link not found');
    
    // Log available links
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({
        text: a.textContent?.trim().substring(0, 50),
        href: a.href,
      })).filter(l => l.text && l.text.length > 0);
    });
    console.log('[Transamerica] Available links:', JSON.stringify(links.slice(0, 20), null, 2));
  }
  
  return clicked;
}

async function navigateToMyBook(page) {
  console.log('[Transamerica] Looking for My Book > Pending...');
  
  // Look for "My Book" or "Pending" link
  const clicked = await page.evaluate(() => {
    const links = document.querySelectorAll('a, button, div[role="button"], span');
    for (const link of links) {
      const text = link.textContent?.toLowerCase() || '';
      if (text.includes('my book') || text.includes('pending')) {
        link.click();
        return text;
      }
    }
    return null;
  });
  
  if (clicked) {
    console.log(`[Transamerica] Clicked: ${clicked}`);
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: '/tmp/ta-my-book.png', fullPage: true });
  }
  
  return clicked;
}

async function extractPendingPolicies(page) {
  console.log('[Transamerica] Extracting pending policies...');
  
  // Look for "View My Book" button
  const viewMyBookClicked = await page.evaluate(() => {
    const buttons = document.querySelectorAll('a, button');
    for (const btn of buttons) {
      const text = btn.textContent?.toLowerCase() || '';
      if (text.includes('view my book') || text.includes('view')) {
        btn.click();
        return true;
      }
    }
    return false;
  });
  
  if (viewMyBookClicked) {
    console.log('[Transamerica] Clicked View My Book');
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: '/tmp/ta-pending-list.png', fullPage: true });
  }
  
  // Extract policy data from the page
  const policies = await page.evaluate(() => {
    const results = [];
    
    // Look for table rows or card elements
    const rows = document.querySelectorAll('tr, .policy-card, .policy-item, [data-policy]');
    
    for (const row of rows) {
      const text = row.textContent || '';
      const cells = row.querySelectorAll('td, .cell, span');
      
      if (cells.length > 0) {
        results.push({
          text: text.substring(0, 200),
          cellCount: cells.length,
        });
      }
    }
    
    return results;
  });
  
  console.log('[Transamerica] Found policies:', policies.length);
  
  return policies;
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  try {
    // First, let's try the direct Life Access URL
    console.log('[Transamerica] Trying direct Life Access URL...');
    await page.goto('https://lifeaccess.transamerica.com', { waitUntil: 'networkidle2', timeout: 60000 });
    
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: '/tmp/ta-lifeaccess-direct.png', fullPage: true });
    console.log('[Transamerica] Screenshot saved: /tmp/ta-lifeaccess-direct.png');
    
    // Log page content
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('[Transamerica] Page text (first 1000 chars):', pageText.substring(0, 1000));
    
    // Check if we need to login
    const needsLogin = pageText.toLowerCase().includes('sign in') || 
                       pageText.toLowerCase().includes('login') ||
                       pageText.toLowerCase().includes('username');
    
    if (needsLogin) {
      console.log('[Transamerica] Login required...');
      
      // Look for login form
      const inputs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input')).map(i => ({
          type: i.type,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder,
        }));
      });
      console.log('[Transamerica] Input fields:', JSON.stringify(inputs, null, 2));
      
      // Try to login
      const creds = getTransamericaCredentials();
      
      // Find username field
      const usernameInput = await page.$('input[name="username"]') ||
                           await page.$('input[id="username"]') ||
                           await page.$('input[type="text"]');
      
      if (usernameInput) {
        await usernameInput.click({ clickCount: 3 });
        await usernameInput.type(creds.username);
        console.log('[Transamerica] Entered username');
      }
      
      // Find password field
      const passwordInput = await page.$('input[type="password"]');
      if (passwordInput) {
        await passwordInput.click({ clickCount: 3 });
        await passwordInput.type(creds.password);
        console.log('[Transamerica] Entered password');
      }
      
      // Find submit button
      const submitBtn = await page.$('button[type="submit"]') ||
                       await page.$('input[type="submit"]') ||
                       await page.$('button');
      
      if (submitBtn) {
        console.log('[Transamerica] Clicking submit...');
        await Promise.all([
          submitBtn.click(),
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {}),
        ]);
      }
      
      await new Promise(r => setTimeout(r, 5000));
      await page.screenshot({ path: '/tmp/ta-after-submit.png', fullPage: true });
      console.log('[Transamerica] Screenshot saved: /tmp/ta-after-submit.png');
      
      // Check for OTP
      const afterSubmitText = await page.evaluate(() => document.body.innerText);
      console.log('[Transamerica] After submit (first 500 chars):', afterSubmitText.substring(0, 500));
      
      if (afterSubmitText.toLowerCase().includes('verification') || 
          afterSubmitText.toLowerCase().includes('code') ||
          afterSubmitText.toLowerCase().includes('one-time')) {
        console.log('[Transamerica] OTP required, waiting for email...');
        
        const gmailCreds = {
          email: creds.email,
          appPassword: creds.appPassword,
        };
        
        const otpResult = await waitForOTP(gmailCreds, 'transamerica', 90, 5);
        
        if (otpResult.success && otpResult.otp) {
          console.log(`[Transamerica] OTP received: ${otpResult.otp}`);
          
          // Find and fill OTP input
          const otpInput = await page.$('input[type="text"]') ||
                          await page.$('input[name="code"]') ||
                          await page.$('input[name="otp"]');
          
          if (otpInput) {
            await otpInput.click({ clickCount: 3 });
            await otpInput.type(otpResult.otp);
            
            // Submit OTP
            const verifyBtn = await page.$('button[type="submit"]') || await page.$('button');
            if (verifyBtn) {
              await Promise.all([
                verifyBtn.click(),
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {}),
              ]);
            }
          }
          
          await new Promise(r => setTimeout(r, 5000));
          await page.screenshot({ path: '/tmp/ta-after-otp.png', fullPage: true });
          console.log('[Transamerica] Screenshot saved: /tmp/ta-after-otp.png');
        }
      }
    }
    
    // Now look for My Book / Pending
    const currentText = await page.evaluate(() => document.body.innerText);
    console.log('[Transamerica] Current page (first 1500 chars):', currentText.substring(0, 1500));
    
    // Look for navigation elements
    const navItems = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a, button, [role="menuitem"], nav *')).map(el => ({
        tag: el.tagName,
        text: el.textContent?.trim().substring(0, 50),
        href: el.href || '',
      })).filter(item => item.text && item.text.length > 0);
    });
    console.log('[Transamerica] Navigation items:', JSON.stringify(navItems.slice(0, 30), null, 2));
    
  } catch (error) {
    console.error('[Transamerica] Error:', error.message);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

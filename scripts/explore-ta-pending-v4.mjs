/**
 * Explore Transamerica Life Access portal to extract pending policy data
 * Complete version with OTP selection and verification flow
 */

import puppeteer from 'puppeteer';
import { waitForOTP, getTransamericaCredentials } from '../server/gmail-otp.ts';

// Get Transamerica login credentials from environment
function getTransamericaLoginCredentials() {
  return {
    username: process.env.TRANSAMERICA_USERNAME || '',
    password: process.env.TRANSAMERICA_PASSWORD || '',
  };
}

async function loginToTransamerica(page) {
  console.log('[Transamerica] Starting automated login...');
  
  // Navigate to Transamerica login page
  console.log('[Transamerica] Navigating to login page...');
  await page.goto('https://secure.transamerica.com/login/sign-in/login.html', { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  
  // Get credentials
  const credentials = getTransamericaLoginCredentials();
  console.log('[Transamerica] Using username:', credentials.username);
  
  if (!credentials.username || !credentials.password) {
    throw new Error('Transamerica credentials not configured');
  }
  
  // Wait for login form - use specific ID selectors
  await page.waitForSelector('#username', { timeout: 10000 });
  console.log('[Transamerica] Found username field');
  
  // Clear and fill username using the specific ID selector
  console.log('[Transamerica] Entering username...');
  await page.click('#username', { clickCount: 3 });
  await page.type('#username', credentials.username, { delay: 50 });
  
  // Clear and fill password using the specific ID selector
  console.log('[Transamerica] Entering password...');
  await page.click('#password', { clickCount: 3 });
  await page.type('#password', credentials.password, { delay: 50 });
  
  // Find and click the LOGIN button
  console.log('[Transamerica] Clicking LOGIN button...');
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('button, input[type="submit"]');
    for (const btn of buttons) {
      const text = btn.textContent?.trim().toUpperCase() || btn.value?.toUpperCase() || '';
      if (text === 'LOGIN') {
        btn.click();
        return;
      }
    }
  });
  
  // Wait for navigation
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check if we're on the OTP selection page
  const pageUrl = page.url();
  const pageText = await page.evaluate(() => document.body.innerText);
  
  console.log('[Transamerica] Current URL:', pageUrl);
  
  if (pageUrl.includes('securityCodeDelivery') || pageText.includes('Extra Security Step Required')) {
    console.log('[Transamerica] OTP selection page detected');
    
    // Select email option (second radio button)
    console.log('[Transamerica] Selecting email option for OTP...');
    
    // Find and click the email radio button
    const emailSelected = await page.evaluate(() => {
      const radios = document.querySelectorAll('input[type="radio"]');
      for (const radio of radios) {
        const label = radio.parentElement?.textContent || '';
        if (label.toLowerCase().includes('email')) {
          radio.click();
          return true;
        }
      }
      // If no email option found, try the second radio
      if (radios.length >= 2) {
        radios[1].click();
        return true;
      }
      return false;
    });
    
    console.log('[Transamerica] Email option selected:', emailSelected);
    
    await page.screenshot({ path: '/tmp/ta-v4-otp-selected.png', fullPage: true });
    
    // Click SUBMIT button
    console.log('[Transamerica] Clicking SUBMIT button...');
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, input[type="submit"]');
      for (const btn of buttons) {
        const text = btn.textContent?.trim().toUpperCase() || btn.value?.toUpperCase() || '';
        if (text === 'SUBMIT') {
          btn.click();
          return;
        }
      }
    });
    
    // Wait for OTP entry page
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await page.screenshot({ path: '/tmp/ta-v4-otp-entry.png', fullPage: true });
    console.log('[Transamerica] Screenshot saved: /tmp/ta-v4-otp-entry.png');
    
    // Now wait for OTP from email
    console.log('[Transamerica] Waiting for OTP email...');
    const gmailCreds = getTransamericaCredentials();
    const otpResult = await waitForOTP(gmailCreds, 'transamerica', 90, 5);
    
    if (!otpResult.success || !otpResult.otp) {
      throw new Error(`Failed to get OTP: ${otpResult.error}`);
    }
    
    console.log(`[Transamerica] OTP received: ${otpResult.otp}`);
    
    // Find and enter OTP
    const otpEntered = await page.evaluate((otp) => {
      // Look for OTP input field
      const inputs = document.querySelectorAll('input[type="text"], input[type="tel"], input[inputmode="numeric"]');
      for (const input of inputs) {
        const name = input.name?.toLowerCase() || '';
        const id = input.id?.toLowerCase() || '';
        const placeholder = input.placeholder?.toLowerCase() || '';
        if (name.includes('code') || name.includes('otp') || id.includes('code') || id.includes('otp') || 
            placeholder.includes('code') || placeholder.includes('enter')) {
          input.value = otp;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      // Fallback: use first visible text input
      for (const input of inputs) {
        if (input.offsetParent !== null) { // Check if visible
          input.value = otp;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    }, otpResult.otp);
    
    console.log('[Transamerica] OTP entered:', otpEntered);
    
    await page.screenshot({ path: '/tmp/ta-v4-otp-filled.png', fullPage: true });
    
    // Submit OTP
    console.log('[Transamerica] Submitting OTP...');
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, input[type="submit"]');
      for (const btn of buttons) {
        const text = btn.textContent?.trim().toUpperCase() || btn.value?.toUpperCase() || '';
        if (text === 'SUBMIT' || text === 'VERIFY' || text === 'CONTINUE') {
          btn.click();
          return;
        }
      }
    });
    
    // Wait for login to complete
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  await page.screenshot({ path: '/tmp/ta-v4-after-otp.png', fullPage: true });
  console.log('[Transamerica] Screenshot saved: /tmp/ta-v4-after-otp.png');
  
  // Verify login success
  const finalUrl = page.url();
  const finalText = await page.evaluate(() => document.body.innerText);
  
  console.log('[Transamerica] Final URL:', finalUrl);
  console.log('[Transamerica] Final page text (first 500 chars):', finalText.substring(0, 500));
  
  const loginSuccess = !finalUrl.includes('sign-in/login') && 
                       !finalUrl.includes('securityCode') &&
                       !finalText.toLowerCase().includes('invalid credentials');
  
  console.log('[Transamerica] Login successful:', loginSuccess);
  
  return loginSuccess;
}

async function navigateToLifeAccess(page) {
  console.log('[Transamerica] Looking for Life Access...');
  
  // First check if we're on the dashboard
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('[Transamerica] Current page text (first 1000 chars):', pageText.substring(0, 1000));
  
  // Look for Life Access link on the dashboard
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.textContent?.trim().substring(0, 80),
      href: a.href,
    })).filter(l => l.text && l.text.length > 0);
  });
  console.log('[Transamerica] Available links:', JSON.stringify(links.slice(0, 30), null, 2));
  
  // Try to find and click Life Access link
  const clicked = await page.evaluate(() => {
    const links = document.querySelectorAll('a');
    for (const link of links) {
      const text = link.textContent?.toLowerCase() || '';
      const href = link.href?.toLowerCase() || '';
      if (text.includes('life access') || text.includes('lifeaccess') || href.includes('lifeaccess')) {
        link.click();
        return link.textContent?.trim();
      }
    }
    return null;
  });
  
  if (clicked) {
    console.log('[Transamerica] Clicked Life Access link:', clicked);
    await new Promise(resolve => setTimeout(resolve, 5000));
    await page.screenshot({ path: '/tmp/ta-v4-life-access.png', fullPage: true });
    return true;
  }
  
  // Try clicking "Launch" button if present
  const launchClicked = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button, a');
    for (const btn of buttons) {
      const text = btn.textContent?.toLowerCase() || '';
      if (text.includes('launch')) {
        btn.click();
        return true;
      }
    }
    return false;
  });
  
  if (launchClicked) {
    console.log('[Transamerica] Clicked Launch button');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await page.screenshot({ path: '/tmp/ta-v4-after-launch.png', fullPage: true });
  }
  
  return true;
}

async function navigateToMyBookPending(page) {
  console.log('[Transamerica] Looking for My Book > Pending...');
  
  await page.screenshot({ path: '/tmp/ta-v4-before-mybook.png', fullPage: true });
  
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('[Transamerica] Current page text (first 2000 chars):', pageText.substring(0, 2000));
  
  // Look for navigation elements
  const navItems = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a, button, [role="menuitem"], .nav-item, .menu-item, span')).map(el => ({
      tag: el.tagName,
      text: el.textContent?.trim().substring(0, 50),
      href: el.href || '',
    })).filter(item => item.text && item.text.length > 0 && item.text.length < 50);
  });
  console.log('[Transamerica] Navigation items:', JSON.stringify(navItems.slice(0, 40), null, 2));
  
  // Try to click "My Book"
  let clicked = await page.evaluate(() => {
    const elements = document.querySelectorAll('a, button, span, div, li');
    for (const el of elements) {
      const text = el.textContent?.trim() || '';
      if (text.toLowerCase() === 'my book' || text.toLowerCase().includes('my book')) {
        el.click();
        return text;
      }
    }
    return null;
  });
  
  if (clicked) {
    console.log(`[Transamerica] Clicked: ${clicked}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: '/tmp/ta-v4-my-book.png', fullPage: true });
  }
  
  // Look for "Pending" section
  clicked = await page.evaluate(() => {
    const elements = document.querySelectorAll('a, button, span, div, td, li');
    for (const el of elements) {
      const text = el.textContent?.trim() || '';
      if (text.toLowerCase() === 'pending' || (text.toLowerCase().includes('pending') && text.length < 30)) {
        el.click();
        return text;
      }
    }
    return null;
  });
  
  if (clicked) {
    console.log(`[Transamerica] Clicked: ${clicked}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: '/tmp/ta-v4-pending.png', fullPage: true });
  }
  
  // Look for "View My Book" button
  clicked = await page.evaluate(() => {
    const elements = document.querySelectorAll('a, button');
    for (const el of elements) {
      const text = el.textContent?.trim().toLowerCase() || '';
      if (text.includes('view my book') || (text.includes('view') && text.length < 20)) {
        el.click();
        return el.textContent?.trim();
      }
    }
    return null;
  });
  
  if (clicked) {
    console.log(`[Transamerica] Clicked: ${clicked}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: '/tmp/ta-v4-view-my-book.png', fullPage: true });
  }
  
  return true;
}

async function extractPendingPolicies(page) {
  console.log('[Transamerica] Extracting pending policies...');
  
  await page.screenshot({ path: '/tmp/ta-v4-pending-list.png', fullPage: true });
  
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('[Transamerica] Page content:', pageText.substring(0, 4000));
  
  // Look for policy data in tables
  const tableData = await page.evaluate(() => {
    const tables = document.querySelectorAll('table');
    const data = [];
    
    tables.forEach((table, tableIndex) => {
      const rows = table.querySelectorAll('tr');
      rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('td, th');
        const rowData = Array.from(cells).map(cell => cell.textContent?.trim());
        if (rowData.length > 0 && rowData.some(cell => cell && cell.length > 0)) {
          data.push({ tableIndex, rowIndex, cells: rowData });
        }
      });
    });
    
    return data;
  });
  
  console.log('[Transamerica] Table data:', JSON.stringify(tableData.slice(0, 30), null, 2));
  
  return tableData;
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  // Set user agent to avoid bot detection
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  try {
    // Login to Transamerica
    const loginSuccess = await loginToTransamerica(page);
    
    if (loginSuccess) {
      // Navigate to Life Access
      await navigateToLifeAccess(page);
      
      // Navigate to My Book > Pending
      await navigateToMyBookPending(page);
      
      // Extract pending policies
      await extractPendingPolicies(page);
    } else {
      console.log('[Transamerica] Login failed, cannot proceed');
    }
    
  } catch (error) {
    console.error('[Transamerica] Error:', error.message);
    await page.screenshot({ path: '/tmp/ta-v4-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

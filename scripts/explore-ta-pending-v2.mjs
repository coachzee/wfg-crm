/**
 * Explore Transamerica Life Access portal to extract pending policy data
 * Uses the working login flow from auto-login-transamerica.ts
 * Navigation: secure.transamerica.com > Life Access > Launch > My Book > Pending > View My Book
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
  
  // Navigate to Transamerica login page (using the working URL)
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
  
  // Take screenshot of login page
  await page.screenshot({ path: '/tmp/ta-login-v2.png', fullPage: true });
  console.log('[Transamerica] Screenshot saved: /tmp/ta-login-v2.png');
  
  // Wait for login form - using more specific selectors
  await page.waitForSelector('input', { timeout: 10000 });
  
  // Get all input fields to understand the form
  const inputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input')).map(i => ({
      type: i.type,
      name: i.name,
      id: i.id,
      placeholder: i.placeholder,
      className: i.className,
    }));
  });
  console.log('[Transamerica] Input fields:', JSON.stringify(inputs, null, 2));
  
  // Fill in username using evaluate to handle the form directly
  console.log('[Transamerica] Entering username...');
  await page.evaluate((username) => {
    const usernameInput = document.querySelector('input[type="text"]') || 
                          document.querySelector('input[name="username"]') ||
                          document.querySelector('input:not([type="password"]):not([type="submit"]):not([type="hidden"])');
    if (usernameInput) {
      usernameInput.value = username;
      usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
      usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, credentials.username);
  
  // Fill in password
  console.log('[Transamerica] Entering password...');
  await page.evaluate((password) => {
    const passwordInput = document.querySelector('input[type="password"]');
    if (passwordInput) {
      passwordInput.value = password;
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, credentials.password);
  
  // Take screenshot before clicking login
  await page.screenshot({ path: '/tmp/ta-before-login.png', fullPage: true });
  console.log('[Transamerica] Screenshot saved: /tmp/ta-before-login.png');
  
  // Click login button using evaluate
  console.log('[Transamerica] Clicking login button...');
  await page.evaluate(() => {
    const loginBtn = document.querySelector('button[type="submit"]') ||
                     document.querySelector('input[type="submit"]') ||
                     document.querySelector('button.login-btn') ||
                     document.querySelector('button');
    if (loginBtn) {
      loginBtn.click();
    }
  });
  
  // Wait for page to load after login
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  
  // Check if OTP is required
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await page.screenshot({ path: '/tmp/ta-after-login-click.png', fullPage: true });
  console.log('[Transamerica] Screenshot saved: /tmp/ta-after-login-click.png');
  
  const pageContent = await page.content();
  const pageUrl = page.url();
  const pageText = await page.evaluate(() => document.body.innerText);
  
  console.log('[Transamerica] Current URL:', pageUrl);
  console.log('[Transamerica] Page text (first 500 chars):', pageText.substring(0, 500));
  
  const otpRequired = pageContent.toLowerCase().includes('verification') || 
                      pageContent.toLowerCase().includes('one-time') || 
                      pageContent.toLowerCase().includes('security code') ||
                      pageContent.toLowerCase().includes('enter the code') ||
                      pageUrl.includes('mfa') ||
                      pageUrl.includes('verify');
  
  if (otpRequired) {
    console.log('[Transamerica] OTP verification required, waiting for email...');
    
    // Get Gmail credentials for OTP
    const gmailCreds = getTransamericaCredentials();
    
    // Wait for OTP email
    const otpResult = await waitForOTP(gmailCreds, 'transamerica', 90, 5);
    
    if (!otpResult.success || !otpResult.otp) {
      throw new Error(`Failed to get OTP: ${otpResult.error}`);
    }
    
    console.log(`[Transamerica] OTP received: ${otpResult.otp}`);
    
    // Find and enter OTP using evaluate
    await page.evaluate((otp) => {
      const otpInput = document.querySelector('input[name="otp"]') ||
                       document.querySelector('input[name="code"]') ||
                       document.querySelector('input[type="tel"]') ||
                       document.querySelector('input[inputmode="numeric"]') ||
                       document.querySelector('input:not([type="hidden"])');
      if (otpInput) {
        otpInput.value = otp;
        otpInput.dispatchEvent(new Event('input', { bubbles: true }));
        otpInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, otpResult.otp);
    
    // Submit OTP
    await page.evaluate(() => {
      const submitBtn = document.querySelector('button[type="submit"]') ||
                        document.querySelector('input[type="submit"]') ||
                        document.querySelector('button');
      if (submitBtn) {
        submitBtn.click();
      }
    });
    
    // Wait for successful login
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  }
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  await page.screenshot({ path: '/tmp/ta-logged-in.png', fullPage: true });
  console.log('[Transamerica] Screenshot saved: /tmp/ta-logged-in.png');
  
  return true;
}

async function navigateToLifeAccess(page) {
  console.log('[Transamerica] Looking for Life Access...');
  
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('[Transamerica] Current page text (first 1000 chars):', pageText.substring(0, 1000));
  
  // Look for Life Access link
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.textContent?.trim().substring(0, 50),
      href: a.href,
    })).filter(l => l.text && l.text.length > 0);
  });
  console.log('[Transamerica] Available links:', JSON.stringify(links.slice(0, 20), null, 2));
  
  // Try to find and click Life Access link
  const clicked = await page.evaluate(() => {
    const links = document.querySelectorAll('a, button');
    for (const link of links) {
      const text = link.textContent?.toLowerCase() || '';
      const href = link.href?.toLowerCase() || '';
      if (text.includes('life access') || text.includes('lifeaccess') || href.includes('lifeaccess')) {
        link.click();
        return true;
      }
    }
    return false;
  });
  
  if (clicked) {
    console.log('[Transamerica] Clicked Life Access link');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await page.screenshot({ path: '/tmp/ta-life-access-page.png', fullPage: true });
    console.log('[Transamerica] Screenshot saved: /tmp/ta-life-access-page.png');
    return true;
  }
  
  // Try direct navigation to Life Access
  console.log('[Transamerica] Trying direct navigation to Life Access...');
  await page.goto('https://lifeaccess.transamerica.com', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 3000));
  await page.screenshot({ path: '/tmp/ta-life-access-direct.png', fullPage: true });
  console.log('[Transamerica] Screenshot saved: /tmp/ta-life-access-direct.png');
  
  return true;
}

async function navigateToMyBook(page) {
  console.log('[Transamerica] Looking for My Book > Pending...');
  
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('[Transamerica] Current page text (first 1500 chars):', pageText.substring(0, 1500));
  
  // Look for navigation elements
  const navItems = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a, button, [role="menuitem"], nav *, .nav-item, .menu-item')).map(el => ({
      tag: el.tagName,
      text: el.textContent?.trim().substring(0, 50),
      href: el.href || '',
      className: el.className,
    })).filter(item => item.text && item.text.length > 0);
  });
  console.log('[Transamerica] Navigation items:', JSON.stringify(navItems.slice(0, 30), null, 2));
  
  // Try to click "My Book"
  let clicked = await page.evaluate(() => {
    const elements = document.querySelectorAll('a, button, span, div');
    for (const el of elements) {
      const text = el.textContent?.trim().toLowerCase() || '';
      if (text === 'my book' || text.includes('my book')) {
        el.click();
        return 'my book';
      }
    }
    return null;
  });
  
  if (clicked) {
    console.log(`[Transamerica] Clicked: ${clicked}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: '/tmp/ta-my-book.png', fullPage: true });
    console.log('[Transamerica] Screenshot saved: /tmp/ta-my-book.png');
  }
  
  // Look for "Pending" section
  clicked = await page.evaluate(() => {
    const elements = document.querySelectorAll('a, button, span, div, td');
    for (const el of elements) {
      const text = el.textContent?.trim().toLowerCase() || '';
      if (text === 'pending' || (text.includes('pending') && text.length < 20)) {
        el.click();
        return 'pending';
      }
    }
    return null;
  });
  
  if (clicked) {
    console.log(`[Transamerica] Clicked: ${clicked}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: '/tmp/ta-pending.png', fullPage: true });
    console.log('[Transamerica] Screenshot saved: /tmp/ta-pending.png');
  }
  
  // Look for "View My Book" button
  clicked = await page.evaluate(() => {
    const elements = document.querySelectorAll('a, button');
    for (const el of elements) {
      const text = el.textContent?.trim().toLowerCase() || '';
      if (text.includes('view my book') || text.includes('view') && text.length < 20) {
        el.click();
        return el.textContent?.trim();
      }
    }
    return null;
  });
  
  if (clicked) {
    console.log(`[Transamerica] Clicked: ${clicked}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: '/tmp/ta-view-my-book.png', fullPage: true });
    console.log('[Transamerica] Screenshot saved: /tmp/ta-view-my-book.png');
  }
  
  return true;
}

async function extractPendingPolicies(page) {
  console.log('[Transamerica] Extracting pending policies...');
  
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('[Transamerica] Page content:', pageText.substring(0, 3000));
  
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
  
  console.log('[Transamerica] Table data:', JSON.stringify(tableData.slice(0, 20), null, 2));
  
  // Look for policy cards or list items
  const policyItems = await page.evaluate(() => {
    const items = document.querySelectorAll('.policy-item, .card, [data-policy], .list-item, .row');
    return Array.from(items).slice(0, 20).map(item => ({
      text: item.textContent?.trim().substring(0, 200),
      className: item.className,
    }));
  });
  
  console.log('[Transamerica] Policy items:', JSON.stringify(policyItems.slice(0, 10), null, 2));
  
  return { tableData, policyItems };
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
    await loginToTransamerica(page);
    
    // Navigate to Life Access
    await navigateToLifeAccess(page);
    
    // Navigate to My Book > Pending
    await navigateToMyBook(page);
    
    // Extract pending policies
    await extractPendingPolicies(page);
    
  } catch (error) {
    console.error('[Transamerica] Error:', error.message);
    await page.screenshot({ path: '/tmp/ta-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

/**
 * Explore Transamerica Life Access portal to extract pending policy data
 * Fixed version with correct form selectors
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
  await page.click('#username', { clickCount: 3 }); // Select all
  await page.type('#username', credentials.username, { delay: 50 });
  
  // Clear and fill password using the specific ID selector
  console.log('[Transamerica] Entering password...');
  await page.click('#password', { clickCount: 3 }); // Select all
  await page.type('#password', credentials.password, { delay: 50 });
  
  // Take screenshot before clicking login
  await page.screenshot({ path: '/tmp/ta-v3-before-login.png', fullPage: true });
  console.log('[Transamerica] Screenshot saved: /tmp/ta-v3-before-login.png');
  
  // Verify the fields are filled
  const usernameValue = await page.$eval('#username', el => el.value);
  const passwordValue = await page.$eval('#password', el => el.value);
  console.log('[Transamerica] Username field value:', usernameValue);
  console.log('[Transamerica] Password field filled:', passwordValue.length > 0);
  
  // Find and click the LOGIN button specifically (not any button)
  console.log('[Transamerica] Looking for LOGIN button...');
  
  // The login button has text "LOGIN" - find it specifically
  const loginButtonClicked = await page.evaluate(() => {
    // Find button with text LOGIN
    const buttons = document.querySelectorAll('button, input[type="submit"]');
    for (const btn of buttons) {
      const text = btn.textContent?.trim().toUpperCase() || btn.value?.toUpperCase() || '';
      if (text === 'LOGIN') {
        console.log('Found LOGIN button:', btn);
        btn.click();
        return true;
      }
    }
    // Fallback: find button in the login form
    const form = document.querySelector('form');
    if (form) {
      const formBtn = form.querySelector('button, input[type="submit"]');
      if (formBtn) {
        formBtn.click();
        return true;
      }
    }
    return false;
  });
  
  console.log('[Transamerica] Login button clicked:', loginButtonClicked);
  
  // Wait for page to load after login
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {
    console.log('[Transamerica] Navigation timeout - checking page state...');
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await page.screenshot({ path: '/tmp/ta-v3-after-login.png', fullPage: true });
  console.log('[Transamerica] Screenshot saved: /tmp/ta-v3-after-login.png');
  
  const pageUrl = page.url();
  const pageText = await page.evaluate(() => document.body.innerText);
  
  console.log('[Transamerica] Current URL:', pageUrl);
  console.log('[Transamerica] Page text (first 500 chars):', pageText.substring(0, 500));
  
  // Check if OTP is required
  const otpRequired = pageText.toLowerCase().includes('verification') || 
                      pageText.toLowerCase().includes('one-time') || 
                      pageText.toLowerCase().includes('security code') ||
                      pageText.toLowerCase().includes('enter the code') ||
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
    
    // Find and enter OTP
    const otpSelectors = [
      'input[name="otp"]',
      'input[name="code"]',
      'input[name="verificationCode"]',
      'input[type="tel"]',
      'input[inputmode="numeric"]',
      '.otp-input',
      '#otp',
      '#code'
    ];
    
    for (const selector of otpSelectors) {
      const otpInput = await page.$(selector);
      if (otpInput) {
        await otpInput.click({ clickCount: 3 });
        await otpInput.type(otpResult.otp, { delay: 100 });
        console.log(`[Transamerica] OTP entered using selector: ${selector}`);
        break;
      }
    }
    
    // Submit OTP
    const submitBtn = await page.$('button[type="submit"]') || await page.$('button');
    if (submitBtn) {
      await submitBtn.click();
    }
    
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  }
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  await page.screenshot({ path: '/tmp/ta-v3-logged-in.png', fullPage: true });
  console.log('[Transamerica] Screenshot saved: /tmp/ta-v3-logged-in.png');
  
  // Check if login was successful
  const finalUrl = page.url();
  const finalText = await page.evaluate(() => document.body.innerText);
  
  const loginSuccess = !finalUrl.includes('sign-in/login') && 
                       !finalText.toLowerCase().includes('invalid credentials');
  
  console.log('[Transamerica] Login successful:', loginSuccess);
  console.log('[Transamerica] Final URL:', finalUrl);
  
  return loginSuccess;
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
    const links = document.querySelectorAll('a');
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
    await page.screenshot({ path: '/tmp/ta-v3-life-access.png', fullPage: true });
    return true;
  }
  
  // Try direct navigation to Life Access
  console.log('[Transamerica] Trying direct navigation to Life Access...');
  await page.goto('https://lifeaccess.transamerica.com', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 3000));
  await page.screenshot({ path: '/tmp/ta-v3-life-access-direct.png', fullPage: true });
  
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
    })).filter(item => item.text && item.text.length > 0);
  });
  console.log('[Transamerica] Navigation items:', JSON.stringify(navItems.slice(0, 30), null, 2));
  
  return true;
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
      await navigateToMyBook(page);
    }
    
  } catch (error) {
    console.error('[Transamerica] Error:', error.message);
    await page.screenshot({ path: '/tmp/ta-v3-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

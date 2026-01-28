import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import puppeteer, { Browser, Page } from 'puppeteer';

describe('Transamerica Login', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  }, 30000);

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  it('should have Transamerica credentials configured', () => {
    const username = process.env.TRANSAMERICA_USERNAME;
    const password = process.env.TRANSAMERICA_PASSWORD;
    
    expect(username).toBeDefined();
    expect(username).not.toBe('');
    expect(password).toBeDefined();
    expect(password).not.toBe('');
    
    // Verify username format (should be lowercase alphanumeric)
    expect(username?.toLowerCase()).toBe(username);
  });

  it('should be able to reach Transamerica login page', async () => {
    await page.goto('https://secure.transamerica.com/login/sign-in/login.html', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Verify we're on the login page
    const pageTitle = await page.title();
    const pageContent = await page.content();
    
    // Check for login form elements
    const hasUsernameField = pageContent.includes('username') || pageContent.includes('Username');
    const hasPasswordField = pageContent.includes('password') || pageContent.includes('Password');
    
    expect(hasUsernameField || hasPasswordField).toBe(true);
  }, 60000);

  it('should be able to submit login form without errors', async () => {
    const username = process.env.TRANSAMERICA_USERNAME || '';
    const password = process.env.TRANSAMERICA_PASSWORD || '';
    
    // Navigate to login page
    await page.goto('https://secure.transamerica.com/login/sign-in/login.html', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for form to load
    await page.waitForSelector('input', { timeout: 10000 });
    
    // Fill in credentials using evaluate for reliability
    await page.evaluate((user, pass) => {
      const usernameInput = document.querySelector('input[type="text"]') as HTMLInputElement ||
                            document.querySelector('input[name="username"]') as HTMLInputElement ||
                            document.querySelector('#username') as HTMLInputElement;
      const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
      
      if (usernameInput) {
        usernameInput.value = user;
        usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (passwordInput) {
        passwordInput.value = pass;
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, username, password);
    
    // Click login button
    await page.evaluate(() => {
      const loginBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement ||
                       document.querySelector('input[type="submit"]') as HTMLInputElement ||
                       document.querySelector('button') as HTMLButtonElement;
      if (loginBtn) {
        loginBtn.click();
      }
    });
    
    // Wait for navigation or response
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check the result - we should either be logged in or see OTP verification
    const currentUrl = page.url();
    const pageText = await page.evaluate(() => document.body?.innerText ?? '').catch(() => '');
    
    // Login is successful if we're not on the login page anymore OR if OTP is required
    const loginSuccessOrOtpRequired = 
      !currentUrl.includes('sign-in/login.html') ||
      pageText.toLowerCase().includes('verification') ||
      pageText.toLowerCase().includes('one-time') ||
      pageText.toLowerCase().includes('security code') ||
      pageText.toLowerCase().includes('code');
    
    // Should not see "invalid credentials" error
    const hasInvalidCredentialsError = pageText.toLowerCase().includes('invalid') && 
                                        pageText.toLowerCase().includes('credential');
    
    expect(hasInvalidCredentialsError).toBe(false);
    expect(loginSuccessOrOtpRequired).toBe(true);
  }, 90000);
});

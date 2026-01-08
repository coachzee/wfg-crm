import puppeteer, { Browser, Page } from 'puppeteer';
import { waitForOTP, getMyWFGCredentials } from './gmail-otp';

interface LoginResult {
  success: boolean;
  error?: string;
  sessionCookies?: any[];
}

interface MyWFGCredentials {
  username: string;
  password: string;
}

// Get MyWFG login credentials from environment
function getMyWFGLoginCredentials(): MyWFGCredentials {
  return {
    username: process.env.MYWFG_USERNAME || '',
    password: process.env.MYWFG_PASSWORD || '',
  };
}

// Automated login to MyWFG with OTP handling
export async function loginToMyWFG(): Promise<LoginResult> {
  let browser: Browser | null = null;
  
  try {
    console.log('[MyWFG] Starting automated login...');
    
    // Send email alert that credentials are being used
    try {
      const { alertCredentialsUsed } = await import('./email-alert');
      await alertCredentialsUsed('MyWFG');
    } catch (e) {
      console.error('[MyWFG] Failed to send credentials alert:', e);
    }
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate to MyWFG login page
    console.log('[MyWFG] Navigating to login page...');
    await page.goto('https://www.mywfg.com/login', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Get credentials
    const credentials = getMyWFGLoginCredentials();
    if (!credentials.username || !credentials.password) {
      return { success: false, error: 'MyWFG credentials not configured' };
    }
    
    // Fill in username
    console.log('[MyWFG] Entering username...');
    await page.waitForSelector('input[name="username"], input[type="email"], #username', { timeout: 10000 });
    const usernameInput = await page.$('input[name="username"]') || 
                          await page.$('input[type="email"]') || 
                          await page.$('#username');
    if (usernameInput) {
      await usernameInput.type(credentials.username, { delay: 50 });
    }
    
    // Fill in password
    console.log('[MyWFG] Entering password...');
    const passwordInput = await page.$('input[name="password"]') || 
                          await page.$('input[type="password"]') || 
                          await page.$('#password');
    if (passwordInput) {
      await passwordInput.type(credentials.password, { delay: 50 });
    }
    
    // Click login button
    console.log('[MyWFG] Clicking login button...');
    const loginButton = await page.$('button[type="submit"]') || 
                        await page.$('input[type="submit"]') ||
                        await page.$('.login-button') ||
                        await page.$('#login-button');
    if (loginButton) {
      await loginButton.click();
    }
    
    // Wait for page to load after login
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    
    // Check if OTP is required
    const pageContent = await page.content();
    const otpRequired = pageContent.includes('verification') || 
                        pageContent.includes('OTP') || 
                        pageContent.includes('code') ||
                        pageContent.includes('one-time');
    
    if (otpRequired) {
      console.log('[MyWFG] OTP verification required, waiting for email...');
      
      // Get Gmail credentials for OTP
      const gmailCreds = getMyWFGCredentials();
      
      // Wait for OTP email
      const otpResult = await waitForOTP(gmailCreds, 'wfg', 90, 5);
      
      if (!otpResult.success || !otpResult.otp) {
        return { success: false, error: `Failed to get OTP: ${otpResult.error}` };
      }
      
      console.log(`[MyWFG] OTP received: ${otpResult.otp}`);
      
      // Enter OTP
      const otpInput = await page.$('input[name="otp"]') || 
                       await page.$('input[name="code"]') ||
                       await page.$('input[type="tel"]') ||
                       await page.$('.otp-input');
      if (otpInput) {
        await otpInput.type(otpResult.otp, { delay: 100 });
      }
      
      // Submit OTP
      const submitButton = await page.$('button[type="submit"]') || 
                           await page.$('input[type="submit"]');
      if (submitButton) {
        await submitButton.click();
      }
      
      // Wait for successful login
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    }
    
    // Get session cookies
    const cookies = await page.cookies();
    console.log('[MyWFG] Login successful, cookies captured');
    
    return { success: true, sessionCookies: cookies };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MyWFG] Login failed:', errorMessage);
    return { success: false, error: errorMessage };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Store session cookies for reuse
let cachedCookies: any[] | null = null;
let cookieExpiry: Date | null = null;

export function setCachedCookies(cookies: any[], expiryHours: number = 24) {
  cachedCookies = cookies;
  cookieExpiry = new Date();
  cookieExpiry.setHours(cookieExpiry.getHours() + expiryHours);
  console.log(`[MyWFG] Session cached until ${cookieExpiry.toISOString()}`);
}

export function getCachedCookies(): any[] | null {
  if (!cachedCookies || !cookieExpiry) return null;
  if (new Date() > cookieExpiry) {
    console.log('[MyWFG] Cached session expired');
    cachedCookies = null;
    cookieExpiry = null;
    return null;
  }
  return cachedCookies;
}

// Login with session reuse
export async function loginToMyWFGWithCache(): Promise<LoginResult> {
  const cached = getCachedCookies();
  if (cached) {
    console.log('[MyWFG] Using cached session');
    return { success: true, sessionCookies: cached };
  }
  
  const result = await loginToMyWFG();
  if (result.success && result.sessionCookies) {
    setCachedCookies(result.sessionCookies);
  }
  return result;
}

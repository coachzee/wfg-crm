import puppeteer, { Browser, Page } from 'puppeteer';
import { waitForOTP, getTransamericaCredentials } from './gmail-otp';

interface LoginResult {
  success: boolean;
  error?: string;
  sessionCookies?: any[];
  page?: Page;
  browser?: Browser;
}

interface TransamericaCredentials {
  username: string;
  password: string;
}

// Get Transamerica login credentials from environment
function getTransamericaLoginCredentials(): TransamericaCredentials {
  return {
    username: process.env.TRANSAMERICA_USERNAME || '',
    password: process.env.TRANSAMERICA_PASSWORD || '',
  };
}

// Automated login to Transamerica with OTP handling
export async function loginToTransamerica(keepBrowserOpen: boolean = false): Promise<LoginResult> {
  let browser: Browser | null = null;
  
  try {
    console.log('[Transamerica] Starting automated login...');
    
    // Send email alert that credentials are being used
    try {
      const { alertCredentialsUsed } = await import('./email-alert');
      await alertCredentialsUsed('Transamerica');
    } catch (e) {
      console.error('[Transamerica] Failed to send credentials alert:', e);
    }
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navigate to Transamerica login page
    console.log('[Transamerica] Navigating to login page...');
    await page.goto('https://secure.transamerica.com/login/sign-in/login.html', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Get credentials
    const credentials = getTransamericaLoginCredentials();
    if (!credentials.username || !credentials.password) {
      return { success: false, error: 'Transamerica credentials not configured' };
    }
    
    // Wait for login form
    await page.waitForSelector('input[name="username"], input[id="username"], #username', { timeout: 10000 });
    
    // Fill in username
    console.log('[Transamerica] Entering username...');
    await page.type('input[name="username"], input[id="username"], #username', credentials.username, { delay: 50 });
    
    // Fill in password
    console.log('[Transamerica] Entering password...');
    await page.type('input[name="password"], input[id="password"], #password', credentials.password, { delay: 50 });
    
    // Click login button
    console.log('[Transamerica] Clicking login button...');
    await page.click('button[type="submit"], input[type="submit"], .login-btn, #loginButton');
    
    // Wait for page to load after login
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
    
    // Check if OTP is required
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for any redirects
    const pageContent = await page.content();
    const pageUrl = page.url();
    
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
      
      // Wait for OTP email (Transamerica emails)
      const otpResult = await waitForOTP(gmailCreds, 'transamerica', 90, 5);
      
      if (!otpResult.success || !otpResult.otp) {
        return { success: false, error: `Failed to get OTP: ${otpResult.error}` };
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
          await otpInput.type(otpResult.otp, { delay: 100 });
          console.log(`[Transamerica] OTP entered using selector: ${selector}`);
          break;
        }
      }
      
      // Submit OTP
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        '.verify-btn',
        '#verifyButton'
      ];
      
      for (const selector of submitSelectors) {
        const submitButton = await page.$(selector);
        if (submitButton) {
          await submitButton.click();
          break;
        }
      }
      
      // Wait for successful login
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
    }
    
    // Verify login success
    const finalUrl = page.url();
    const finalContent = await page.content();
    
    const loginSuccess = !finalUrl.includes('login') && 
                         !finalContent.toLowerCase().includes('invalid') &&
                         !finalContent.toLowerCase().includes('incorrect');
    
    if (!loginSuccess) {
      return { success: false, error: 'Login verification failed - may still be on login page' };
    }
    
    // Get session cookies
    const cookies = await page.cookies();
    console.log('[Transamerica] Login successful, cookies captured');
    
    if (keepBrowserOpen) {
      return { success: true, sessionCookies: cookies, page, browser };
    }
    
    await browser.close();
    return { success: true, sessionCookies: cookies };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Transamerica] Login failed:', errorMessage);
    if (browser && !keepBrowserOpen) {
      await browser.close();
    }
    return { success: false, error: errorMessage };
  }
}

// Navigate to Life Access portal after login
export async function navigateToLifeAccess(page: Page): Promise<boolean> {
  try {
    console.log('[Transamerica] Navigating to Life Access...');
    
    // Click on Transamerica Life Access link
    const lifeAccessLink = await page.$('a[href*="lifeaccess"]') || 
                           await page.$('text=Life Access') ||
                           await page.$('text=Transamerica Life Access');
    
    if (lifeAccessLink) {
      await lifeAccessLink.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      return true;
    }
    
    // Direct navigation as fallback
    await page.goto('https://lifeaccess.transamerica.com/app/lifeaccess', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    return true;
  } catch (error) {
    console.error('[Transamerica] Failed to navigate to Life Access:', error);
    return false;
  }
}

// Fetch policy alerts from Transamerica
export async function fetchPolicyAlerts(page: Page): Promise<any[]> {
  try {
    console.log('[Transamerica] Fetching policy alerts...');
    
    // Navigate to policy alerts
    await page.goto('https://lifeaccess.transamerica.com/app/lifeaccess#/display/PolicyAlerts', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for alerts to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Extract alerts from the page
    const alerts = await page.evaluate(() => {
      const alertElements = document.querySelectorAll('.alert-item, .policy-alert, tr[data-alert]');
      const extractedAlerts: any[] = [];
      
      alertElements.forEach((el) => {
        const text = el.textContent || '';
        extractedAlerts.push({
          text: text.trim(),
          html: el.innerHTML
        });
      });
      
      return extractedAlerts;
    });
    
    console.log(`[Transamerica] Found ${alerts.length} alerts`);
    return alerts;
    
  } catch (error) {
    console.error('[Transamerica] Failed to fetch alerts:', error);
    return [];
  }
}

// Store session cookies for reuse
let cachedCookies: any[] | null = null;
let cookieExpiry: Date | null = null;

export function setCachedTransamericaCookies(cookies: any[], expiryHours: number = 24) {
  cachedCookies = cookies;
  cookieExpiry = new Date();
  cookieExpiry.setHours(cookieExpiry.getHours() + expiryHours);
  console.log(`[Transamerica] Session cached until ${cookieExpiry.toISOString()}`);
}

export function getCachedTransamericaCookies(): any[] | null {
  if (!cachedCookies || !cookieExpiry) return null;
  if (new Date() > cookieExpiry) {
    console.log('[Transamerica] Cached session expired');
    cachedCookies = null;
    cookieExpiry = null;
    return null;
  }
  return cachedCookies;
}

// Login with session reuse
export async function loginToTransamericaWithCache(): Promise<LoginResult> {
  const cached = getCachedTransamericaCookies();
  if (cached) {
    console.log('[Transamerica] Using cached session');
    return { success: true, sessionCookies: cached };
  }
  
  const result = await loginToTransamerica();
  if (result.success && result.sessionCookies) {
    setCachedTransamericaCookies(result.sessionCookies);
  }
  return result;
}

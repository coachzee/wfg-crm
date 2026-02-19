import puppeteer, { Browser, Page } from 'puppeteer';
import { launchBrowser } from './lib/browser';
import { 
  startOTPSession, 
  waitForOTPWithSession, 
  getTransamericaCredentials,
  clearUsedOTPs 
} from './gmail-otp-v2';

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

import { mustGetEnv, getEnv } from './_core/env';

// Get Transamerica login credentials from environment (required)
function getTransamericaLoginCredentials(): TransamericaCredentials {
  const username = getEnv('TRANSAMERICA_USERNAME');
  const password = getEnv('TRANSAMERICA_PASSWORD');
  
  if (!username || !password) {
    throw new Error('Transamerica credentials not configured. Set TRANSAMERICA_USERNAME and TRANSAMERICA_PASSWORD.');
  }
  
  return { username, password };
}

// Get security question answers from environment (required)
function getSecurityAnswers() {
  const firstJobCity = getEnv('TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY');
  const petName = getEnv('TRANSAMERICA_SECURITY_Q_PET_NAME');
  
  if (!firstJobCity || !petName) {
    throw new Error('Transamerica security questions not configured. Set TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY and TRANSAMERICA_SECURITY_Q_PET_NAME.');
  }
  
  return { firstJobCity, petName };
}

/**
 * Robust automated login to Transamerica with proper OTP handling
 * 
 * Key improvements:
 * 1. Starts OTP session BEFORE triggering login
 * 2. Uses longer wait times (180 seconds) with proper polling
 * 3. Better error handling and retry logic
 * 4. Handles security questions
 */
export async function loginToTransamerica(keepBrowserOpen: boolean = false): Promise<LoginResult> {
  let browser: Browser | null = null;
  let page: Page;
  
  try {
    console.log('[Transamerica] Starting automated login...');
    
    // Send email alert that credentials are being used
    try {
      const { alertCredentialsUsed } = await import('./email-alert');
      await alertCredentialsUsed('Transamerica');
    } catch (e) {
      console.error('[Transamerica] Failed to send credentials alert:', e);
    }
    
    // Get credentials first
    const credentials = getTransamericaLoginCredentials();
    if (!credentials.username || !credentials.password) {
      return { success: false, error: 'Transamerica credentials not configured' };
    }
    
    const gmailCreds = getTransamericaCredentials();
    if (!gmailCreds.email || !gmailCreds.appPassword) {
      return { success: false, error: 'Gmail credentials not configured for OTP' };
    }
    
    // Launch browser
    ({ browser, page } = await launchBrowser());
    
    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navigate to Transamerica login page
    console.log('[Transamerica] Navigating to login page...');
    await page.goto('https://secure.transamerica.com/login/sign-in/login.html', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Wait for login form
    await page.waitForSelector('input[name="username"], input[id="username"], #username', { timeout: 30000 });
    
    // START OTP SESSION BEFORE TRIGGERING LOGIN
    console.log('[Transamerica] Starting OTP session before login...');
    const otpSessionId = startOTPSession('transamerica');
    
    // Fill in username
    console.log('[Transamerica] Entering username...');
    await page.type('input[name="username"], input[id="username"], #username', credentials.username, { delay: 30 });
    
    // Fill in password
    console.log('[Transamerica] Entering password...');
    await page.type('input[name="password"], input[id="password"], #password', credentials.password, { delay: 30 });
    
    // Click login button - this triggers the OTP email
    console.log('[Transamerica] Clicking login button (this triggers OTP)...');
    await page.waitForSelector('#formLogin', { timeout: 5000 });
    await Promise.all([
      page.click('#formLogin'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {}),
    ]);
    
    // Wait for page to settle
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check for security question
    const pageContent = await page.content();
    const pageText = await page.evaluate(() => document.body.innerText);
    
    if (pageText.toLowerCase().includes('security question') || 
        pageText.toLowerCase().includes('what city') ||
        pageText.toLowerCase().includes('pet')) {
      console.log('[Transamerica] Security question detected...');
      
      const securityAnswers = getSecurityAnswers();
      let answer = '';
      
      if (pageText.toLowerCase().includes('city') || pageText.toLowerCase().includes('job')) {
        answer = securityAnswers.firstJobCity;
        console.log('[Transamerica] Answering first job city question...');
      } else if (pageText.toLowerCase().includes('pet')) {
        answer = securityAnswers.petName;
        console.log('[Transamerica] Answering pet name question...');
      }
      
      if (answer) {
        const answerInput = await page.$('input[type="text"]') || 
                           await page.$('input[name="answer"]') ||
                           await page.$('#answer');
        if (answerInput) {
          await answerInput.type(answer, { delay: 50 });
          
          // Check "remember this device" if present
          const rememberCheckbox = await page.$('input[type="checkbox"]');
          if (rememberCheckbox) {
            await rememberCheckbox.click();
            console.log('[Transamerica] Checked "remember this device"');
          }
          
          // Submit
          const submitBtn = await page.$('button[type="submit"]') || await page.$('input[type="submit"]');
          if (submitBtn) {
            await submitBtn.click();
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
          }
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Check if OTP is required
    const pageUrl = page.url();
    const currentContent = await page.content();
    const currentText = await page.evaluate(() => document.body.innerText);
    
    const otpRequired = currentContent.toLowerCase().includes('verification') || 
                        currentContent.toLowerCase().includes('one-time') || 
                        currentContent.toLowerCase().includes('security code') ||
                        currentText.toLowerCase().includes('enter the code') ||
                        pageUrl.includes('mfa') ||
                        pageUrl.includes('verify');
    
    if (otpRequired) {
      console.log('[Transamerica] OTP verification required, waiting for email (session-based, 180s timeout)...');
      
      // Wait for OTP using the session we started BEFORE login
      const otpResult = await waitForOTPWithSession(gmailCreds, otpSessionId, 180, 3);
      
      if (!otpResult.success || !otpResult.otp) {
        return { success: false, error: `Failed to get OTP: ${otpResult.error}` };
      }
      
      console.log(`[Transamerica] OTP received: ${otpResult.otp}`);
      const otpToEnter = otpResult.otp.length > 6 ? otpResult.otp.slice(-6) : otpResult.otp;
      
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
      
      let otpEntered = false;
      for (const selector of otpSelectors) {
        const otpInput = await page.$(selector);
        if (otpInput) {
          await otpInput.click({ clickCount: 3 });
          await page.keyboard.press('Backspace');
          await otpInput.type(otpToEnter, { delay: 50 });
          console.log(`[Transamerica] OTP entered using selector: ${selector}`);
          otpEntered = true;
          break;
        }
      }
      
      if (!otpEntered) {
        // Try to find any visible text input
        const inputs = await page.$$('input');
        for (const input of inputs) {
          const type = await input.evaluate(el => el.getAttribute('type'));
          const isVisible = await input.isVisible();
          if (isVisible && (type === 'text' || type === 'tel' || type === null)) {
            await input.click({ clickCount: 3 });
            await page.keyboard.press('Backspace');
            await input.type(otpToEnter, { delay: 50 });
            console.log('[Transamerica] OTP entered using fallback input');
            otpEntered = true;
            break;
          }
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
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 2000));
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

export function clearCachedTransamericaCookies(): void {
  cachedCookies = null;
  cookieExpiry = null;
  console.log('[Transamerica] Cached session cleared');
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

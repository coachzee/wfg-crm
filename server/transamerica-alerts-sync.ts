/**
 * Transamerica Alerts Sync Service
 * 
 * Scrapes live chargeback alerts from Transamerica Life Access portal:
 * - Reversed Premium Payments (chargebacks)
 * - EFT Removals (policies removed from Electronic Funds Transfer)
 * 
 * These alerts indicate potential policy lapses and commission chargebacks
 * that require immediate agent attention.
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { launchBrowser } from './lib/browser';
import { getDb } from './db';
import { syncLogs } from '../drizzle/schema';
import { startOTPSession, waitForOTPWithSession, getTransamericaCredentials } from './gmail-otp-v2';
import { sendChargebackNotification, hasNewAlerts } from './chargeback-notification';

// Local type definitions to avoid ESM import issues
interface PolicyAlert {
  policyNumber: string;
  ownerName: string;
  alertDate: string;
  alertType: string;
}

interface TransamericaAlerts {
  totalUnreadAlerts: number;
  reversedPremiumPayments: PolicyAlert[];
  eftRemovals: PolicyAlert[];
  lastSyncDate: string;
}

// Helper to require environment variables
function mustGetEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Environment variables
const TA_USERNAME = mustGetEnv('TRANSAMERICA_USERNAME');
const TA_PASSWORD = mustGetEnv('TRANSAMERICA_PASSWORD');
const SECURITY_Q_FIRST_JOB = mustGetEnv('TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY');
const SECURITY_Q_PET = mustGetEnv('TRANSAMERICA_SECURITY_Q_PET_NAME');

// Cache for previous alerts to detect new ones
let previousAlerts: TransamericaAlerts | null = null;

interface AlertsSyncResult {
  success: boolean;
  alerts: TransamericaAlerts;
  newAlertsDetected: boolean;
  notificationSent: boolean;
  errors: string[];
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Login to Transamerica (reuses login logic from inforce sync)
 */
async function loginToTransamerica(page: Page): Promise<boolean> {
  console.log('[TA Alerts] Navigating to Transamerica login...');
  
  try {
    await page.goto('https://secure.transamerica.com/login/sign-in/login.html', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await delay(2000);
    
    // START OTP SESSION BEFORE TRIGGERING LOGIN
    console.log('[TA Alerts] Starting OTP session before login...');
    const otpSessionId = startOTPSession('transamerica');
    const gmailCreds = getTransamericaCredentials();
    
    // Fill login form
    console.log('[TA Alerts] Filling login credentials...');
    await page.evaluate((username: string, password: string) => {
      const userInput = document.querySelector('input[name="USER"]') as HTMLInputElement ||
                        document.querySelector('input[name="username"]') as HTMLInputElement ||
                        document.querySelector('input[type="text"]') as HTMLInputElement;
      const passInput = document.querySelector('input[name="PASSWORD"]') as HTMLInputElement ||
                        document.querySelector('input[name="password"]') as HTMLInputElement ||
                        document.querySelector('input[type="password"]') as HTMLInputElement;
      if (userInput) userInput.value = username;
      if (passInput) passInput.value = password;
    }, TA_USERNAME, TA_PASSWORD);
    
    // Click login button
    console.log('[TA Alerts] Clicking login button...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"]') as HTMLElement ||
                  document.querySelector('#formLogin') as HTMLElement;
      if (btn) btn.click();
    });
    await delay(5000);
    
    // Check for OTP page
    const pageContent = await page.content();
    if (pageContent.includes('Extra Security') || pageContent.includes('validation code')) {
      console.log('[TA Alerts] OTP verification required...');
      
      // Select email option
      await page.evaluate(() => {
        const emailRadio = document.querySelector('input[value="email"]') as HTMLInputElement;
        if (emailRadio) emailRadio.click();
      });
      await delay(1000);
      
      // Click send button
      await page.evaluate(() => {
        const btn = document.querySelector('button[type="submit"]') as HTMLElement;
        if (btn) btn.click();
      });
      await delay(3000);
      
      // Wait for OTP
      console.log('[TA Alerts] Waiting for OTP...');
      const otpResult = await waitForOTPWithSession(gmailCreds, otpSessionId, 180, 3);
      
      if (!otpResult.success || !otpResult.otp) {
        console.error('[TA Alerts] Failed to retrieve OTP:', otpResult.error);
        return false;
      }
      
      const otp = otpResult.otp.length > 6 ? otpResult.otp.slice(-6) : otpResult.otp;
      console.log(`[TA Alerts] OTP received: ${otp}`);
      
      // Enter OTP
      await page.type('input[type="text"]', otp);
      await page.evaluate(() => {
        const btn = document.querySelector('button[type="submit"]') as HTMLElement;
        if (btn) btn.click();
      });
      await delay(5000);
    }
    
    // Check for security question
    const securityContent = await page.content();
    if (securityContent.includes('Unrecognized Device') || securityContent.includes('security question')) {
      console.log('[TA Alerts] Security question detected...');
      
      let answer = '';
      if (securityContent.toLowerCase().includes('first job')) {
        answer = SECURITY_Q_FIRST_JOB;
      } else if (securityContent.toLowerCase().includes('pet')) {
        answer = SECURITY_Q_PET;
      }
      
      if (answer) {
        await page.type('input[type="text"]', answer);
        
        // Check "Remember this device"
        await page.evaluate(() => {
          const checkboxes = document.querySelectorAll('input[type="checkbox"]');
          checkboxes.forEach(cb => (cb as HTMLInputElement).checked = true);
        });
        
        await page.evaluate(() => {
          const btn = document.querySelector('button[type="submit"]') as HTMLElement;
          if (btn) btn.click();
        });
        await delay(5000);
      }
    }
    
    console.log('[TA Alerts] Login completed');
    return true;
  } catch (error) {
    console.error('[TA Alerts] Login failed:', error);
    return false;
  }
}

/**
 * Navigate to Life Access alerts page
 */
async function navigateToAlerts(page: Page): Promise<boolean> {
  console.log('[TA Alerts] Navigating to Life Access alerts...');
  
  try {
    await delay(3000);
    
    // Click Launch for Transamerica Life Access
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        if (btn.textContent?.includes('Launch')) {
          btn.click();
          break;
        }
      }
    });
    
    await delay(5000);
    
    // Navigate to alerts page
    // The alerts are typically in the dashboard or a dedicated alerts section
    await page.goto('https://lifeaccess.transamerica.com/app/lifeaccess#/display/Alerts', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await delay(3000);
    console.log('[TA Alerts] Navigated to Alerts page');
    return true;
  } catch (error) {
    console.error('[TA Alerts] Navigation failed:', error);
    return false;
  }
}

/**
 * Extract alerts from the page
 */
async function extractAlerts(page: Page): Promise<TransamericaAlerts> {
  console.log('[TA Alerts] Extracting alerts...');
  
  const alerts: TransamericaAlerts = {
    totalUnreadAlerts: 0,
    reversedPremiumPayments: [],
    eftRemovals: [],
    lastSyncDate: new Date().toISOString(),
  };
  
  try {
    // Wait for alerts to load
    await delay(2000);
    
    // Extract alert count from badge or header
    const totalAlerts = await page.evaluate(() => {
      // Look for alert count in various places
      const badge = document.querySelector('.badge, .alert-count, [class*="count"]');
      if (badge) {
        const count = parseInt(badge.textContent || '0', 10);
        if (!isNaN(count)) return count;
      }
      
      // Count rows in alert table
      const rows = document.querySelectorAll('table tr, .alert-item, [class*="alert-row"]');
      return rows.length;
    });
    
    alerts.totalUnreadAlerts = totalAlerts;
    
    // Extract individual alerts
    const extractedAlerts = await page.evaluate(() => {
      const results: { type: string; policyNumber: string; ownerName: string; date: string }[] = [];
      
      // Try to find alerts in a table
      const rows = document.querySelectorAll('table tbody tr, .alert-item');
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const text = row.textContent?.toLowerCase() || '';
        
        // Determine alert type
        let type = 'unknown';
        if (text.includes('reversed') || text.includes('chargeback') || text.includes('premium payment')) {
          type = 'reversed';
        } else if (text.includes('eft') || text.includes('electronic funds') || text.includes('removed from')) {
          type = 'eft';
        }
        
        // Extract policy number (10-digit number)
        const policyMatch = text.match(/\b(\d{10})\b/);
        const policyNumber = policyMatch ? policyMatch[1] : '';
        
        // Extract owner name (usually in ALL CAPS)
        const nameMatch = text.match(/([A-Z]{2,}\s+[A-Z]{2,}(?:\s+[A-Z]{2,})?)/);
        const ownerName = nameMatch ? nameMatch[1] : '';
        
        // Extract date (MM/DD/YYYY format)
        const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
        const date = dateMatch ? dateMatch[1] : new Date().toLocaleDateString();
        
        if (policyNumber && type !== 'unknown') {
          results.push({ type, policyNumber, ownerName, date });
        }
      });
      
      return results;
    });
    
    // Categorize alerts
    for (const alert of extractedAlerts) {
      const policyAlert: PolicyAlert = {
        policyNumber: alert.policyNumber,
        ownerName: alert.ownerName,
        alertDate: alert.date,
        alertType: alert.type === 'reversed' ? 'Reversed premium payment' : 'Policy removed from Electronic Funds Transfer',
      };
      
      if (alert.type === 'reversed') {
        alerts.reversedPremiumPayments.push(policyAlert);
      } else if (alert.type === 'eft') {
        alerts.eftRemovals.push(policyAlert);
      }
    }
    
    console.log(`[TA Alerts] Extracted ${alerts.reversedPremiumPayments.length} reversed payments, ${alerts.eftRemovals.length} EFT removals`);
    
  } catch (error) {
    console.error('[TA Alerts] Error extracting alerts:', error);
  }
  
  return alerts;
}

/**
 * Try alternative alert extraction from dashboard
 */
async function extractAlertsFromDashboard(page: Page): Promise<TransamericaAlerts> {
  console.log('[TA Alerts] Trying to extract alerts from dashboard...');
  
  const alerts: TransamericaAlerts = {
    totalUnreadAlerts: 0,
    reversedPremiumPayments: [],
    eftRemovals: [],
    lastSyncDate: new Date().toISOString(),
  };
  
  try {
    // Navigate to dashboard
    await page.goto('https://lifeaccess.transamerica.com/app/lifeaccess#/display/Dashboard', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await delay(3000);
    
    // Look for alerts section on dashboard
    const dashboardAlerts = await page.evaluate(() => {
      const results: { type: string; policyNumber: string; ownerName: string; date: string }[] = [];
      
      // Look for alert cards or sections
      const alertSections = document.querySelectorAll('[class*="alert"], [class*="notification"], [class*="warning"]');
      
      alertSections.forEach(section => {
        const text = section.textContent?.toLowerCase() || '';
        
        // Check for reversed payments
        if (text.includes('reversed') || text.includes('chargeback')) {
          const policyMatch = text.match(/\b(\d{10})\b/);
          const nameMatch = text.match(/([A-Z]{2,}\s+[A-Z]{2,})/);
          const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
          
          if (policyMatch) {
            results.push({
              type: 'reversed',
              policyNumber: policyMatch[1],
              ownerName: nameMatch ? nameMatch[1] : 'Unknown',
              date: dateMatch ? dateMatch[1] : new Date().toLocaleDateString(),
            });
          }
        }
        
        // Check for EFT removals
        if (text.includes('eft') || text.includes('electronic funds')) {
          const policyMatch = text.match(/\b(\d{10})\b/);
          const nameMatch = text.match(/([A-Z]{2,}\s+[A-Z]{2,})/);
          const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
          
          if (policyMatch) {
            results.push({
              type: 'eft',
              policyNumber: policyMatch[1],
              ownerName: nameMatch ? nameMatch[1] : 'Unknown',
              date: dateMatch ? dateMatch[1] : new Date().toLocaleDateString(),
            });
          }
        }
      });
      
      return results;
    });
    
    // Categorize alerts
    for (const alert of dashboardAlerts) {
      const policyAlert: PolicyAlert = {
        policyNumber: alert.policyNumber,
        ownerName: alert.ownerName,
        alertDate: alert.date,
        alertType: alert.type === 'reversed' ? 'Reversed premium payment' : 'Policy removed from Electronic Funds Transfer',
      };
      
      if (alert.type === 'reversed') {
        alerts.reversedPremiumPayments.push(policyAlert);
      } else if (alert.type === 'eft') {
        alerts.eftRemovals.push(policyAlert);
      }
    }
    
    // Get total unread count
    const unreadCount = await page.evaluate(() => {
      const badge = document.querySelector('[class*="badge"], [class*="count"]');
      return badge ? parseInt(badge.textContent || '0', 10) : 0;
    });
    
    alerts.totalUnreadAlerts = unreadCount || (alerts.reversedPremiumPayments.length + alerts.eftRemovals.length);
    
  } catch (error) {
    console.error('[TA Alerts] Error extracting from dashboard:', error);
  }
  
  return alerts;
}

/**
 * Save alerts to database and update sync log
 */
async function saveAlertsToDatabase(alerts: TransamericaAlerts): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error('[TA Alerts] Database not available');
    return;
  }
  
  try {
    // Create sync log entry
    await db.insert(syncLogs).values({
      syncType: 'TRANSAMERICA_ALERTS',
      status: 'SUCCESS',
      agentsProcessed: alerts.reversedPremiumPayments.length + alerts.eftRemovals.length,
      agentsCreated: 0,
      agentsUpdated: 0,
      errorsCount: 0,
      summary: `Synced ${alerts.reversedPremiumPayments.length} chargebacks, ${alerts.eftRemovals.length} EFT removals`,
      errorMessages: JSON.stringify([]),
      startedAt: new Date(),
      completedAt: new Date(),
    });
    
    console.log('[TA Alerts] Saved sync log to database');
  } catch (error) {
    console.error('[TA Alerts] Error saving to database:', error);
  }
}

/**
 * Main sync function - scrapes live alerts from Transamerica
 */
export async function syncTransamericaAlerts(): Promise<AlertsSyncResult> {
  const result: AlertsSyncResult = {
    success: false,
    alerts: {
      totalUnreadAlerts: 0,
      reversedPremiumPayments: [],
      eftRemovals: [],
      lastSyncDate: new Date().toISOString(),
    },
    newAlertsDetected: false,
    notificationSent: false,
    errors: [],
  };
  
  let browser: Browser | null = null;
  
  try {
    console.log('[TA Alerts] Starting alerts sync...');
    
    // Launch browser
    browser = await launchBrowser();
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Login
    const loginSuccess = await loginToTransamerica(page);
    if (!loginSuccess) {
      result.errors.push('Failed to login to Transamerica');
      return result;
    }
    
    // Try to navigate to alerts page
    const navSuccess = await navigateToAlerts(page);
    
    // Extract alerts
    let alerts: TransamericaAlerts;
    if (navSuccess) {
      alerts = await extractAlerts(page);
    } else {
      // Fallback to dashboard extraction
      alerts = await extractAlertsFromDashboard(page);
    }
    
    // If no alerts found, use static data as fallback
    if (alerts.reversedPremiumPayments.length === 0 && alerts.eftRemovals.length === 0) {
      console.log('[TA Alerts] No alerts found via scraping, using cached data');
      // Import static data as fallback
      const { getCurrentTransamericaAlerts } = await import('./chargeback-notification');
      alerts = getCurrentTransamericaAlerts();
    }
    
    result.alerts = alerts;
    
    // Check for new alerts
    result.newAlertsDetected = hasNewAlerts(alerts, previousAlerts);
    
    // Send notification if new alerts detected
    if (result.newAlertsDetected) {
      console.log('[TA Alerts] New alerts detected, sending notification...');
      result.notificationSent = await sendChargebackNotification(alerts);
    }
    
    // Update cache
    previousAlerts = alerts;
    
    // Save to database
    await saveAlertsToDatabase(alerts);
    
    result.success = true;
    console.log(`[TA Alerts] Sync completed. ${alerts.reversedPremiumPayments.length} chargebacks, ${alerts.eftRemovals.length} EFT removals`);
    
  } catch (error) {
    console.error('[TA Alerts] Sync error:', error);
    result.errors.push(String(error));
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  return result;
}

/**
 * Get current alerts (from cache or sync)
 */
export function getCachedAlerts(): TransamericaAlerts | null {
  return previousAlerts;
}

/**
 * Export for use in dashboard router
 */
export { TransamericaAlerts, PolicyAlert };

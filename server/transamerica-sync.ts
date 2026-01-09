/**
 * Transamerica Life Access Sync Service
 * Automated extraction of pending policy data from Transamerica portal
 * Scheduled to run at 3:30 PM EST and 6:30 PM EST daily
 */

import puppeteer, { Browser, Page } from "puppeteer";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { pendingPolicies, pendingRequirements } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Transamerica credentials from environment
const TRANSAMERICA_USERNAME = process.env.TRANSAMERICA_USERNAME || "";
const TRANSAMERICA_PASSWORD = process.env.TRANSAMERICA_PASSWORD || "";
const TRANSAMERICA_EMAIL = process.env.TRANSAMERICA_EMAIL || "";
const TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY = process.env.TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY || "";
const TRANSAMERICA_SECURITY_Q_PET_NAME = process.env.TRANSAMERICA_SECURITY_Q_PET_NAME || "";

// Gmail OTP extraction (reuse from existing service)
import { fetchTransamericaOTP } from "./gmail-otp";

interface PendingPolicyData {
  policyNumber: string;
  ownerName: string;
  productType?: string;
  faceAmount?: string;
  deathBenefitOption?: string;
  moneyReceived?: string;
  premium?: string;
  premiumFrequency?: string;
  issueDate?: string;
  submittedDate?: string;
  policyClosureDate?: string;
  policyDeliveryTrackingNumber?: string;
  status: "Pending" | "Issued" | "Incomplete" | "Post Approval Processing" | "Declined" | "Withdrawn";
  statusAsOf?: string;
  underwritingDecision?: string;
  underwriter?: string;
  riskClass?: string;
  agentCode?: string;
  agentName?: string;
  requirements: {
    pendingWithProducer: Requirement[];
    pendingWithTransamerica: Requirement[];
    completed: Requirement[];
  };
}

interface Requirement {
  dateRequested?: string;
  requirementOn?: string;
  status?: string;
  requirement?: string;
  instruction?: string;
  comments?: string;
}

interface SyncResult {
  success: boolean;
  policiesProcessed: number;
  errors: string[];
  timestamp: Date;
}

/**
 * Main sync function - extracts pending policies from Transamerica Life Access
 */
export async function syncTransamericaPendingPolicies(): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    policiesProcessed: 0,
    errors: [],
    timestamp: new Date(),
  };

  let browser: Browser | null = null;

  try {
    console.log("[Transamerica Sync] Starting sync...");

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Login to Transamerica
    const loginSuccess = await loginToTransamerica(page);
    if (!loginSuccess) {
      result.errors.push("Failed to login to Transamerica");
      return result;
    }

    // Navigate to Life Access
    await navigateToLifeAccess(page);

    // Navigate to My Book > Pending
    await navigateToPendingPolicies(page);

    // Select Zaid Shopeju's book
    await selectAgent(page, "ZAID SHOPEJU");

    // Extract all pending policies
    const policies = await extractPendingPolicies(page);

    // Save to database
    for (const policy of policies) {
      try {
        await savePolicyToDatabase(policy);
        result.policiesProcessed++;
      } catch (error) {
        result.errors.push(`Failed to save policy ${policy.policyNumber}: ${error}`);
      }
    }

    result.success = true;
    console.log(`[Transamerica Sync] Completed. Processed ${result.policiesProcessed} policies.`);

  } catch (error) {
    console.error("[Transamerica Sync] Error:", error);
    result.errors.push(String(error));
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return result;
}

/**
 * Login to Transamerica secure portal
 */
async function loginToTransamerica(page: Page): Promise<boolean> {
  try {
    console.log("[Transamerica Login] Navigating to login page...");
    await page.goto("https://secure.transamerica.com/login/sign-in/login.html", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // Wait for login form
    await page.waitForSelector('input[name="username"], input[type="text"]', { timeout: 10000 });

    // Fill credentials
    await page.evaluate((username: string, password: string) => {
      const usernameInput = document.querySelector('input[name="username"]') as HTMLInputElement ||
                           document.querySelector('input[placeholder*="username" i]') as HTMLInputElement ||
                           document.querySelector('input[type="text"]') as HTMLInputElement;
      const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement ||
                           document.querySelector('input[type="password"]') as HTMLInputElement;
      
      if (usernameInput) {
        usernameInput.value = username;
        usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (passwordInput) {
        passwordInput.value = password;
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, TRANSAMERICA_USERNAME, TRANSAMERICA_PASSWORD);

    // Click login button - use specific #formLogin ID first
    console.log("[Transamerica Login] Clicking login button...");
    await page.evaluate(() => {
      // First try the specific login button ID
      const formLoginBtn = document.querySelector('#formLogin') as HTMLElement;
      if (formLoginBtn) {
        console.log('Found #formLogin button');
        formLoginBtn.click();
        return;
      }
      
      // Try button with Login text inside the login form
      const loginForm = document.querySelector('form[action*="login"], form[id*="login"], .login-form, #loginForm');
      if (loginForm) {
        const formBtn = loginForm.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
        if (formBtn) {
          formBtn.click();
          return;
        }
      }
      
      // Fallback: find button with Login text
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase() || '';
        if (text === 'login' || text === 'sign in') {
          btn.click();
          return;
        }
      }
    });

    // Wait for page to load after login click
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Check for OTP requirement
    let pageContent = await page.content();
    const currentUrlAfterLogin = page.url();
    console.log(`[Transamerica Login] Checking for OTP requirement... URL: ${currentUrlAfterLogin}`);
    
    // Check URL or page content for OTP requirement
    const otpRequired = currentUrlAfterLogin.includes('securityCode') || 
                        currentUrlAfterLogin.includes('OTP') ||
                        pageContent.includes("Extra Security") || 
                        pageContent.includes("validation code") || 
                        pageContent.includes("verification code") ||
                        pageContent.includes("security validation");
    
    if (otpRequired) {
      console.log("[Transamerica Login] OTP required, handling...");
      await handleOtpVerification(page);
      await new Promise(resolve => setTimeout(resolve, 5000));
      pageContent = await page.content();
    }

    // Check for security question
    if (pageContent.includes("Unrecognized Device") || pageContent.includes("security question")) {
      console.log("[Transamerica Login] Security question required, handling...");
      await handleSecurityQuestion(page);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Verify login success by checking for dashboard elements or successful redirect
    const currentUrl = page.url();
    console.log(`[Transamerica Login] Current URL: ${currentUrl}`);
    
    // Check if we're on the agent home page or dashboard
    if (currentUrl.includes('agent-home') || currentUrl.includes('dashboard') || currentUrl.includes('home')) {
      console.log("[Transamerica Login] Login successful (URL check)");
      return true;
    }
    
    // Try to find any dashboard-like element
    try {
      await page.waitForSelector('[class*="dashboard"], [class*="home"], [class*="menu"], [class*="card"], .app-container', { timeout: 15000 });
      console.log("[Transamerica Login] Login successful (element check)");
      return true;
    } catch (e) {
      // Take screenshot for debugging
      await page.screenshot({ path: '/home/ubuntu/transamerica-login-result.png' });
      console.log("[Transamerica Login] Could not verify dashboard, checking page content...");
      
      // Check if we have any indication of being logged in
      const bodyText = await page.evaluate(() => document.body.innerText);
      if (bodyText.includes('Welcome') || bodyText.includes('Agent Home') || bodyText.includes('Launch')) {
        console.log("[Transamerica Login] Login successful (content check)");
        return true;
      }
    }
    
    console.log("[Transamerica Login] Login verification failed");
    return false;

  } catch (error) {
    console.error("[Transamerica Login] Error:", error);
    return false;
  }
}

/**
 * Handle OTP verification
 */
async function handleOtpVerification(page: Page): Promise<void> {
  try {
    // Select email option using JavaScript
    await page.evaluate(() => {
      // Find and click email radio button or label
      const labels = Array.from(document.querySelectorAll('label'));
      for (const label of labels) {
        if (label.textContent?.toLowerCase().includes('email')) {
          label.click();
          break;
        }
      }
      // Also try radio buttons
      const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
      for (const radio of radios) {
        const parent = radio.parentElement;
        if (parent?.textContent?.toLowerCase().includes('email')) {
          (radio as HTMLElement).click();
          break;
        }
      }
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Click Submit/Send button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase() || '';
        if (text.includes('submit') || text.includes('send')) {
          btn.click();
          return;
        }
      }
    });

    // Wait for OTP email
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Fetch OTP from Gmail
    const otpResult = await fetchTransamericaOTP();
    const otp = otpResult.otp;
    if (!otp) {
      throw new Error("Failed to fetch OTP from email");
    }

    // Enter OTP
    await page.evaluate((otpCode) => {
      const inputs = Array.from(document.querySelectorAll('input'));
      for (const input of inputs) {
        const name = input.name?.toLowerCase() || '';
        const placeholder = input.placeholder?.toLowerCase() || '';
        const type = input.type?.toLowerCase() || '';
        if (name.includes('otp') || name.includes('code') || placeholder.includes('code') || type === 'tel') {
          input.value = otpCode;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          return;
        }
      }
    }, otp);
    
    // Click Submit/Verify button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase() || '';
        if (text.includes('submit') || text.includes('verify')) {
          btn.click();
          return;
        }
      }
    });

    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});

  } catch (error) {
    console.error("[Transamerica OTP] Error:", error);
    throw error;
  }
}

/**
 * Handle security question
 */
async function handleSecurityQuestion(page: Page): Promise<void> {
  try {
    const pageContent = await page.content();
    
    let answer = "";
    if (pageContent.toLowerCase().includes("first job")) {
      answer = TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY;
    } else if (pageContent.toLowerCase().includes("pet")) {
      answer = TRANSAMERICA_SECURITY_Q_PET_NAME;
    }

    if (answer) {
      await page.type('input[name="answer"], input[type="text"]', answer);
      
      // Check "Remember this device"
      await page.click('input[type="checkbox"]').catch(() => {});
      
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const btn of buttons) {
          const text = btn.textContent?.toLowerCase() || '';
          if (text.includes('submit') || text.includes('continue')) {
            btn.click();
            return;
          }
        }
      });
      await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
    }

  } catch (error) {
    console.error("[Transamerica Security Question] Error:", error);
    throw error;
  }
}

/**
 * Navigate to Life Access portal
 */
async function navigateToLifeAccess(page: Page): Promise<void> {
  try {
    // Wait for dashboard to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Click Launch for Transamerica Life Access
    const buttons = await page.$$('button');
    for (const button of buttons) {
      const text = await button.evaluate(el => el.textContent);
      if (text?.includes("Launch")) {
        const parentText = await button.evaluate((el: Element) => {
          const parent = el.closest('[class*="card"], [class*="tile"], div');
          return (parent as HTMLElement | null)?.textContent || "";
        });
        if (parentText?.includes("Life Access")) {
          await button.click();
          break;
        }
      }
    }

    // Wait for Life Access to load
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    console.error("[Transamerica Life Access] Error:", error);
    throw error;
  }
}

/**
 * Navigate to pending policies list
 */
async function navigateToPendingPolicies(page: Page): Promise<void> {
  try {
    // Click My Book using JavaScript
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      for (const link of links) {
        if (link.textContent?.toLowerCase().includes('my book')) {
          link.click();
          return;
        }
      }
    });
    await new Promise(resolve => setTimeout(resolve, 3000));

  } catch (error) {
    console.error("[Transamerica Navigate] Error:", error);
    throw error;
  }
}

/**
 * Select specific agent from dropdown
 */
async function selectAgent(page: Page, agentName: string): Promise<void> {
  try {
    // Click agent dropdown
    await page.click('[class*="select"], [class*="dropdown"]');
    await page.waitForSelector('[role="option"], [class*="option"]', { timeout: 5000 });

    // Find and click the agent
    const options = await page.$$('[role="option"], [class*="option"]');
    for (const option of options) {
      const text = await option.evaluate(el => el.textContent);
      if (text?.toUpperCase().includes(agentName.toUpperCase())) {
        await option.click();
        break;
      }
    }

    // Wait for list to update
    await new Promise(resolve => setTimeout(resolve, 2000));

  } catch (error) {
    console.error("[Transamerica Select Agent] Error:", error);
    // Continue without agent filter
  }
}

/**
 * Extract all pending policies from the list
 */
async function extractPendingPolicies(page: Page): Promise<PendingPolicyData[]> {
  const policies: PendingPolicyData[] = [];

  try {
    // Get all policy rows
    const rows = await page.$$('tr:has(button:has-text("VIEW"))');

    for (const row of rows) {
      const rowData = await row.evaluate(el => {
        const cells = el.querySelectorAll('td, span');
        const text = el.textContent || "";
        
        // Extract policy number (10 digits starting with 66)
        const policyMatch = text.match(/66\d{8}/);
        const policyNumber = policyMatch ? policyMatch[0] : "";
        
        // Extract status
        let status = "Pending";
        if (text.includes("Issued")) status = "Issued";
        else if (text.includes("Incomplete")) status = "Incomplete";
        else if (text.includes("Post Approval")) status = "Post Approval Processing";
        
        // Extract name (usually after status)
        const nameMatch = text.match(/(?:Pending|Issued|Incomplete|Post Approval Processing)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
        const ownerName = nameMatch ? nameMatch[1] : "";
        
        return { policyNumber, status, ownerName };
      });

      if (rowData.policyNumber && rowData.status !== "Issued") {
        // Click VIEW to get details
        const viewButton = await row.$('button:has-text("VIEW")');
        if (viewButton) {
          await viewButton.click();
          await page.waitForSelector('[class*="requirement"], [class*="pending"]', { timeout: 10000 }).catch(() => {});

          // Extract detailed policy data
          const policyData = await extractPolicyDetails(page);
          if (policyData) {
            policies.push(policyData);
          }

          // Go back to list
          await page.click('a:has-text("My Book")');
          await page.waitForSelector('button:has-text("VIEW")', { timeout: 10000 });
          
          // Re-select agent
          await selectAgent(page, "ZAID SHOPEJU");
        }
      }
    }

  } catch (error) {
    console.error("[Transamerica Extract] Error:", error);
  }

  return policies;
}

/**
 * Extract detailed policy information from policy detail page
 */
async function extractPolicyDetails(page: Page): Promise<PendingPolicyData | null> {
  try {
    const data = await page.evaluate(() => {
      const getText = (selector: string) => {
        const el = document.querySelector(selector);
        return el?.textContent?.trim() || "";
      };

      const getTextByLabel = (label: string) => {
      const elements = Array.from(document.querySelectorAll('*'));
      for (const el of elements) {
          if (el.textContent?.includes(label)) {
            const next = el.nextElementSibling;
            if (next) return next.textContent?.trim() || "";
          }
        }
        return "";
      };

      // Extract policy info
      const policyNumber = document.body.textContent?.match(/66\d{8}/)?.[0] || "";
      const ownerName = getTextByLabel("Owner Name:") || "";
      const productType = getTextByLabel("Product Type:") || "";
      const faceAmount = getTextByLabel("Face Amount:") || "";
      const issueDate = getTextByLabel("Issue Date:") || "";
      const policyClosureDate = getTextByLabel("Policy Closure Date:") || "";
      const moneyReceived = getTextByLabel("Money Received:") || "";

      // Determine status
      let status = "Pending";
      const pageText = document.body.textContent || "";
      if (pageText.includes("Issued")) status = "Issued";
      else if (pageText.includes("Incomplete")) status = "Incomplete";
      else if (pageText.includes("Post Approval")) status = "Post Approval Processing";

      // Extract requirements
      const extractRequirements = (tabName: string) => {
        const requirements: any[] = [];
        const rows = document.querySelectorAll('tr');
        
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 5) {
            requirements.push({
              dateRequested: cells[0]?.textContent?.trim(),
              requirementOn: cells[1]?.textContent?.trim(),
              status: cells[2]?.textContent?.trim(),
              requirement: cells[3]?.textContent?.trim(),
              instruction: cells[4]?.textContent?.trim(),
              comments: cells[5]?.textContent?.trim() || "",
            });
          }
        });
        
        return requirements;
      };

      return {
        policyNumber,
        ownerName,
        productType,
        faceAmount,
        issueDate,
        policyClosureDate,
        moneyReceived,
        status,
        requirements: {
          pendingWithProducer: [],
          pendingWithTransamerica: [],
          completed: [],
        },
      };
    });

    // Click through tabs to get all requirements
    // Pending with Producer
    await page.click('[id*="tab-0"], a:has-text("Pending with Producer")').catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 500));
    const producerReqs = await extractRequirementsFromTable(page);

    // Pending with Transamerica
    await page.click('[id*="tab-1"], a:has-text("Pending with Transamerica")').catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 500));
    const taReqs = await extractRequirementsFromTable(page);

    // Completed
    await page.click('[id*="tab-2"], a:has-text("Completed")').catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 500));
    const completedReqs = await extractRequirementsFromTable(page);

    return {
      ...data,
      status: data.status as any,
      requirements: {
        pendingWithProducer: producerReqs,
        pendingWithTransamerica: taReqs,
        completed: completedReqs,
      },
    };

  } catch (error) {
    console.error("[Transamerica Extract Details] Error:", error);
    return null;
  }
}

/**
 * Extract requirements from the current table
 */
async function extractRequirementsFromTable(page: Page): Promise<Requirement[]> {
  return page.evaluate(() => {
    const requirements: any[] = [];
    const rows = document.querySelectorAll('table tr');
    
    rows.forEach((row, index) => {
      if (index === 0) return; // Skip header
      const cells = row.querySelectorAll('td');
      if (cells.length >= 5) {
        requirements.push({
          dateRequested: cells[0]?.textContent?.trim(),
          requirementOn: cells[1]?.textContent?.trim(),
          status: cells[2]?.textContent?.trim(),
          requirement: cells[3]?.textContent?.trim(),
          instruction: cells[4]?.textContent?.trim(),
          comments: cells[5]?.textContent?.trim() || "",
        });
      }
    });
    
    return requirements;
  });
}

/**
 * Save policy data to database
 */
async function savePolicyToDatabase(policy: PendingPolicyData): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if policy exists
  const existing = await db.select()
    .from(pendingPolicies)
    .where(eq(pendingPolicies.policyNumber, policy.policyNumber))
    .limit(1);

  let policyId: number;

  if (existing.length > 0) {
    // Update existing policy
    await db.update(pendingPolicies)
      .set({
        ownerName: policy.ownerName,
        productType: policy.productType,
        faceAmount: policy.faceAmount,
        deathBenefitOption: policy.deathBenefitOption,
        moneyReceived: policy.moneyReceived,
        premium: policy.premium,
        premiumFrequency: policy.premiumFrequency,
        issueDate: policy.issueDate,
        submittedDate: policy.submittedDate,
        policyClosureDate: policy.policyClosureDate,
        policyDeliveryTrackingNumber: policy.policyDeliveryTrackingNumber,
        status: policy.status,
        statusAsOf: policy.statusAsOf,
        underwritingDecision: policy.underwritingDecision,
        underwriter: policy.underwriter,
        riskClass: policy.riskClass,
        agentCode: policy.agentCode,
        agentName: policy.agentName,
        lastSyncedAt: new Date(),
      })
      .where(eq(pendingPolicies.policyNumber, policy.policyNumber));
    
    policyId = existing[0].id;
  } else {
    // Insert new policy
    const result = await db.insert(pendingPolicies).values({
      policyNumber: policy.policyNumber,
      ownerName: policy.ownerName,
      productType: policy.productType,
      faceAmount: policy.faceAmount,
      deathBenefitOption: policy.deathBenefitOption,
      moneyReceived: policy.moneyReceived,
      premium: policy.premium,
      premiumFrequency: policy.premiumFrequency,
      issueDate: policy.issueDate,
      submittedDate: policy.submittedDate,
      policyClosureDate: policy.policyClosureDate,
      policyDeliveryTrackingNumber: policy.policyDeliveryTrackingNumber,
      status: policy.status,
      statusAsOf: policy.statusAsOf,
      underwritingDecision: policy.underwritingDecision,
      underwriter: policy.underwriter,
      riskClass: policy.riskClass,
      agentCode: policy.agentCode,
      agentName: policy.agentName,
      lastSyncedAt: new Date(),
    });
    
    policyId = (result as any)[0]?.insertId;
  }

  // Clear existing requirements
  await db.delete(pendingRequirements).where(eq(pendingRequirements.policyId, policyId));

  // Insert new requirements
  const allRequirements = [
    ...policy.requirements.pendingWithProducer.map(r => ({
      ...r,
      policyId,
      category: "Pending with Producer" as const,
    })),
    ...policy.requirements.pendingWithTransamerica.map(r => ({
      ...r,
      policyId,
      category: "Pending with Transamerica" as const,
    })),
    ...policy.requirements.completed.map(r => ({
      ...r,
      policyId,
      category: "Completed" as const,
    })),
  ];

  if (allRequirements.length > 0) {
    await db.insert(pendingRequirements).values(allRequirements);
  }
}

// Export for use in scheduled jobs
export { PendingPolicyData, Requirement, SyncResult };


/**
 * Schedule Transamerica pending policy sync to run at specific times
 * Runs twice daily at 3:30 PM EST and 6:30 PM EST
 */
export function scheduleTransamericaSync(): void {
  // Schedule for 3:30 PM EST
  scheduleAtTime(15, 30, "3:30 PM");
  
  // Schedule for 6:30 PM EST
  scheduleAtTime(18, 30, "6:30 PM");
  
  console.log("[Transamerica Sync] Scheduled pending policy sync for 3:30 PM EST and 6:30 PM EST daily");
}

/**
 * Schedule a sync at a specific hour and minute (EST timezone)
 */
function scheduleAtTime(hour: number, minute: number, label: string): void {
  const runScheduledSync = async () => {
    console.log(`[Transamerica Sync] Running scheduled sync at ${label}...`);
    
    // Create sync log entry
    const logId = await createSyncLogEntry(label);
    
    try {
      const result = await syncTransamericaPendingPolicies();
      
      // Update sync log with results
      await updateSyncLogEntry(logId, {
        status: result.success ? "SUCCESS" : "PARTIAL",
        policiesSynced: result.policiesProcessed,
        errors: result.errors,
      });
      
      console.log(`[Transamerica Sync] Completed ${label} sync: ${result.policiesProcessed} policies synced`);
    } catch (error) {
      console.error(`[Transamerica Sync] Error during ${label} sync:`, error);
      
      await updateSyncLogEntry(logId, {
        status: "FAILED",
        errors: [error instanceof Error ? error.message : String(error)],
      });
    }
  };

  // Calculate time until next scheduled run
  const now = new Date();
  const scheduledTime = new Date();
  
  // Convert to EST (UTC-5)
  const estOffset = -5 * 60; // EST offset in minutes
  const localOffset = now.getTimezoneOffset();
  const estDiff = estOffset - localOffset;
  
  scheduledTime.setHours(hour, minute, 0, 0);
  scheduledTime.setMinutes(scheduledTime.getMinutes() - estDiff);
  
  // If the scheduled time has already passed today, schedule for tomorrow
  if (scheduledTime <= now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }
  
  const msUntilSync = scheduledTime.getTime() - now.getTime();
  
  console.log(`[Transamerica Sync] Next ${label} sync scheduled for ${scheduledTime.toISOString()}`);
  
  // Set initial timeout
  setTimeout(() => {
    runScheduledSync();
    
    // Then repeat daily
    setInterval(() => {
      runScheduledSync();
    }, 24 * 60 * 60 * 1000); // 24 hours
  }, msUntilSync);
}

/**
 * Create a sync log entry for tracking
 */
async function createSyncLogEntry(scheduledTime: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  try {
    const result = await db.insert(syncLogs).values({
      syncType: "TRANSAMERICA_PENDING",
      status: "RUNNING",
      scheduledTime,
      startedAt: new Date(),
    });
    return result[0].insertId;
  } catch (error) {
    console.error("[Transamerica Sync] Failed to create sync log:", error);
    return 0;
  }
}

/**
 * Update sync log entry with results
 */
async function updateSyncLogEntry(
  logId: number,
  data: {
    status: string;
    policiesSynced?: number;
    errors?: string[];
  }
): Promise<void> {
  if (logId === 0) return;
  const db = await getDb();
  if (!db) return;
  try {
    await db.update(syncLogs)
      .set({
        status: data.status as "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "PARTIAL",
        agentsProcessed: data.policiesSynced || 0,
        errorMessages: data.errors ? data.errors : null,
        completedAt: new Date(),
      })
      .where(eq(syncLogs.id, logId));
  } catch (error) {
    console.error("[Transamerica Sync] Failed to update sync log:", error);
  }
}

// Import syncLogs table for logging
import { syncLogs } from "../drizzle/schema";

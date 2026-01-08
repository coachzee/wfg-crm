/**
 * Extract Writing Agent Data from Transamerica Inforce Policies
 * 
 * This script logs into Transamerica, navigates to each policy detail page,
 * and extracts:
 * - Writing Agent Name, Code, Split %
 * - Secondary Agent (if split)
 * - Target Premium from Policy Guidelines
 * 
 * Then updates the database with the correct data.
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { getDb } from './db';
import { inforcePolicies } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { fetchTransamericaOTP } from './gmail-otp';

// Environment variables
const TA_USERNAME = process.env.TRANSAMERICA_USERNAME || '';
const TA_PASSWORD = process.env.TRANSAMERICA_PASSWORD || '';
const SECURITY_Q_FIRST_JOB = process.env.TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY || '';
const SECURITY_Q_PET = process.env.TRANSAMERICA_SECURITY_Q_PET_NAME || '';

// Commission constants
const TRANSAMERICA_MULTIPLIER = 1.25;

interface AgentData {
  name: string;
  code: string;
  split: number;
  role: string;
}

interface PolicyAgentData {
  policyNumber: string;
  writingAgentName: string;
  writingAgentCode: string;
  writingAgentSplit: number;
  secondAgentName: string | null;
  secondAgentCode: string | null;
  secondAgentSplit: number;
  targetPremium: number | null;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Login to Transamerica
 */
async function loginToTransamerica(page: Page): Promise<boolean> {
  console.log('[Extract] Navigating to Transamerica login...');
  
  try {
    await page.goto('https://secure.transamerica.com/login/sign-in/login.html', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await delay(2000);
    
    // Fill login form
    console.log('[Extract] Filling login credentials...');
    await page.evaluate((username: string, password: string) => {
      const userInput = document.querySelector('input[name="USER"]') as HTMLInputElement;
      const passInput = document.querySelector('input[name="PASSWORD"]') as HTMLInputElement;
      if (userInput) userInput.value = username;
      if (passInput) passInput.value = password;
    }, TA_USERNAME, TA_PASSWORD);
    
    // Click login button - use waitForSelector and evaluate click
    await delay(1000);
    await page.evaluate(() => {
      const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (submitBtn) submitBtn.click();
    });
    await delay(5000);
    
    // Check for OTP page
    const pageContent = await page.content();
    if (pageContent.includes('Extra Security Step')) {
      console.log('[Extract] OTP verification required...');
      
      // Select email option
      await page.click('input[value="email"]');
      await page.click('button[type="submit"]');
      await delay(10000);
      
      // Fetch OTP from Gmail
      console.log('[Extract] Fetching OTP from Gmail...');
      const otpResult = await fetchTransamericaOTP();
      const otp = otpResult.otp;
      
      if (otp) {
        console.log('[Extract] OTP received, entering code...');
        await page.type('input[type="text"]', otp);
        await page.click('button[type="submit"]');
        await delay(5000);
      } else {
        console.error('[Extract] Failed to retrieve OTP');
        return false;
      }
    }
    
    // Check for security question
    const securityContent = await page.content();
    if (securityContent.includes('Unrecognized Device') || securityContent.includes('security question')) {
      console.log('[Extract] Security question detected...');
      
      let answer = '';
      if (securityContent.toLowerCase().includes('first job')) {
        answer = SECURITY_Q_FIRST_JOB;
      } else if (securityContent.toLowerCase().includes('pet')) {
        answer = SECURITY_Q_PET;
      }
      
      if (answer) {
        await page.type('input[type="text"]', answer);
        
        // Check "Remember this device"
        const checkboxes = await page.$$('input[type="checkbox"]');
        for (const checkbox of checkboxes) {
          await checkbox.click();
        }
        
        await page.click('button[type="submit"]');
        await delay(5000);
      }
    }
    
    console.log('[Extract] Login completed');
    return true;
  } catch (error) {
    console.error('[Extract] Login failed:', error);
    return false;
  }
}

/**
 * Navigate to Life Access
 */
async function navigateToLifeAccess(page: Page): Promise<boolean> {
  console.log('[Extract] Navigating to Life Access...');
  
  try {
    await delay(3000);
    
    // Click Launch for Transamerica Life Access
    const launchButtons = await page.$$('button');
    for (const btn of launchButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Launch')) {
        await btn.click();
        break;
      }
    }
    
    await delay(5000);
    
    // Navigate directly to inforce list
    await page.goto('https://lifeaccess.transamerica.com/app/lifeaccess#/display/PolicyList?type=inforce', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await delay(3000);
    console.log('[Extract] Navigated to Inforce policies list');
    return true;
  } catch (error) {
    console.error('[Extract] Navigation failed:', error);
    return false;
  }
}

/**
 * Extract agent data from a single policy detail page
 */
async function extractPolicyAgentData(page: Page, policyNumber: string): Promise<PolicyAgentData | null> {
  try {
    console.log(`[Extract] Processing policy ${policyNumber}...`);
    
    // Navigate to policy detail page (General tab)
    await page.goto(`https://lifeaccess.transamerica.com/app/lifeaccess#/display/Inforce/${policyNumber}/Inforce`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await delay(2000);
    
    // Extract agent data from the Producers section
    const agentData = await page.evaluate(() => {
      const agents: AgentData[] = [];
      
      // Find all producer cards/sections
      const content = document.body.innerText;
      
      // Look for the Producers section
      const producersMatch = content.match(/Producers[\s\S]*?(?=Financial|$)/i);
      if (producersMatch) {
        const producersText = producersMatch[0];
        
        // Parse each producer entry
        // Format is typically: Name, Producer Number, Role, Split
        const lines = producersText.split('\n').map(l => l.trim()).filter(l => l);
        
        let currentAgent: Partial<AgentData> = {};
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Check for producer number pattern (like 73DXR, 49AEA)
          if (/^[A-Z0-9]{4,6}$/.test(line)) {
            currentAgent.code = line;
          }
          // Check for role
          else if (line.includes('Writing') || line.includes('Overwriting') || line.includes('Service')) {
            currentAgent.role = line;
          }
          // Check for split percentage
          else if (line.includes('%')) {
            const match = line.match(/(\d+)%/);
            if (match) {
              currentAgent.split = parseInt(match[1]);
            }
          }
          // Check for name (all caps, at least 2 words)
          else if (/^[A-Z][A-Z\s\-]+[A-Z]$/.test(line) && line.split(' ').length >= 2) {
            // If we have a previous agent, save it
            if (currentAgent.name) {
              agents.push({
                name: currentAgent.name,
                code: currentAgent.code || '',
                split: currentAgent.split || 100,
                role: currentAgent.role || ''
              });
            }
            currentAgent = { name: line };
          }
        }
        
        // Don't forget the last agent
        if (currentAgent.name) {
          agents.push({
            name: currentAgent.name,
            code: currentAgent.code || '',
            split: currentAgent.split || 100,
            role: currentAgent.role || ''
          });
        }
      }
      
      return agents;
    });
    
    // Navigate to Payment tab to get Target Premium
    await page.click('text=Payment');
    await delay(1500);
    
    // Click on Policy Guidelines
    await page.click('text=Policy Guidelines');
    await delay(1500);
    
    // Extract Target Premium
    const targetPremium = await page.evaluate(() => {
      const content = document.body.innerText;
      
      // Look for Target Premium pattern
      const targetMatch = content.match(/Target Premium[:\s]*\$?([\d,]+\.?\d*)/i);
      if (targetMatch) {
        return parseFloat(targetMatch[1].replace(/,/g, ''));
      }
      
      // Alternative: look for "Target" followed by a dollar amount
      const altMatch = content.match(/Target[\s\S]{0,20}\$?([\d,]+\.?\d*)/i);
      if (altMatch) {
        return parseFloat(altMatch[1].replace(/,/g, ''));
      }
      
      return null;
    });
    
    // Determine writing agent and secondary agent
    const writingAgent = agentData.find(a => a.role.toLowerCase().includes('writing')) || agentData[0];
    const secondAgent = agentData.find(a => a !== writingAgent && a.split > 0);
    
    return {
      policyNumber,
      writingAgentName: writingAgent?.name || 'Unknown',
      writingAgentCode: writingAgent?.code || '',
      writingAgentSplit: writingAgent?.split || 100,
      secondAgentName: secondAgent?.name || null,
      secondAgentCode: secondAgent?.code || null,
      secondAgentSplit: secondAgent?.split || 0,
      targetPremium
    };
  } catch (error) {
    console.error(`[Extract] Error processing policy ${policyNumber}:`, error);
    return null;
  }
}

/**
 * Main extraction function
 */
export async function extractAllPolicyAgentData(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error('[Extract] Database connection failed');
    return;
  }
  
  let browser: Browser | null = null;
  
  try {
    console.log('[Extract] Starting agent data extraction...');
    console.log(`[Extract] Credentials: ${TA_USERNAME ? 'Set' : 'Missing'}`);
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Login
    const loginSuccess = await loginToTransamerica(page);
    if (!loginSuccess) {
      throw new Error('Failed to login to Transamerica');
    }
    
    // Navigate to Life Access
    const navSuccess = await navigateToLifeAccess(page);
    if (!navSuccess) {
      throw new Error('Failed to navigate to Life Access');
    }
    
    // Get all policies from database
    const allPolicies = await db.select().from(inforcePolicies);
    console.log(`[Extract] Found ${allPolicies.length} policies to process`);
    
    let processed = 0;
    let updated = 0;
    let errors = 0;
    
    // Process each policy
    for (const policy of allPolicies) {
      try {
        const agentData = await extractPolicyAgentData(page, policy.policyNumber);
        
        if (agentData) {
          // Calculate commission with extracted data
          const targetPremium = agentData.targetPremium || parseFloat(policy.premium?.toString() || '0');
          const primaryCommission = targetPremium * TRANSAMERICA_MULTIPLIER * 0.55 * (agentData.writingAgentSplit / 100);
          const secondaryCommission = agentData.secondAgentSplit > 0 
            ? targetPremium * TRANSAMERICA_MULTIPLIER * 0.25 * (agentData.secondAgentSplit / 100)
            : 0;
          const totalCommission = primaryCommission + secondaryCommission;
          
          // Update database
          await db.update(inforcePolicies)
            .set({
              writingAgentName: agentData.writingAgentName,
              writingAgentCode: agentData.writingAgentCode,
              writingAgentSplit: agentData.writingAgentSplit,
              secondAgentName: agentData.secondAgentName,
              secondAgentCode: agentData.secondAgentCode,
              secondAgentSplit: agentData.secondAgentSplit,
              targetPremium: agentData.targetPremium?.toString() || policy.premium?.toString(),
              calculatedCommission: totalCommission.toString(),
              updatedAt: new Date()
            })
            .where(eq(inforcePolicies.policyNumber, policy.policyNumber));
          
          updated++;
          console.log(`[Extract] Updated ${policy.policyNumber}: ${agentData.writingAgentName} (${agentData.writingAgentSplit}%) - Target: $${agentData.targetPremium || 'N/A'}`);
        } else {
          errors++;
        }
        
        processed++;
        
        // Progress update every 10 policies
        if (processed % 10 === 0) {
          console.log(`[Extract] Progress: ${processed}/${allPolicies.length} (${updated} updated, ${errors} errors)`);
        }
        
        // Small delay between policies to avoid rate limiting
        await delay(1000);
        
      } catch (error) {
        console.error(`[Extract] Error processing ${policy.policyNumber}:`, error);
        errors++;
      }
    }
    
    console.log(`[Extract] Extraction complete!`);
    console.log(`[Extract] Processed: ${processed}, Updated: ${updated}, Errors: ${errors}`);
    
  } catch (error) {
    console.error('[Extract] Extraction failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the extraction
extractAllPolicyAgentData().then(() => {
  console.log('[Extract] Done');
  process.exit(0);
}).catch(err => {
  console.error('[Extract] Fatal error:', err);
  process.exit(1);
});

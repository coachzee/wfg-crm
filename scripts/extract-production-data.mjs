/**
 * Extract Production Data from Transamerica Life Access
 * 
 * This script:
 * 1. Logs into Transamerica secure portal
 * 2. Navigates to Life Access > Inforce policies
 * 3. Extracts each policy's details including writing agent and split
 * 4. Calculates commissions using: Target Premium × 125% × Agent Level
 * 5. Saves data to JSON for import into Production dashboard
 */

import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// --- Auto Chrome Discovery ---
import { homedir } from 'os';
function findChrome() {
  // Check Puppeteer cache directories
  for (const base of [resolve(homedir(), '.cache/puppeteer/chrome'), '/root/.cache/puppeteer/chrome']) {
    if (existsSync(base)) {
      try {
        const vers = readdirSync(base).sort().reverse();
        for (const v of vers) {
          const bin = resolve(base, v, 'chrome-linux64', 'chrome');
          if (existsSync(bin)) return bin;
        }
      } catch {}
    }
  }
  // System Chromium fallbacks
  for (const p of ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome-stable', '/usr/bin/google-chrome']) {
    if (existsSync(p)) return p;
  }
  return undefined;
}
const __chromePath = findChrome();
// --- End Auto Chrome Discovery ---


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SECURITY: Credentials must be set via environment variables - no fallbacks
function mustGetEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    console.error(`❌ Missing required environment variable: ${name}`);
    console.error('Please set all required Transamerica credentials in your environment.');
    process.exit(1);
  }
  return value;
}

// Transamerica credentials from environment (required)
const TA_USERNAME = mustGetEnv('TRANSAMERICA_USERNAME');
const TA_PASSWORD = mustGetEnv('TRANSAMERICA_PASSWORD');
const SECURITY_Q_FIRST_JOB = mustGetEnv('TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY');
const SECURITY_Q_PET = mustGetEnv('TRANSAMERICA_SECURITY_Q_PET_NAME');

// Commission constants
const TRANSAMERICA_MULTIPLIER = 1.25; // 125%

// Agent levels (percentage) - these should be fetched from the agents table
const DEFAULT_AGENT_LEVEL = 0.55; // 55% default

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loginToTransamerica(page) {
  console.log('Navigating to Transamerica login...');
  await page.goto('https://secure.transamerica.com/login/sign-in/login.html', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });
  
  await delay(2000);
  
  // Fill login form
  console.log('Filling login credentials...');
  await page.type('input[name="USER"]', TA_USERNAME);
  await page.type('input[name="PASSWORD"]', TA_PASSWORD);
  
  // Click login button
  await page.click('button[type="submit"]');
  await delay(5000);
  
  // Check for OTP page
  const pageContent = await page.content();
  if (pageContent.includes('Extra Security Step')) {
    console.log('OTP verification required...');
    // Select email option and submit
    await page.click('input[value="email"]');
    await page.click('button[type="submit"]');
    await delay(10000);
    
    // Wait for OTP - in production this would fetch from Gmail
    console.log('Waiting for OTP entry (manual intervention may be needed)...');
    await delay(30000);
  }
  
  // Check for security question
  const securityContent = await page.content();
  if (securityContent.includes('Unrecognized Device') || securityContent.includes('security question')) {
    console.log('Security question detected...');
    
    if (securityContent.includes('first job')) {
      await page.type('input[type="text"]', SECURITY_Q_FIRST_JOB);
    } else if (securityContent.includes('pet')) {
      await page.type('input[type="text"]', SECURITY_Q_PET);
    }
    
    // Check "Remember this device"
    const rememberCheckbox = await page.$('input[type="checkbox"]');
    if (rememberCheckbox) {
      await rememberCheckbox.click();
    }
    
    await page.click('button[type="submit"]');
    await delay(5000);
  }
  
  console.log('Login completed');
}

async function navigateToLifeAccess(page) {
  console.log('Navigating to Life Access...');
  
  // Wait for dashboard to load
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
  console.log('Navigated to Inforce policies list');
}

async function extractPolicyList(page) {
  console.log('Extracting policy list...');
  
  const policies = [];
  let hasMorePages = true;
  let pageNum = 1;
  
  while (hasMorePages) {
    console.log(`Processing page ${pageNum}...`);
    
    // Wait for table to load
    await delay(2000);
    
    // Extract policy rows from current page
    const pageData = await page.evaluate(() => {
      const rows = document.querySelectorAll('tr');
      const data = [];
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 7) {
          const status = cells[0]?.textContent?.trim();
          const policyNumber = cells[1]?.textContent?.trim();
          const ownerName = cells[2]?.textContent?.trim();
          const productType = cells[3]?.textContent?.trim();
          const state = cells[4]?.textContent?.trim();
          const faceAmount = cells[5]?.textContent?.trim();
          const premium = cells[6]?.textContent?.trim();
          
          if (policyNumber && policyNumber.match(/^\d+$/)) {
            data.push({
              status,
              policyNumber,
              ownerName,
              productType,
              state,
              faceAmount,
              premium
            });
          }
        }
      });
      
      return data;
    });
    
    policies.push(...pageData);
    console.log(`Found ${pageData.length} policies on page ${pageNum}`);
    
    // Check for next page
    const nextButton = await page.$('a[aria-label="Next page"], button:has-text("Next"), .pagination-next');
    if (nextButton) {
      const isDisabled = await page.evaluate(el => el.disabled || el.classList.contains('disabled'), nextButton);
      if (!isDisabled) {
        await nextButton.click();
        await delay(2000);
        pageNum++;
      } else {
        hasMorePages = false;
      }
    } else {
      // Try clicking page 2 if pagination exists
      const page2Link = await page.$('a:has-text("2")');
      if (page2Link && pageNum === 1) {
        await page2Link.click();
        await delay(2000);
        pageNum++;
      } else {
        hasMorePages = false;
      }
    }
    
    // Safety limit
    if (pageNum > 10) hasMorePages = false;
  }
  
  console.log(`Total policies extracted: ${policies.length}`);
  return policies;
}

async function extractPolicyDetails(page, policyNumber) {
  console.log(`Extracting details for policy ${policyNumber}...`);
  
  try {
    // Navigate to policy detail page
    await page.goto(`https://lifeaccess.transamerica.com/app/lifeaccess#/display/Inforce/${policyNumber}/Inforce`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await delay(2000);
    
    // Extract writing agent and split information
    const details = await page.evaluate(() => {
      const content = document.body.innerText;
      
      // Find writing agent info
      const writingAgentMatch = content.match(/Name\s+([A-Z\s\-]+)\s+Business Phone.*?RoleWriting.*?Split\s+(\d+)%/s);
      const writingAgent = writingAgentMatch ? {
        name: writingAgentMatch[1].trim(),
        split: parseInt(writingAgentMatch[2])
      } : null;
      
      // Find all producer info
      const producers = [];
      const producerBlocks = content.split(/Name\s+(?=[A-Z])/);
      
      producerBlocks.forEach(block => {
        const nameMatch = block.match(/^([A-Z\s\-]+)/);
        const roleMatch = block.match(/Role\s*([A-Za-z,\s]+)/);
        const splitMatch = block.match(/Split\s+(\d+)%/);
        const producerNumMatch = block.match(/Producer Number\s+([A-Z0-9]+)/);
        
        if (nameMatch && roleMatch) {
          producers.push({
            name: nameMatch[1].trim(),
            role: roleMatch[1].trim(),
            split: splitMatch ? parseInt(splitMatch[1]) : null,
            producerNumber: producerNumMatch ? producerNumMatch[1] : null
          });
        }
      });
      
      // Find premium info from Payment tab content if available
      const premiumMatch = content.match(/Billed Premium\s+\$?([\d,]+\.?\d*)/);
      const billedPremium = premiumMatch ? parseFloat(premiumMatch[1].replace(',', '')) : null;
      
      const frequencyMatch = content.match(/Frequency\s+(\w+)/);
      const frequency = frequencyMatch ? frequencyMatch[1] : 'Monthly';
      
      return {
        producers,
        writingAgent,
        billedPremium,
        frequency
      };
    });
    
    return details;
  } catch (error) {
    console.error(`Error extracting details for ${policyNumber}:`, error.message);
    return null;
  }
}

function calculateCommission(targetPremium, agentLevel, split) {
  // Commission = Target Premium × 125% × Agent Level × Split
  return targetPremium * TRANSAMERICA_MULTIPLIER * agentLevel * (split / 100);
}

function parseAmount(amountStr) {
  if (!amountStr) return 0;
  return parseFloat(amountStr.replace(/[$,]/g, '')) || 0;
}

async function main() {
  console.log('Starting Transamerica production data extraction...');
  
  const browser = await puppeteer.launch({
    executablePath: __chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Login
    await loginToTransamerica(page);
    
    // Navigate to Life Access
    await navigateToLifeAccess(page);
    
    // Extract policy list
    const policies = await extractPolicyList(page);
    
    // For each policy, extract detailed info
    const productionData = [];
    
    for (const policy of policies.slice(0, 10)) { // Limit to first 10 for testing
      const details = await extractPolicyDetails(page, policy.policyNumber);
      
      if (details) {
        // Calculate annual premium
        let annualPremium = parseAmount(policy.premium);
        if (details.frequency === 'Monthly') {
          annualPremium *= 12;
        } else if (details.frequency === 'Quarterly') {
          annualPremium *= 4;
        }
        
        // Find writing agent and calculate commission
        const writingAgent = details.producers.find(p => 
          p.role && p.role.toLowerCase().includes('writing')
        );
        
        const split = writingAgent?.split || 100;
        const commission = calculateCommission(annualPremium, DEFAULT_AGENT_LEVEL, split);
        
        productionData.push({
          policyNumber: policy.policyNumber,
          ownerName: policy.ownerName,
          productType: policy.productType,
          state: policy.state,
          faceAmount: parseAmount(policy.faceAmount),
          premium: parseAmount(policy.premium),
          annualPremium,
          frequency: details.frequency,
          writingAgent: writingAgent?.name || 'Unknown',
          writingAgentProducerNumber: writingAgent?.producerNumber || null,
          split,
          commission,
          status: policy.status,
          producers: details.producers
        });
      }
      
      await delay(1000); // Rate limiting
    }
    
    // Save to JSON file
    const outputPath = path.join(__dirname, '../data/production-data.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(productionData, null, 2));
    
    console.log(`\nExtracted ${productionData.length} policies with production data`);
    console.log(`Data saved to: ${outputPath}`);
    
    // Summary
    const totalPremium = productionData.reduce((sum, p) => sum + p.annualPremium, 0);
    const totalCommission = productionData.reduce((sum, p) => sum + p.commission, 0);
    
    console.log(`\nSummary:`);
    console.log(`Total Annual Premium: $${totalPremium.toLocaleString()}`);
    console.log(`Total Commission (at 55% level): $${totalCommission.toLocaleString()}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

main();

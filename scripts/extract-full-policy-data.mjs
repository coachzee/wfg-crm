/**
 * Extract Target Premium and Split Agent data from all Transamerica inforce policies.
 * 
 * For each policy:
 * 1. Click VIEW to open policy detail
 * 2. Go to Payment tab > Policy Guidelines to get Target Premium
 * 3. Go to General tab > Agent Information to get Split Agents
 * 4. Save data to JSON file
 * 5. Update database with correct values
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// Configuration
const TRANSAMERICA_URL = 'https://secure.transamerica.com/login/sign-in/login.html';
const USERNAME = process.env.TRANSAMERICA_USERNAME || 'larex3030';
const PASSWORD = process.env.TRANSAMERICA_PASSWORD || 'Jesulob@1241';
const SECURITY_Q_FIRST_JOB = process.env.TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY || 'lagos';
const SECURITY_Q_PET = process.env.TRANSAMERICA_SECURITY_Q_PET_NAME || 'bingo';

const OUTPUT_FILE = '/home/ubuntu/wfg-crm/data/policy-details-extracted.json';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function extractPolicyDetails(page, policyNumber) {
  const details = {
    policyNumber,
    targetPremium: null,
    monthlyMinimumPremium: null,
    splitAgents: [],
    extractedAt: new Date().toISOString()
  };

  try {
    // Click on Payment tab
    await page.waitForSelector('[id*="policyDetailNav-tab-2"], a:has-text("Payment")', { timeout: 10000 });
    await page.click('[id*="policyDetailNav-tab-2"]');
    await delay(1500);

    // Click on Policy Guidelines sub-tab
    await page.waitForSelector('[id*="policyDetailPanelFinancialInfoCol2Nav3-tab-0"], a:has-text("Policy Guidelines")', { timeout: 10000 });
    await page.click('[id*="policyDetailPanelFinancialInfoCol2Nav3-tab-0"]');
    await delay(1500);

    // Extract Target Premium from the page
    const pageContent = await page.content();
    
    // Look for Target Premium value
    const targetPremiumMatch = pageContent.match(/Target Premium[^$]*\$([0-9,]+\.?\d*)/i);
    if (targetPremiumMatch) {
      details.targetPremium = parseFloat(targetPremiumMatch[1].replace(/,/g, ''));
    }

    // Look for Monthly Minimum Premium
    const monthlyMinMatch = pageContent.match(/Monthly Minimum Premium[^$]*\$([0-9,]+\.?\d*)/i);
    if (monthlyMinMatch) {
      details.monthlyMinimumPremium = parseFloat(monthlyMinMatch[1].replace(/,/g, ''));
    }

    // Now go to General tab for Agent Information
    await page.click('[id*="policyDetailNav-tab-0"]');
    await delay(1500);

    // Scroll down to find Agent Information section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await delay(1000);

    // Extract agent split information from the page
    const agentContent = await page.content();
    
    // Parse agent splits - look for patterns like "Name ... Split 40%"
    const agentMatches = agentContent.matchAll(/Name\s*([A-Z\s]+)\s*.*?Role\s*(Writing|Service Agent|Overwriting).*?Split\s*(\d+)%/gis);
    for (const match of agentMatches) {
      details.splitAgents.push({
        name: match[1].trim(),
        role: match[2].trim(),
        splitPercent: parseInt(match[3])
      });
    }

    // Alternative parsing - look for structured agent data
    if (details.splitAgents.length === 0) {
      const splitMatches = agentContent.matchAll(/([A-Z][A-Z\s]+)\s+.*?Split\s+(\d+)%/g);
      for (const match of splitMatches) {
        if (match[1].length > 3 && !match[1].includes('WORLD FINANCIAL')) {
          details.splitAgents.push({
            name: match[1].trim(),
            role: 'Unknown',
            splitPercent: parseInt(match[2])
          });
        }
      }
    }

    console.log(`  ✓ Policy ${policyNumber}: Target Premium $${details.targetPremium}, ${details.splitAgents.length} split agents`);
  } catch (error) {
    console.error(`  ✗ Error extracting ${policyNumber}: ${error.message}`);
    details.error = error.message;
  }

  return details;
}

async function main() {
  console.log('Starting Transamerica policy data extraction...');
  console.log('This will extract Target Premium and Split Agent data from all inforce policies.');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const extractedPolicies = [];
  
  try {
    // Step 1: Login to Transamerica
    console.log('\n1. Logging into Transamerica...');
    await page.goto(TRANSAMERICA_URL, { waitUntil: 'networkidle2' });
    await delay(2000);

    // Fill login form
    await page.type('input[name="username"], input[type="text"]', USERNAME);
    await page.type('input[name="password"], input[type="password"]', PASSWORD);
    await delay(500);
    
    // Click login button
    await page.click('button[type="submit"], input[type="submit"]');
    await delay(5000);

    // Check for OTP or security question
    const pageUrl = page.url();
    const pageContent = await page.content();
    
    if (pageContent.includes('Extra Security Step') || pageContent.includes('verification code')) {
      console.log('   OTP required - this script needs manual intervention for OTP');
      console.log('   Please use the browser tool to complete login manually');
      await browser.close();
      return;
    }

    if (pageContent.includes('security question') || pageContent.includes('first job')) {
      console.log('   Security question detected, answering...');
      await page.type('input[type="text"]:not([name="username"])', SECURITY_Q_FIRST_JOB);
      await page.click('button[type="submit"]');
      await delay(3000);
    }

    // Step 2: Navigate to Life Access
    console.log('\n2. Navigating to Transamerica Life Access...');
    await page.goto('https://lifeaccess.transamerica.com/app/lifeaccess#/display/Home', { waitUntil: 'networkidle2' });
    await delay(3000);

    // Step 3: Go to Inforce policies
    console.log('\n3. Navigating to Inforce policies...');
    await page.goto('https://lifeaccess.transamerica.com/app/lifeaccess#/display/PolicyList?type=inforce', { waitUntil: 'networkidle2' });
    await delay(3000);

    // Select WORLD FINANCIAL GROUP to see all policies
    const agentDropdown = await page.$('[class*="dropdown"], select');
    if (agentDropdown) {
      await agentDropdown.click();
      await delay(1000);
      // Look for WFG option
      const wfgOption = await page.$('text/WORLD FINANCIAL GROUP');
      if (wfgOption) {
        await wfgOption.click();
        await delay(2000);
      }
    }

    // Step 4: Get list of all policy numbers from the page
    console.log('\n4. Extracting policy list...');
    const policyNumbers = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="PolicyDetail"], td');
      const numbers = [];
      links.forEach(link => {
        const text = link.textContent.trim();
        if (/^660\d{7}$/.test(text)) {
          numbers.push(text);
        }
      });
      return [...new Set(numbers)];
    });

    console.log(`   Found ${policyNumbers.length} policies to process`);

    // Step 5: Process each policy
    console.log('\n5. Extracting details from each policy...');
    
    for (let i = 0; i < policyNumbers.length; i++) {
      const policyNumber = policyNumbers[i];
      console.log(`\n   Processing ${i + 1}/${policyNumbers.length}: ${policyNumber}`);
      
      try {
        // Click VIEW button for this policy
        const viewButtons = await page.$$('button:has-text("VIEW"), a:has-text("VIEW")');
        if (viewButtons[i]) {
          await viewButtons[i].click();
          await delay(3000);
          
          // Extract details
          const details = await extractPolicyDetails(page, policyNumber);
          extractedPolicies.push(details);
          
          // Go back to list
          await page.goBack();
          await delay(2000);
        }
      } catch (error) {
        console.error(`   Error processing ${policyNumber}: ${error.message}`);
        extractedPolicies.push({
          policyNumber,
          error: error.message,
          extractedAt: new Date().toISOString()
        });
      }

      // Save progress every 10 policies
      if ((i + 1) % 10 === 0) {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(extractedPolicies, null, 2));
        console.log(`   Progress saved: ${i + 1} policies processed`);
      }
    }

    // Save final results
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(extractedPolicies, null, 2));
    console.log(`\n✓ Extraction complete! ${extractedPolicies.length} policies saved to ${OUTPUT_FILE}`);

  } catch (error) {
    console.error('Fatal error:', error);
    // Save whatever we have
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(extractedPolicies, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

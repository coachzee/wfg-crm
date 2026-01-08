import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// Credentials from environment
const USERNAME = process.env.TRANSAMERICA_USERNAME || 'larex3030';
const PASSWORD = process.env.TRANSAMERICA_PASSWORD || 'Jesulob@1241';

const EXTRACTED_DATA_PATH = '/home/ubuntu/wfg-crm/data/extracted-policies-full.json';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function extractPolicyData() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  const extractedPolicies = [];
  
  try {
    console.log('Step 1: Logging into Transamerica...');
    
    // Go to login page
    await page.goto('https://secure.transamerica.com/login/sign-in/login.html', { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(2000);
    
    // Enter credentials
    await page.type('#username', USERNAME);
    await page.type('#password', PASSWORD);
    await page.click('#formLogin');
    
    // Wait for login to complete
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
    console.log('Login successful!');
    await sleep(3000);
    
    // Navigate to Transamerica Life Access
    console.log('Step 2: Navigating to Transamerica Life Access...');
    await page.goto('https://lifeaccess.transamerica.com/app/lifeaccess#/display/Home', { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(5000);
    
    // Click on Inforce tab
    console.log('Step 3: Clicking on Inforce tab...');
    await page.waitForSelector('#navPendingAndInforceKPIs-tab-1', { timeout: 30000 });
    await page.click('#navPendingAndInforceKPIs-tab-1');
    await sleep(2000);
    
    // Click VIEW MY BOOK
    console.log('Step 4: Clicking VIEW MY BOOK...');
    await page.waitForSelector('#btnViewMyBookInforce', { timeout: 30000 });
    await page.click('#btnViewMyBookInforce');
    await sleep(5000);
    
    // Wait for policy list to load
    console.log('Step 5: Waiting for policy list to load...');
    await page.waitForSelector('#bookNavCasesAndPolicies-tab-1', { timeout: 30000 });
    await page.click('#bookNavCasesAndPolicies-tab-1');
    await sleep(3000);
    
    // Get all policy numbers from the table
    console.log('Step 6: Extracting policy numbers...');
    
    let allPolicyNumbers = [];
    let currentPage = 1;
    let hasMorePages = true;
    
    while (hasMorePages) {
      // Extract policy numbers from current page
      const policyNumbers = await page.evaluate(() => {
        const links = document.querySelectorAll('table tbody tr td a[id]');
        return Array.from(links).map(link => link.id).filter(id => id.match(/^\d+$/));
      });
      
      console.log(`Found ${policyNumbers.length} policies on page ${currentPage}`);
      allPolicyNumbers = [...allPolicyNumbers, ...policyNumbers];
      
      // Check if there's a next page
      const nextButton = await page.$('button.pagination-next:not([disabled])');
      if (nextButton) {
        await nextButton.click();
        await sleep(2000);
        currentPage++;
      } else {
        hasMorePages = false;
      }
    }
    
    console.log(`Total policies found: ${allPolicyNumbers.length}`);
    
    // Now extract data from each policy
    console.log('Step 7: Extracting data from each policy...');
    
    for (let i = 0; i < allPolicyNumbers.length; i++) {
      const policyNumber = allPolicyNumbers[i];
      console.log(`Processing policy ${i + 1}/${allPolicyNumbers.length}: ${policyNumber}`);
      
      try {
        // Click on the policy number to open details
        await page.click(`a#${policyNumber}`);
        await sleep(3000);
        
        // Wait for policy details to load
        await page.waitForSelector('#policyDetailNav-tab-0', { timeout: 15000 });
        await sleep(2000);
        
        // Extract writing agent info from General tab (should already be visible)
        const agentInfo = await page.evaluate(() => {
          const text = document.body.innerText;
          
          // Find writing agent info
          const writingAgentMatch = text.match(/Name\s+([A-Z\s\-]+)\s+Business Phone.*?RoleWriting.*?Producer Number\s+(\w+)\s+Split\s+(\d+)%/s);
          const secondAgentMatch = text.match(/Name\s+([A-Z\s\-]+)\s+Business Phone.*?RoleWriting.*?Producer Number\s+(\w+)\s+Split\s+(\d+)%.*?Name\s+([A-Z\s\-]+)\s+Business Phone.*?RoleWriting.*?Producer Number\s+(\w+)\s+Split\s+(\d+)%/s);
          
          // Get owner name
          const ownerMatch = text.match(/([A-Z\s\-]+)'S POLICY/);
          
          // Get face amount
          const faceMatch = text.match(/Face Amount:\s*\$([0-9,]+)/);
          
          return {
            ownerName: ownerMatch ? ownerMatch[1].trim() : null,
            faceAmount: faceMatch ? parseInt(faceMatch[1].replace(/,/g, '')) : null,
            writingAgentName: writingAgentMatch ? writingAgentMatch[1].trim() : null,
            writingAgentCode: writingAgentMatch ? writingAgentMatch[2] : null,
            writingAgentSplit: writingAgentMatch ? parseInt(writingAgentMatch[3]) : 100,
            secondAgentName: secondAgentMatch ? secondAgentMatch[4].trim() : null,
            secondAgentCode: secondAgentMatch ? secondAgentMatch[5] : null,
            secondAgentSplit: secondAgentMatch ? parseInt(secondAgentMatch[6]) : null
          };
        });
        
        // Click on Payment tab
        await page.click('#policyDetailNav-tab-2');
        await sleep(2000);
        
        // Click on Policy Guidelines tab
        await page.waitForSelector('#policyDetailPanelFinancialInfoCol2Nav3-tab-0', { timeout: 10000 });
        await page.click('#policyDetailPanelFinancialInfoCol2Nav3-tab-0');
        await sleep(2000);
        
        // Extract Target Premium
        const premiumInfo = await page.evaluate(() => {
          const text = document.body.innerText;
          const targetMatch = text.match(/Target Premium\s*\$([0-9,.]+)/);
          const billedMatch = text.match(/Billed Premium\s*\$([0-9,.]+)/);
          
          return {
            targetPremium: targetMatch ? parseFloat(targetMatch[1].replace(/,/g, '')) : null,
            billedPremium: billedMatch ? parseFloat(billedMatch[1].replace(/,/g, '')) : null
          };
        });
        
        const policyData = {
          policyNumber,
          ...agentInfo,
          ...premiumInfo,
          extractedAt: new Date().toISOString()
        };
        
        extractedPolicies.push(policyData);
        console.log(`  Extracted: ${agentInfo.writingAgentName || 'Unknown'}, Target: $${premiumInfo.targetPremium || 'N/A'}`);
        
        // Save progress after each policy
        fs.writeFileSync(EXTRACTED_DATA_PATH, JSON.stringify({ 
          extractedAt: new Date().toISOString(),
          totalPolicies: allPolicyNumbers.length,
          extractedCount: extractedPolicies.length,
          policies: extractedPolicies 
        }, null, 2));
        
        // Go back to policy list
        await page.click('a[href*="My Book"]');
        await sleep(2000);
        await page.click('#bookNavCasesAndPolicies-tab-1');
        await sleep(2000);
        
      } catch (error) {
        console.error(`  Error extracting policy ${policyNumber}: ${error.message}`);
        extractedPolicies.push({
          policyNumber,
          error: error.message,
          extractedAt: new Date().toISOString()
        });
        
        // Try to recover by going back to policy list
        try {
          await page.goto('https://lifeaccess.transamerica.com/app/lifeaccess#/display/PolicyList?type=inforce', { waitUntil: 'networkidle2', timeout: 30000 });
          await sleep(3000);
        } catch (e) {
          console.error('Failed to recover, continuing...');
        }
      }
    }
    
    console.log('\nExtraction complete!');
    console.log(`Successfully extracted: ${extractedPolicies.filter(p => !p.error).length}/${allPolicyNumbers.length} policies`);
    
  } catch (error) {
    console.error('Fatal error:', error.message);
  } finally {
    await browser.close();
  }
  
  // Final save
  fs.writeFileSync(EXTRACTED_DATA_PATH, JSON.stringify({ 
    extractedAt: new Date().toISOString(),
    policies: extractedPolicies 
  }, null, 2));
  
  return extractedPolicies;
}

// Run the extraction
extractPolicyData().then(policies => {
  console.log(`\nExtracted ${policies.length} policies`);
  console.log(`Data saved to: ${EXTRACTED_DATA_PATH}`);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Automated Transamerica Policy Data Extraction
 * Extracts writing agent and target premium data from all inforce policies
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  username: process.env.TRANSAMERICA_USERNAME || 'larex3030',
  password: process.env.TRANSAMERICA_PASSWORD || 'Jesulob@1241',
  outputFile: '/home/ubuntu/wfg-crm/data/extracted-policy-data.json',
  headless: true,
  timeout: 60000,
};

// All policy numbers
const ALL_POLICIES = [
  "6602269223","6602269192","6602261140","6602261128","6602261107","6602261087","6602260436","6602253476","6602249306","6602248890",
  "6602240821","6602238677","6602238477","6602238442","6602238431","6602238411","6602229276","6602229206","6602228160","6602226983",
  "6602220773","6602220770","6602220390","6602209351","6602206689","6602206390","6602193338","6602193310","6602188517","6602187664",
  "6602187637","6602187565","6602187500","6602182339","6602179163","6602170374","6602164027","6602164014","6602163662","6602149144",
  "6602144055","6602131194","6602131049","6602130905","6602129205","6602128468","6602127194","6602126722","6602125120","6602122713",
  "6602120233","6602112226","6602110189","6602105477","6602103743","6602095343","6602093495","6602093453","6602093037","6602093014",
  "6602092983","6602089630","6602089626","6602078054","6602076037","6602074840","6602072090","6602056904","6602047476","6602037542",
  "6602032636","6602030925","6602016169","6602013018","6602012170","6602011183","6602004668","6602001359","6601990789","6601986273",
  "6601985304","6601979120","6601979097","6601972047","6601958027","6601946313","6601935778","6601935732","6601934000","6601933717",
  "6601933689","6601929464","6601929409","6601928682","6601928616","6601925054","6601925022"
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForSelector(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

async function login(page) {
  console.log('🔐 Logging in to Transamerica...');
  
  await page.goto('https://secure.transamerica.com/login/sign-in/login.html', {
    waitUntil: 'networkidle2',
    timeout: CONFIG.timeout
  });
  
  await sleep(3000);
  
  // Fill username using evaluate
  await page.evaluate((username) => {
    const input = document.querySelector('input[name="username"]');
    if (input) {
      input.value = username;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, CONFIG.username);
  
  await sleep(500);
  
  // Fill password using evaluate
  await page.evaluate((password) => {
    const input = document.querySelector('input[name="password"]');
    if (input) {
      input.value = password;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, CONFIG.password);
  
  await sleep(500);
  
  // Click login button using evaluate
  await page.evaluate(() => {
    const button = document.querySelector('button[type="submit"]');
    if (button) button.click();
  });
  
  // Wait for navigation
  try {
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: CONFIG.timeout });
  } catch (e) {
    // Navigation may have already happened
  }
  await sleep(5000);
  
  // Check if login was successful by looking at URL
  const currentUrl = page.url();
  if (currentUrl.includes('login') && currentUrl.includes('error')) {
    throw new Error('Login failed - check credentials');
  }
  
  console.log('✅ Login successful');
}

async function navigateToLifeAccess(page) {
  console.log('🚀 Navigating to Transamerica Life Access...');
  
  // Click on Transamerica Life Access tile
  const lifeAccessLink = await page.$('a[href*="lifeaccess"]');
  if (lifeAccessLink) {
    await lifeAccessLink.click();
    await sleep(5000);
  } else {
    // Direct navigation
    await page.goto('https://lifeaccess.transamerica.com/app/lifeaccess', {
      waitUntil: 'networkidle2',
      timeout: CONFIG.timeout
    });
    await sleep(3000);
  }
  
  console.log('✅ Navigated to Life Access');
}

async function navigateToInforceList(page) {
  console.log('📋 Navigating to Inforce Policy List...');
  
  // Click on Inforce tab
  await page.evaluate(() => {
    const tabs = document.querySelectorAll('a, button, div');
    for (const tab of tabs) {
      if (tab.textContent?.includes('Inforce') && !tab.textContent?.includes('Pending')) {
        tab.click();
        break;
      }
    }
  });
  
  await sleep(3000);
  
  // Click VIEW MY BOOK
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('button, a');
    for (const btn of buttons) {
      if (btn.textContent?.includes('VIEW MY BOOK') || btn.textContent?.includes('View My Book')) {
        btn.click();
        break;
      }
    }
  });
  
  await sleep(5000);
  console.log('✅ Loaded Inforce Policy List');
}

async function extractPolicyData(page, policyNumber, index, total) {
  console.log(`\n📄 [${index + 1}/${total}] Extracting policy ${policyNumber}...`);
  
  const result = {
    policyNumber,
    writingAgents: [],
    targetPremium: null,
    extractedAt: new Date().toISOString(),
    error: null
  };
  
  try {
    // Navigate directly to policy detail page
    const policyUrl = `https://lifeaccess.transamerica.com/app/lifeaccess#/display/Inforce/${policyNumber}/Inforce`;
    await page.goto(policyUrl, { waitUntil: 'networkidle2', timeout: CONFIG.timeout });
    await sleep(3000);
    
    // Check if we need to click through any loading dialogs
    await page.evaluate(() => {
      const closeButtons = document.querySelectorAll('button');
      for (const btn of closeButtons) {
        if (btn.textContent?.includes('×') || btn.textContent?.includes('Close') || btn.getAttribute('aria-label')?.includes('close')) {
          btn.click();
        }
      }
    });
    await sleep(1000);
    
    // Extract agent information from the General tab (default view)
    const agentData = await page.evaluate(() => {
      const agents = [];
      const pageText = document.body.innerText;
      
      // Look for agent information patterns
      // Pattern: "Writing" or "Service Agent" followed by agent details
      const sections = document.querySelectorAll('div, tr, td');
      
      let currentAgent = null;
      
      for (const section of sections) {
        const text = section.innerText || '';
        
        // Check for agent role indicators
        if (text.includes('Writing') && text.includes('Producer Number')) {
          // This section contains agent info
          const nameMatch = text.match(/Name\s+([A-Z][A-Z\s]+?)(?:\s+Business|$)/);
          const codeMatch = text.match(/Producer Number\s+([A-Z0-9]+)/);
          const splitMatch = text.match(/Split\s+(\d+)%/);
          
          if (nameMatch || codeMatch) {
            agents.push({
              name: nameMatch ? nameMatch[1].trim() : null,
              code: codeMatch ? codeMatch[1].trim() : null,
              split: splitMatch ? parseInt(splitMatch[1]) : 100,
              role: text.includes('Service Agent') ? 'Service' : 'Writing'
            });
          }
        }
      }
      
      // Alternative: Look for specific table structure
      if (agents.length === 0) {
        const rows = document.querySelectorAll('tr');
        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            const label = cells[0]?.innerText?.trim();
            const value = cells[1]?.innerText?.trim();
            
            if (label === 'Name' && value && /^[A-Z\s]+$/.test(value)) {
              currentAgent = { name: value };
            }
            if (label === 'Producer Number' && currentAgent) {
              currentAgent.code = value;
            }
            if (label === 'Split' && currentAgent) {
              currentAgent.split = parseInt(value) || 100;
              agents.push(currentAgent);
              currentAgent = null;
            }
          }
        }
      }
      
      return agents;
    });
    
    result.writingAgents = agentData;
    
    // Click on Payment tab to get Target Premium
    console.log('   💰 Extracting Target Premium...');
    
    await page.evaluate(() => {
      const tabs = document.querySelectorAll('a, button, li');
      for (const tab of tabs) {
        if (tab.textContent?.trim() === 'Payment' || tab.id?.includes('Payment')) {
          tab.click();
          break;
        }
      }
    });
    
    await sleep(2000);
    
    // Click on Policy Guidelines sub-tab
    await page.evaluate(() => {
      const tabs = document.querySelectorAll('a, button, li');
      for (const tab of tabs) {
        if (tab.textContent?.includes('Policy Guidelines')) {
          tab.click();
          break;
        }
      }
    });
    
    await sleep(2000);
    
    // Extract Target Premium
    const targetPremium = await page.evaluate(() => {
      const pageText = document.body.innerText;
      
      // Look for Target Premium pattern
      const patterns = [
        /Target Premium\s+\$?([\d,]+\.?\d*)/,
        /Target\s+Premium[:\s]+\$?([\d,]+\.?\d*)/,
        /TargetPremium[:\s]+\$?([\d,]+\.?\d*)/
      ];
      
      for (const pattern of patterns) {
        const match = pageText.match(pattern);
        if (match) {
          return parseFloat(match[1].replace(/,/g, ''));
        }
      }
      
      // Try finding in table cells
      const cells = document.querySelectorAll('td, div');
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        if (cell.innerText?.includes('Target Premium')) {
          // Check next sibling or next cell
          const nextCell = cells[i + 1];
          if (nextCell) {
            const value = nextCell.innerText?.trim();
            const match = value?.match(/\$?([\d,]+\.?\d*)/);
            if (match) {
              return parseFloat(match[1].replace(/,/g, ''));
            }
          }
        }
      }
      
      return null;
    });
    
    result.targetPremium = targetPremium;
    
    console.log(`   ✅ Agents: ${result.writingAgents.map(a => `${a.name} (${a.split}%)`).join(', ') || 'None found'}`);
    console.log(`   ✅ Target Premium: ${targetPremium ? `$${targetPremium.toLocaleString()}` : 'Not found'}`);
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    result.error = error.message;
  }
  
  return result;
}

async function main() {
  console.log('🚀 Starting Transamerica Policy Data Extraction');
  console.log(`📊 Total policies to extract: ${ALL_POLICIES.length}`);
  console.log('');
  
  const browser = await puppeteer.launch({
    headless: CONFIG.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();
  page.setDefaultTimeout(CONFIG.timeout);
  page.setDefaultNavigationTimeout(CONFIG.timeout);
  
  const results = [];
  
  try {
    // Login
    await login(page);
    
    // Navigate to Life Access
    await navigateToLifeAccess(page);
    
    // Navigate to Inforce list
    await navigateToInforceList(page);
    
    // Extract data for each policy
    for (let i = 0; i < ALL_POLICIES.length; i++) {
      const policyNumber = ALL_POLICIES[i];
      const result = await extractPolicyData(page, policyNumber, i, ALL_POLICIES.length);
      results.push(result);
      
      // Save progress every 10 policies
      if ((i + 1) % 10 === 0) {
        fs.writeFileSync(CONFIG.outputFile, JSON.stringify(results, null, 2));
        console.log(`\n💾 Progress saved (${i + 1}/${ALL_POLICIES.length})`);
      }
      
      // Small delay between policies to avoid rate limiting
      await sleep(1000);
    }
    
    // Save final results
    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(results, null, 2));
    console.log(`\n✅ Extraction complete! Results saved to ${CONFIG.outputFile}`);
    
    // Summary
    const successful = results.filter(r => r.writingAgents.length > 0 || r.targetPremium);
    const failed = results.filter(r => r.error);
    
    console.log('\n📊 Summary:');
    console.log(`   Total: ${results.length}`);
    console.log(`   Successful: ${successful.length}`);
    console.log(`   Failed: ${failed.length}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    
    // Save whatever we have
    if (results.length > 0) {
      fs.writeFileSync(CONFIG.outputFile, JSON.stringify(results, null, 2));
      console.log(`💾 Partial results saved to ${CONFIG.outputFile}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

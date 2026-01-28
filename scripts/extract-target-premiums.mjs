/**
 * Extract Target Premium and Split Agent data from Transamerica Life Access
 * 
 * This script:
 * 1. Logs into Transamerica with OTP handling
 * 2. Navigates to each inforce policy
 * 3. Extracts Target Premium from Payment > Policy Guidelines
 * 4. Extracts split agent info from General > Agent Information
 * 5. Updates the database with accurate data
 */

import puppeteer from 'puppeteer';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq } from 'drizzle-orm';
import * as schema from '../drizzle/schema.js';
import Imap from 'imap';

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

// Environment variables (required)
const TRANSAMERICA_USERNAME = mustGetEnv('TRANSAMERICA_USERNAME');
const TRANSAMERICA_PASSWORD = mustGetEnv('TRANSAMERICA_PASSWORD');
const TRANSAMERICA_EMAIL = mustGetEnv('TRANSAMERICA_EMAIL');
const TRANSAMERICA_APP_PASSWORD = mustGetEnv('TRANSAMERICA_APP_PASSWORD');
const SECURITY_Q_FIRST_JOB_CITY = mustGetEnv('TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY');
const SECURITY_Q_PET_NAME = mustGetEnv('TRANSAMERICA_SECURITY_Q_PET_NAME');

// Database connection
async function getDb() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  return drizzle(connection, { schema, mode: 'default' });
}

// Fetch OTP from Gmail
async function fetchOtpFromGmail(maxWaitMs = 120000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const imap = new Imap({
      user: TRANSAMERICA_EMAIL,
      password: TRANSAMERICA_APP_PASSWORD,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });

    function checkForOtp() {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          imap.end();
          reject(err);
          return;
        }

        // Search for recent Transamerica emails
        const searchDate = new Date();
        searchDate.setMinutes(searchDate.getMinutes() - 5);
        const dateStr = searchDate.toISOString().split('T')[0].replace(/-/g, '-');
        
        imap.search([['FROM', 'transamerica'], ['SINCE', searchDate]], (err, results) => {
          if (err || !results || results.length === 0) {
            if (Date.now() - startTime < maxWaitMs) {
              setTimeout(checkForOtp, 5000);
              return;
            }
            imap.end();
            reject(new Error('No OTP email found within timeout'));
            return;
          }

          const latestId = results[results.length - 1];
          const fetch = imap.fetch([latestId], { bodies: '' });
          
          fetch.on('message', (msg) => {
            let body = '';
            msg.on('body', (stream) => {
              stream.on('data', (chunk) => { body += chunk.toString(); });
              stream.on('end', () => {
                // Extract 6-digit OTP code
                const otpMatch = body.match(/\b(\d{6})\b/);
                if (otpMatch) {
                  imap.end();
                  resolve(otpMatch[1]);
                } else if (Date.now() - startTime < maxWaitMs) {
                  setTimeout(checkForOtp, 5000);
                } else {
                  imap.end();
                  reject(new Error('Could not extract OTP from email'));
                }
              });
            });
          });

          fetch.once('error', (err) => {
            imap.end();
            reject(err);
          });
        });
      });
    }

    imap.once('ready', checkForOtp);
    imap.once('error', reject);
    imap.connect();
  });
}

// Main extraction function
async function extractTargetPremiums() {
  console.log('Starting Target Premium extraction...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  try {
    // Step 1: Login to Transamerica
    console.log('Logging into Transamerica...');
    await page.goto('https://secure.transamerica.com/login/sign-in/login.html', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    
    // Fill login form
    await page.type('input[type="text"]', TRANSAMERICA_USERNAME);
    await page.type('input[type="password"]', TRANSAMERICA_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for OTP page or dashboard
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    
    // Check if OTP is required
    const pageContent = await page.content();
    if (pageContent.includes('Extra Security') || pageContent.includes('verification code')) {
      console.log('OTP required, selecting email option...');
      
      // Select email option
      const emailRadio = await page.$('input[value*="email"], input[id*="email"]');
      if (emailRadio) await emailRadio.click();
      
      // Submit to send OTP
      const submitBtn = await page.$('button[type="submit"], input[type="submit"]');
      if (submitBtn) await submitBtn.click();
      
      await page.waitForTimeout(3000);
      
      // Fetch OTP from Gmail
      console.log('Waiting for OTP email...');
      const otp = await fetchOtpFromGmail(120000);
      console.log(`OTP received: ${otp}`);
      
      // Enter OTP
      const otpInput = await page.$('input[type="text"], input[type="tel"]');
      if (otpInput) {
        await otpInput.type(otp);
        const verifyBtn = await page.$('button[type="submit"]');
        if (verifyBtn) await verifyBtn.click();
      }
      
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    }
    
    // Check for security question
    const securityContent = await page.content();
    if (securityContent.includes('security question') || securityContent.includes('Unrecognized Device')) {
      console.log('Security question detected...');
      
      let answer = SECURITY_Q_FIRST_JOB_CITY;
      if (securityContent.toLowerCase().includes('pet')) {
        answer = SECURITY_Q_PET_NAME;
      }
      
      const answerInput = await page.$('input[type="text"]:not([readonly])');
      if (answerInput) {
        await answerInput.type(answer);
        
        // Check "Remember this device"
        const rememberCheckbox = await page.$('input[type="checkbox"]');
        if (rememberCheckbox) await rememberCheckbox.click();
        
        const submitBtn = await page.$('button[type="submit"]');
        if (submitBtn) await submitBtn.click();
      }
      
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    }
    
    // Step 2: Navigate to Life Access
    console.log('Navigating to Transamerica Life Access...');
    await page.goto('https://lifeaccess.transamerica.com/app/lifeaccess#/display/Home', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(3000);
    
    // Step 3: Go to Inforce policies
    await page.goto('https://lifeaccess.transamerica.com/app/lifeaccess#/display/PolicyList?type=inforce', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(3000);
    
    // Select WORLD FINANCIAL GROUP
    const agentDropdown = await page.$('span[class*="select"]');
    if (agentDropdown) {
      await agentDropdown.click();
      await page.waitForTimeout(1000);
      
      // Type to search
      await page.keyboard.type('WORLD FINANCIAL');
      await page.waitForTimeout(1000);
      
      // Click the option
      const option = await page.$('li[class*="option"]');
      if (option) await option.click();
    }
    
    await page.waitForTimeout(3000);
    
    // Step 4: Get all policy numbers from the list
    const policyNumbers = await page.evaluate(() => {
      const links = document.querySelectorAll('a[id^="66"]');
      return Array.from(links).map(a => a.textContent.trim());
    });
    
    console.log(`Found ${policyNumbers.length} policies to process`);
    
    // Step 5: Process each policy
    const db = await getDb();
    const results = [];
    
    for (let i = 0; i < policyNumbers.length; i++) {
      const policyNumber = policyNumbers[i];
      console.log(`Processing policy ${i + 1}/${policyNumbers.length}: ${policyNumber}`);
      
      try {
        // Click on the policy number to open details
        const policyLink = await page.$(`a[id="${policyNumber}"]`);
        if (!policyLink) {
          console.log(`  Could not find link for ${policyNumber}, skipping...`);
          continue;
        }
        
        // Open in new tab
        const newPagePromise = new Promise(resolve => browser.once('targetcreated', target => resolve(target.page())));
        await page.evaluate((pn) => {
          const link = document.querySelector(`a[id="${pn}"]`);
          if (link) {
            link.setAttribute('target', '_blank');
            link.click();
          }
        }, policyNumber);
        
        const detailPage = await newPagePromise;
        await detailPage.waitForTimeout(3000);
        
        // Navigate to Payment tab
        const paymentTab = await detailPage.$('a:contains("Payment"), button:contains("Payment")');
        if (paymentTab) {
          await paymentTab.click();
          await detailPage.waitForTimeout(2000);
        }
        
        // Extract Target Premium from Policy Guidelines
        let targetPremium = null;
        const pageText = await detailPage.evaluate(() => document.body.innerText);
        const targetMatch = pageText.match(/Target Premium[:\s]*\$?([\d,]+\.?\d*)/i);
        if (targetMatch) {
          targetPremium = parseFloat(targetMatch[1].replace(/,/g, ''));
          console.log(`  Target Premium: $${targetPremium}`);
        }
        
        // Navigate to General tab for agent info
        const generalTab = await detailPage.$('a:contains("General"), button:contains("General")');
        if (generalTab) {
          await generalTab.click();
          await detailPage.waitForTimeout(2000);
        }
        
        // Extract split agent info
        let writingAgent = null;
        let splitPercentage = 100;
        const agentText = await detailPage.evaluate(() => document.body.innerText);
        
        const writingMatch = agentText.match(/Writing Agent[:\s]*([A-Z\s\-]+)/i);
        if (writingMatch) {
          writingAgent = writingMatch[1].trim();
        }
        
        const splitMatch = agentText.match(/(\d+)%\s*Split/i);
        if (splitMatch) {
          splitPercentage = parseInt(splitMatch[1]);
        }
        
        console.log(`  Writing Agent: ${writingAgent}, Split: ${splitPercentage}%`);
        
        // Update database
        if (targetPremium) {
          const commission = targetPremium * 1.25 * 0.55 * (splitPercentage / 100);
          await db.update(schema.inforcePolicies)
            .set({
              targetPremium: targetPremium.toString(),
              writingAgentName: writingAgent,
              writingAgentSplit: splitPercentage,
              calculatedCommission: commission.toFixed(2)
            })
            .where(eq(schema.inforcePolicies.policyNumber, policyNumber));
          
          results.push({
            policyNumber,
            targetPremium,
            writingAgent,
            splitPercentage
          });
        }
        
        // Close detail tab
        await detailPage.close();
        
        // Small delay to avoid rate limiting
        await page.waitForTimeout(1000);
        
      } catch (err) {
        console.log(`  Error processing ${policyNumber}: ${err.message}`);
      }
    }
    
    console.log(`\nExtraction complete! Processed ${results.length} policies`);
    console.log('Results:', JSON.stringify(results, null, 2));
    
    await browser.close();
    return results;
    
  } catch (error) {
    console.error('Extraction failed:', error);
    await browser.close();
    throw error;
  }
}

// Run the extraction
extractTargetPremiums()
  .then(results => {
    console.log(`Successfully extracted ${results.length} policies`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Failed:', err);
    process.exit(1);
  });

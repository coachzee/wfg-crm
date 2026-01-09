#!/usr/bin/env npx tsx
/**
 * Transamerica Pending Policies Sync using Playwright
 * More robust than Puppeteer for slow/complex sites
 */
import { chromium } from 'playwright';
import Imap from 'imap';

const credentials = {
  username: process.env.TRANSAMERICA_USERNAME || '',
  password: process.env.TRANSAMERICA_PASSWORD || '',
};

const gmailCredentials = {
  email: process.env.TRANSAMERICA_EMAIL || '',
  password: process.env.TRANSAMERICA_APP_PASSWORD || '',
};

console.log('[Transamerica Sync] Starting...');
console.log(`Username: ${credentials.username}`);
console.log(`Gmail: ${gmailCredentials.email}`);

async function fetchOTPFromGmail(maxWaitSeconds = 120, afterTimestamp = null) {
  return new Promise((resolve) => {
    console.log('[Gmail] Connecting to fetch OTP...');
    const minTimestamp = afterTimestamp || Date.now() - 60000; // Default: emails from last 1 minute
    console.log(`[Gmail] Looking for emails after: ${new Date(minTimestamp).toISOString()}`);
    
    const imap = new Imap({
      user: gmailCredentials.email,
      password: gmailCredentials.password,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    const startTime = Date.now();
    let resolved = false;

    const checkForOTP = () => {
      if (resolved) return;
      
      imap.openBox('INBOX', false, (err) => {
        if (err) {
          console.log('[Gmail] Error opening inbox:', err.message);
          return;
        }

        // Search for recent Transamerica emails
        const searchDate = new Date(minTimestamp);
        
        imap.search([
          ['FROM', 'transamerica'],
          ['SINCE', searchDate]
        ], (err, results) => {
          if (err || !results?.length) {
            if ((Date.now() - startTime) / 1000 < maxWaitSeconds) {
              setTimeout(checkForOTP, 5000);
            } else {
              resolved = true;
              imap.end();
              resolve({ success: false, error: 'Timeout waiting for OTP' });
            }
            return;
          }

          const fetch = imap.fetch(results.slice(-1), { bodies: '' });
          
          fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
              let body = '';
              stream.on('data', (chunk) => body += chunk.toString());
              stream.on('end', () => {
                // Extract 6-digit OTP
                const otpMatch = body.match(/\b(\d{6})\b/);
                if (otpMatch && !resolved) {
                  resolved = true;
                  imap.end();
                  resolve({ success: true, otp: otpMatch[1] });
                }
              });
            });
          });

          fetch.once('end', () => {
            if (!resolved && (Date.now() - startTime) / 1000 < maxWaitSeconds) {
              setTimeout(checkForOTP, 5000);
            }
          });
        });
      });
    };

    imap.once('ready', checkForOTP);
    imap.once('error', (err) => {
      if (!resolved) {
        resolved = true;
        resolve({ success: false, error: err.message });
      }
    });

    imap.connect();
  });
}

async function main() {
  console.log('=== Transamerica Sync (Playwright) ===');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate to login
    console.log('[Sync] Navigating to Transamerica...');
    await page.goto('https://secure.transamerica.com/login/sign-in/login.html', { 
      timeout: 60000,
      waitUntil: 'domcontentloaded'
    });
    
    await page.waitForTimeout(3000);
    
    // Fill login form
    console.log('[Sync] Filling login form...');
    await page.fill('#username', credentials.username);
    await page.fill('#password', credentials.password);
    
    // Click login
    console.log('[Sync] Clicking login...');
    await page.click('#formLogin');
    
    // Wait for navigation
    await page.waitForTimeout(5000);
    
    // Check for OTP page
    const currentUrl = page.url();
    console.log(`[Sync] Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('securityCode') || currentUrl.includes('macotp')) {
      console.log('[Sync] OTP required!');
      
      // Wait for page to fully load (loading spinner to disappear)
      console.log('[Sync] Waiting for OTP page to fully load...');
      await page.waitForTimeout(3000);
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: '/home/ubuntu/ta-pw-otp.png' });
      
      // Wait for radio buttons to be visible
      console.log('[Sync] Waiting for radio buttons...');
      await page.waitForSelector('input[type="radio"]', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1000);
      
      // Select email option (second radio button) using JavaScript for reliability
      console.log('[Sync] Selecting email option...');
      const emailSelected = await page.evaluate(() => {
        const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
        console.log('Found radios:', radios.length);
        if (radios.length >= 2) {
          radios[1].checked = true;
          radios[1].click();
          radios[1].dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
        // Try by label text
        const labels = Array.from(document.querySelectorAll('label'));
        for (const label of labels) {
          if (label.textContent?.toLowerCase().includes('email')) {
            label.click();
            return true;
          }
        }
        return false;
      });
      console.log(`[Sync] Email option selected: ${emailSelected}`);
      
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '/home/ubuntu/ta-pw-after-email-select.png' });
      
      // Record timestamp BEFORE clicking Submit so we only get new OTPs
      const submitTimestamp = Date.now();
      console.log(`[Sync] Recording timestamp: ${new Date(submitTimestamp).toISOString()}`);
      
      // Click Submit - use text selector to find the right button
      console.log('[Sync] Clicking Submit...');
      await page.locator('button:has-text("SUBMIT"):visible').first().click({ force: true }).catch(async () => {
        // Fallback: click by evaluating in page
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          for (const btn of buttons) {
            if (btn.textContent?.toUpperCase().includes('SUBMIT') && btn.offsetParent !== null) {
              btn.click();
              return;
            }
          }
        });
      });
      
      // Wait for OTP to be sent
      console.log('[Sync] Waiting for OTP to be sent...');
      await page.waitForTimeout(10000);
      await page.screenshot({ path: '/home/ubuntu/ta-pw-after-submit.png' });
      
      // Wait for OTP email - only look for emails AFTER we clicked Submit
      console.log('[Sync] Waiting for NEW OTP email...');
      
      const otpResult = await fetchOTPFromGmail(120, submitTimestamp);
      
      if (!otpResult.success) {
        throw new Error(`Failed to get OTP: ${otpResult.error}`);
      }
      
      console.log(`[Sync] OTP received: ${otpResult.otp}`);
      
      // Wait for OTP input page to be ready
      await page.waitForTimeout(3000);
      await page.screenshot({ path: '/home/ubuntu/ta-pw-otp-entry.png' });
      console.log(`[Sync] OTP entry page URL: ${page.url()}`);
      
      // Enter OTP - look for the specific OTP input field
      console.log('[Sync] Entering OTP...');
      const otpEntered = await page.evaluate((otp) => {
        // Try multiple selectors for OTP input
        const selectors = [
          'input[name="otp"]',
          'input[name*="otp"]',
          'input[id*="otp"]',
          'input[placeholder*="code"]',
          'input[placeholder*="Code"]',
          'input[type="tel"]',
          'input.otp-input',
        ];
        
        for (const sel of selectors) {
          const input = document.querySelector(sel);
          if (input && input.offsetParent !== null) {
            input.value = otp;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            return `Found and filled: ${sel}`;
          }
        }
        
        // Fallback: find visible text input that's not a search box
        const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="tel"], input:not([type])'));
        for (const input of inputs) {
          if (input.offsetParent !== null && 
              !input.name?.includes('search') && 
              !input.id?.includes('search') &&
              !input.placeholder?.toLowerCase().includes('search')) {
            input.value = otp;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            return `Fallback filled: ${input.name || input.id || 'unnamed'}`;
          }
        }
        
        return null;
      }, otpResult.otp);
      
      console.log(`[Sync] OTP entry result: ${otpEntered}`);
      
      if (!otpEntered) {
        throw new Error('Could not find OTP input field');
      }
      
      await page.waitForTimeout(1000);
      
      // Submit OTP
      console.log('[Sync] Submitting OTP...');
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const btn of buttons) {
          if (btn.textContent?.toUpperCase().includes('SUBMIT') && btn.offsetParent !== null) {
            btn.click();
            return;
          }
        }
        // Fallback to any submit button
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      });
      
      await page.waitForTimeout(5000);
    }
    
    console.log('[Sync] Login successful!');
    console.log(`[Sync] Current URL: ${page.url()}`);
    
    // Handle device registration / security question page if present
    if (page.url().includes('deviceRegistration') || page.url().includes('registerDevice')) {
      console.log('[Sync] Device registration / security question page detected...');
      await page.screenshot({ path: '/home/ubuntu/ta-pw-device-reg.png' });
      
      // Security question answers from environment (case-sensitive!)
      const securityAnswers = {
        'first job': process.env.TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY || 'Lagos',
        'pet': process.env.TRANSAMERICA_SECURITY_Q_PET_NAME || 'Bingo',
        'mother': 'Ode Remo',  // Where did your mother and father meet
        'father': 'Ode Remo',  // Where did your mother and father meet
        'parent': 'Ode Remo',  // Where did your parents meet
      };
      
      // Try to answer security question
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        attempts++;
        console.log(`[Sync] Security question attempt ${attempts}...`);
        
        // Get the current question text
        const questionText = await page.evaluate(() => {
          const labels = document.querySelectorAll('label, p, div');
          for (const el of labels) {
            const text = el.textContent?.toLowerCase() || '';
            if (text.includes('what') || text.includes('city') || text.includes('pet') || text.includes('job')) {
              return text;
            }
          }
          return '';
        });
        console.log(`[Sync] Question: ${questionText}`);
        
        // Find the answer based on question keywords
        let answer = null;
        if (questionText.includes('first job') || questionText.includes('city') && questionText.includes('job')) {
          answer = securityAnswers['first job'];
        } else if (questionText.includes('pet')) {
          answer = securityAnswers['pet'];
        } else if (questionText.includes('mother') || questionText.includes('father') || questionText.includes('parent')) {
          answer = securityAnswers['mother'];
        }
        
        if (!answer) {
          // We don't have this answer, click "Get another question"
          console.log(`[Sync] Unknown question, clicking Get another question...`);
          try {
            await page.click('a:has-text("Get another question"), a:has-text("another question")');
            await page.waitForTimeout(2000);
            attempts++;
            continue;
          } catch (e) {
            console.log(`[Sync] Could not click Get another question: ${e.message}`);
          }
        }
        
        if (answer) {
          console.log(`[Sync] Found answer: ${answer}`);
          
          // Fill in the answer using Playwright's type() for proper keystroke simulation
          console.log(`[Sync] Filling answer: ${answer}`);
          
          // First, clear any existing value and focus the input
          const inputSelectors = [
            'input[name="answermasked"]',
            'input[name="answer"]', 
            'input#answer',
            'input#answermasked'
          ];
          
          let filled = false;
          for (const selector of inputSelectors) {
            try {
              const input = page.locator(selector).first();
              if (await input.count() > 0) {
                // Click to focus
                await input.click();
                // Clear existing content
                await input.fill('');
                // Type character by character to trigger validation
                await input.type(answer, { delay: 50 });
                console.log(`[Sync] Typed answer in ${selector}`);
                filled = true;
                break;
              }
            } catch (e) {
              console.log(`[Sync] Failed to fill ${selector}: ${e.message}`);
            }
          }
          
          if (!filled) {
            // Fallback: try any visible text input
            console.log('[Sync] Trying fallback input method...');
            const textInput = page.locator('input[type="text"]:visible, input:not([type]):visible').first();
            if (await textInput.count() > 0) {
              await textInput.click();
              await textInput.fill('');
              await textInput.type(answer, { delay: 50 });
              console.log('[Sync] Typed answer in fallback input');
            }
          }
          
          await page.waitForTimeout(500);
          
          // Select "Yes" to remember device
          await page.evaluate(() => {
            const radios = document.querySelectorAll('input[type="radio"]');
            for (const radio of radios) {
              const label = radio.closest('label') || document.querySelector(`label[for="${radio.id}"]`);
              if (label?.textContent?.toLowerCase().includes('yes')) {
                radio.click();
                return;
              }
            }
            // Click first radio if no "yes" found
            if (radios[0]) radios[0].click();
          });
          
          await page.waitForTimeout(500);
          
          // Click LOGIN button
          await page.evaluate(() => {
            const buttons = document.querySelectorAll('button, input[type="submit"]');
            for (const btn of buttons) {
              if ((btn.textContent || btn.value || '').toLowerCase().includes('login')) {
                btn.click();
                return;
              }
            }
          });
          
          await page.waitForTimeout(5000);
          break;
        } else {
          // Click "Get another question" to try a different question
          console.log('[Sync] Unknown question, getting another...');
          const gotAnother = await page.evaluate(() => {
            const links = document.querySelectorAll('a, button');
            for (const link of links) {
              if (link.textContent?.toLowerCase().includes('another question')) {
                link.click();
                return true;
              }
            }
            return false;
          });
          
          if (!gotAnother) {
            console.log('[Sync] Could not find "Get another question" link');
            break;
          }
          
          await page.waitForTimeout(2000);
        }
      }
      
      await page.screenshot({ path: '/home/ubuntu/ta-pw-after-security.png' });
      console.log(`[Sync] After security question: ${page.url()}`);
      
      // If still on registration page or error, try direct navigation
      if (page.url().includes('deviceRegistration') || page.url().includes('chrome-error')) {
        console.log('[Sync] Still on registration, navigating to agent home...');
        await page.goto('https://secure.transamerica.com/agenthome/', { 
          timeout: 30000,
          waitUntil: 'domcontentloaded' 
        }).catch(() => {});
        await page.waitForTimeout(5000);
      }
      
      console.log(`[Sync] Final URL after device registration: ${page.url()}`);
    }
    
    // Navigate to Life Access
    console.log('[Sync] Looking for Life Access...');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/home/ubuntu/ta-pw-dashboard.png' });
    
    // Click Launch button for Life Access using JavaScript
    const launchClicked = await page.evaluate(() => {
      // Find all cards/sections
      const cards = document.querySelectorAll('.card, .panel, .tile, [class*="card"], [class*="tile"], div');
      for (const card of cards) {
        if (card.textContent?.includes('Life Access') || card.textContent?.includes('Transamerica Life')) {
          const btn = card.querySelector('button, a[class*="btn"], [class*="launch"]');
          if (btn) {
            btn.click();
            return 'Clicked Launch in Life Access card';
          }
        }
      }
      // Fallback: find any Launch button
      const buttons = Array.from(document.querySelectorAll('button, a'));
      for (const btn of buttons) {
        if (btn.textContent?.toLowerCase().includes('launch')) {
          btn.click();
          return 'Clicked generic Launch button';
        }
      }
      return null;
    });
    console.log(`[Sync] Launch result: ${launchClicked}`);
    
    // Wait for Life Access to load
    await page.waitForTimeout(15000);
    console.log(`[Sync] Life Access URL: ${page.url()}`);
    
    // Click My Book
    await page.click('text=My Book', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(5000);
    
    // Extract policies
    console.log('[Sync] Extracting policies...');
    await page.screenshot({ path: '/home/ubuntu/ta-pw-policies.png' });
    
    const policies = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      return rows.map(row => {
        const cells = row.querySelectorAll('td');
        return {
          status: cells[0]?.textContent?.trim() || '',
          policyNumber: cells[1]?.textContent?.trim() || '',
          ownerName: cells[2]?.textContent?.trim() || '',
          date: cells[3]?.textContent?.trim() || '',
          product: cells[4]?.textContent?.trim() || '',
          faceAmount: cells[5]?.textContent?.trim() || '',
          premium: cells[6]?.textContent?.trim() || '',
        };
      }).filter(p => p.policyNumber);
    });
    
    console.log(`[Sync] Found ${policies.length} policies`);
    policies.forEach(p => {
      console.log(`  - ${p.status}: ${p.policyNumber} - ${p.ownerName} - ${p.faceAmount}`);
    });
    
    console.log('\n=== Sync Complete ===');
    
  } catch (error) {
    console.error('[Sync] Error:', error.message);
    await page.screenshot({ path: '/home/ubuntu/ta-pw-error.png' });
  } finally {
    await browser.close();
  }
}

main();

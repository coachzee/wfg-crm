/**
 * Explore Transamerica Life Access portal to extract pending policy data
 * Complete version with OTP, security questions, and device registration
 */

import puppeteer from 'puppeteer';
import { waitForOTP, getTransamericaCredentials } from '../server/gmail-otp.ts';

// Get Transamerica login credentials from environment
function getTransamericaLoginCredentials() {
  return {
    username: process.env.TRANSAMERICA_USERNAME || '',
    password: process.env.TRANSAMERICA_PASSWORD || '',
  };
}

// Get security question answers from environment
function getSecurityQuestionAnswers() {
  return {
    firstJobCity: process.env.TRANSAMERICA_SECURITY_Q_FIRST_JOB_CITY || 'lagos',
    petName: process.env.TRANSAMERICA_SECURITY_Q_PET_NAME || 'bingo',
  };
}

// Answer security question based on the question text
function getSecurityAnswer(questionText) {
  const answers = getSecurityQuestionAnswers();
  const question = questionText.toLowerCase();
  
  if (question.includes('first job') || question.includes('city') || question.includes('town')) {
    return answers.firstJobCity;
  }
  if (question.includes('pet') || question.includes('animal')) {
    return answers.petName;
  }
  
  console.log('[Transamerica] Unknown security question:', questionText);
  return null;
}

async function loginToTransamerica(page) {
  console.log('[Transamerica] Starting automated login...');
  
  // Navigate to Transamerica login page
  console.log('[Transamerica] Navigating to login page...');
  await page.goto('https://secure.transamerica.com/login/sign-in/login.html', { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  
  // Get credentials
  const credentials = getTransamericaLoginCredentials();
  console.log('[Transamerica] Using username:', credentials.username);
  
  if (!credentials.username || !credentials.password) {
    throw new Error('Transamerica credentials not configured');
  }
  
  // Wait for login form
  await page.waitForSelector('#username', { timeout: 10000 });
  console.log('[Transamerica] Found username field');
  
  // Fill username and password
  console.log('[Transamerica] Entering credentials...');
  await page.click('#username', { clickCount: 3 });
  await page.type('#username', credentials.username, { delay: 50 });
  await page.click('#password', { clickCount: 3 });
  await page.type('#password', credentials.password, { delay: 50 });
  
  // Click LOGIN button
  console.log('[Transamerica] Clicking LOGIN button...');
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('button, input[type="submit"]');
    for (const btn of buttons) {
      const text = btn.textContent?.trim().toUpperCase() || btn.value?.toUpperCase() || '';
      if (text === 'LOGIN') {
        btn.click();
        return;
      }
    }
  });
  
  // Wait for navigation
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check current page state
  let pageUrl = page.url();
  let pageText = await page.evaluate(() => document.body.innerText);
  
  console.log('[Transamerica] Current URL:', pageUrl);
  
  // Handle OTP selection page
  if (pageUrl.includes('securityCodeDelivery') || pageText.includes('Extra Security Step Required')) {
    console.log('[Transamerica] OTP selection page detected');
    
    // Select email option
    console.log('[Transamerica] Selecting email option for OTP...');
    await page.evaluate(() => {
      const radios = document.querySelectorAll('input[type="radio"]');
      for (const radio of radios) {
        const label = radio.parentElement?.textContent || '';
        if (label.toLowerCase().includes('email')) {
          radio.click();
          return;
        }
      }
      if (radios.length >= 2) {
        radios[1].click();
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Click SUBMIT
    console.log('[Transamerica] Clicking SUBMIT...');
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, input[type="submit"]');
      for (const btn of buttons) {
        const text = btn.textContent?.trim().toUpperCase() || btn.value?.toUpperCase() || '';
        if (text === 'SUBMIT') {
          btn.click();
          return;
        }
      }
    });
    
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Wait for OTP email
    console.log('[Transamerica] Waiting for OTP email...');
    const gmailCreds = getTransamericaCredentials();
    const otpResult = await waitForOTP(gmailCreds, 'transamerica', 90, 5);
    
    if (!otpResult.success || !otpResult.otp) {
      throw new Error(`Failed to get OTP: ${otpResult.error}`);
    }
    
    console.log(`[Transamerica] OTP received: ${otpResult.otp}`);
    
    // Enter OTP
    await page.evaluate((otp) => {
      const inputs = document.querySelectorAll('input[type="text"], input[type="tel"], input[inputmode="numeric"]');
      for (const input of inputs) {
        if (input.offsetParent !== null) {
          input.value = otp;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
      }
    }, otpResult.otp);
    
    // Submit OTP
    console.log('[Transamerica] Submitting OTP...');
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, input[type="submit"]');
      for (const btn of buttons) {
        const text = btn.textContent?.trim().toUpperCase() || btn.value?.toUpperCase() || '';
        if (text === 'SUBMIT' || text === 'VERIFY' || text === 'CONTINUE') {
          btn.click();
          return;
        }
      }
    });
    
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update page state
    pageUrl = page.url();
    pageText = await page.evaluate(() => document.body.innerText);
  }
  
  // Handle Unrecognized Device / Security Question page
  if (pageUrl.includes('deviceRegistration') || pageText.includes('Unrecognized Device') || pageText.includes('verify your identity')) {
    console.log('[Transamerica] Security question page detected');
    
    await page.screenshot({ path: '/tmp/ta-v5-security-question.png', fullPage: true });
    
    // Find the security question text
    const questionText = await page.evaluate(() => {
      const labels = document.querySelectorAll('label, p, span, div');
      for (const label of labels) {
        const text = label.textContent?.trim() || '';
        if (text.includes('?') && (text.includes('city') || text.includes('town') || text.includes('job') || text.includes('pet') || text.includes('name'))) {
          return text;
        }
      }
      return '';
    });
    
    console.log('[Transamerica] Security question:', questionText);
    
    // Get the answer
    const answer = getSecurityAnswer(questionText);
    
    if (answer) {
      console.log('[Transamerica] Entering security answer...');
      
      // Find and fill the answer input
      await page.evaluate((ans) => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="password"]');
        for (const input of inputs) {
          const name = input.name?.toLowerCase() || '';
          const id = input.id?.toLowerCase() || '';
          // Skip username/password fields
          if (name.includes('username') || name.includes('password') || id.includes('username') || id.includes('password')) {
            continue;
          }
          if (input.offsetParent !== null) {
            input.value = ans;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return;
          }
        }
      }, answer);
      
      // Select "Yes" for remember this device
      console.log('[Transamerica] Selecting "Yes" to remember device...');
      await page.evaluate(() => {
        const radios = document.querySelectorAll('input[type="radio"]');
        for (const radio of radios) {
          const label = radio.parentElement?.textContent?.toLowerCase() || '';
          if (label.includes('yes') || label.includes('private')) {
            radio.click();
            return;
          }
        }
        // Fallback: click first radio
        if (radios.length > 0) {
          radios[0].click();
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await page.screenshot({ path: '/tmp/ta-v5-security-filled.png', fullPage: true });
      
      // Click LOGIN button
      console.log('[Transamerica] Clicking LOGIN to submit security answer...');
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, input[type="submit"]');
        for (const btn of buttons) {
          const text = btn.textContent?.trim().toUpperCase() || btn.value?.toUpperCase() || '';
          if (text === 'LOGIN' || text === 'SUBMIT' || text === 'CONTINUE') {
            btn.click();
            return;
          }
        }
      });
      
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  await page.screenshot({ path: '/tmp/ta-v5-after-login.png', fullPage: true });
  console.log('[Transamerica] Screenshot saved: /tmp/ta-v5-after-login.png');
  
  // Verify login success
  const finalUrl = page.url();
  const finalText = await page.evaluate(() => document.body.innerText);
  
  console.log('[Transamerica] Final URL:', finalUrl);
  console.log('[Transamerica] Final page text (first 1000 chars):', finalText.substring(0, 1000));
  
  const loginSuccess = !finalUrl.includes('sign-in/login') && 
                       !finalUrl.includes('securityCode') &&
                       !finalUrl.includes('deviceRegistration') &&
                       !finalText.toLowerCase().includes('invalid credentials');
  
  console.log('[Transamerica] Login successful:', loginSuccess);
  
  return loginSuccess;
}

async function navigateToLifeAccess(page) {
  console.log('[Transamerica] Looking for Life Access...');
  
  await page.screenshot({ path: '/tmp/ta-v5-dashboard.png', fullPage: true });
  
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('[Transamerica] Dashboard text (first 1500 chars):', pageText.substring(0, 1500));
  
  // Look for Life Access link
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.textContent?.trim().substring(0, 80),
      href: a.href,
    })).filter(l => l.text && l.text.length > 0);
  });
  console.log('[Transamerica] Available links:', JSON.stringify(links.slice(0, 30), null, 2));
  
  // Try to find and click Life Access or Transamerica Life Access link
  let clicked = await page.evaluate(() => {
    const links = document.querySelectorAll('a');
    for (const link of links) {
      const text = link.textContent?.toLowerCase() || '';
      const href = link.href?.toLowerCase() || '';
      if (text.includes('life access') || text.includes('lifeaccess') || 
          href.includes('lifeaccess') || text.includes('transamerica life')) {
        link.click();
        return link.textContent?.trim();
      }
    }
    return null;
  });
  
  if (clicked) {
    console.log('[Transamerica] Clicked Life Access link:', clicked);
    await new Promise(resolve => setTimeout(resolve, 5000));
    await page.screenshot({ path: '/tmp/ta-v5-life-access.png', fullPage: true });
    return true;
  }
  
  // Look for "Launch" button
  clicked = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button, a, span');
    for (const btn of buttons) {
      const text = btn.textContent?.toLowerCase() || '';
      if (text.includes('launch')) {
        btn.click();
        return btn.textContent?.trim();
      }
    }
    return null;
  });
  
  if (clicked) {
    console.log('[Transamerica] Clicked Launch:', clicked);
    await new Promise(resolve => setTimeout(resolve, 5000));
    await page.screenshot({ path: '/tmp/ta-v5-after-launch.png', fullPage: true });
  }
  
  return true;
}

async function navigateToMyBookPending(page) {
  console.log('[Transamerica] Looking for My Book > Pending...');
  
  await page.screenshot({ path: '/tmp/ta-v5-before-mybook.png', fullPage: true });
  
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('[Transamerica] Current page text (first 2000 chars):', pageText.substring(0, 2000));
  
  // Look for My Book
  let clicked = await page.evaluate(() => {
    const elements = document.querySelectorAll('a, button, span, div, li, td');
    for (const el of elements) {
      const text = el.textContent?.trim() || '';
      if (text.toLowerCase() === 'my book' || (text.toLowerCase().includes('my book') && text.length < 30)) {
        el.click();
        return text;
      }
    }
    return null;
  });
  
  if (clicked) {
    console.log(`[Transamerica] Clicked: ${clicked}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: '/tmp/ta-v5-my-book.png', fullPage: true });
  }
  
  // Look for Pending
  clicked = await page.evaluate(() => {
    const elements = document.querySelectorAll('a, button, span, div, td, li');
    for (const el of elements) {
      const text = el.textContent?.trim() || '';
      if (text.toLowerCase() === 'pending' || (text.toLowerCase().includes('pending') && text.length < 30)) {
        el.click();
        return text;
      }
    }
    return null;
  });
  
  if (clicked) {
    console.log(`[Transamerica] Clicked: ${clicked}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: '/tmp/ta-v5-pending.png', fullPage: true });
  }
  
  // Look for View My Book
  clicked = await page.evaluate(() => {
    const elements = document.querySelectorAll('a, button');
    for (const el of elements) {
      const text = el.textContent?.trim().toLowerCase() || '';
      if (text.includes('view my book') || text === 'view') {
        el.click();
        return el.textContent?.trim();
      }
    }
    return null;
  });
  
  if (clicked) {
    console.log(`[Transamerica] Clicked: ${clicked}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: '/tmp/ta-v5-view-my-book.png', fullPage: true });
  }
  
  return true;
}

async function extractPendingPolicies(page) {
  console.log('[Transamerica] Extracting pending policies...');
  
  await page.screenshot({ path: '/tmp/ta-v5-pending-list.png', fullPage: true });
  
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('[Transamerica] Page content:', pageText.substring(0, 5000));
  
  // Look for policy data in tables
  const tableData = await page.evaluate(() => {
    const tables = document.querySelectorAll('table');
    const data = [];
    
    tables.forEach((table, tableIndex) => {
      const rows = table.querySelectorAll('tr');
      rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('td, th');
        const rowData = Array.from(cells).map(cell => cell.textContent?.trim());
        if (rowData.length > 0 && rowData.some(cell => cell && cell.length > 0)) {
          data.push({ tableIndex, rowIndex, cells: rowData });
        }
      });
    });
    
    return data;
  });
  
  console.log('[Transamerica] Table data:', JSON.stringify(tableData.slice(0, 30), null, 2));
  
  return tableData;
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  try {
    const loginSuccess = await loginToTransamerica(page);
    
    if (loginSuccess) {
      await navigateToLifeAccess(page);
      await navigateToMyBookPending(page);
      await extractPendingPolicies(page);
    } else {
      console.log('[Transamerica] Login failed, cannot proceed');
    }
    
  } catch (error) {
    console.error('[Transamerica] Error:', error.message);
    try {
      await page.screenshot({ path: '/tmp/ta-v5-error.png', fullPage: true });
    } catch (e) {
      console.error('[Transamerica] Could not capture error screenshot');
    }
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

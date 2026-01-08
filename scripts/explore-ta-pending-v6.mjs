/**
 * Explore Transamerica Life Access portal to extract pending policy data
 * Complete version - clicks Launch for Life Access and navigates to My Book > Pending
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
  
  // Handle OTP selection page
  if (pageUrl.includes('securityCodeDelivery') || pageText.includes('Extra Security Step Required')) {
    console.log('[Transamerica] OTP selection page detected');
    
    // Select email option
    await page.evaluate(() => {
      const radios = document.querySelectorAll('input[type="radio"]');
      for (const radio of radios) {
        const label = radio.parentElement?.textContent || '';
        if (label.toLowerCase().includes('email')) {
          radio.click();
          return;
        }
      }
      if (radios.length >= 2) radios[1].click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Click SUBMIT
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, input[type="submit"]');
      for (const btn of buttons) {
        const text = btn.textContent?.trim().toUpperCase() || btn.value?.toUpperCase() || '';
        if (text === 'SUBMIT') { btn.click(); return; }
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
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, input[type="submit"]');
      for (const btn of buttons) {
        const text = btn.textContent?.trim().toUpperCase() || btn.value?.toUpperCase() || '';
        if (text === 'SUBMIT' || text === 'VERIFY' || text === 'CONTINUE') { btn.click(); return; }
      }
    });
    
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    pageUrl = page.url();
    pageText = await page.evaluate(() => document.body.innerText);
  }
  
  // Handle Unrecognized Device / Security Question page
  if (pageUrl.includes('deviceRegistration') || pageText.includes('Unrecognized Device')) {
    console.log('[Transamerica] Security question page detected');
    
    const questionText = await page.evaluate(() => {
      const labels = document.querySelectorAll('label, p, span, div');
      for (const label of labels) {
        const text = label.textContent?.trim() || '';
        if (text.includes('?')) return text;
      }
      return '';
    });
    
    const answer = getSecurityAnswer(questionText);
    
    if (answer) {
      await page.evaluate((ans) => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="password"]');
        for (const input of inputs) {
          const name = input.name?.toLowerCase() || '';
          const id = input.id?.toLowerCase() || '';
          if (name.includes('username') || name.includes('password') || id.includes('username') || id.includes('password')) continue;
          if (input.offsetParent !== null) {
            input.value = ans;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            return;
          }
        }
      }, answer);
      
      // Select "Yes" for remember device
      await page.evaluate(() => {
        const radios = document.querySelectorAll('input[type="radio"]');
        for (const radio of radios) {
          const label = radio.parentElement?.textContent?.toLowerCase() || '';
          if (label.includes('yes') || label.includes('private')) { radio.click(); return; }
        }
        if (radios.length > 0) radios[0].click();
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, input[type="submit"]');
        for (const btn of buttons) {
          const text = btn.textContent?.trim().toUpperCase() || btn.value?.toUpperCase() || '';
          if (text === 'LOGIN' || text === 'SUBMIT') { btn.click(); return; }
        }
      });
      
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  await page.screenshot({ path: '/tmp/ta-v6-dashboard.png', fullPage: true });
  console.log('[Transamerica] Screenshot saved: /tmp/ta-v6-dashboard.png');
  
  return true;
}

async function launchLifeAccess(page, browser) {
  console.log('[Transamerica] Looking for Life Access Launch button...');
  
  // Find all Launch buttons and their associated card titles
  const cards = await page.evaluate(() => {
    const results = [];
    const cardElements = document.querySelectorAll('[class*="card"], [class*="tile"], div');
    
    cardElements.forEach(card => {
      const text = card.textContent || '';
      if (text.includes('Transamerica Life Access') && text.includes('Launch')) {
        const launchBtn = card.querySelector('a[href*="launch"], button, a');
        if (launchBtn) {
          results.push({
            title: 'Transamerica Life Access',
            href: launchBtn.href || '',
            text: launchBtn.textContent?.trim()
          });
        }
      }
    });
    
    return results;
  });
  
  console.log('[Transamerica] Found cards:', JSON.stringify(cards, null, 2));
  
  // Find and click the Launch button for Life Access
  // The Launch button opens in a new tab, so we need to handle that
  const [newPage] = await Promise.all([
    new Promise(resolve => browser.once('targetcreated', async target => {
      const page = await target.page();
      resolve(page);
    })),
    page.evaluate(() => {
      // Find the card containing "Transamerica Life Access"
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const text = el.textContent || '';
        if (text.includes('Transamerica Life Access') && !text.includes('Transamerica Life Illustrator')) {
          // Find the Launch link/button within this element
          const links = el.querySelectorAll('a');
          for (const link of links) {
            const linkText = link.textContent?.trim().toLowerCase() || '';
            if (linkText.includes('launch')) {
              console.log('Clicking Launch for Life Access');
              link.click();
              return true;
            }
          }
        }
      }
      return false;
    })
  ]).catch(async () => {
    // Fallback: try direct navigation
    console.log('[Transamerica] Trying direct navigation to Life Access...');
    await page.goto('https://lifeaccess.transamerica.com', { waitUntil: 'networkidle2', timeout: 30000 });
    return null;
  });
  
  // Wait for the new page to load
  const targetPage = newPage || page;
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  if (newPage) {
    await newPage.setViewport({ width: 1280, height: 800 });
    console.log('[Transamerica] New tab opened for Life Access');
  }
  
  await targetPage.screenshot({ path: '/tmp/ta-v6-life-access.png', fullPage: true });
  console.log('[Transamerica] Screenshot saved: /tmp/ta-v6-life-access.png');
  
  const lifeAccessUrl = targetPage.url();
  const lifeAccessText = await targetPage.evaluate(() => document.body.innerText);
  
  console.log('[Transamerica] Life Access URL:', lifeAccessUrl);
  console.log('[Transamerica] Life Access text (first 2000 chars):', lifeAccessText.substring(0, 2000));
  
  return targetPage;
}

async function navigateToMyBookPending(page) {
  console.log('[Transamerica] Looking for My Book > Pending...');
  
  // Wait for page to fully load
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await page.screenshot({ path: '/tmp/ta-v6-life-access-loaded.png', fullPage: true });
  
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('[Transamerica] Life Access page text:', pageText.substring(0, 3000));
  
  // Look for navigation menu items
  const navItems = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a, button, span, li, div[role="menuitem"], [class*="nav"], [class*="menu"]'))
      .map(el => ({
        tag: el.tagName,
        text: el.textContent?.trim().substring(0, 60),
        href: el.href || '',
        className: el.className || ''
      }))
      .filter(item => item.text && item.text.length > 0 && item.text.length < 60);
  });
  
  console.log('[Transamerica] Navigation items:', JSON.stringify(navItems.slice(0, 50), null, 2));
  
  // Try to click "My Book"
  let clicked = await page.evaluate(() => {
    const elements = document.querySelectorAll('a, button, span, li, div');
    for (const el of elements) {
      const text = el.textContent?.trim().toLowerCase() || '';
      if (text === 'my book' || text === 'mybook') {
        el.click();
        return el.textContent?.trim();
      }
    }
    return null;
  });
  
  if (clicked) {
    console.log(`[Transamerica] Clicked: ${clicked}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: '/tmp/ta-v6-my-book.png', fullPage: true });
  }
  
  // Look for "Pending" submenu or section
  clicked = await page.evaluate(() => {
    const elements = document.querySelectorAll('a, button, span, li, div, td');
    for (const el of elements) {
      const text = el.textContent?.trim() || '';
      if (text.toLowerCase() === 'pending' || (text.toLowerCase().includes('pending') && text.length < 20)) {
        el.click();
        return text;
      }
    }
    return null;
  });
  
  if (clicked) {
    console.log(`[Transamerica] Clicked: ${clicked}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: '/tmp/ta-v6-pending.png', fullPage: true });
  }
  
  // Look for "View My Book" or "view" button
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
    await page.screenshot({ path: '/tmp/ta-v6-view-my-book.png', fullPage: true });
  }
  
  return true;
}

async function extractPendingPolicies(page) {
  console.log('[Transamerica] Extracting pending policies...');
  
  await page.screenshot({ path: '/tmp/ta-v6-pending-list.png', fullPage: true });
  
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('[Transamerica] Page content:', pageText.substring(0, 6000));
  
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
  
  console.log('[Transamerica] Table data:', JSON.stringify(tableData.slice(0, 50), null, 2));
  
  // Also look for any list items or cards with policy info
  const listData = await page.evaluate(() => {
    const items = document.querySelectorAll('[class*="policy"], [class*="card"], [class*="list-item"], li');
    return Array.from(items).map(item => item.textContent?.trim().substring(0, 200)).filter(t => t && t.length > 10);
  });
  
  console.log('[Transamerica] List data:', JSON.stringify(listData.slice(0, 20), null, 2));
  
  return { tableData, listData };
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
    // Login to Transamerica
    await loginToTransamerica(page);
    
    // Launch Life Access (may open in new tab)
    const lifeAccessPage = await launchLifeAccess(page, browser);
    
    // Navigate to My Book > Pending
    await navigateToMyBookPending(lifeAccessPage);
    
    // Extract pending policies
    await extractPendingPolicies(lifeAccessPage);
    
  } catch (error) {
    console.error('[Transamerica] Error:', error.message);
    try {
      await page.screenshot({ path: '/tmp/ta-v6-error.png', fullPage: true });
    } catch (e) {}
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

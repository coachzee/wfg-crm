import puppeteer from 'puppeteer';
import { waitForOTP, getMyWFGCredentials } from '../server/gmail-otp.ts';
import { getDb } from '../server/db.ts';
import { agents } from '../drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const agentCodes = [
  'E7X0L', 'D5L56', 'D3Y01', 'D3T9L', 'E6Y1G', 'D3C69', 'D3C5U', 'E6G9W', 'E2Y9B',
  '94ISM', 'E1U8L', 'E6I1E', 'C8U78', 'D3U63', 'E8Z2N', 'E3C76', 'E7A93', 'E7X6H',
  'D3Q3F', 'E6E23', 'E2Z1F', 'C9U9S', 'D6W3S', 'D3Y16', 'D3Z8L', 'E0D89', '49AEA',
  'C9F3Z', 'C3D01', 'D3Y2G', 'D0T7M'
];

const credentials = {
  username: process.env.MYWFG_USERNAME || '',
  password: process.env.MYWFG_PASSWORD || '',
};

console.log('[Working Scraper] Validating credentials...');
if (!credentials.username || !credentials.password) {
  console.error('[Working Scraper] Missing MYWFG_USERNAME or MYWFG_PASSWORD');
  process.exit(1);
}

async function loginToMyWFG(page) {
  console.log('[Working Scraper] Navigating to MyWFG...');
  try {
    await page.goto('https://www.mywfg.com', { 
      waitUntil: 'networkidle0',
      timeout: 45000 
    });
  } catch (e) {
    console.log('[Working Scraper] Navigation timeout, continuing...');
  }
  
  // Wait for page to stabilize
  await new Promise(r => setTimeout(r, 5000));

  // Wait for login form - try multiple selectors
  console.log('[Working Scraper] Waiting for login form...');
  const usernameSelectors = [
    'input[id="myWfgUsernameDisplay"]',
    'input[name="username"]',
    'input[placeholder*="User"]',
    'input[placeholder*="ID"]',
    'input[type="text"]:first-of-type'
  ];
  
  let usernameInput = null;
  for (const selector of usernameSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      usernameInput = await page.$(selector);
      if (usernameInput) {
        console.log(`[Working Scraper] Found username input: ${selector}`);
        break;
      }
    } catch (e) {
      // Try next selector
    }
  }
  
  if (!usernameInput) {
    await page.screenshot({ path: '/tmp/login-page-debug.png', fullPage: true });
    throw new Error('Could not find username input field');
  }

  // Enter credentials
  console.log('[Working Scraper] Entering credentials...');
  await usernameInput.type(credentials.username, { delay: 100 });
  
  // Find password input
  const passwordInput = await page.$('input[id="myWfgPassword"]') ||
                        await page.$('input[type="password"]') ||
                        await page.$('input[name="password"]');
  if (passwordInput) {
    await passwordInput.type(credentials.password, { delay: 100 });
  }

  // Wait before clicking
  await new Promise(r => setTimeout(r, 500));

  // Click login button
  console.log('[Working Scraper] Clicking login...');
  const loginButton = await page.$('button[id="btnLogin"]') ||
                      await page.$('button[type="submit"]') ||
                      await page.$('input[type="submit"]');
  
  if (loginButton) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
      loginButton.click()
    ]);
  }
  
  // Wait for page to stabilize after login
  await new Promise(r => setTimeout(r, 5000));  // Check if OTP is required - look for OTP page indicators
  const pageContent = await page.content();
  const pageText = await page.evaluate(() => document.body.innerText);
  const otpRequired = pageContent.includes('mywfgOtppswd') || 
                      pageContent.includes('One-Time') || 
                      pageContent.includes('verification code') ||
                      pageContent.includes('OTP') ||
                      pageText.includes('One-Time Password') ||
                      pageText.includes('Security Code') ||
                      pageText.includes('Validation Code');
  
  // Check if we got an error page
  if (pageText.includes('ERROR OCCURRED') || pageText.includes('Bad Request')) {
    console.log('[Working Scraper] Error page detected, retrying login...');
    // Click Return to Login if available
    // Find Return to Login button by evaluating page
    const returnBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      return buttons.find(el => el.textContent && el.textContent.includes('Return to Login'));
    });
    if (returnBtn) {
      await returnBtn.click();
      await new Promise(r => setTimeout(r, 3000));
      // Retry login
      return await loginToMyWFG(page);
    }
  }

  if (otpRequired) {
    console.log('[Working Scraper] OTP required, waiting for email...');
    
    const gmailCreds = getMyWFGCredentials();
    // Use shorter timeout and faster polling for OTP
    const otpResult = await waitForOTP(gmailCreds, 'transamerica', 60, 3);
    
    if (!otpResult.success || !otpResult.otp) {
      throw new Error(`Failed to get OTP: ${otpResult.error}`);
    }
    
    console.log(`[Working Scraper] ✓ OTP received: ${otpResult.otp}`);
    
    // Enter OTP - try multiple selectors
    const otpSelectors = [
      'input[id="mywfgOtppswd"]',
      'input[name="otp"]',
      'input[name="code"]',
      'input[type="tel"]',
      'input[placeholder*="code"]',
      'input[placeholder*="Code"]',
      'input:not([type="hidden"]):not([type="password"]):not([type="checkbox"])'
    ];
    
    let otpInput = null;
    for (const selector of otpSelectors) {
      otpInput = await page.$(selector);
      if (otpInput) {
        console.log(`[Working Scraper] Found OTP input with selector: ${selector}`);
        break;
      }
    }
    
    if (!otpInput) {
      // Take screenshot for debugging
      await page.screenshot({ path: '/tmp/otp-page-debug.png', fullPage: true });
      throw new Error('Could not find OTP input field');
    }
    
    await otpInput.type(otpResult.otp, { delay: 100 });
    
    // Submit OTP - try multiple selectors
    const submitSelectors = [
      'button[id="mywfgTheylive"]',
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Submit")',
      'button:has-text("Verify")'
    ];
    
    let submitButton = null;
    for (const selector of submitSelectors) {
      submitButton = await page.$(selector);
      if (submitButton) {
        console.log(`[Working Scraper] Found submit button with selector: ${selector}`);
        break;
      }
    }
    
    if (submitButton) {
      await submitButton.click();
    }
    
    // Wait for dashboard
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {
      console.log('[Working Scraper] Navigation timeout after OTP');
    });
  }

  console.log('[Working Scraper] ✓ Login successful');
}

async function getAgentContactInfo(page, agentCode) {
  console.log(`[Working Scraper] Fetching ${agentCode}...`);

  try {
    // Navigate directly to the AgentDetails AJAX endpoint
    const url = `https://www.mywfg.com/Wfg.HierarchyTool/HierarchyDetails/AgentDetails?agentcodenumber=${agentCode}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    // Extract contact info from the page
    const bodyText = await page.evaluate(() => document.body.innerText);
    const html = await page.content();
    
    const contactInfo = {};

    // Extract Personal Email - look in both text and HTML
    const emailMatch = bodyText.match(/Personal Email[\s\S]*?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
                       html.match(/Personal Email[\s\S]*?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (emailMatch && emailMatch[1]) {
      contactInfo.personalEmail = emailMatch[1];
    }

    // Extract Mobile Phone
    const phoneMatch = bodyText.match(/Mobile Phone[\s\S]*?(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i) ||
                       html.match(/Mobile Phone[\s\S]*?(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i);
    if (phoneMatch && phoneMatch[1]) {
      contactInfo.mobilePhone = phoneMatch[1];
    }

    // Also try to find any email/phone in the page
    if (!contactInfo.personalEmail) {
      const anyEmail = bodyText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (anyEmail) contactInfo.personalEmail = anyEmail[1];
    }
    
    if (!contactInfo.mobilePhone) {
      const anyPhone = bodyText.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
      if (anyPhone) contactInfo.mobilePhone = anyPhone[1];
    }

    if (contactInfo.personalEmail || contactInfo.mobilePhone) {
      console.log(`[Working Scraper] ✓ ${agentCode}: email=${contactInfo.personalEmail || 'N/A'}, phone=${contactInfo.mobilePhone || 'N/A'}`);
    } else {
      console.log(`[Working Scraper] - ${agentCode}: no contact info found`);
    }

    return contactInfo;
  } catch (error) {
    console.error(`[Working Scraper] Error fetching ${agentCode}:`, error.message);
    return {};
  }
}

async function main() {
  let browser = null;

  try {
    console.log('[Working Scraper] Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await loginToMyWFG(page);

    console.log('\n[Working Scraper] Starting contact extraction...\n');

    const contactData = [];

    for (let i = 0; i < agentCodes.length; i++) {
      const agentCode = agentCodes[i];
      console.log(`\n[Working Scraper] Agent ${i + 1}/${agentCodes.length}: ${agentCode}`);

      try {
        const contactInfo = await getAgentContactInfo(page, agentCode);
        contactData.push({ agentCode, ...contactInfo });
        await new Promise(r => setTimeout(r, 1200));
      } catch (error) {
        console.error(`[Working Scraper] Failed ${agentCode}:`, error.message);
        contactData.push({ agentCode });
      }
    }

    // Update database
    const db = await getDb();
    console.log('\n\n[Database] Updating agents...\n');

    let updated = 0;
    let skipped = 0;

    for (const contact of contactData) {
      try {
        if (contact.personalEmail || contact.mobilePhone) {
          await db
            .update(agents)
            .set({
              email: contact.personalEmail || undefined,
              phone: contact.mobilePhone || undefined,
            })
            .where(eq(agents.agentCode, contact.agentCode));

          console.log(`✓ ${contact.agentCode}: email=${contact.personalEmail || 'N/A'}, phone=${contact.mobilePhone || 'N/A'}`);
          updated++;
        } else {
          console.log(`- ${contact.agentCode}: no contact info`);
          skipped++;
        }
      } catch (error) {
        console.error(`✗ ${contact.agentCode}:`, error.message);
      }
    }

    console.log(`\n✓ Complete: ${updated} updated, ${skipped} skipped`);
  } catch (error) {
    console.error('[Working Scraper] Fatal error:', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
      console.log('[Working Scraper] Browser closed');
    }
  }
}

main();

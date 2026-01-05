import { chromium } from 'playwright';
import { waitForOTPAdvanced } from '../server/gmail-otp-advanced.ts';
import { getDb } from '../server/db.ts';
import { agents } from '../drizzle/schema.ts';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const agentCodes = [
  'E7X0L', 'D5L56', 'D3Y01', 'D3T9L', 'E6Y1G', 'D3C69', 'D3C5U', 'E6G9W', 'E2Y9B',
  '94ISM', 'E1U8L', 'E6I1E', 'C8U78', 'D3U63', 'E8Z2N', 'E3C76', 'E7A93', 'E7X6H',
  'D3Q3F', 'E6E23', 'E2Z1F', 'C9U9S', 'D6W3S', 'D3Y16', 'D3Z8L', 'E0D89', '49AEA',
  'C9F3Z', 'C3D01', 'D3Y2G', 'D0T7M'
];

const credentials = {
  email: process.env.MYWFG_EMAIL,
  appPassword: process.env.MYWFG_APP_PASSWORD,
  username: process.env.MYWFG_USERNAME,
  password: process.env.MYWFG_PASSWORD,
};

console.log('[Playwright Scraper] Validating credentials...');
if (!credentials.email || !credentials.appPassword || !credentials.username || !credentials.password) {
  console.error('[Playwright Scraper] Missing credentials');
  process.exit(1);
}

class PlaywrightMyWFGScraper {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.storageFile = '/tmp/mywfg_cookies.json';
  }

  async initialize() {
    console.log('[Playwright Scraper] Launching browser...');
    this.browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    // Load existing cookies if available
    let contextOptions = {};
    if (fs.existsSync(this.storageFile)) {
      console.log('[Playwright Scraper] Loading saved session...');
      const storage = JSON.parse(fs.readFileSync(this.storageFile, 'utf-8'));
      contextOptions = { storageState: storage };
    }

    this.context = await this.browser.newContext(contextOptions);
    this.page = await this.context.newPage();
    console.log('[Playwright Scraper] Browser ready');
  }

  async login() {
    console.log('[Playwright Scraper] Navigating to MyWFG...');
    await this.page.goto('https://www.mywfg.com', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);

    // Check if already logged in
    const currentUrl = this.page.url();
    if (!currentUrl.includes('login') && !currentUrl.includes('signin')) {
      console.log('[Playwright Scraper] ✓ Already logged in (session restored)');
      return;
    }

    console.log('[Playwright Scraper] Logging in...');
    await this.page.fill('input[id="myWfgUsernameDisplay"]', credentials.username);
    await this.page.fill('input[id="myWfgPassword"]', credentials.password);
    await this.page.click('button[id="btnLogin"]');

    // Wait for navigation
    await this.page.waitForTimeout(3000);

    // Check for OTP
    const otpInput = await this.page.$('input[id="mywfgOtppswd"]');
    if (otpInput) {
      console.log('[Playwright Scraper] OTP required, fetching from Gmail...');
      const otp = await waitForOTPAdvanced(
        {
          email: credentials.email,
          appPassword: credentials.appPassword,
        },
        120,
        3
      );

      if (!otp.success || !otp.otp) {
        throw new Error('Failed to retrieve OTP: ' + otp.error);
      }

      console.log(`[Playwright Scraper] ✓ OTP received: ${otp.otp}`);
      await this.page.fill('input[id="mywfgOtppswd"]', otp.otp);
      await this.page.click('button[id="mywfgTheylive"]');
      await this.page.waitForNavigation({ waitUntil: 'domcontentloaded' });
    }

    // Save session
    const storage = await this.context.storageState();
    fs.writeFileSync(this.storageFile, JSON.stringify(storage, null, 2));
    console.log('[Playwright Scraper] ✓ Login successful, session saved');
  }

  async getAgentContactInfo(agentCode) {
    console.log(`[Playwright Scraper] Fetching ${agentCode}...`);

    try {
      const url = `https://www.mywfg.com/Wfg.HierarchyTool/HierarchyDetails/LoadHierarchyToolMain?agentcodenumber=${agentCode}`;
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);

      // Click Associate Details
      const detailsLink = await this.page.$('a[id="AgentDetailsLink"]');
      if (detailsLink) {
        await detailsLink.click();
        await this.page.waitForTimeout(1500);
      }

      // Extract contact info
      const bodyText = await this.page.textContent('body');
      const lines = bodyText.split('\n');

      const contactInfo = {};

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.includes('Personal Email')) {
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            const match = lines[j].match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            if (match) {
              contactInfo.personalEmail = match[1];
              break;
            }
          }
        }

        if (line.includes('Mobile Phone')) {
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            const match = lines[j].match(/(\(\d{3}\)\s*\d{3}[-.]?\d{4}|\d{3}[-.]?\d{3}[-.]?\d{4})/);
            if (match) {
              contactInfo.mobilePhone = match[1];
              break;
            }
          }
        }
      }

      if (contactInfo.personalEmail || contactInfo.mobilePhone) {
        console.log(`[Playwright Scraper] ✓ ${agentCode}: email=${contactInfo.personalEmail || 'N/A'}, phone=${contactInfo.mobilePhone || 'N/A'}`);
      } else {
        console.log(`[Playwright Scraper] - ${agentCode}: no contact info found`);
      }

      return contactInfo;
    } catch (error) {
      console.error(`[Playwright Scraper] Error fetching ${agentCode}:`, error.message);
      return {};
    }
  }

  async fetchAllContacts() {
    const results = [];

    for (let i = 0; i < agentCodes.length; i++) {
      const agentCode = agentCodes[i];
      console.log(`\n[Playwright Scraper] Agent ${i + 1}/${agentCodes.length}: ${agentCode}`);

      try {
        const contactInfo = await this.getAgentContactInfo(agentCode);
        results.push({ agentCode, ...contactInfo });
        await this.page.waitForTimeout(1500);
      } catch (error) {
        console.error(`[Playwright Scraper] Failed ${agentCode}:`, error.message);
        results.push({ agentCode });
      }
    }

    return results;
  }

  async close() {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    console.log('[Playwright Scraper] Browser closed');
  }
}

async function main() {
  const scraper = new PlaywrightMyWFGScraper();

  try {
    await scraper.initialize();
    await scraper.login();
    console.log('\n[Playwright Scraper] Starting contact extraction...\n');
    const contactData = await scraper.fetchAllContacts();

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
    console.error('[Playwright Scraper] Fatal error:', error.message);
    process.exit(1);
  } finally {
    await scraper.close();
  }
}

main();

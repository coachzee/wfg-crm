import puppeteer from 'puppeteer';
import { waitForOTPAdvanced } from '../server/gmail-otp-advanced.ts';
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
  email: process.env.MYWFG_EMAIL,
  appPassword: process.env.MYWFG_APP_PASSWORD,
  username: process.env.MYWFG_USERNAME,
  password: process.env.MYWFG_PASSWORD,
};

console.log('[Scraper] Validating credentials...');
if (!credentials.email || !credentials.appPassword || !credentials.username || !credentials.password) {
  console.error('[Scraper] Missing credentials');
  process.exit(1);
}

class RobustMyWFGScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    console.log('[Scraper] Launching browser...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });
    console.log('[Scraper] Browser ready');
  }

  async login() {
    console.log('[Scraper] Navigating to MyWFG...');
    await this.page.goto('https://www.mywfg.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    console.log('[Scraper] Waiting for login form...');
    await this.page.waitForSelector('input[id="myWfgUsernameDisplay"]', { timeout: 15000 });

    console.log('[Scraper] Entering credentials...');
    await this.page.type('input[id="myWfgUsernameDisplay"]', credentials.username);
    await this.page.type('input[id="myWfgPassword"]', credentials.password);

    console.log('[Scraper] Clicking login...');
    await this.page.click('button[id="btnLogin"]');

    // Wait for either OTP page or dashboard
    console.log('[Scraper] Waiting for login response...');
    await new Promise(r => setTimeout(r, 3000));

    // Check for OTP page
    const otpInput = await this.page.$('input[id="mywfgOtppswd"]');
    if (otpInput) {
      console.log('[Scraper] OTP required, fetching from Gmail...');
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

      console.log(`[Scraper] ✓ OTP received: ${otp.otp}`);
      await this.page.type('input[id="mywfgOtppswd"]', otp.otp);
      await this.page.click('button[id="mywfgTheylive"]');

      console.log('[Scraper] OTP submitted, waiting for dashboard...');
      await new Promise(r => setTimeout(r, 5000));
    }

    // Verify we're logged in
    console.log('[Scraper] Verifying login...');
    const currentUrl = this.page.url();
    console.log(`[Scraper] Current URL: ${currentUrl}`);

    if (currentUrl.includes('login') || currentUrl.includes('signin')) {
      throw new Error('Login failed - still on login page');
    }

    console.log('[Scraper] ✓ Login successful');
  }

  async getAgentContactInfo(agentCode) {
    console.log(`[Scraper] Fetching ${agentCode}...`);

    try {
      const url = `https://www.mywfg.com/Wfg.HierarchyTool/HierarchyDetails/LoadHierarchyToolMain?agentcodenumber=${agentCode}`;
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));

      // Click Associate Details tab
      const detailsLink = await this.page.$('a[id="AgentDetailsLink"]');
      if (detailsLink) {
        await detailsLink.click();
        await new Promise(r => setTimeout(r, 1500));
      }

      // Extract contact info
      const contactInfo = await this.page.evaluate(() => {
        const info = {};
        const bodyText = document.body.innerText;
        const lines = bodyText.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          if (line.includes('Personal Email')) {
            for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
              const match = lines[j].match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
              if (match) {
                info.personalEmail = match[1];
                break;
              }
            }
          }

          if (line.includes('Mobile Phone')) {
            for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
              const match = lines[j].match(/(\(\d{3}\)\s*\d{3}[-.]?\d{4}|\d{3}[-.]?\d{3}[-.]?\d{4})/);
              if (match) {
                info.mobilePhone = match[1];
                break;
              }
            }
          }
        }

        return info;
      });

      if (contactInfo.personalEmail || contactInfo.mobilePhone) {
        console.log(`[Scraper] ✓ ${agentCode}: email=${contactInfo.personalEmail || 'N/A'}, phone=${contactInfo.mobilePhone || 'N/A'}`);
      } else {
        console.log(`[Scraper] - ${agentCode}: no contact info found`);
      }

      return contactInfo;
    } catch (error) {
      console.error(`[Scraper] Error fetching ${agentCode}:`, error.message);
      return {};
    }
  }

  async fetchAllContacts() {
    const results = [];

    for (let i = 0; i < agentCodes.length; i++) {
      const agentCode = agentCodes[i];
      console.log(`\n[Scraper] Agent ${i + 1}/${agentCodes.length}: ${agentCode}`);

      try {
        const contactInfo = await this.getAgentContactInfo(agentCode);
        results.push({ agentCode, ...contactInfo });
        await new Promise(r => setTimeout(r, 1500));
      } catch (error) {
        console.error(`[Scraper] Failed ${agentCode}:`, error.message);
        results.push({ agentCode });
      }
    }

    return results;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('[Scraper] Browser closed');
    }
  }
}

async function main() {
  const scraper = new RobustMyWFGScraper();

  try {
    await scraper.initialize();
    await scraper.login();
    console.log('\n[Scraper] Starting contact extraction...\n');
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
    console.error('[Scraper] Fatal error:', error.message);
    process.exit(1);
  } finally {
    await scraper.close();
  }
}

main();

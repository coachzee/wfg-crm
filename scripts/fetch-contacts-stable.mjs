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

console.log('[Stable Scraper] Validating credentials...');
if (!credentials.email || !credentials.appPassword || !credentials.username || !credentials.password) {
  console.error('[Stable Scraper] Missing credentials');
  process.exit(1);
}

class StableMyWFGScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    console.log('[Stable Scraper] Launching browser...');
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });
    console.log('[Stable Scraper] Browser ready');
  }

  async login() {
    console.log('[Stable Scraper] Navigating to MyWFG...');
    try {
      await this.page.goto('https://www.mywfg.com', {
        waitUntil: 'networkidle2',
        timeout: 45000,
      });
    } catch (e) {
      console.log('[Stable Scraper] Navigation timeout (expected), continuing...');
    }

    console.log('[Stable Scraper] Waiting for login form...');
    try {
      await this.page.waitForSelector('input[id="myWfgUsernameDisplay"]', { timeout: 15000 });
    } catch (e) {
      throw new Error('Login form not found');
    }

    console.log('[Stable Scraper] Entering credentials...');
    await this.page.type('input[id="myWfgUsernameDisplay"]', credentials.username, { delay: 50 });
    await this.page.type('input[id="myWfgPassword"]', credentials.password, { delay: 50 });

    console.log('[Stable Scraper] Submitting login...');
    await this.page.click('button[id="btnLogin"]');

    // Wait for response
    await new Promise(r => setTimeout(r, 4000));

    // Check for OTP
    const otpInput = await this.page.$('input[id="mywfgOtppswd"]');
    if (otpInput) {
      console.log('[Stable Scraper] OTP required, fetching from Gmail...');
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

      console.log(`[Stable Scraper] ✓ OTP received: ${otp.otp}`);
      await this.page.type('input[id="mywfgOtppswd"]', otp.otp, { delay: 50 });
      await this.page.click('button[id="mywfgTheylive"]');

      console.log('[Stable Scraper] Waiting for dashboard...');
      await new Promise(r => setTimeout(r, 5000));
    }

    console.log('[Stable Scraper] ✓ Login successful');
  }

  async getAgentContactInfo(agentCode) {
    console.log(`[Stable Scraper] Fetching ${agentCode}...`);

    try {
      const url = `https://www.mywfg.com/Wfg.HierarchyTool/HierarchyDetails/LoadHierarchyToolMain?agentcodenumber=${agentCode}`;
      
      try {
        await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
      } catch (e) {
        console.log(`[Stable Scraper] Navigation timeout for ${agentCode}, continuing...`);
      }

      await new Promise(r => setTimeout(r, 1500));

      // Click Associate Details
      try {
        const detailsLink = await this.page.$('a[id="AgentDetailsLink"]');
        if (detailsLink) {
          await detailsLink.click();
          await new Promise(r => setTimeout(r, 1500));
        }
      } catch (e) {
        console.log(`[Stable Scraper] Could not click details link for ${agentCode}`);
      }

      // Extract text content
      const bodyText = await this.page.evaluate(() => {
        return document.body.innerText;
      });

      const contactInfo = {};
      const lines = bodyText.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Extract email
        if (line.includes('Personal Email')) {
          for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
            const nextLine = lines[j].trim();
            const emailMatch = nextLine.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            if (emailMatch) {
              contactInfo.personalEmail = emailMatch[1];
              break;
            }
          }
        }

        // Extract phone
        if (line.includes('Mobile Phone')) {
          for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
            const nextLine = lines[j].trim();
            const phoneMatch = nextLine.match(/(\(\d{3}\)\s*\d{3}[-.]?\d{4}|\d{3}[-.]?\d{3}[-.]?\d{4})/);
            if (phoneMatch) {
              contactInfo.mobilePhone = phoneMatch[1];
              break;
            }
          }
        }
      }

      if (contactInfo.personalEmail || contactInfo.mobilePhone) {
        console.log(`[Stable Scraper] ✓ ${agentCode}: email=${contactInfo.personalEmail || 'N/A'}, phone=${contactInfo.mobilePhone || 'N/A'}`);
      } else {
        console.log(`[Stable Scraper] - ${agentCode}: no contact info found`);
      }

      return contactInfo;
    } catch (error) {
      console.error(`[Stable Scraper] Error fetching ${agentCode}:`, error.message);
      return {};
    }
  }

  async fetchAllContacts() {
    const results = [];

    for (let i = 0; i < agentCodes.length; i++) {
      const agentCode = agentCodes[i];
      console.log(`\n[Stable Scraper] Agent ${i + 1}/${agentCodes.length}: ${agentCode}`);

      try {
        const contactInfo = await this.getAgentContactInfo(agentCode);
        results.push({ agentCode, ...contactInfo });
        await new Promise(r => setTimeout(r, 1200));
      } catch (error) {
        console.error(`[Stable Scraper] Failed ${agentCode}:`, error.message);
        results.push({ agentCode });
      }
    }

    return results;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('[Stable Scraper] Browser closed');
    }
  }
}

async function main() {
  const scraper = new StableMyWFGScraper();

  try {
    await scraper.initialize();
    await scraper.login();
    console.log('\n[Stable Scraper] Starting contact extraction...\n');
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
    console.error('[Stable Scraper] Fatal error:', error.message);
    process.exit(1);
  } finally {
    await scraper.close();
  }
}

main();

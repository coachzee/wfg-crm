import puppeteer from 'puppeteer';
import { waitForOTPAdvanced } from '../server/gmail-otp-advanced.ts';
import { getDb } from '../server/db.ts';
import { agents } from '../drizzle/schema.ts';
import { eq } from 'drizzle-orm';

// Agent codes to fetch (from the CSV we just processed)
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
  console.error('[Scraper] Missing credentials. Required: MYWFG_EMAIL, MYWFG_APP_PASSWORD, MYWFG_USERNAME, MYWFG_PASSWORD');
  process.exit(1);
}

class MyWFGContactScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.loginAttempts = 0;
    this.maxLoginAttempts = 3;
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
    this.loginAttempts++;
    if (this.loginAttempts > this.maxLoginAttempts) {
      throw new Error(`Failed to login after ${this.maxLoginAttempts} attempts`);
    }

    console.log(`[Scraper] Login attempt ${this.loginAttempts}/${this.maxLoginAttempts}...`);

    try {
      await this.page.goto('https://www.mywfg.com', { waitUntil: 'networkidle2', timeout: 30000 });
      console.log('[Scraper] Navigated to MyWFG');

      // Wait for login form
      await this.page.waitForSelector('input[id="myWfgUsernameDisplay"]', { timeout: 10000 });
      console.log('[Scraper] Login form found');

      // Enter credentials
      await this.page.type('input[id="myWfgUsernameDisplay"]', credentials.username);
      await this.page.type('input[id="myWfgPassword"]', credentials.password);
      console.log('[Scraper] Credentials entered');

      // Click login
      await this.page.click('button[id="btnLogin"]');
      console.log('[Scraper] Login button clicked, waiting for response...');

      // Wait for either OTP page or dashboard (with longer timeout)
      let isOTPRequired = false;
      try {
        await this.page.waitForSelector('input[id="mywfgOtppswd"]', { timeout: 8000 });
        isOTPRequired = true;
        console.log('[Scraper] OTP page detected');
      } catch (e) {
        console.log('[Scraper] No OTP page detected, checking for dashboard...');
      }

      if (isOTPRequired) {
        console.log('[Scraper] Fetching OTP from Gmail...');
        const otp = await waitForOTPAdvanced(
          {
            email: credentials.email,
            appPassword: credentials.appPassword,
          },
          120, // 2 minute timeout
          3    // 3 second poll interval
        );

        if (!otp.success || !otp.otp) {
          console.error('[Scraper] OTP fetch failed:', otp.error);
          throw new Error('Failed to retrieve OTP: ' + otp.error);
        }

        console.log(`[Scraper] ✓ OTP received: ${otp.otp} (confidence: ${otp.confidence}, method: ${otp.extractionMethod})`);
        
        // Enter OTP
        await this.page.type('input[id="mywfgOtppswd"]', otp.otp);
        console.log('[Scraper] OTP entered');

        // Submit OTP
        await this.page.click('button[id="mywfgTheylive"]');
        console.log('[Scraper] OTP submitted, waiting for dashboard...');

        // Wait for dashboard
        await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        console.log('[Scraper] ✓ Login successful with OTP');
      } else {
        // Try to wait for dashboard
        try {
          await this.page.waitForSelector('a[id="AgentDetailsLink"]', { timeout: 5000 });
          console.log('[Scraper] ✓ Login successful without OTP');
        } catch (e) {
          console.log('[Scraper] Dashboard not found, may need OTP');
          throw new Error('Could not verify login success');
        }
      }
    } catch (error) {
      console.error('[Scraper] Login error:', error.message);
      throw error;
    }
  }

  async getAgentContactInfo(agentCode) {
    console.log(`[Scraper] Fetching contact info for ${agentCode}...`);

    try {
      const url = `https://www.mywfg.com/Wfg.HierarchyTool/HierarchyDetails/LoadHierarchyToolMain?agentcodenumber=${agentCode}`;
      await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for page to load
      await this.page.waitForSelector('a[id="AgentDetailsLink"]', { timeout: 10000 });

      // Click Associate Details
      const associateDetailsLink = await this.page.$('a[id="AgentDetailsLink"]');
      if (associateDetailsLink) {
        await associateDetailsLink.click();
        await new Promise(r => setTimeout(r, 1500));
      }

      // Extract contact information from page text
      const contactInfo = await this.page.evaluate(() => {
        const info = {};
        const bodyText = document.body.innerText;
        const lines = bodyText.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          // Extract Personal Email
          if (line.includes('Personal Email')) {
            for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
              const nextLine = lines[j].trim();
              const emailMatch = nextLine.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
              if (emailMatch) {
                info.personalEmail = emailMatch[1];
                break;
              }
            }
          }

          // Extract Mobile Phone
          if (line.includes('Mobile Phone')) {
            for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
              const nextLine = lines[j].trim();
              const phoneMatch = nextLine.match(/(\(\d{3}\)\s*\d{3}[-.]?\d{4}|\d{3}[-.]?\d{3}[-.]?\d{4})/);
              if (phoneMatch) {
                info.mobilePhone = phoneMatch[1];
                break;
              }
            }
          }

          // Extract Home Address
          if (line.includes('Home Address')) {
            const addressLines = [];
            for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
              const nextLine = lines[j].trim();
              if (nextLine && !nextLine.includes('Business') && !nextLine.includes(':')) {
                addressLines.push(nextLine);
              } else if (addressLines.length > 0) {
                break;
              }
            }
            if (addressLines.length > 0) {
              info.homeAddress = addressLines.join(', ');
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
      console.log(`\n[Scraper] Processing agent ${i + 1}/${agentCodes.length}: ${agentCode}`);

      try {
        const contactInfo = await this.getAgentContactInfo(agentCode);
        results.push({ agentCode, ...contactInfo });

        // Add delay between requests to avoid rate limiting
        await new Promise(r => setTimeout(r, 2000));
      } catch (error) {
        console.error(`[Scraper] Failed to fetch ${agentCode}:`, error.message);
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
  const scraper = new MyWFGContactScraper();

  try {
    await scraper.initialize();
    await scraper.login();
    console.log('\n[Scraper] Starting contact information extraction...\n');
    const contactData = await scraper.fetchAllContacts();

    // Update database with contact information
    const db = await getDb();
    console.log('\n\n[Database] Updating agent contact information...\n');

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

          console.log(`✓ Updated ${contact.agentCode}: email=${contact.personalEmail || 'N/A'}, phone=${contact.mobilePhone || 'N/A'}`);
          updated++;
        } else {
          console.log(`- Skipped ${contact.agentCode}: no contact info`);
          skipped++;
        }
      } catch (error) {
        console.error(`✗ Error updating ${contact.agentCode}:`, error.message);
      }
    }

    console.log(`\n✓ Database update complete: ${updated} agents updated, ${skipped} skipped`);
  } catch (error) {
    console.error('[Scraper] Fatal error:', error.message);
    process.exit(1);
  } finally {
    await scraper.close();
  }
}

main();

import fetch from 'node-fetch';
import { CookieJar } from 'tough-cookie';
import { HttpCookieAgent, HttpsCookieAgent } from 'http-cookie-agent/http';
import { waitForOTPAdvanced } from '../server/gmail-otp-advanced.ts';
import { getDb } from '../server/db.ts';
import { agents } from '../drizzle/schema.ts';
import { eq } from 'drizzle-orm';
import https from 'https';

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

console.log('[API Scraper] Validating credentials...');
if (!credentials.email || !credentials.appPassword || !credentials.username || !credentials.password) {
  console.error('[API Scraper] Missing credentials');
  process.exit(1);
}

class MyWFGAPIScraper {
  constructor() {
    this.cookieJar = new CookieJar();
    this.httpAgent = new HttpCookieAgent({ cookies: { jar: this.cookieJar } });
    this.httpsAgent = new HttpsCookieAgent({ cookies: { jar: this.cookieJar } });
    this.baseUrl = 'https://www.mywfg.com';
  }

  async fetch(url, options = {}) {
    const agent = url.startsWith('https') ? this.httpsAgent : this.httpAgent;
    return fetch(url, {
      ...options,
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...options.headers,
      },
    });
  }

  async login() {
    console.log('[API Scraper] Logging in...');

    try {
      // Get login page
      const loginRes = await this.fetch(`${this.baseUrl}/`);
      await loginRes.text();

      // Submit login
      const loginFormData = new URLSearchParams();
      loginFormData.append('myWfgUsernameDisplay', credentials.username);
      loginFormData.append('myWfgPassword', credentials.password);

      const submitRes = await this.fetch(`${this.baseUrl}/`, {
        method: 'POST',
        body: loginFormData,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const submitText = await submitRes.text();

      // Check if OTP is required
      if (submitText.includes('mywfgOtppswd') || submitText.includes('OTP')) {
        console.log('[API Scraper] OTP required, fetching from Gmail...');
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

        console.log(`[API Scraper] ✓ OTP received: ${otp.otp}`);

        // Submit OTP
        const otpFormData = new URLSearchParams();
        otpFormData.append('mywfgOtppswd', otp.otp);

        const otpRes = await this.fetch(`${this.baseUrl}/`, {
          method: 'POST',
          body: otpFormData,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        const otpText = await otpRes.text();
        if (otpText.includes('login') || otpText.includes('error')) {
          throw new Error('OTP verification failed');
        }
      }

      console.log('[API Scraper] ✓ Login successful');
    } catch (error) {
      console.error('[API Scraper] Login error:', error.message);
      throw error;
    }
  }

  async getAgentContactInfo(agentCode) {
    console.log(`[API Scraper] Fetching ${agentCode}...`);

    try {
      const url = `${this.baseUrl}/Wfg.HierarchyTool/HierarchyDetails/LoadHierarchyToolMain?agentcodenumber=${agentCode}`;
      const res = await this.fetch(url);
      const html = await res.text();

      const contactInfo = {};

      // Extract Personal Email
      const emailMatch = html.match(/Personal Email[^<]*<[^>]*>([^<]*@[^<]*)<\/[^>]*>/i);
      if (emailMatch && emailMatch[1]) {
        const email = emailMatch[1].trim();
        if (email.includes('@')) {
          contactInfo.personalEmail = email;
        }
      }

      // Extract Mobile Phone
      const phoneMatch = html.match(/Mobile Phone[^<]*<[^>]*>(\(\d{3}\)\s*\d{3}[-.]?\d{4}|\d{3}[-.]?\d{3}[-.]?\d{4})<\/[^>]*>/i);
      if (phoneMatch && phoneMatch[1]) {
        contactInfo.mobilePhone = phoneMatch[1].trim();
      }

      if (contactInfo.personalEmail || contactInfo.mobilePhone) {
        console.log(`[API Scraper] ✓ ${agentCode}: email=${contactInfo.personalEmail || 'N/A'}, phone=${contactInfo.mobilePhone || 'N/A'}`);
      } else {
        console.log(`[API Scraper] - ${agentCode}: no contact info found`);
      }

      return contactInfo;
    } catch (error) {
      console.error(`[API Scraper] Error fetching ${agentCode}:`, error.message);
      return {};
    }
  }

  async fetchAllContacts() {
    const results = [];

    for (let i = 0; i < agentCodes.length; i++) {
      const agentCode = agentCodes[i];
      console.log(`\n[API Scraper] Agent ${i + 1}/${agentCodes.length}: ${agentCode}`);

      try {
        const contactInfo = await this.getAgentContactInfo(agentCode);
        results.push({ agentCode, ...contactInfo });
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        console.error(`[API Scraper] Failed ${agentCode}:`, error.message);
        results.push({ agentCode });
      }
    }

    return results;
  }
}

async function main() {
  const scraper = new MyWFGAPIScraper();

  try {
    await scraper.login();
    console.log('\n[API Scraper] Starting contact extraction...\n');
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
    console.error('[API Scraper] Fatal error:', error.message);
    process.exit(1);
  }
}

main();

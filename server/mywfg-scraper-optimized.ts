import puppeteer from 'puppeteer';
import type { Browser, Page } from 'puppeteer';
import { waitForOTPOptimized } from './gmail-otp-optimized';

interface MyWFGCredentials {
  email: string;
  appPassword: string;
  username: string;
  password: string;
}

interface AgentContactInfo {
  agentCode: string;
  personalEmail?: string;
  mobilePhone?: string;
  homeAddress?: string;
}

class MyWFGScraperOptimized {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private credentials: MyWFGCredentials;
  private loginAttempts = 0;
  private maxLoginAttempts = 3;

  constructor(credentials: MyWFGCredentials) {
    this.credentials = credentials;
  }

  async initialize(): Promise<void> {
    console.log('[MyWFG] Initializing browser...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    if (!this.browser) throw new Error('Failed to launch browser');
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });
    console.log('[MyWFG] Browser initialized');
  }

  async login(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    this.loginAttempts++;
    if (this.loginAttempts > this.maxLoginAttempts) {
      throw new Error(`Failed to login after ${this.maxLoginAttempts} attempts`);
    }

    console.log(`[MyWFG] Login attempt ${this.loginAttempts}...`);

    try {
      await this.page.goto('https://www.mywfg.com', { waitUntil: 'networkidle2', timeout: 30000 });

      // Enter credentials
      await this.page.waitForSelector('input[id="myWfgUsernameDisplay"]', { timeout: 10000 });
      await this.page.type('input[id="myWfgUsernameDisplay"]', this.credentials.username);
      await this.page.type('input[id="myWfgPassword"]', this.credentials.password);
      await this.page.click('button[id="btnLogin"]');

      // Wait for either OTP page or dashboard
      const otpPagePromise = this.page.waitForSelector('input[id="mywfgOtppswd"]', { timeout: 5000 }).catch(() => null);
      const dashboardPromise = this.page.waitForSelector('a[id="AgentDetailsLink"]', { timeout: 5000 }).catch(() => null);

      const result = await Promise.race([otpPagePromise, dashboardPromise]);

      if (result) {
        // Check if we're on OTP page
        const otpInput = await this.page.$('input[id="mywfgOtppswd"]');
        if (otpInput) {
          console.log('[MyWFG] OTP required, fetching from Gmail...');
          const otp = await waitForOTPOptimized(
            {
              email: this.credentials.email,
              appPassword: this.credentials.appPassword,
            },
            'wfg',
            120,
            5
          );

          if (!otp.success || !otp.otp) {
            console.error('[MyWFG] OTP fetch failed:', otp.error);
            throw new Error('Failed to retrieve OTP: ' + otp.error);
          }

          console.log(`[MyWFG] OTP received: ${otp.otp} (confidence: ${otp.confidence}, method: ${otp.extractionMethod})`);
          await this.page.type('input[id="mywfgOtppswd"]', otp.otp);
          await this.page.click('button[id="mywfgTheylive"]');

          // Wait for dashboard
          await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
          console.log('[MyWFG] Login successful with OTP');
        } else {
          console.log('[MyWFG] Login successful without OTP');
        }
      }
    } catch (error) {
      console.error('[MyWFG] Login error:', error);
      throw error;
    }
  }

  async getAgentContactInfo(agentCode: string): Promise<AgentContactInfo> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log(`[MyWFG] Fetching contact info for ${agentCode}...`);

    try {
      const url = `https://www.mywfg.com/Wfg.HierarchyTool/HierarchyDetails/LoadHierarchyToolMain?agentcodenumber=${agentCode}`;
      await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for Associate Details section
      await this.page.waitForSelector('a[id="AgentDetailsLink"]', { timeout: 10000 });

      // Click Associate Details if not already visible
      const associateDetailsLink = await this.page.$('a[id="AgentDetailsLink"]');
      if (associateDetailsLink) {
        await associateDetailsLink.click();
        await new Promise((r) => setTimeout(r, 1000));
      }

      // Extract contact information
      const contactInfo = await this.page.evaluate(() => {
        const info: AgentContactInfo = { agentCode: '' };
        const pageText = document.body.innerText;

        // Parse the page text to find contact information
        const lines = pageText.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          // Look for Personal Email
          if (line.includes('Personal Email')) {
            const nextLines = lines.slice(i + 1, i + 5).join(' ');
            const emailMatch = nextLines.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            if (emailMatch) {
              info.personalEmail = emailMatch[1];
            }
          }

          // Look for Mobile Phone
          if (line.includes('Mobile Phone')) {
            const nextLines = lines.slice(i + 1, i + 5).join(' ');
            const phoneMatch = nextLines.match(/(\(\d{3}\)\s*\d{3}[-.]?\d{4}|\d{3}[-.]?\d{3}[-.]?\d{4})/);
            if (phoneMatch) {
              info.mobilePhone = phoneMatch[1];
            }
          }

          // Look for Home Address
          if (line.includes('Home Address')) {
            const nextLines = lines.slice(i + 1, i + 10);
            const addressLines = [];
            for (const addressLine of nextLines) {
              if (addressLine.trim() && !addressLine.includes('Business') && !addressLine.includes(':')) {
                addressLines.push(addressLine.trim());
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

      contactInfo.agentCode = agentCode;

      console.log(
        `[MyWFG] ✓ Extracted for ${agentCode}: email=${contactInfo.personalEmail || 'N/A'}, phone=${contactInfo.mobilePhone || 'N/A'}`
      );

      return contactInfo;
    } catch (error) {
      console.error(`[MyWFG] Error fetching contact info for ${agentCode}:`, error);
      return { agentCode };
    }
  }

  async getAllAgentContactInfo(agentCodes: string[]): Promise<AgentContactInfo[]> {
    const allData: AgentContactInfo[] = [];

    for (const agentCode of agentCodes) {
      try {
        const contactInfo = await this.getAgentContactInfo(agentCode);
        allData.push(contactInfo);

        // Add delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 2000));
      } catch (error) {
        console.error(`[MyWFG] Failed to get contact info for ${agentCode}:`, error);
        allData.push({ agentCode });
      }
    }

    return allData;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      console.log('[MyWFG] Browser closed');
    }
  }
}

export async function scrapeAllAgentContactInfo(
  credentials: MyWFGCredentials,
  agentCodes: string[]
): Promise<AgentContactInfo[]> {
  const scraper = new MyWFGScraperOptimized(credentials);

  try {
    await scraper.initialize();
    await scraper.login();
    const data = await scraper.getAllAgentContactInfo(agentCodes);
    return data;
  } finally {
    await scraper.close();
  }
}

export { MyWFGScraperOptimized, AgentContactInfo };

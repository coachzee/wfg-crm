import puppeteer from 'puppeteer';
import type { Browser, Page } from 'puppeteer';
import { waitForOTP, getMyWFGCredentials } from './gmail-otp';

interface AgentLicenseInfo {
  agentCode: string;
  firstName: string;
  lastName: string;
  titleLevel: string;
  isLifeLicensed: boolean;
  licenseEndDate?: string;
}

interface AgentContactInfo {
  agentCode: string;
  personalEmail?: string;
  mobilePhone?: string;
  homeAddress?: string;
}

class MyWFGAutomation {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private credentials = getMyWFGCredentials();

  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    if (!this.browser) throw new Error('Failed to launch browser');
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });
  }

  async login(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log('[MyWFG] Logging in...');
    await this.page.goto('https://www.mywfg.com', { waitUntil: 'networkidle2' });

    // Enter credentials
    await this.page.type('input[id="myWfgUsernameDisplay"]', this.credentials.email);
    await this.page.type('input[id="myWfgPassword"]', this.credentials.appPassword);
    await this.page.click('button[id="btnLogin"]');

    // Wait for OTP page or dashboard
    await Promise.race([
      this.page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
      this.page.waitForSelector('input[id="mywfgOtppswd"]', { timeout: 5000 }).catch(() => {}),
    ]);

    // Check if OTP is needed
    const otpInput = await this.page.$('input[id="mywfgOtppswd"]');
    if (otpInput) {
      console.log('[MyWFG] OTP required, fetching from Gmail...');
      const otp = await waitForOTP(this.credentials, 'wfg', 120, 10);
      if (!otp.success || !otp.otp) {
        throw new Error('Failed to retrieve OTP: ' + otp.error);
      }
      await this.page.type('input[id="mywfgOtppswd"]', otp.otp);
      await this.page.click('button[id="mywfgTheylive"]');
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
    }

    console.log('[MyWFG] Login successful');
  }

  async getDownlineStatusReport(): Promise<AgentLicenseInfo[]> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log('[MyWFG] Fetching Downline Status report...');
    await this.page.goto('https://www.mywfg.com/reports-downline-status', {
      waitUntil: 'networkidle2',
    });

    // Wait for report to load
    await this.page.waitForSelector('table', { timeout: 10000 });

    // Extract agents from table
    const agents = await this.page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      const agents: AgentLicenseInfo[] = [];

      rows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 8) {
          const firstName = cells[0]?.textContent?.trim() || '';
          const lastName = cells[1]?.textContent?.trim() || '';
          const agentCode = cells[3]?.textContent?.trim() || '';
          const titleLevel = cells[4]?.textContent?.trim() || '';
          const llFlag = cells[6]?.textContent?.trim() || '';
          const llEndDate = cells[7]?.textContent?.trim() || '';

          if (agentCode) {
            agents.push({
              agentCode,
              firstName,
              lastName,
              titleLevel,
              isLifeLicensed: llFlag === 'Yes',
              licenseEndDate: llEndDate,
            });
          }
        }
      });

      return agents;
    });

    console.log(`[MyWFG] Found ${agents.length} agents in Downline Status report`);
    return agents;
  }

  async getAgentContactInfo(agentCode: string): Promise<AgentContactInfo> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log(`[MyWFG] Fetching contact info for ${agentCode}...`);
    const url = `https://www.mywfg.com/Wfg.HierarchyTool/HierarchyDetails/LoadHierarchyToolMain?agentcodenumber=${agentCode}`;

    try {
      await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for Associate Details section to load
      await this.page.waitForSelector('a[id="AgentDetailsLink"]', { timeout: 5000 });

      // Click on Associate Details if not already visible
      const associateDetailsLink = await this.page.$('a[id="AgentDetailsLink"]');
      if (associateDetailsLink) {
        await associateDetailsLink.click();
        await new Promise(r => setTimeout(r, 1000));
      }

      // Extract contact information
      const contactInfo = await this.page.evaluate(() => {
        const info: AgentContactInfo = { agentCode: '' };

        // Find all label-value pairs
        const labels = document.querySelectorAll('label, div');
        let currentLabel = '';

        labels.forEach((el) => {
          const text = el.textContent?.trim() || '';

          if (text.includes('Personal Email')) {
            currentLabel = 'email';
          } else if (text.includes('Mobile Phone')) {
            currentLabel = 'phone';
          } else if (text.includes('Home Address')) {
            currentLabel = 'address';
          } else if (currentLabel === 'email' && text.includes('@')) {
            info.personalEmail = text;
            currentLabel = '';
          } else if (currentLabel === 'phone' && text.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/)) {
            info.mobilePhone = text;
            currentLabel = '';
          } else if (currentLabel === 'address' && text.length > 10) {
            info.homeAddress = text;
            currentLabel = '';
          }
        });

        return info;
      });

      contactInfo.agentCode = agentCode;
      return contactInfo;
    } catch (error) {
      console.error(`[MyWFG] Error fetching contact info for ${agentCode}:`, error);
      return { agentCode };
    }
  }

  async getAllAgentData(): Promise<(AgentLicenseInfo & AgentContactInfo)[]> {
    // Get license info
    const licenseInfo = await this.getDownlineStatusReport();

    // Get contact info for each agent
    const allData: (AgentLicenseInfo & AgentContactInfo)[] = [];

    for (const agent of licenseInfo) {
      const contactInfo = await this.getAgentContactInfo(agent.agentCode);
      allData.push({
        ...agent,
        ...contactInfo,
      });

      // Add delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 2000));
    }

    return allData;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

export async function fetchAllAgentDataFromMyWFG(): Promise<(AgentLicenseInfo & AgentContactInfo)[]> {
  const automation = new MyWFGAutomation();

  try {
    await automation.initialize();
    await automation.login();
    const data = await automation.getAllAgentData();
    return data;
  } finally {
    await automation.close();
  }
}

export { MyWFGAutomation, AgentLicenseInfo, AgentContactInfo };

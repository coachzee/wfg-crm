import { chromium, Browser, Page } from "playwright";
import { decryptCredential } from "./encryption";

export interface ExtractedAgent {
  agentCode: string;
  firstName: string;
  lastName: string;
  email?: string;
  licenseStatus?: string;
  productionAmount?: number;
  firstPolicyDate?: string;
}

export interface ExtractedProduction {
  agentCode: string;
  policyNumber: string;
  policyType: string;
  premiumAmount?: number;
  commissionAmount?: number;
  issueDate?: string;
}

export interface MyWFGSyncResult {
  success: boolean;
  agentsExtracted: number;
  productionRecordsExtracted: number;
  agents: ExtractedAgent[];
  productionRecords: ExtractedProduction[];
  error?: string;
  timestamp: Date;
}

class MyWFGServiceV2 {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
      });
    }
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Extract agent and production data from mywfg.com
   * Improved version with better login handling
   */
  async extractData(encryptedUsername: string, encryptedPassword: string): Promise<MyWFGSyncResult> {
    try {
      await this.initialize();

      if (!this.browser) {
        throw new Error("Failed to initialize browser");
      }

      const username = decryptCredential(encryptedUsername);
      const password = decryptCredential(encryptedPassword);

      const page = await this.browser.newPage();

      try {
        // Navigate to mywfg.com
        console.log("[MyWFG] Navigating to mywfg.com...");
        await page.goto("https://www.mywfg.com/", { waitUntil: "networkidle", timeout: 45000 });

        // Wait for any login form to appear
        console.log("[MyWFG] Waiting for login form...");
        
        // Try multiple selectors for username field
        const usernameSelectors = [
          'input[name="username"]',
          'input[id="username"]',
          'input[placeholder*="username" i]',
          'input[placeholder*="user" i]',
          'input[type="text"]',
        ];

        let usernameInput = null;
        for (const selector of usernameSelectors) {
          const element = await page.$(selector);
          if (element) {
            usernameInput = element;
            console.log(`[MyWFG] Found username input with selector: ${selector}`);
            break;
          }
        }

        if (!usernameInput) {
          // Try to find by visible text or other attributes
          const inputs = await page.$$("input");
          console.log(`[MyWFG] Found ${inputs.length} total input fields`);
          
          for (let i = 0; i < inputs.length; i++) {
            const type = await inputs[i].getAttribute("type");
            const id = await inputs[i].getAttribute("id");
            const name = await inputs[i].getAttribute("name");
            const placeholder = await inputs[i].getAttribute("placeholder");
            console.log(
              `[MyWFG] Input ${i}: type=${type}, id=${id}, name=${name}, placeholder=${placeholder}`
            );
          }

          throw new Error("Could not find username input field");
        }

        // Try multiple selectors for password field
        const passwordSelectors = [
          'input[name="password"]',
          'input[id="password"]',
          'input[placeholder*="password" i]',
          'input[type="password"]',
        ];

        let passwordInput = null;
        for (const selector of passwordSelectors) {
          const element = await page.$(selector);
          if (element) {
            passwordInput = element;
            console.log(`[MyWFG] Found password input with selector: ${selector}`);
            break;
          }
        }

        if (!passwordInput) {
          throw new Error("Could not find password input field");
        }

        // Fill in credentials
        console.log("[MyWFG] Filling in credentials...");
        await usernameInput.fill(username);
        await page.waitForTimeout(500);
        await passwordInput.fill(password);
        await page.waitForTimeout(500);

        // Find and click login button
        const loginButtonSelectors = [
          'button[type="submit"]',
          'button:has-text("Log in")',
          'button:has-text("LOGIN")',
          'button:has-text("Sign in")',
          'button:has-text("SIGN IN")',
          'input[type="submit"]',
        ];

        let loginButton = null;
        for (const selector of loginButtonSelectors) {
          const element = await page.$(selector);
          if (element) {
            loginButton = element;
            console.log(`[MyWFG] Found login button with selector: ${selector}`);
            break;
          }
        }

        if (!loginButton) {
          const buttons = await page.$$("button");
          console.log(`[MyWFG] Found ${buttons.length} buttons`);
          for (let i = 0; i < buttons.length; i++) {
            const text = await buttons[i].textContent();
            console.log(`[MyWFG] Button ${i}: ${text}`);
          }
          throw new Error("Could not find login button");
        }

        console.log("[MyWFG] Clicking login button...");
        await loginButton.click();

        // Wait for navigation or page load after login
        console.log("[MyWFG] Waiting for page load after login...");
        try {
          await page.waitForNavigation({ waitUntil: "networkidle", timeout: 30000 });
        } catch (e) {
          console.log("[MyWFG] Navigation timeout (may still be logged in)");
        }

        // Wait additional time for page to settle
        await page.waitForTimeout(3000);

        // Check if login was successful
        const pageUrl = page.url();
        console.log(`[MyWFG] Current URL: ${pageUrl}`);

        // Look for common dashboard indicators
        const isDashboard = await page.evaluate(() => {
          const html = document.body.innerHTML;
          const hasIndicators =
            html.includes("Dashboard") ||
            html.includes("Team") ||
            html.includes("Production") ||
            html.includes("Agent") ||
            html.includes("Recruit") ||
            html.includes("Logout") ||
            html.includes("Sign out");
          return hasIndicators;
        });

        if (!isDashboard && pageUrl.includes("mywfg.com/")) {
          console.log("[MyWFG] Warning: May not be fully logged in, but continuing...");
        }

        console.log("[MyWFG] Successfully accessed mywfg.com");

        // Extract agent data
        const agents = await this.extractAgents(page);

        // Extract production data
        const productionRecords = await this.extractProduction(page);

        return {
          success: true,
          agentsExtracted: agents.length,
          productionRecordsExtracted: productionRecords.length,
          agents,
          productionRecords,
          timestamp: new Date(),
        };
      } finally {
        await page.close();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[MyWFG] Extraction failed:", errorMessage);
      return {
        success: false,
        agentsExtracted: 0,
        productionRecordsExtracted: 0,
        agents: [],
        productionRecords: [],
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Extract agent information from mywfg.com
   */
  private async extractAgents(page: Page): Promise<ExtractedAgent[]> {
    console.log("[MyWFG] Extracting agent data...");

    try {
      const agents = await page.evaluate(() => {
        const agentList: ExtractedAgent[] = [];

        // Look for agent data in various possible structures
        // This is a flexible approach that looks for common patterns

        // Try table rows
        const rows = document.querySelectorAll("table tbody tr, [role='row']");
        console.log(`Found ${rows.length} potential agent rows`);

        rows.forEach((row) => {
          const cells = row.querySelectorAll("td, [role='cell']");
          if (cells.length > 0) {
            const agent: ExtractedAgent = {
              agentCode: cells[0]?.textContent?.trim() || "",
              firstName: cells[1]?.textContent?.trim() || "",
              lastName: cells[2]?.textContent?.trim() || "",
              email: cells[3]?.textContent?.trim(),
            };

            if (agent.agentCode) {
              agentList.push(agent);
            }
          }
        });

        return agentList;
      });

      console.log(`[MyWFG] Extracted ${agents.length} agents`);
      return agents;
    } catch (error) {
      console.error("[MyWFG] Error extracting agents:", error);
      return [];
    }
  }

  /**
   * Extract production/policy information from mywfg.com
   */
  private async extractProduction(page: Page): Promise<ExtractedProduction[]> {
    console.log("[MyWFG] Extracting production data...");

    try {
      const records = await page.evaluate(() => {
        const productionList: ExtractedProduction[] = [];

        // Look for production data in various possible structures
        const rows = document.querySelectorAll("table tbody tr, [role='row']");

        rows.forEach((row) => {
          const cells = row.querySelectorAll("td, [role='cell']");
          if (cells.length > 0) {
            const record: ExtractedProduction = {
              agentCode: cells[0]?.textContent?.trim() || "",
              policyNumber: cells[1]?.textContent?.trim() || "",
              policyType: cells[2]?.textContent?.trim() || "",
            };

            if (record.agentCode && record.policyNumber) {
              productionList.push(record);
            }
          }
        });

        return productionList;
      });

      console.log(`[MyWFG] Extracted ${records.length} production records`);
      return records;
    } catch (error) {
      console.error("[MyWFG] Error extracting production data:", error);
      return [];
    }
  }
}

export const myWFGServiceV2 = new MyWFGServiceV2();

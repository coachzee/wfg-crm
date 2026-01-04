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

class MyWFGService {
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
   * This is a template implementation that you'll need to customize
   * based on the actual structure of mywfg.com
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
        // Navigate to mywfg.com login page
        console.log("[MyWFG] Navigating to mywfg.com...");
        await page.goto("https://www.mywfg.com/", { waitUntil: "domcontentloaded", timeout: 30000 });

        // Wait for login form to be visible
        await page.waitForSelector('input[id*="username"], input[id*="User"], input[placeholder*="User"]', {
          timeout: 10000,
        });

        // Fill in credentials
        console.log("[MyWFG] Filling in credentials...");
        const usernameInput = await page.$('input[id*="username"], input[id*="User"], input[placeholder*="User"]');
        const passwordInput = await page.$('input[id*="password"], input[id*="Password"], input[placeholder*="Password"]');

        if (!usernameInput || !passwordInput) {
          throw new Error("Could not find login form fields");
        }

        await usernameInput.fill(username);
        await passwordInput.fill(password);

        // Click login button
        const loginButton = await page.$('button:has-text("Log in"), button[type="submit"]');
        if (!loginButton) {
          throw new Error("Could not find login button");
        }

        console.log("[MyWFG] Clicking login button...");
        await loginButton.click();

        // Wait for navigation after login (adjust timeout as needed)
        await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {
          console.log("[MyWFG] Navigation timeout - may have logged in successfully");
        });

        // Wait a bit for page to fully load
        await page.waitForTimeout(2000);

        // Check if login was successful by looking for dashboard elements
        const isDashboard = await page.locator("body").evaluate(() => {
          const html = document.body.innerHTML;
          return html.includes("Dashboard") || html.includes("Team") || html.includes("Production");
        });

        if (!isDashboard) {
          throw new Error("Login may have failed - dashboard not detected");
        }

        console.log("[MyWFG] Successfully logged in");

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
   * This is a template - customize based on actual page structure
   */
  private async extractAgents(page: Page): Promise<ExtractedAgent[]> {
    console.log("[MyWFG] Extracting agent data...");

    try {
      // Navigate to team/agents page if needed
      // This is a placeholder - adjust URL based on actual mywfg.com structure
      const agents = await page.evaluate(() => {
        const agentList: ExtractedAgent[] = [];

        // Look for agent rows in tables or lists
        // This is a template - customize based on actual HTML structure
        const rows = document.querySelectorAll("table tbody tr, [data-agent], .agent-row");

        rows.forEach((row) => {
          const cells = row.querySelectorAll("td, [data-field]");
          if (cells.length > 0) {
            const agent: ExtractedAgent = {
              agentCode: cells[0]?.textContent?.trim() || "",
              firstName: cells[1]?.textContent?.trim() || "",
              lastName: cells[2]?.textContent?.trim() || "",
              email: cells[3]?.textContent?.trim(),
              licenseStatus: cells[4]?.textContent?.trim(),
              productionAmount: parseFloat(cells[5]?.textContent?.replace(/[^0-9.]/g, "") || "0"),
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
   * This is a template - customize based on actual page structure
   */
  private async extractProduction(page: Page): Promise<ExtractedProduction[]> {
    console.log("[MyWFG] Extracting production data...");

    try {
      // Navigate to production/policies page if needed
      // This is a placeholder - adjust URL based on actual mywfg.com structure
      const records = await page.evaluate(() => {
        const productionList: ExtractedProduction[] = [];

        // Look for production rows in tables or lists
        // This is a template - customize based on actual HTML structure
        const rows = document.querySelectorAll("table tbody tr, [data-production], .production-row");

        rows.forEach((row) => {
          const cells = row.querySelectorAll("td, [data-field]");
          if (cells.length > 0) {
            const record: ExtractedProduction = {
              agentCode: cells[0]?.textContent?.trim() || "",
              policyNumber: cells[1]?.textContent?.trim() || "",
              policyType: cells[2]?.textContent?.trim() || "",
              premiumAmount: parseFloat(cells[3]?.textContent?.replace(/[^0-9.]/g, "") || "0"),
              commissionAmount: parseFloat(cells[4]?.textContent?.replace(/[^0-9.]/g, "") || "0"),
              issueDate: cells[5]?.textContent?.trim(),
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

export const myWFGService = new MyWFGService();

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
  requiresValidation?: boolean;
}

class MyWFGServiceV3 {
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
   * Supports 2FA/validation code requirement
   */
  async extractData(
    encryptedUsername: string,
    encryptedPassword: string,
    validationCode?: string
  ): Promise<MyWFGSyncResult> {
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
        await page.goto("https://www.mywfg.com/", { waitUntil: "networkidle", timeout: 60000 });

        console.log("[MyWFG] Page loaded. Attempting login...");

        // Step 1: Fill in username
        const usernameInput = await this.findInputField(page, ["text", "username"]);
        if (!usernameInput) {
          throw new Error("Could not find username input field");
        }

        console.log("[MyWFG] Filling username...");
        await usernameInput.fill(username);
        await page.waitForTimeout(500);

        // Step 2: Fill in password
        const passwordInput = await this.findInputField(page, ["password"]);
        if (!passwordInput) {
          throw new Error("Could not find password input field");
        }

        console.log("[MyWFG] Filling password...");
        await passwordInput.fill(password);
        await page.waitForTimeout(500);

        // Step 3: Click login button
        const loginButton = await this.findButton(page, ["submit", "Log in", "LOGIN", "Sign in"]);
        if (!loginButton) {
          throw new Error("Could not find login button");
        }

        console.log("[MyWFG] Clicking login button...");
        await loginButton.click();

        // Wait for page to respond
        await page.waitForTimeout(3000);

        // Step 4: Check if validation code is required
        const validationField = await page.$('input[type="text"][placeholder*="code" i], input[name*="code" i], input[placeholder*="validation" i]');
        
        if (validationField && validationCode) {
          console.log("[MyWFG] Validation code field detected. Entering validation code...");
          await validationField.fill(validationCode);
          await page.waitForTimeout(500);

          // Find and click submit button for validation
          const submitButton = await this.findButton(page, ["submit", "Verify", "VERIFY", "Confirm"]);
          if (submitButton) {
            console.log("[MyWFG] Submitting validation code...");
            await submitButton.click();
            await page.waitForTimeout(3000);
          }
        } else if (validationField && !validationCode) {
          console.log("[MyWFG] Validation code required but not provided");
          return {
            success: false,
            agentsExtracted: 0,
            productionRecordsExtracted: 0,
            agents: [],
            productionRecords: [],
            error: "Validation code required",
            timestamp: new Date(),
            requiresValidation: true,
          };
        }

        // Wait for navigation
        try {
          await page.waitForNavigation({ waitUntil: "networkidle", timeout: 30000 });
        } catch (e) {
          console.log("[MyWFG] Navigation timeout (continuing)");
        }

        await page.waitForTimeout(3000);

        console.log("[MyWFG] Current URL:", page.url());

        // Verify we're logged in
        const isLoggedIn = await page.evaluate(() => {
          const html = document.body.innerHTML;
          return (
            html.includes("Dashboard") ||
            html.includes("Team") ||
            html.includes("Production") ||
            html.includes("Agent") ||
            html.includes("Recruit") ||
            html.includes("Logout") ||
            html.includes("Sign out") ||
            html.includes("Welcome")
          );
        });

        if (!isLoggedIn) {
          console.log("[MyWFG] Warning: May not be fully logged in");
        }

        // Extract data
        const agents = await this.extractAgents(page);
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

  private async findInputField(page: Page, types: string[]): Promise<any> {
    for (const type of types) {
      const input = await page.$(`input[type="${type}"]`);
      if (input) return input;

      const input2 = await page.$(`input[name*="${type}" i]`);
      if (input2) return input2;

      const input3 = await page.$(`input[placeholder*="${type}" i]`);
      if (input3) return input3;
    }

    // Fallback: get first input
    const inputs = await page.$$("input");
    return inputs[0] || null;
  }

  private async findButton(page: Page, texts: string[]): Promise<any> {
    for (const text of texts) {
      const button = await page.$(`button:has-text("${text}")`);
      if (button) return button;

      const button2 = await page.$(`button[type="${text}"]`);
      if (button2) return button2;
    }

    // Fallback: get first button
    const buttons = await page.$$("button");
    return buttons[0] || null;
  }

  private async extractAgents(page: Page): Promise<ExtractedAgent[]> {
    console.log("[MyWFG] Extracting agent data...");

    try {
      const agents = await page.evaluate(() => {
        const agentList: ExtractedAgent[] = [];

        // Look for tables or lists with agent data
        const rows = document.querySelectorAll("table tbody tr, [role='row'], .agent-row, [data-agent]");
        console.log(`Found ${rows.length} potential rows`);

        rows.forEach((row) => {
          const cells = row.querySelectorAll("td, [role='cell'], [data-field]");
          if (cells.length > 0) {
            const agent: ExtractedAgent = {
              agentCode: cells[0]?.textContent?.trim() || "",
              firstName: cells[1]?.textContent?.trim() || "",
              lastName: cells[2]?.textContent?.trim() || "",
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

  private async extractProduction(page: Page): Promise<ExtractedProduction[]> {
    console.log("[MyWFG] Extracting production data...");

    try {
      const records = await page.evaluate(() => {
        const productionList: ExtractedProduction[] = [];

        const rows = document.querySelectorAll("table tbody tr, [role='row'], .production-row, [data-production]");

        rows.forEach((row) => {
          const cells = row.querySelectorAll("td, [role='cell'], [data-field]");
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

export const myWFGServiceV3 = new MyWFGServiceV3();

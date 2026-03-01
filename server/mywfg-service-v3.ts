import { type Browser, type Page } from "puppeteer";
import { launchBrowser } from "./lib/browser";
import { decryptCredential } from "./encryption";

// Report URLs discovered from mywfg.com exploration
const MYWFG_URLS = {
  base: "https://www.mywfg.com",
  login: "https://www.mywfg.com/",
  dashboard: "https://www.mywfg.com/dashboard",
  teamChart: "https://www.mywfg.com/team-chart",
  reports: {
    downlineStatus: "https://www.mywfg.com/reports/downline-status",
    commissionsSummary: "https://www.mywfg.com/reports/commissions-summary",
    paymentReport: "https://www.mywfg.com/reports/payment-report",
    totalCashFlow: "https://www.mywfg.com/reports/total-cash-flow",
    productionSummary: "https://www.mywfg.com/reports/production-summary",
  },
  advancementGuidelines: "https://www.mywfg.com/advancement-guidelines",
  commissionGuidelines: "https://www.mywfg.com/commission-guidelines",
};

// WFG Rank mapping from mywfg.com display names to internal codes
const RANK_MAPPING: Record<string, string> = {
  "Training Associate": "TRAINING_ASSOCIATE",
  "TA": "TRAINING_ASSOCIATE",
  "TA+": "TRAINING_ASSOCIATE",
  "Associate": "ASSOCIATE",
  "A": "ASSOCIATE",
  "Senior Associate": "SENIOR_ASSOCIATE",
  "SA": "SENIOR_ASSOCIATE",
  "Marketing Director": "MARKETING_DIRECTOR",
  "MD": "MARKETING_DIRECTOR",
  "Senior Marketing Director": "SENIOR_MARKETING_DIRECTOR",
  "SMD": "SENIOR_MARKETING_DIRECTOR",
  "Executive Marketing Director": "EXECUTIVE_MARKETING_DIRECTOR",
  "EMD": "EXECUTIVE_MARKETING_DIRECTOR",
  "CEO Marketing Director": "CEO_MARKETING_DIRECTOR",
  "CEO": "CEO_MARKETING_DIRECTOR",
  "Executive Vice Chairman": "EXECUTIVE_VICE_CHAIRMAN",
  "EVC": "EXECUTIVE_VICE_CHAIRMAN",
  "Senior Executive Vice Chairman": "SENIOR_EXECUTIVE_VICE_CHAIRMAN",
  "SEVC": "SENIOR_EXECUTIVE_VICE_CHAIRMAN",
  "Field Chairman": "FIELD_CHAIRMAN",
  "FC": "FIELD_CHAIRMAN",
  "Executive Chairman": "EXECUTIVE_CHAIRMAN",
  "EC": "EXECUTIVE_CHAIRMAN",
};

export interface ExtractedAgent {
  agentCode: string;
  mywfgAgentId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  currentRank?: string;
  licenseStatus?: string;
  isLifeLicensed?: boolean;
  isSecuritiesLicensed?: boolean;
  productionAmount?: number;
  firstPolicyDate?: string;
  uplineAgentCode?: string;
  directRecruits?: number;
  licensedAgentsInOrg?: number;
  totalBaseShopPoints?: number;
  totalCashFlow?: number;
}

export interface ExtractedProduction {
  agentCode: string;
  policyNumber: string;
  policyType: string;
  productCompany?: string;
  customerName?: string;
  premiumAmount?: number;
  commissionAmount?: number;
  basePoints?: number;
  issueDate?: string;
  paymentCycle?: string;
  generation?: number;
  overridePercentage?: number;
}

export interface ExtractedPayment {
  agentCode: string;
  paymentDate: string;
  paymentCycle: string;
  grossAmount: number;
  netAmount: number;
  deductions?: number;
  personalCommission?: number;
  overrideCommission?: number;
  bonusAmount?: number;
}

export interface TeamHierarchyNode {
  agentCode: string;
  name: string;
  rank: string;
  uplineAgentCode?: string;
  children: TeamHierarchyNode[];
}

export interface MyWFGSyncResult {
  success: boolean;
  agentsExtracted: number;
  productionRecordsExtracted: number;
  paymentsExtracted: number;
  agents: ExtractedAgent[];
  productionRecords: ExtractedProduction[];
  payments: ExtractedPayment[];
  teamHierarchy?: TeamHierarchyNode[];
  error?: string;
  timestamp: Date;
  requiresValidation?: boolean;
  syncType?: "FULL" | "DOWNLINE_STATUS" | "COMMISSIONS" | "PAYMENTS" | "CASH_FLOW" | "TEAM_CHART";
}

class MyWFGServiceV3 {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    if (!this.browser) {
      const { browser } = await launchBrowser();
      this.browser = browser;
    }
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Parse rank from display text to internal code
   */
  private parseRank(rankText: string): string {
    const normalized = rankText.trim();
    return RANK_MAPPING[normalized] || "TRAINING_ASSOCIATE";
  }

  /**
   * Parse currency string to number
   */
  private parseCurrency(text: string): number {
    if (!text) return 0;
    const cleaned = text.replace(/[$,\s]/g, "");
    return parseFloat(cleaned) || 0;
  }

  /**
   * Parse date string to ISO format
   */
  private parseDate(text: string): string | undefined {
    if (!text) return undefined;
    try {
      const date = new Date(text);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
    } catch {
      // Ignore parse errors
    }
    return undefined;
  }

  /**
   * Extract agent and production data from mywfg.com
   * Supports 2FA/validation code requirement
   */
  async extractData(
    encryptedUsername: string,
    encryptedPassword: string,
    validationCode?: string,
    syncType: "FULL" | "DOWNLINE_STATUS" | "COMMISSIONS" | "PAYMENTS" | "CASH_FLOW" | "TEAM_CHART" = "FULL"
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
        await page.goto(MYWFG_URLS.login, { waitUntil: "networkidle0", timeout: 60000 });

        console.log("[MyWFG] Page loaded. Attempting login...");

        // Step 1: Fill in username
        const usernameInput = await this.findInputField(page, ["text", "username"]);
        if (!usernameInput) {
          throw new Error("Could not find username input field");
        }

        console.log("[MyWFG] Filling username...");
        await usernameInput.click({ clickCount: 3 });
        await usernameInput.type(username, { delay: 50 });
        await page.waitForTimeout(500);

        // Step 2: Fill in password
        const passwordInput = await this.findInputField(page, ["password"]);
        if (!passwordInput) {
          throw new Error("Could not find password input field");
        }

        console.log("[MyWFG] Filling password...");
        await passwordInput.click({ clickCount: 3 });
        await passwordInput.type(password, { delay: 50 });
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
          await validationField.click({ clickCount: 3 });
          await validationField.type(validationCode, { delay: 50 });
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
            paymentsExtracted: 0,
            agents: [],
            productionRecords: [],
            payments: [],
            error: "Validation code required. Please check your email/phone for the OTP code.",
            timestamp: new Date(),
            requiresValidation: true,
            syncType,
          };
        }

        // Wait for navigation
        try {
          await page.waitForNavigation({ waitUntil: "networkidle0", timeout: 30000 });
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

        // Extract data based on sync type
        let agents: ExtractedAgent[] = [];
        let productionRecords: ExtractedProduction[] = [];
        let payments: ExtractedPayment[] = [];
        let teamHierarchy: TeamHierarchyNode[] | undefined;

        switch (syncType) {
          case "DOWNLINE_STATUS":
            agents = await this.extractDownlineStatus(page);
            break;
          case "COMMISSIONS":
            productionRecords = await this.extractCommissions(page);
            break;
          case "PAYMENTS":
            payments = await this.extractPayments(page);
            break;
          case "CASH_FLOW":
            productionRecords = await this.extractCashFlow(page);
            break;
          case "TEAM_CHART":
            teamHierarchy = await this.extractTeamChart(page);
            agents = this.flattenHierarchy(teamHierarchy);
            break;
          case "FULL":
          default:
            // Full sync - extract all data
            agents = await this.extractDownlineStatus(page);
            productionRecords = await this.extractCommissions(page);
            payments = await this.extractPayments(page);
            teamHierarchy = await this.extractTeamChart(page);
            break;
        }

        return {
          success: true,
          agentsExtracted: agents.length,
          productionRecordsExtracted: productionRecords.length,
          paymentsExtracted: payments.length,
          agents,
          productionRecords,
          payments,
          teamHierarchy,
          timestamp: new Date(),
          syncType,
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
        paymentsExtracted: 0,
        agents: [],
        productionRecords: [],
        payments: [],
        error: errorMessage,
        timestamp: new Date(),
        syncType,
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
      // Try type attribute first
      const button2 = await page.$(`button[type="${text}"]`);
      if (button2) return button2;
      // Try text content match using Puppeteer evaluate
      const buttonByText = await page.evaluateHandle((t) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(b => b.textContent?.trim().toLowerCase().includes(t.toLowerCase())) || null;
      }, text);
      const el = buttonByText.asElement();
      if (el) return el;
    }
    // Fallback: get first button
    const buttons = await page.$$("button");
    return buttons[0] || null;
  }

  /**
   * Extract agent data from Downline Status report
   */
  private async extractDownlineStatus(page: Page): Promise<ExtractedAgent[]> {
    console.log("[MyWFG] Navigating to Downline Status report...");
    
    try {
        await page.goto(MYWFG_URLS.reports.downlineStatus, { waitUntil: "networkidle0", timeout: 30000 });
      await page.waitForTimeout(2000);

      const agents = await page.evaluate(() => {
        const agentList: any[] = [];

        // Look for the downline status table
        const rows = document.querySelectorAll("table tbody tr, .downline-row, [data-agent-row]");
        
        rows.forEach((row) => {
          const cells = row.querySelectorAll("td, [data-field]");
          if (cells.length >= 3) {
            // Parse name (usually "Last, First" format)
            const nameText = cells[1]?.textContent?.trim() || "";
            const nameParts = nameText.split(",").map(s => s.trim());
            
            const agent = {
              agentCode: cells[0]?.textContent?.trim() || "",
              lastName: nameParts[0] || "",
              firstName: nameParts[1] || "",
              currentRank: cells[2]?.textContent?.trim() || "",
              email: cells[3]?.textContent?.trim() || "",
              phone: cells[4]?.textContent?.trim() || "",
              licenseStatus: cells[5]?.textContent?.trim() || "",
              totalBaseShopPoints: parseFloat(cells[6]?.textContent?.replace(/[$,]/g, "") || "0"),
              directRecruits: parseInt(cells[7]?.textContent || "0", 10),
            };

            if (agent.agentCode) {
              agentList.push(agent);
            }
          }
        });

        return agentList;
      });

      // Map ranks to internal codes
      const mappedAgents = agents.map(agent => ({
        ...agent,
        currentRank: this.parseRank(agent.currentRank || ""),
        isLifeLicensed: agent.licenseStatus?.toLowerCase().includes("life") || false,
        isSecuritiesLicensed: agent.licenseStatus?.toLowerCase().includes("securities") || false,
      }));

      console.log(`[MyWFG] Extracted ${mappedAgents.length} agents from Downline Status`);
      return mappedAgents;
    } catch (error) {
      console.error("[MyWFG] Error extracting Downline Status:", error);
      return [];
    }
  }

  /**
   * Extract commission data from Commissions Summary report
   */
  private async extractCommissions(page: Page): Promise<ExtractedProduction[]> {
    console.log("[MyWFG] Navigating to Commissions Summary report...");
    
    try {
        await page.goto(MYWFG_URLS.reports.commissionsSummary, { waitUntil: "networkidle0", timeout: 30000 });
      await page.waitForTimeout(2000);

      const records = await page.evaluate(() => {
        const productionList: any[] = [];

        const rows = document.querySelectorAll("table tbody tr, .commission-row, [data-commission-row]");
        
        rows.forEach((row) => {
          const cells = row.querySelectorAll("td, [data-field]");
          if (cells.length >= 5) {
            const record = {
              agentCode: cells[0]?.textContent?.trim() || "",
              policyNumber: cells[1]?.textContent?.trim() || "",
              policyType: cells[2]?.textContent?.trim() || "",
              productCompany: cells[3]?.textContent?.trim() || "",
              customerName: cells[4]?.textContent?.trim() || "",
              premiumAmount: cells[5]?.textContent?.trim() || "0",
              commissionAmount: cells[6]?.textContent?.trim() || "0",
              basePoints: cells[7]?.textContent?.trim() || "0",
              issueDate: cells[8]?.textContent?.trim() || "",
              paymentCycle: cells[9]?.textContent?.trim() || "",
            };

            if (record.agentCode && record.policyNumber) {
              productionList.push(record);
            }
          }
        });

        return productionList;
      });

      // Parse numeric values
      const parsedRecords = records.map(record => ({
        ...record,
        premiumAmount: this.parseCurrency(record.premiumAmount),
        commissionAmount: this.parseCurrency(record.commissionAmount),
        basePoints: this.parseCurrency(record.basePoints),
        issueDate: this.parseDate(record.issueDate),
      }));

      console.log(`[MyWFG] Extracted ${parsedRecords.length} commission records`);
      return parsedRecords;
    } catch (error) {
      console.error("[MyWFG] Error extracting Commissions:", error);
      return [];
    }
  }

  /**
   * Extract payment data from Payment Report
   */
  private async extractPayments(page: Page): Promise<ExtractedPayment[]> {
    console.log("[MyWFG] Navigating to Payment Report...");
    
    try {
        await page.goto(MYWFG_URLS.reports.paymentReport, { waitUntil: "networkidle0", timeout: 30000 });
      await page.waitForTimeout(2000);

      const payments = await page.evaluate(() => {
        const paymentList: any[] = [];

        const rows = document.querySelectorAll("table tbody tr, .payment-row, [data-payment-row]");
        
        rows.forEach((row) => {
          const cells = row.querySelectorAll("td, [data-field]");
          if (cells.length >= 4) {
            const payment = {
              agentCode: cells[0]?.textContent?.trim() || "",
              paymentDate: cells[1]?.textContent?.trim() || "",
              paymentCycle: cells[2]?.textContent?.trim() || "",
              grossAmount: cells[3]?.textContent?.trim() || "0",
              netAmount: cells[4]?.textContent?.trim() || "0",
              deductions: cells[5]?.textContent?.trim() || "0",
              personalCommission: cells[6]?.textContent?.trim() || "0",
              overrideCommission: cells[7]?.textContent?.trim() || "0",
              bonusAmount: cells[8]?.textContent?.trim() || "0",
            };

            if (payment.agentCode && payment.paymentDate) {
              paymentList.push(payment);
            }
          }
        });

        return paymentList;
      });

      // Parse numeric values
      const parsedPayments = payments.map(payment => ({
        agentCode: payment.agentCode,
        paymentDate: this.parseDate(payment.paymentDate) || payment.paymentDate,
        paymentCycle: payment.paymentCycle,
        grossAmount: this.parseCurrency(payment.grossAmount),
        netAmount: this.parseCurrency(payment.netAmount),
        deductions: this.parseCurrency(payment.deductions),
        personalCommission: this.parseCurrency(payment.personalCommission),
        overrideCommission: this.parseCurrency(payment.overrideCommission),
        bonusAmount: this.parseCurrency(payment.bonusAmount),
      }));

      console.log(`[MyWFG] Extracted ${parsedPayments.length} payment records`);
      return parsedPayments;
    } catch (error) {
      console.error("[MyWFG] Error extracting Payments:", error);
      return [];
    }
  }

  /**
   * Extract cash flow data from Total Cash Flow report
   */
  private async extractCashFlow(page: Page): Promise<ExtractedProduction[]> {
    console.log("[MyWFG] Navigating to Total Cash Flow report...");
    
    try {
        await page.goto(MYWFG_URLS.reports.totalCashFlow, { waitUntil: "networkidle0", timeout: 30000 });
      await page.waitForTimeout(2000);

      const records = await page.evaluate(() => {
        const cashFlowList: any[] = [];

        const rows = document.querySelectorAll("table tbody tr, .cashflow-row, [data-cashflow-row]");
        
        rows.forEach((row) => {
          const cells = row.querySelectorAll("td, [data-field]");
          if (cells.length >= 4) {
            const record = {
              agentCode: cells[0]?.textContent?.trim() || "",
              policyNumber: cells[1]?.textContent?.trim() || "",
              policyType: cells[2]?.textContent?.trim() || "",
              commissionAmount: cells[3]?.textContent?.trim() || "0",
              generation: cells[4]?.textContent?.trim() || "0",
              overridePercentage: cells[5]?.textContent?.trim() || "0",
              issueDate: cells[6]?.textContent?.trim() || "",
            };

            if (record.agentCode) {
              cashFlowList.push(record);
            }
          }
        });

        return cashFlowList;
      });

      // Parse numeric values
      const parsedRecords = records.map(record => ({
        ...record,
        commissionAmount: this.parseCurrency(record.commissionAmount),
        generation: parseInt(record.generation, 10) || 0,
        overridePercentage: parseFloat(record.overridePercentage) || 0,
        issueDate: this.parseDate(record.issueDate),
      }));

      console.log(`[MyWFG] Extracted ${parsedRecords.length} cash flow records`);
      return parsedRecords;
    } catch (error) {
      console.error("[MyWFG] Error extracting Cash Flow:", error);
      return [];
    }
  }

  /**
   * Extract team hierarchy from Team Chart
   */
  private async extractTeamChart(page: Page): Promise<TeamHierarchyNode[]> {
    console.log("[MyWFG] Navigating to Team Chart...");
    
    try {
        await page.goto(MYWFG_URLS.teamChart, { waitUntil: "networkidle0", timeout: 30000 });
      await page.waitForTimeout(2000);

      // Click expand button if available to show full hierarchy
      const expandButton = await page.$('[data-expand], .expand-all');
      if (expandButton) {
        await expandButton.click();
        await page.waitForTimeout(1000);
      }

      const hierarchy = await page.evaluate(() => {
        const nodes: any[] = [];

        // Look for hierarchy nodes in the team chart
        const chartNodes = document.querySelectorAll(".org-chart-node, [data-node], .team-member, .hierarchy-node");
        
        chartNodes.forEach((node) => {
          const agentCode = node.getAttribute("data-agent-code") || 
                          node.querySelector("[data-code]")?.textContent?.trim() || "";
          const name = node.querySelector(".name, [data-name]")?.textContent?.trim() || "";
          const rank = node.querySelector(".rank, [data-rank]")?.textContent?.trim() || "";
          const uplineCode = node.getAttribute("data-upline") || 
                           node.closest("[data-parent]")?.getAttribute("data-parent") || "";

          if (agentCode || name) {
            nodes.push({
              agentCode,
              name,
              rank,
              uplineAgentCode: uplineCode,
              children: [],
            });
          }
        });

        return nodes;
      });

      // Build tree structure from flat list
      const tree = this.buildHierarchyTree(hierarchy);

      console.log(`[MyWFG] Extracted ${hierarchy.length} nodes from Team Chart`);
      return tree;
    } catch (error) {
      console.error("[MyWFG] Error extracting Team Chart:", error);
      return [];
    }
  }

  /**
   * Build hierarchy tree from flat list
   */
  private buildHierarchyTree(nodes: TeamHierarchyNode[]): TeamHierarchyNode[] {
    const nodeMap = new Map<string, TeamHierarchyNode>();
    const roots: TeamHierarchyNode[] = [];

    // Create map
    nodes.forEach(node => {
      nodeMap.set(node.agentCode, { ...node, children: [] });
    });

    // Build relationships
    nodes.forEach(node => {
      const current = nodeMap.get(node.agentCode);
      if (current && node.uplineAgentCode && nodeMap.has(node.uplineAgentCode)) {
        const parent = nodeMap.get(node.uplineAgentCode)!;
        parent.children.push(current);
      } else if (current) {
        roots.push(current);
      }
    });

    return roots;
  }

  /**
   * Flatten hierarchy tree to agent list
   */
  private flattenHierarchy(hierarchy: TeamHierarchyNode[]): ExtractedAgent[] {
    const agents: ExtractedAgent[] = [];

    const traverse = (node: TeamHierarchyNode, uplineCode?: string) => {
      const nameParts = node.name.split(" ");
      agents.push({
        agentCode: node.agentCode,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        currentRank: this.parseRank(node.rank),
        uplineAgentCode: uplineCode,
        directRecruits: node.children.length,
      });

      node.children.forEach(child => traverse(child, node.agentCode));
    };

    hierarchy.forEach(root => traverse(root));
    return agents;
  }

  // Legacy methods for backward compatibility
  private async extractAgents(page: Page): Promise<ExtractedAgent[]> {
    return this.extractDownlineStatus(page);
  }

  private async extractProduction(page: Page): Promise<ExtractedProduction[]> {
    return this.extractCommissions(page);
  }
}

export const myWFGServiceV3 = new MyWFGServiceV3();

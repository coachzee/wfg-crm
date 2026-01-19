/**
 * Hierarchy Sync Service
 * Extracts upline relationships from MyWFG and updates the database
 */

import { chromium, type Page, type Browser } from "playwright";
import { getDb } from "./db";
import { agents } from "../drizzle/schema";
import { eq, isNotNull } from "drizzle-orm";
import { waitForOTP, getMyWFGCredentials } from "./gmail-otp";

interface UplineData {
  agentCode: string;
  uplineCode: string | null;
  uplineName: string | null;
}

/**
 * Extract upline from the Upline Leaders report for a single agent
 */
async function extractUplineFromReport(
  page: Page,
  agentCode: string
): Promise<UplineData> {
  try {
    // Navigate to the Upline Leaders report
    const reportUrl = `https://www.mywfg.com/reports-UplineLeaders?AgentID=${agentCode}`;
    await page.goto(reportUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait for the page to load
    await page.waitForSelector("#AgentID", { timeout: 10000 });

    // Click Generate Report button
    await page.click("#passVariablesToIFrameButton84937");

    // Wait for the report to load in the iframe
    await page.waitForTimeout(3000);

    // The report loads in an iframe - we need to extract from the page content
    // Look for the "Leader" row which contains the direct upline
    const uplineData = await page.evaluate(() => {
      // The report viewer renders content that we can search for
      const pageText = document.body.innerText;

      // Look for the Leader row pattern
      // Format: "Leader    Name    AgentCode    Title"
      const lines = pageText.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === "Leader" || line.startsWith("Leader\t")) {
          // The next few lines or cells contain the upline info
          // Try to find the agent code (format: alphanumeric like 94NJG)
          for (let j = i; j < Math.min(i + 5, lines.length); j++) {
            const nextLine = lines[j].trim();
            // Look for agent code pattern (letters and numbers, 4-6 chars)
            const codeMatch = nextLine.match(/\b([A-Z0-9]{4,6})\b/);
            if (codeMatch && codeMatch[1] !== "Leader") {
              // Found a potential agent code
              // Try to get the name from the previous line
              const nameLine = lines[j - 1]?.trim() || "";
              return {
                code: codeMatch[1],
                name: nameLine.length > 2 && !nameLine.match(/^[A-Z0-9]{4,6}$/) ? nameLine : null,
              };
            }
          }
        }
      }

      // Alternative: Look for the table structure in the HTML
      const tables = Array.from(document.querySelectorAll("table"));
      for (const table of tables) {
        const rows = Array.from(table.querySelectorAll("tr"));
        for (const row of rows) {
          const cells = Array.from(row.querySelectorAll("td"));
          if (cells.length >= 3) {
            const firstCell = cells[0]?.textContent?.trim();
            if (firstCell === "Leader") {
              const name = cells[1]?.textContent?.trim() || null;
              const code = cells[2]?.textContent?.trim() || null;
              if (code && code.match(/^[A-Z0-9]{4,6}$/)) {
                return { code, name };
              }
            }
          }
        }
      }

      return null;
    });

    if (uplineData && uplineData.code) {
      return {
        agentCode,
        uplineCode: uplineData.code,
        uplineName: uplineData.name,
      };
    }

    // No upline found - might be a root agent
    return {
      agentCode,
      uplineCode: null,
      uplineName: null,
    };
  } catch (error) {
    console.error(`Error extracting upline for ${agentCode}:`, error);
    return {
      agentCode,
      uplineCode: null,
      uplineName: null,
    };
  }
}

/**
 * Main function to sync hierarchy data for all agents
 */
export async function syncHierarchy(): Promise<{
  success: boolean;
  processed: number;
  updated: number;
  errors: string[];
}> {
  let browser: Browser | null = null;
  const errors: string[] = [];
  let processed = 0;
  let updated = 0;

  try {
    console.log("\n🔗 Starting Hierarchy Sync...\n");

    // Get database connection
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    // Get all agents from the database
    const allAgents = await db
      .select({
        id: agents.id,
        agentCode: agents.agentCode,
        firstName: agents.firstName,
        lastName: agents.lastName,
        uplineAgentId: agents.uplineAgentId,
      })
      .from(agents)
      .where(isNotNull(agents.agentCode));

    console.log(`📊 Found ${allAgents.length} agents in database`);

    if (allAgents.length === 0) {
      return { success: true, processed: 0, updated: 0, errors: [] };
    }

    // Create a map of agent codes to agent IDs for quick lookup
    const agentCodeToId = new Map<string, number>();
    for (const agent of allAgents) {
      if (agent.agentCode) {
        agentCodeToId.set(agent.agentCode, agent.id);
      }
    }

    // Launch browser and login to MyWFG
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log("🔐 Logging into MyWFG...");
    
    // Get login credentials
    const username = process.env.MYWFG_USERNAME || '';
    const password = process.env.MYWFG_PASSWORD || '';
    const gmailCreds = getMyWFGCredentials();
    
    // Navigate to MyWFG
    await page.goto("https://www.mywfg.com", { waitUntil: "networkidle", timeout: 60000 });
    
    // Wait for login form
    await page.waitForSelector('input[id="myWfgUsernameDisplay"], input[name="username"]', { timeout: 30000 });
    
    // Fill username
    const usernameInput = await page.$('input[id="myWfgUsernameDisplay"]') || await page.$('input[name="username"]');
    if (usernameInput) {
      await usernameInput.click({ clickCount: 3 });
      await usernameInput.type(username);
    }
    
    // Fill password
    const passwordInput = await page.$('input[id="myWfgPasswordDisplay"]') || await page.$('input[name="password"]');
    if (passwordInput) {
      await passwordInput.click({ clickCount: 3 });
      await passwordInput.type(password);
    }
    
    // Click login button
    const loginButton = await page.$('button[id="mywfgTheyLive"]') || await page.$('button[type="submit"]');
    if (loginButton) {
      await loginButton.click();
      await page.waitForTimeout(5000);
    }
    
    // Check for OTP requirement
    const pageContent = await page.content();
    const otpRequired = pageContent.includes('mywfgOtppswd') || 
                        pageContent.includes('One-Time Password') ||
                        pageContent.includes('Security Code');
    
    if (otpRequired) {
      console.log("📧 OTP required, waiting for email...");
      await page.waitForTimeout(5000);
      
      // Get OTP from email
      const otpResult = await waitForOTP(gmailCreds, "transamerica", 120000);
      if (!otpResult || !otpResult.otp) {
        throw new Error("Failed to get OTP");
      }
      
      // Enter OTP
      const otpInput = await page.$('input[id="mywfgOtppswd"]') || 
                       await page.$('input[name="otp"]') ||
                       await page.$('input[type="text"][maxlength="6"]');
      if (otpInput) {
        await otpInput.click({ clickCount: 3 });
        await otpInput.type(otpResult.otp);
      }
      
      // Submit OTP
      const submitBtn = await page.$('button[id="mywfgOtpSubmit"]') || await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForTimeout(5000);
      }
    }
    
    // Verify login success
    const currentUrl = page.url();
    if (currentUrl.includes('login') || currentUrl.includes('error')) {
      throw new Error("Login failed - still on login page");
    }
    console.log("✅ Login successful\n");

    // Process each agent to extract their upline
    const uplineResults: UplineData[] = [];

    for (let i = 0; i < allAgents.length; i++) {
      const agent = allAgents[i];
      if (!agent.agentCode) continue;

      processed++;
      const agentName = `${agent.firstName} ${agent.lastName}`;
      console.log(`[${i + 1}/${allAgents.length}] Processing ${agentName} (${agent.agentCode})...`);

      try {
        const uplineData = await extractUplineFromReport(page, agent.agentCode);
        uplineResults.push(uplineData);

        if (uplineData.uplineCode) {
          console.log(`  → Upline: ${uplineData.uplineCode} (${uplineData.uplineName || "unknown"})`);
        } else {
          console.log(`  → No upline (root agent)`);
        }

        // Small delay to avoid rate limiting
        await page.waitForTimeout(500);
      } catch (error) {
        const errorMsg = `Failed to process ${agent.agentCode}: ${error}`;
        errors.push(errorMsg);
        console.error(`  ✗ ${errorMsg}`);
      }
    }

    // Update the database with upline relationships
    console.log("\n📝 Updating database with upline relationships...\n");

    for (const uplineData of uplineResults) {
      if (!uplineData.uplineCode) continue;

      // Find the upline agent's ID
      const uplineAgentId = agentCodeToId.get(uplineData.uplineCode);
      if (!uplineAgentId) {
        console.log(`  ⚠ Upline ${uplineData.uplineCode} not found in database for ${uplineData.agentCode}`);
        continue;
      }

      // Find the agent's ID
      const agentId = agentCodeToId.get(uplineData.agentCode);
      if (!agentId) continue;

      // Update the agent's uplineAgentId
      await db
        .update(agents)
        .set({ uplineAgentId: uplineAgentId })
        .where(eq(agents.id, agentId));

      updated++;
      console.log(`  ✓ Updated ${uplineData.agentCode} → upline: ${uplineData.uplineCode}`);
    }

    console.log("\n📊 Hierarchy Sync Summary:");
    console.log(`   Agents processed: ${processed}`);
    console.log(`   Uplines updated: ${updated}`);
    console.log(`   Errors: ${errors.length}`);

    return {
      success: errors.length === 0,
      processed,
      updated,
      errors,
    };
  } catch (error) {
    const errorMsg = `Hierarchy sync failed: ${error}`;
    console.error(errorMsg);
    errors.push(errorMsg);
    return {
      success: false,
      processed,
      updated,
      errors,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncHierarchy()
    .then((result) => {
      console.log("\nResult:", result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}

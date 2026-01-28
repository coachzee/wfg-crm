/**
 * Hierarchy Sync Service
 * Extracts upline relationships from MyWFG and updates the database
 * 
 * Processes agents in batches of 15 with session refresh between batches
 * to prevent timeouts and maintain stable connections.
 */

import { chromium, type Page, type Browser, type BrowserContext } from "playwright";
import { getDb } from "./db";
import { agents } from "../drizzle/schema";
import { eq, isNotNull } from "drizzle-orm";
import { startOTPSession, waitForOTPWithSession, getMyWFGCredentials, clearUsedOTPs } from "./gmail-otp-v2";

// Helper to require environment variables
function mustGetEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Configuration
const BATCH_SIZE = 15; // Process 15 agents per batch
const DELAY_BETWEEN_AGENTS = 500; // 500ms delay between agents
const DELAY_BETWEEN_BATCHES = 5000; // 5 seconds delay between batches

interface UplineData {
  agentCode: string;
  uplineCode: string | null;
  uplineName: string | null;
}

/**
 * Login to MyWFG with OTP handling (V2 - session-based)
 */
async function loginToMyWFG(page: Page): Promise<boolean> {
  try {
    const username = mustGetEnv('MYWFG_USERNAME');
    const password = mustGetEnv('MYWFG_PASSWORD');
    const gmailCreds = getMyWFGCredentials();
    
    // Navigate to MyWFG
    await page.goto("https://www.mywfg.com", { waitUntil: "networkidle", timeout: 60000 });
    
    // Wait for login form
    await page.waitForSelector('input[id="myWfgUsernameDisplay"], input[name="username"]', { timeout: 30000 });
    
    // START OTP SESSION BEFORE TRIGGERING LOGIN
    console.log("📧 Starting OTP session before login...");
    const otpSessionId = startOTPSession('mywfg');
    
    // Fill username
    const usernameInput = await page.$('input[id="myWfgUsernameDisplay"]') || await page.$('input[name="username"]');
    if (usernameInput) {
      await usernameInput.click({ clickCount: 3 });
      await usernameInput.type(username, { delay: 30 });
    }
    
    // Fill password
    const passwordInput = await page.$('input[id="myWfgPasswordDisplay"]') || await page.$('input[name="password"]');
    if (passwordInput) {
      await passwordInput.click({ clickCount: 3 });
      await passwordInput.type(password, { delay: 30 });
    }
    
    // Click login button - this triggers the OTP email
    console.log("🔐 Clicking login button (this triggers OTP)...");
    const loginButton = await page.$('button[id="mywfgTheyLive"]') || await page.$('button[type="submit"]');
    if (loginButton) {
      await loginButton.click();
      await page.waitForTimeout(3000);
    }
    
    // Check for OTP requirement
    const pageContent = await page.content();
    const pageText = await page.evaluate(() => document.body.innerText);
    
    // Check for error page
    if (pageText.includes('ERROR OCCURRED') || pageText.includes('Bad Request')) {
      console.log("⚠️ Error page detected, retrying...");
      clearUsedOTPs();
      await page.goto("https://www.mywfg.com", { waitUntil: "networkidle", timeout: 60000 });
      return loginToMyWFG(page);
    }
    
    const otpRequired = pageContent.includes('mywfgOtppswd') || 
                        pageText.includes('One-Time Password') ||
                        pageText.includes('Security Code') ||
                        pageText.includes('Validation Code');
    
    if (otpRequired) {
      console.log("📧 OTP required, waiting for email (session-based, 180s timeout)...");
      
      // Wait for OTP using the session we started BEFORE login
      const otpResult = await waitForOTPWithSession(gmailCreds, otpSessionId, 180, 3);
      if (!otpResult.success || !otpResult.otp) {
        throw new Error(`Failed to get OTP: ${otpResult.error}`);
      }
      
      console.log(`✓ OTP received: ${otpResult.otp}`);
      
      // The OTP from email is the 6 digits we need to enter
      const otpToEnter = otpResult.otp.length > 6 ? otpResult.otp.slice(-6) : otpResult.otp;
      
      // Enter OTP
      const otpInput = await page.$('input[id="mywfgOtppswd"]') || 
                       await page.$('input[name="otp"]') ||
                       await page.$('input[type="text"][maxlength="6"]');
      if (otpInput) {
        await otpInput.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        await otpInput.type(otpToEnter, { delay: 50 });
      }
      
      // Submit OTP
      let submitBtn = await page.$('button[id="mywfgTheylive"]');
      if (!submitBtn) submitBtn = await page.$('button[id="mywfgTheyLive"]');
      if (!submitBtn) submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForTimeout(3000);
      }
    }
    
    // Verify login success
    const currentUrl = page.url();
    const finalPageText = await page.evaluate(() => document.body.innerText);
    
    const isLoggedIn = (currentUrl.includes('mywfg.com') && 
                        !currentUrl.includes('login') && 
                        !currentUrl.includes('signin')) ||
                       finalPageText.includes('Welcome') ||
                       finalPageText.includes('Dashboard');
    
    if (!isLoggedIn) {
      console.log("❌ Login verification failed");
      return false;
    }
    
    console.log("✅ Login successful");
    return true;
  } catch (error) {
    console.error("Login error:", error);
    return false;
  }
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
 * Process a batch of agents with a fresh browser session
 */
async function processBatch(
  batchAgents: Array<{ id: number; agentCode: string | null; firstName: string | null; lastName: string | null }>,
  batchIndex: number,
  totalBatches: number,
  totalAgents: number,
  startIndex: number
): Promise<{ results: UplineData[]; errors: string[] }> {
  let browser: Browser | null = null;
  const results: UplineData[] = [];
  const errors: string[] = [];

  try {
    console.log(`\n========== BATCH ${batchIndex + 1}/${totalBatches} (${batchAgents.length} agents) ==========`);
    
    // Launch fresh browser for this batch
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login to MyWFG
    console.log(`🔐 Batch ${batchIndex + 1}: Logging in to MyWFG...`);
    const loggedIn = await loginToMyWFG(page);
    
    if (!loggedIn) {
      const errorMsg = `Batch ${batchIndex + 1}: Login failed, skipping batch`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
      return { results, errors };
    }
    
    console.log(`✅ Batch ${batchIndex + 1}: Login successful, processing agents...`);

    // Process each agent in this batch
    for (let i = 0; i < batchAgents.length; i++) {
      const agent = batchAgents[i];
      if (!agent.agentCode) continue;

      const overallIndex = startIndex + i + 1;
      const agentName = `${agent.firstName || ''} ${agent.lastName || ''}`.trim();
      console.log(`[${overallIndex}/${totalAgents}] Processing ${agentName} (${agent.agentCode})...`);

      try {
        const uplineData = await extractUplineFromReport(page, agent.agentCode);
        results.push(uplineData);

        if (uplineData.uplineCode) {
          console.log(`  → Upline: ${uplineData.uplineCode} (${uplineData.uplineName || "unknown"})`);
        } else {
          console.log(`  → No upline (root agent)`);
        }

        // Small delay to avoid rate limiting
        await page.waitForTimeout(DELAY_BETWEEN_AGENTS);
      } catch (error) {
        const errorMsg = `Failed to process ${agent.agentCode}: ${error}`;
        errors.push(errorMsg);
        console.error(`  ✗ ${errorMsg}`);
      }
    }

    console.log(`✅ Batch ${batchIndex + 1}: Completed - Found ${results.filter(r => r.uplineCode).length} uplines`);

  } catch (batchError) {
    const errorMsg = `Batch ${batchIndex + 1} error: ${batchError}`;
    console.error(`❌ ${errorMsg}`);
    errors.push(errorMsg);
  } finally {
    if (browser) {
      await browser.close();
      browser = null;
    }
  }

  return { results, errors };
}

/**
 * Main function to sync hierarchy data for all agents
 * Processes agents in batches of 15 with session refresh between batches
 */
export async function syncHierarchy(batchSize: number = BATCH_SIZE): Promise<{
  success: boolean;
  processed: number;
  updated: number;
  errors: string[];
}> {
  const allErrors: string[] = [];
  let processed = 0;
  let updated = 0;

  try {
    console.log("\n🔗 Starting Hierarchy Sync...");
    console.log(`📊 Configuration: Batch size = ${batchSize}, Delay between batches = ${DELAY_BETWEEN_BATCHES / 1000}s\n`);

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

    // Split agents into batches
    const batches: typeof allAgents[] = [];
    for (let i = 0; i < allAgents.length; i += batchSize) {
      batches.push(allAgents.slice(i, i + batchSize));
    }

    console.log(`📦 Split into ${batches.length} batches of up to ${batchSize} agents each\n`);

    // Process each batch with a fresh browser session
    const allUplineResults: UplineData[] = [];

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const startIndex = batchIndex * batchSize;

      const { results, errors } = await processBatch(
        batch,
        batchIndex,
        batches.length,
        allAgents.length,
        startIndex
      );

      allUplineResults.push(...results);
      allErrors.push(...errors);
      processed += batch.length;

      // Wait between batches to avoid rate limiting (except for last batch)
      if (batchIndex < batches.length - 1) {
        console.log(`\n⏳ Waiting ${DELAY_BETWEEN_BATCHES / 1000} seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    // Update the database with upline relationships
    console.log("\n📝 Updating database with upline relationships...\n");

    for (const uplineData of allUplineResults) {
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

    console.log("\n========================================");
    console.log("📊 Hierarchy Sync Summary:");
    console.log(`   Batches processed: ${batches.length}`);
    console.log(`   Agents processed: ${processed}`);
    console.log(`   Uplines updated: ${updated}`);
    console.log(`   Errors: ${allErrors.length}`);
    console.log("========================================\n");

    return {
      success: allErrors.length === 0,
      processed,
      updated,
      errors: allErrors,
    };
  } catch (error) {
    const errorMsg = `Hierarchy sync failed: ${error}`;
    console.error(errorMsg);
    allErrors.push(errorMsg);
    return {
      success: false,
      processed,
      updated,
      errors: allErrors,
    };
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

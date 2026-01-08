import puppeteer, { Browser, Page } from "puppeteer";

interface PolicyData {
  policyNumber: string;
  writingAgentName?: string;
  writingAgentCode?: string;
  writingAgentSplit?: number;
  targetPremium?: number;
  secondAgentName?: string;
  secondAgentCode?: string;
  secondAgentSplit?: number;
}

export async function syncTransamericaPolicies(
  policyNumbers: string[],
  email: string,
  password: string
): Promise<PolicyData[]> {
  let browser: Browser | null = null;
  const results: PolicyData[] = [];

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setDefaultTimeout(30000);
    await page.setDefaultNavigationTimeout(30000);

    // Login to Transamerica
    console.log("Logging in to Transamerica...");
    await loginToTransamerica(page, email, password);

    // Navigate to Life Access
    console.log("Navigating to Transamerica Life Access...");
    await page.goto("https://lifeaccess.transamerica.com/app/lifeaccess#/display/PolicyList?type=inforce", {
      waitUntil: "networkidle2",
    });

    // Extract data for each policy
    for (const policyNumber of policyNumbers) {
      try {
        console.log(`Extracting data for policy ${policyNumber}...`);
        const policyData = await extractPolicyData(page, policyNumber);
        results.push(policyData);
      } catch (error) {
        console.error(`Failed to extract data for policy ${policyNumber}:`, error);
        results.push({ policyNumber }); // Still add the policy number so we know we tried
      }
    }

    await page.close();
  } catch (error) {
    console.error("Transamerica sync error:", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return results;
}

async function loginToTransamerica(page: Page, email: string, password: string): Promise<void> {
  // Navigate to login page
  await page.goto("https://secure.transamerica.com/login/sign-in/login.html", {
    waitUntil: "networkidle2",
  });

  // Fill in credentials
  await page.type('input[name="username"]', email);
  await page.type('input[name="password"]', password);

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for navigation
  await page.waitForNavigation({ waitUntil: "networkidle2" });

  // Check if we're logged in
  const currentUrl = page.url();
  if (currentUrl.includes("login") || currentUrl.includes("error")) {
    throw new Error("Login failed");
  }
}

async function extractPolicyData(page: Page, policyNumber: string): Promise<PolicyData> {
  const result: PolicyData = { policyNumber };

  try {
    // Search for the policy
    await page.type('input[placeholder*="Search"]', policyNumber);
    await page.keyboard.press("Enter");

    // Wait for search results
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Click on the first policy result
    const policyLink = await page.$('a[href*="Inforce"]');
    if (!policyLink) {
      throw new Error(`Policy ${policyNumber} not found in search results`);
    }

    await policyLink.click();
    await page.waitForNavigation({ waitUntil: "networkidle2" });

    // Extract writing agent from General tab (should be visible by default)
    const agentInfo = await page.evaluate(() => {
      const agentElements = document.querySelectorAll("div");
      let writingAgent: { name?: string; code?: string; split?: number } = {};

      agentElements.forEach((el) => {
        const text = el.textContent || "";
        if (text.includes("Writing") && text.includes("Producer Number")) {
          // Extract agent name and code
          const nameMatch = text.match(/Name\s+([A-Z\s]+)\s+Business Phone/);
          const codeMatch = text.match(/Producer Number\s+([A-Z0-9]+)/);
          const splitMatch = text.match(/Split\s+(\d+)%/);

          if (nameMatch) writingAgent.name = nameMatch[1].trim();
          if (codeMatch) writingAgent.code = codeMatch[1].trim();
          if (splitMatch) writingAgent.split = parseInt(splitMatch[1]);
        }
      });

      return writingAgent;
    });

    result.writingAgentName = agentInfo.name;
    result.writingAgentCode = agentInfo.code;
    result.writingAgentSplit = agentInfo.split || 100;

    // Click on Payment tab to get Target Premium
    const paymentTab = await page.$('a[id*="Payment"]');
    if (paymentTab) {
      await paymentTab.click();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Extract Target Premium from Policy Guidelines
      const targetPremium = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll("div"));
        for (const el of elements) {
          if (el.textContent?.includes("Target Premium")) {
            const match = el.textContent.match(/Target Premium\s+\$?([\d,]+\.?\d*)/);
            if (match) {
              return parseFloat(match[1].replace(/,/g, ""));
            }
          }
        }
        return undefined;
      });

      result.targetPremium = targetPremium;
    }

    // Go back to policy list
    await page.goBack({ waitUntil: "networkidle2" });
  } catch (error) {
    console.error(`Error extracting data for policy ${policyNumber}:`, error);
  }

  return result;
}

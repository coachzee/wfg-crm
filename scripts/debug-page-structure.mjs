import puppeteer from 'puppeteer';
import fs from 'fs';

const credentials = {
  username: process.env.MYWFG_USERNAME || '',
  password: process.env.MYWFG_PASSWORD || '',
};

async function main() {
  console.log('[Debug] Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    // Navigate to a specific agent's hierarchy page
    const agentCode = 'D3T9L'; // Fredrick Chukwuedo
    const url = `https://www.mywfg.com/Wfg.HierarchyTool/HierarchyDetails/LoadHierarchyToolMain?agentcodenumber=${agentCode}`;
    
    console.log(`[Debug] Navigating to ${url}...`);
    
    // First login
    await page.goto('https://www.mywfg.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    await page.waitForSelector('input[id="myWfgUsernameDisplay"]', { timeout: 15000 });
    await page.type('input[id="myWfgUsernameDisplay"]', credentials.username, { delay: 100 });
    await page.type('input[id="myWfgPassword"]', credentials.password, { delay: 100 });
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
      page.click('button[id="btnLogin"]')
    ]);
    
    await new Promise(r => setTimeout(r, 3000));
    console.log('[Debug] Login submitted, checking for OTP...');
    
    const pageContent = await page.content();
    if (pageContent.includes('mywfgOtppswd')) {
      console.log('[Debug] OTP required - please provide OTP manually or wait for automation');
      // For now, just exit - we need to fix OTP first
      await browser.close();
      return;
    }
    
    console.log('[Debug] No OTP required, navigating to agent page...');
    
    // Navigate to agent page
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/agent-page-initial.png', fullPage: true });
    console.log('[Debug] Screenshot saved to /tmp/agent-page-initial.png');
    
    // Get page content
    const bodyText = await page.evaluate(() => document.body.innerText);
    fs.writeFileSync('/tmp/agent-page-text.txt', bodyText);
    console.log('[Debug] Page text saved to /tmp/agent-page-text.txt');
    
    // Get HTML
    const html = await page.content();
    fs.writeFileSync('/tmp/agent-page-html.html', html);
    console.log('[Debug] HTML saved to /tmp/agent-page-html.html');
    
    // Look for Associate Details link
    const detailsLink = await page.$('a[id="AgentDetailsLink"]');
    if (detailsLink) {
      console.log('[Debug] Found AgentDetailsLink, clicking...');
      await detailsLink.click();
      await new Promise(r => setTimeout(r, 2000));
      
      // Take another screenshot
      await page.screenshot({ path: '/tmp/agent-page-details.png', fullPage: true });
      console.log('[Debug] Details screenshot saved to /tmp/agent-page-details.png');
      
      // Get updated content
      const detailsText = await page.evaluate(() => document.body.innerText);
      fs.writeFileSync('/tmp/agent-page-details-text.txt', detailsText);
      console.log('[Debug] Details text saved to /tmp/agent-page-details-text.txt');
    } else {
      console.log('[Debug] AgentDetailsLink not found');
      
      // List all links on the page
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a')).map(a => ({
          id: a.id,
          text: a.textContent?.trim().substring(0, 50),
          href: a.href
        }));
      });
      console.log('[Debug] Available links:', JSON.stringify(links.slice(0, 20), null, 2));
    }
    
    // Search for email pattern in the page
    const emailMatches = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    console.log('[Debug] Email addresses found:', emailMatches);
    
    // Search for phone pattern
    const phoneMatches = bodyText.match(/\(\d{3}\)\s*\d{3}[-.]?\d{4}|\d{3}[-.]?\d{3}[-.]?\d{4}/g);
    console.log('[Debug] Phone numbers found:', phoneMatches);
    
  } catch (error) {
    console.error('[Debug] Error:', error.message);
  } finally {
    await browser.close();
    console.log('[Debug] Browser closed');
  }
}

main();

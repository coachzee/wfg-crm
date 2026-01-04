/**
 * MyWFG.com Crawler - Explores account structure and captures data
 * 
 * This script logs into mywfg.com, navigates through key sections,
 * captures screenshots, and analyzes the HTML structure to understand
 * what data is available for extraction.
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  username: '73DXR',
  password: 'Jesulob@1245',
  outputDir: '/home/ubuntu/wfg-crm/mywfg-analysis',
  screenshotDir: '/home/ubuntu/wfg-crm/mywfg-analysis/screenshots',
  timeout: 60000,
};

// Create output directories
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}
if (!fs.existsSync(CONFIG.screenshotDir)) {
  fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
}

// Logging utility
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  fs.appendFileSync(
    path.join(CONFIG.outputDir, 'crawler.log'),
    `[${timestamp}] ${message}\n`
  );
}

// Save HTML content for analysis
function saveHtml(page, filename) {
  return page.content().then(html => {
    fs.writeFileSync(path.join(CONFIG.outputDir, filename), html);
    log(`Saved HTML: ${filename}`);
  });
}

// Extract and save page structure
async function analyzePageStructure(page, pageName) {
  const analysis = await page.evaluate(() => {
    const result = {
      title: document.title,
      url: window.location.href,
      tables: [],
      forms: [],
      links: [],
      dataElements: [],
    };

    // Analyze tables
    document.querySelectorAll('table').forEach((table, idx) => {
      const headers = [];
      table.querySelectorAll('th').forEach(th => headers.push(th.textContent?.trim()));
      const rowCount = table.querySelectorAll('tr').length;
      result.tables.push({
        index: idx,
        headers,
        rowCount,
        id: table.id || null,
        className: table.className || null,
      });
    });

    // Analyze forms
    document.querySelectorAll('form').forEach((form, idx) => {
      const inputs = [];
      form.querySelectorAll('input, select, textarea').forEach(input => {
        inputs.push({
          type: input.type || input.tagName.toLowerCase(),
          name: input.name || null,
          id: input.id || null,
        });
      });
      result.forms.push({
        index: idx,
        action: form.action || null,
        method: form.method || null,
        inputs,
      });
    });

    // Analyze navigation links
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      const text = link.textContent?.trim();
      if (href && text && !href.startsWith('javascript:') && !href.startsWith('#')) {
        result.links.push({ href, text: text.substring(0, 100) });
      }
    });

    // Look for data-rich elements
    document.querySelectorAll('[data-*], .agent, .production, .report, .dashboard').forEach(el => {
      result.dataElements.push({
        tagName: el.tagName,
        id: el.id || null,
        className: el.className || null,
        dataAttributes: Object.keys(el.dataset || {}),
      });
    });

    return result;
  });

  fs.writeFileSync(
    path.join(CONFIG.outputDir, `${pageName}-structure.json`),
    JSON.stringify(analysis, null, 2)
  );
  log(`Analyzed structure: ${pageName}`);
  return analysis;
}

// Main crawler function
async function crawlMyWFG() {
  log('Starting MyWFG crawler...');
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  page.setDefaultTimeout(CONFIG.timeout);

  const findings = {
    loginSuccess: false,
    pagesExplored: [],
    dataSourcesFound: [],
    recommendations: [],
    errors: [],
  };

  try {
    // Step 1: Navigate to login page
    log('Navigating to mywfg.com...');
    await page.goto('https://www.mywfg.com', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(CONFIG.screenshotDir, '01-homepage.png'), fullPage: true });
    await saveHtml(page, '01-homepage.html');

    // Step 2: Find and fill login form
    log('Looking for login form...');
    
    // Wait for page to fully load
    await page.waitForTimeout(3000);
    
    // Try different login selectors
    const usernameSelectors = [
      'input[name="username"]',
      'input[name="user"]',
      'input[name="userId"]',
      'input[id="username"]',
      'input[id="user"]',
      'input[type="text"][name*="user"]',
      'input[type="text"]',
    ];

    const passwordSelectors = [
      'input[name="password"]',
      'input[name="pass"]',
      'input[id="password"]',
      'input[type="password"]',
    ];

    let usernameField = null;
    let passwordField = null;

    for (const selector of usernameSelectors) {
      usernameField = await page.$(selector);
      if (usernameField) {
        log(`Found username field: ${selector}`);
        break;
      }
    }

    for (const selector of passwordSelectors) {
      passwordField = await page.$(selector);
      if (passwordField) {
        log(`Found password field: ${selector}`);
        break;
      }
    }

    if (usernameField && passwordField) {
      await usernameField.fill(CONFIG.username);
      await passwordField.fill(CONFIG.password);
      await page.screenshot({ path: path.join(CONFIG.screenshotDir, '02-login-filled.png'), fullPage: true });

      // Find and click submit button
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Login")',
        'button:has-text("Sign In")',
        'button:has-text("Log In")',
        '.login-button',
        '#loginButton',
      ];

      for (const selector of submitSelectors) {
        const submitBtn = await page.$(selector);
        if (submitBtn) {
          log(`Found submit button: ${selector}`);
          await submitBtn.click();
          break;
        }
      }

      // Wait for navigation or OTP page
      await page.waitForTimeout(5000);
      await page.screenshot({ path: path.join(CONFIG.screenshotDir, '03-after-login.png'), fullPage: true });
      await saveHtml(page, '03-after-login.html');

      const currentUrl = page.url();
      log(`Current URL after login: ${currentUrl}`);

      // Check if we need OTP
      if (currentUrl.includes('otp') || currentUrl.includes('verification') || currentUrl.includes('macotp')) {
        log('OTP/Verification page detected - will need validation code');
        findings.errors.push('Login requires OTP validation code');
        
        // Analyze OTP page structure
        await analyzePageStructure(page, 'otp-page');
        
        // Look for OTP input field
        const otpInput = await page.$('input[name*="otp"], input[name*="code"], input[type="text"]');
        if (otpInput) {
          log('OTP input field found - waiting for user to provide code...');
          findings.recommendations.push('System requires 2FA - need to handle OTP input');
        }
      } else {
        findings.loginSuccess = true;
        log('Login appears successful!');
      }
    } else {
      log('Could not find login form fields');
      findings.errors.push('Login form not found');
    }

    // If login successful, explore the account
    if (findings.loginSuccess) {
      log('Exploring account pages...');

      // Common WFG portal pages to explore
      const pagesToExplore = [
        { name: 'dashboard', urls: ['/dashboard', '/home', '/main', '/portal'] },
        { name: 'agents', urls: ['/agents', '/team', '/downline', '/hierarchy', '/organization'] },
        { name: 'production', urls: ['/production', '/reports', '/commissions', '/earnings'] },
        { name: 'training', urls: ['/training', '/education', '/courses', '/learning'] },
        { name: 'licensing', urls: ['/licensing', '/licenses', '/compliance'] },
        { name: 'clients', urls: ['/clients', '/customers', '/policies'] },
        { name: 'profile', urls: ['/profile', '/account', '/settings'] },
      ];

      // First, analyze the current page (likely dashboard)
      const dashboardAnalysis = await analyzePageStructure(page, 'dashboard');
      findings.pagesExplored.push({
        name: 'dashboard',
        url: page.url(),
        analysis: dashboardAnalysis,
      });

      // Look for navigation menu
      const navLinks = await page.$$eval('nav a, .menu a, .sidebar a, [class*="nav"] a', links => 
        links.map(l => ({ href: l.href, text: l.textContent?.trim() }))
      );
      
      log(`Found ${navLinks.length} navigation links`);
      fs.writeFileSync(
        path.join(CONFIG.outputDir, 'navigation-links.json'),
        JSON.stringify(navLinks, null, 2)
      );

      // Explore each navigation link
      let pageCount = 4;
      for (const link of navLinks.slice(0, 15)) { // Limit to first 15 links
        if (link.href && !link.href.includes('logout') && !link.href.includes('signout')) {
          try {
            log(`Exploring: ${link.text} - ${link.href}`);
            await page.goto(link.href, { waitUntil: 'networkidle', timeout: 30000 });
            await page.waitForTimeout(2000);
            
            const screenshotName = `${String(pageCount).padStart(2, '0')}-${link.text?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'page'}.png`;
            await page.screenshot({ path: path.join(CONFIG.screenshotDir, screenshotName), fullPage: true });
            
            const htmlName = `${String(pageCount).padStart(2, '0')}-${link.text?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'page'}.html`;
            await saveHtml(page, htmlName);
            
            const pageAnalysis = await analyzePageStructure(page, link.text?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'page');
            
            findings.pagesExplored.push({
              name: link.text,
              url: link.href,
              analysis: pageAnalysis,
            });

            // Check for data tables
            if (pageAnalysis.tables.length > 0) {
              findings.dataSourcesFound.push({
                page: link.text,
                url: link.href,
                tables: pageAnalysis.tables,
              });
            }

            pageCount++;
          } catch (err) {
            log(`Error exploring ${link.text}: ${err.message}`);
          }
        }
      }
    }

  } catch (error) {
    log(`Crawler error: ${error.message}`);
    findings.errors.push(error.message);
    await page.screenshot({ path: path.join(CONFIG.screenshotDir, 'error-state.png'), fullPage: true });
  } finally {
    // Save final findings
    fs.writeFileSync(
      path.join(CONFIG.outputDir, 'crawler-findings.json'),
      JSON.stringify(findings, null, 2)
    );
    
    log('Crawler completed. Closing browser...');
    await browser.close();
  }

  return findings;
}

// Run the crawler
crawlMyWFG()
  .then(findings => {
    console.log('\n=== CRAWLER SUMMARY ===');
    console.log(`Login Success: ${findings.loginSuccess}`);
    console.log(`Pages Explored: ${findings.pagesExplored.length}`);
    console.log(`Data Sources Found: ${findings.dataSourcesFound.length}`);
    console.log(`Errors: ${findings.errors.length}`);
    console.log(`\nResults saved to: ${CONFIG.outputDir}`);
  })
  .catch(err => {
    console.error('Crawler failed:', err);
    process.exit(1);
  });

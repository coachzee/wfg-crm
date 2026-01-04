/**
 * MyWFG.com Crawler v2 - Improved with correct selectors
 * 
 * Based on screenshot analysis:
 * - AGENT ID field with placeholder "User ID"
 * - PASSWORD field
 * - "Log in" button (red/maroon)
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const CONFIG = {
  username: '73DXR',
  password: 'Jesulob@1245',
  outputDir: '/home/ubuntu/wfg-crm/mywfg-analysis',
  screenshotDir: '/home/ubuntu/wfg-crm/mywfg-analysis/screenshots',
  timeout: 30000,
};

// Create output directories
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}
if (!fs.existsSync(CONFIG.screenshotDir)) {
  fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
}

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  fs.appendFileSync(
    path.join(CONFIG.outputDir, 'crawler-v2.log'),
    `[${timestamp}] ${message}\n`
  );
}

async function saveHtml(page, filename) {
  const html = await page.content();
  fs.writeFileSync(path.join(CONFIG.outputDir, filename), html);
  log(`Saved HTML: ${filename}`);
}

async function analyzePageStructure(page, pageName) {
  const analysis = await page.evaluate(() => {
    const result = {
      title: document.title,
      url: window.location.href,
      tables: [],
      forms: [],
      links: [],
      dataElements: [],
      textContent: [],
    };

    // Analyze tables - capture headers and sample data
    document.querySelectorAll('table').forEach((table, idx) => {
      const headers = [];
      table.querySelectorAll('th').forEach(th => headers.push(th.textContent?.trim()));
      
      const rows = [];
      table.querySelectorAll('tbody tr').forEach((tr, rowIdx) => {
        if (rowIdx < 3) { // Sample first 3 rows
          const cells = [];
          tr.querySelectorAll('td').forEach(td => cells.push(td.textContent?.trim().substring(0, 100)));
          rows.push(cells);
        }
      });
      
      result.tables.push({
        index: idx,
        headers,
        sampleRows: rows,
        totalRows: table.querySelectorAll('tbody tr').length,
        id: table.id || null,
        className: table.className || null,
      });
    });

    // Analyze navigation links
    document.querySelectorAll('nav a, .nav a, [class*="menu"] a, [class*="sidebar"] a, header a').forEach(link => {
      const href = link.getAttribute('href');
      const text = link.textContent?.trim();
      if (href && text && text.length > 0 && !href.startsWith('javascript:') && !href.startsWith('#')) {
        result.links.push({ href, text: text.substring(0, 100) });
      }
    });

    // Look for key data sections
    const keySelectors = [
      '[class*="agent"]', '[class*="Agent"]',
      '[class*="production"]', '[class*="Production"]',
      '[class*="commission"]', '[class*="Commission"]',
      '[class*="team"]', '[class*="Team"]',
      '[class*="downline"]', '[class*="Downline"]',
      '[class*="report"]', '[class*="Report"]',
      '[class*="dashboard"]', '[class*="Dashboard"]',
      '[class*="card"]', '[class*="Card"]',
      '[class*="stat"]', '[class*="Stat"]',
    ];
    
    keySelectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(el => {
          const text = el.textContent?.trim().substring(0, 200);
          if (text && text.length > 10) {
            result.dataElements.push({
              selector,
              tagName: el.tagName,
              id: el.id || null,
              className: el.className?.toString().substring(0, 100) || null,
              textPreview: text,
            });
          }
        });
      } catch (e) {}
    });

    // Capture main content text
    const mainContent = document.querySelector('main, [role="main"], .main-content, #main, .content');
    if (mainContent) {
      result.textContent.push({
        source: 'main',
        text: mainContent.textContent?.trim().substring(0, 1000),
      });
    }

    return result;
  });

  fs.writeFileSync(
    path.join(CONFIG.outputDir, `${pageName}-structure.json`),
    JSON.stringify(analysis, null, 2)
  );
  log(`Analyzed structure: ${pageName} - ${analysis.tables.length} tables, ${analysis.links.length} links`);
  return analysis;
}

async function crawlMyWFG() {
  log('Starting MyWFG crawler v2...');
  
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
    requiresOTP: false,
    pagesExplored: [],
    dataSourcesFound: [],
    navigationMenu: [],
    recommendations: [],
    errors: [],
  };

  try {
    // Step 1: Navigate to login page
    log('Navigating to mywfg.com...');
    await page.goto('https://www.mywfg.com', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Step 2: Wait for login form to be visible
    log('Waiting for login form...');
    
    // Based on screenshot: look for input with placeholder "User ID"
    await page.waitForSelector('input[placeholder="User ID"], input[name="username"]', { state: 'visible', timeout: 10000 });
    
    await page.screenshot({ path: path.join(CONFIG.screenshotDir, 'v2-01-login-page.png'), fullPage: true });

    // Fill Agent ID
    log('Filling Agent ID...');
    const agentIdField = await page.$('input[placeholder="User ID"]') || await page.$('input[name="username"]');
    if (agentIdField) {
      await agentIdField.click();
      await agentIdField.fill(CONFIG.username);
    }

    // Fill Password
    log('Filling Password...');
    const passwordField = await page.$('input[placeholder="Password"]') || await page.$('input[type="password"]');
    if (passwordField) {
      await passwordField.click();
      await passwordField.fill(CONFIG.password);
    }

    await page.screenshot({ path: path.join(CONFIG.screenshotDir, 'v2-02-credentials-filled.png'), fullPage: true });

    // Click Log in button
    log('Clicking Log in button...');
    const loginButton = await page.$('button:has-text("Log in")') || 
                        await page.$('button:has-text("Login")') ||
                        await page.$('button[type="submit"]');
    
    if (loginButton) {
      await loginButton.click();
      log('Login button clicked, waiting for response...');
    }

    // Wait for navigation
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(CONFIG.screenshotDir, 'v2-03-after-login-click.png'), fullPage: true });
    await saveHtml(page, 'v2-03-after-login.html');

    const currentUrl = page.url();
    log(`Current URL: ${currentUrl}`);

    // Check for OTP/verification page
    const pageContent = await page.content();
    if (pageContent.includes('verification') || 
        pageContent.includes('otp') || 
        pageContent.includes('security code') ||
        pageContent.includes('One Time') ||
        currentUrl.includes('otp') ||
        currentUrl.includes('verification')) {
      
      log('OTP/Verification required');
      findings.requiresOTP = true;
      await page.screenshot({ path: path.join(CONFIG.screenshotDir, 'v2-04-otp-page.png'), fullPage: true });
      await saveHtml(page, 'v2-04-otp-page.html');
      
      // Analyze OTP page
      await analyzePageStructure(page, 'otp-page');
      findings.recommendations.push('System requires 2FA verification code');
      
    } else if (!currentUrl.includes('mywfg.com') || currentUrl.includes('dashboard') || currentUrl.includes('home')) {
      findings.loginSuccess = true;
      log('Login successful! Exploring account...');
      
      // Explore the dashboard/home page
      await page.screenshot({ path: path.join(CONFIG.screenshotDir, 'v2-05-dashboard.png'), fullPage: true });
      await saveHtml(page, 'v2-05-dashboard.html');
      
      const dashboardAnalysis = await analyzePageStructure(page, 'dashboard');
      findings.pagesExplored.push({
        name: 'Dashboard',
        url: currentUrl,
        analysis: dashboardAnalysis,
      });

      // Extract navigation menu
      const navLinks = await page.$$eval('nav a, .nav a, [class*="menu"] a, [class*="sidebar"] a', links => 
        links.map(l => ({ 
          href: l.href, 
          text: l.textContent?.trim(),
          visible: l.offsetParent !== null
        })).filter(l => l.text && l.text.length > 0)
      );
      
      findings.navigationMenu = navLinks;
      log(`Found ${navLinks.length} navigation links`);
      
      fs.writeFileSync(
        path.join(CONFIG.outputDir, 'navigation-menu.json'),
        JSON.stringify(navLinks, null, 2)
      );

      // Explore key pages
      let pageNum = 6;
      const visitedUrls = new Set([currentUrl]);
      
      for (const link of navLinks.slice(0, 20)) {
        if (link.href && 
            !link.href.includes('logout') && 
            !link.href.includes('signout') &&
            !visitedUrls.has(link.href)) {
          
          visitedUrls.add(link.href);
          
          try {
            log(`Exploring: ${link.text} -> ${link.href}`);
            await page.goto(link.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
            await page.waitForTimeout(2000);
            
            const safeName = (link.text || 'page').replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 30);
            await page.screenshot({ 
              path: path.join(CONFIG.screenshotDir, `v2-${String(pageNum).padStart(2, '0')}-${safeName}.png`), 
              fullPage: true 
            });
            await saveHtml(page, `v2-${String(pageNum).padStart(2, '0')}-${safeName}.html`);
            
            const pageAnalysis = await analyzePageStructure(page, safeName);
            
            findings.pagesExplored.push({
              name: link.text,
              url: link.href,
              analysis: pageAnalysis,
            });

            // Track data sources
            if (pageAnalysis.tables.length > 0) {
              findings.dataSourcesFound.push({
                page: link.text,
                url: link.href,
                tableCount: pageAnalysis.tables.length,
                tables: pageAnalysis.tables,
              });
              log(`  Found ${pageAnalysis.tables.length} data tables on ${link.text}`);
            }

            pageNum++;
          } catch (err) {
            log(`  Error: ${err.message}`);
          }
        }
      }
    } else {
      log('Login may have failed - checking page content...');
      await analyzePageStructure(page, 'post-login-unknown');
    }

  } catch (error) {
    log(`Crawler error: ${error.message}`);
    findings.errors.push(error.message);
    await page.screenshot({ path: path.join(CONFIG.screenshotDir, 'v2-error.png'), fullPage: true });
  } finally {
    // Generate summary report
    const summary = {
      ...findings,
      summary: {
        loginSuccess: findings.loginSuccess,
        requiresOTP: findings.requiresOTP,
        totalPagesExplored: findings.pagesExplored.length,
        totalDataSources: findings.dataSourcesFound.length,
        totalTables: findings.dataSourcesFound.reduce((sum, ds) => sum + ds.tableCount, 0),
        errorCount: findings.errors.length,
      }
    };
    
    fs.writeFileSync(
      path.join(CONFIG.outputDir, 'crawler-v2-findings.json'),
      JSON.stringify(summary, null, 2)
    );
    
    log('Crawler completed. Closing browser...');
    await browser.close();
  }

  return findings;
}

// Run
crawlMyWFG()
  .then(findings => {
    console.log('\n========================================');
    console.log('        MYWFG CRAWLER SUMMARY');
    console.log('========================================');
    console.log(`Login Success: ${findings.loginSuccess}`);
    console.log(`Requires OTP: ${findings.requiresOTP}`);
    console.log(`Pages Explored: ${findings.pagesExplored.length}`);
    console.log(`Data Sources Found: ${findings.dataSourcesFound.length}`);
    console.log(`Errors: ${findings.errors.length}`);
    console.log(`\nResults saved to: ${CONFIG.outputDir}`);
    console.log('========================================\n');
  })
  .catch(err => {
    console.error('Crawler failed:', err);
    process.exit(1);
  });

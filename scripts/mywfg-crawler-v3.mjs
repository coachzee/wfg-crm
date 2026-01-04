/**
 * MyWFG.com Crawler v3 - With OTP code support
 * 
 * Completes login with validation code and explores the account
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const CONFIG = {
  username: '73DXR',
  password: 'Jesulob@1245',
  otpCode: '284761',  // User-provided validation code
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
    path.join(CONFIG.outputDir, 'crawler-v3.log'),
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
      links: [],
      dataElements: [],
      cards: [],
      menuItems: [],
    };

    // Analyze tables with full detail
    document.querySelectorAll('table').forEach((table, idx) => {
      const headers = [];
      table.querySelectorAll('th, thead td').forEach(th => {
        const text = th.textContent?.trim();
        if (text) headers.push(text);
      });
      
      const rows = [];
      table.querySelectorAll('tbody tr').forEach((tr, rowIdx) => {
        if (rowIdx < 5) { // Sample first 5 rows
          const cells = [];
          tr.querySelectorAll('td').forEach(td => {
            cells.push(td.textContent?.trim().substring(0, 150));
          });
          if (cells.length > 0) rows.push(cells);
        }
      });
      
      result.tables.push({
        index: idx,
        headers,
        sampleRows: rows,
        totalRows: table.querySelectorAll('tbody tr').length,
        id: table.id || null,
        className: table.className?.substring(0, 100) || null,
      });
    });

    // Analyze all links for navigation
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      const text = link.textContent?.trim();
      if (href && text && text.length > 0 && 
          !href.startsWith('javascript:') && 
          !href.startsWith('#') &&
          !href.includes('logout')) {
        result.links.push({ 
          href: href.startsWith('/') ? `https://www.mywfg.com${href}` : href, 
          text: text.substring(0, 100),
          isNavigation: link.closest('nav, .nav, [class*="menu"], [class*="sidebar"], header') !== null
        });
      }
    });

    // Look for card/panel elements with data
    document.querySelectorAll('[class*="card"], [class*="panel"], [class*="widget"], [class*="tile"]').forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length > 20 && text.length < 500) {
        result.cards.push({
          className: el.className?.toString().substring(0, 100),
          textPreview: text.substring(0, 300),
        });
      }
    });

    // Extract menu/nav items
    document.querySelectorAll('nav a, .nav a, [class*="menu"] a, [class*="sidebar"] a, [class*="navigation"] a').forEach(link => {
      const text = link.textContent?.trim();
      const href = link.getAttribute('href');
      if (text && href) {
        result.menuItems.push({ text, href });
      }
    });

    return result;
  });

  fs.writeFileSync(
    path.join(CONFIG.outputDir, `${pageName}-structure.json`),
    JSON.stringify(analysis, null, 2)
  );
  log(`Analyzed: ${pageName} - ${analysis.tables.length} tables, ${analysis.menuItems.length} menu items`);
  return analysis;
}

async function crawlMyWFG() {
  log('Starting MyWFG crawler v3 with OTP...');
  
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
    navigationMenu: [],
    agentData: [],
    productionData: [],
    errors: [],
  };

  try {
    // Step 1: Navigate to login page
    log('Navigating to mywfg.com...');
    await page.goto('https://www.mywfg.com', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Step 2: Login
    log('Logging in...');
    await page.waitForSelector('input[placeholder="User ID"], input[name="username"]', { state: 'visible', timeout: 10000 });
    
    const agentIdField = await page.$('input[placeholder="User ID"]') || await page.$('input[name="username"]');
    if (agentIdField) {
      await agentIdField.click();
      await agentIdField.fill(CONFIG.username);
    }

    const passwordField = await page.$('input[placeholder="Password"]') || await page.$('input[type="password"]');
    if (passwordField) {
      await passwordField.click();
      await passwordField.fill(CONFIG.password);
    }

    const loginButton = await page.$('button:has-text("Log in")') || await page.$('button[type="submit"]');
    if (loginButton) {
      await loginButton.click();
    }

    await page.waitForTimeout(5000);
    
    // Step 3: Handle OTP
    const currentUrl = page.url();
    log(`After login URL: ${currentUrl}`);
    
    if (currentUrl.includes('otp') || currentUrl.includes('macotp')) {
      log('OTP page detected, entering validation code...');
      await page.screenshot({ path: path.join(CONFIG.screenshotDir, 'v3-01-otp-page.png'), fullPage: true });
      
      // Find OTP input field - it's after "4163 -"
      const otpInput = await page.$('input[type="text"]:not([name="username"])') || 
                       await page.$('input[name*="otp"]') ||
                       await page.$('input[name*="code"]') ||
                       await page.$('input:not([type="password"]):not([type="hidden"]):not([type="checkbox"])');
      
      if (otpInput) {
        await otpInput.click();
        await otpInput.fill(CONFIG.otpCode);
        log('OTP code entered');
        
        await page.screenshot({ path: path.join(CONFIG.screenshotDir, 'v3-02-otp-filled.png'), fullPage: true });
        
        // Check "Remember this device" if available
        const rememberCheckbox = await page.$('input[type="checkbox"]');
        if (rememberCheckbox) {
          await rememberCheckbox.check();
          log('Checked "Remember this device"');
        }
        
        // Click Submit
        const submitButton = await page.$('button:has-text("Submit")') || 
                            await page.$('button[type="submit"]') ||
                            await page.$('input[type="submit"]');
        if (submitButton) {
          await submitButton.click();
          log('Submit button clicked');
        }
        
        await page.waitForTimeout(8000);
        await page.screenshot({ path: path.join(CONFIG.screenshotDir, 'v3-03-after-otp.png'), fullPage: true });
        await saveHtml(page, 'v3-03-after-otp.html');
      }
    }

    // Step 4: Check if we're logged in
    const postOtpUrl = page.url();
    log(`Post-OTP URL: ${postOtpUrl}`);
    
    // Check for successful login indicators
    const pageContent = await page.content();
    const isLoggedIn = !postOtpUrl.includes('login') && 
                       !postOtpUrl.includes('otp') &&
                       (pageContent.includes('Dashboard') || 
                        pageContent.includes('Welcome') ||
                        pageContent.includes('Home') ||
                        pageContent.includes('Agent'));
    
    if (isLoggedIn || postOtpUrl.includes('portal') || postOtpUrl.includes('home') || postOtpUrl.includes('dashboard')) {
      findings.loginSuccess = true;
      log('LOGIN SUCCESSFUL! Exploring account...');
      
      // Take dashboard screenshot
      await page.screenshot({ path: path.join(CONFIG.screenshotDir, 'v3-04-dashboard.png'), fullPage: true });
      await saveHtml(page, 'v3-04-dashboard.html');
      
      const dashboardAnalysis = await analyzePageStructure(page, 'dashboard');
      findings.pagesExplored.push({
        name: 'Dashboard/Home',
        url: postOtpUrl,
        analysis: dashboardAnalysis,
      });
      findings.navigationMenu = dashboardAnalysis.menuItems;

      // Explore key pages based on navigation
      const pagesToVisit = new Map();
      
      // Add menu items
      for (const item of dashboardAnalysis.menuItems) {
        if (item.href && !item.href.includes('logout')) {
          pagesToVisit.set(item.href, item.text);
        }
      }
      
      // Add links that look like navigation
      for (const link of dashboardAnalysis.links) {
        if (link.isNavigation && !link.href.includes('logout')) {
          pagesToVisit.set(link.href, link.text);
        }
      }

      log(`Found ${pagesToVisit.size} pages to explore`);
      
      let pageNum = 5;
      const visitedUrls = new Set([postOtpUrl]);
      
      for (const [url, name] of pagesToVisit) {
        if (visitedUrls.has(url) || pageNum > 25) continue;
        visitedUrls.add(url);
        
        try {
          log(`Exploring [${pageNum}]: ${name} -> ${url}`);
          
          // Navigate to page
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
          await page.waitForTimeout(3000);
          
          const safeName = (name || 'page').replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 25);
          const screenshotPath = path.join(CONFIG.screenshotDir, `v3-${String(pageNum).padStart(2, '0')}-${safeName}.png`);
          
          await page.screenshot({ path: screenshotPath, fullPage: true });
          await saveHtml(page, `v3-${String(pageNum).padStart(2, '0')}-${safeName}.html`);
          
          const pageAnalysis = await analyzePageStructure(page, safeName);
          
          findings.pagesExplored.push({
            name: name,
            url: url,
            screenshot: screenshotPath,
            analysis: pageAnalysis,
          });

          // Track data sources (pages with tables)
          if (pageAnalysis.tables.length > 0) {
            findings.dataSourcesFound.push({
              page: name,
              url: url,
              tableCount: pageAnalysis.tables.length,
              tables: pageAnalysis.tables,
            });
            log(`  -> Found ${pageAnalysis.tables.length} data tables`);
          }

          // Look for additional navigation links on this page
          for (const link of pageAnalysis.links) {
            if (link.isNavigation && !visitedUrls.has(link.href) && !link.href.includes('logout')) {
              pagesToVisit.set(link.href, link.text);
            }
          }

          pageNum++;
        } catch (err) {
          log(`  Error exploring ${name}: ${err.message}`);
          findings.errors.push({ page: name, error: err.message });
        }
      }
      
    } else {
      log('Login may have failed. Capturing current state...');
      await page.screenshot({ path: path.join(CONFIG.screenshotDir, 'v3-login-failed.png'), fullPage: true });
      await saveHtml(page, 'v3-login-failed.html');
      findings.errors.push('Login verification failed - may need new OTP code');
    }

  } catch (error) {
    log(`Crawler error: ${error.message}`);
    findings.errors.push({ general: error.message });
    await page.screenshot({ path: path.join(CONFIG.screenshotDir, 'v3-error.png'), fullPage: true });
  } finally {
    // Generate comprehensive report
    const report = {
      timestamp: new Date().toISOString(),
      ...findings,
      summary: {
        loginSuccess: findings.loginSuccess,
        totalPagesExplored: findings.pagesExplored.length,
        totalDataSources: findings.dataSourcesFound.length,
        totalTablesFound: findings.dataSourcesFound.reduce((sum, ds) => sum + ds.tableCount, 0),
        navigationItems: findings.navigationMenu.length,
        errorCount: findings.errors.length,
      }
    };
    
    fs.writeFileSync(
      path.join(CONFIG.outputDir, 'crawler-v3-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    log('Crawler completed. Closing browser...');
    await browser.close();
    
    return report;
  }
}

// Run
crawlMyWFG()
  .then(report => {
    console.log('\n' + '='.repeat(60));
    console.log('           MYWFG.COM CRAWLER REPORT');
    console.log('='.repeat(60));
    console.log(`Login Success:      ${report.summary.loginSuccess}`);
    console.log(`Pages Explored:     ${report.summary.totalPagesExplored}`);
    console.log(`Data Sources:       ${report.summary.totalDataSources}`);
    console.log(`Tables Found:       ${report.summary.totalTablesFound}`);
    console.log(`Navigation Items:   ${report.summary.navigationItems}`);
    console.log(`Errors:             ${report.summary.errorCount}`);
    console.log('='.repeat(60));
    console.log(`\nFull report: ${CONFIG.outputDir}/crawler-v3-report.json`);
    console.log(`Screenshots: ${CONFIG.screenshotDir}/`);
    console.log('='.repeat(60) + '\n');
  })
  .catch(err => {
    console.error('Crawler failed:', err);
    process.exit(1);
  });

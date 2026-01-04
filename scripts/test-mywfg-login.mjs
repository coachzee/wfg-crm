import { chromium } from 'playwright';

async function testMyWFGLogin(username, password) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('[Test] Navigating to mywfg.com...');
    await page.goto('https://www.mywfg.com/', { waitUntil: 'networkidle', timeout: 45000 });

    console.log('[Test] Page loaded. Looking for login form...');

    // Get all inputs
    const inputs = await page.$$('input');
    console.log(`[Test] Found ${inputs.length} input fields`);

    for (let i = 0; i < inputs.length; i++) {
      const type = await inputs[i].getAttribute('type');
      const id = await inputs[i].getAttribute('id');
      const name = await inputs[i].getAttribute('name');
      const placeholder = await inputs[i].getAttribute('placeholder');
      console.log(`[Test] Input ${i}: type=${type}, id=${id}, name=${name}, placeholder=${placeholder}`);
    }

    // Try to find and fill username
    const usernameInput = await page.$('input[type="text"]') || await page.$('input[name="username"]') || inputs[0];
    if (usernameInput) {
      console.log('[Test] Filling username...');
      await usernameInput.fill(username);
    }

    // Try to find and fill password
    const passwordInput = await page.$('input[type="password"]') || inputs[1];
    if (passwordInput) {
      console.log('[Test] Filling password...');
      await passwordInput.fill(password);
    }

    // Find and click login button
    const buttons = await page.$$('button');
    console.log(`[Test] Found ${buttons.length} buttons`);

    for (let i = 0; i < buttons.length; i++) {
      const text = await buttons[i].textContent();
      console.log(`[Test] Button ${i}: "${text}"`);
    }

    const loginButton = buttons[0];
    if (loginButton) {
      console.log('[Test] Clicking login button...');
      await loginButton.click();

      // Wait for navigation
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
      } catch (e) {
        console.log('[Test] Navigation timeout (continuing anyway)');
      }

      await page.waitForTimeout(3000);
    }

    console.log('[Test] Current URL:', page.url());
    console.log('[Test] Page title:', await page.title());

    // Take screenshot
    await page.screenshot({ path: '/tmp/mywfg-after-login.png' });
    console.log('[Test] Screenshot saved to /tmp/mywfg-after-login.png');

  } catch (error) {
    console.error('[Test] Error:', error.message);
  } finally {
    await browser.close();
  }
}

// Run test
testMyWFGLogin('73DXR', 'Jesulob@1245');

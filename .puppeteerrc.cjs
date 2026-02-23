const { join } = require('path');

/**
 * Puppeteer Configuration
 * 
 * Stores the Chrome binary inside the project directory (.chrome-cache)
 * so it persists across Manus checkpoint restores and deployments.
 * The default ~/.cache/puppeteer location gets cleared on checkpoint restore.
 */
module.exports = {
  cacheDirectory: join(__dirname, '.chrome-cache'),
};

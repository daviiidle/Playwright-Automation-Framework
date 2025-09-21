#!/usr/bin/env node

/**
 * Quick utility to toggle retry modes in Playwright tests
 * Usage: node toggle-retries.js [on|off]
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'playwright.config.ts');
const basePagePath = path.join(__dirname, 'src/pages/BasePage.ts');

function toggleRetries(mode) {
  console.log(`\n🔧 ${mode === 'on' ? 'ENABLING' : 'DISABLING'} retries for ${mode === 'on' ? 'stability' : 'fast feedback'}...\n`);

  // Update playwright.config.ts
  let configContent = fs.readFileSync(configPath, 'utf8');

  if (mode === 'on') {
    // Enable retries
    configContent = configContent.replace(
      /retries: 0, \/\/ Disabled for faster feedback - was: (.+),/,
      'retries: $1,'
    );
    console.log('✅ Playwright config: Enabled test retries');
  } else {
    // Disable retries
    configContent = configContent.replace(
      /retries: (.+),(?!\s*\/\/ Disabled)/,
      'retries: 0, // Disabled for faster feedback - was: $1,'
    );
    console.log('✅ Playwright config: Disabled test retries');
  }

  fs.writeFileSync(configPath, configContent);

  // Update BasePage.ts
  let basePageContent = fs.readFileSync(basePagePath, 'utf8');

  if (mode === 'on') {
    // Enable retries
    basePageContent = basePageContent.replace(
      /retryAttempts: number = 1; \/\/ Disabled retries for faster feedback - was: (\d+)/,
      'retryAttempts: number = $1;'
    );
    console.log('✅ BasePage: Enabled operation retries');
  } else {
    // Disable retries
    basePageContent = basePageContent.replace(
      /retryAttempts: number = (\d+);(?!\s*\/\/ Disabled)/,
      'retryAttempts: number = 1; // Disabled retries for faster feedback - was: $1'
    );
    console.log('✅ BasePage: Disabled operation retries');
  }

  fs.writeFileSync(basePagePath, basePageContent);

  console.log(`\n🎯 Retry mode: ${mode === 'on' ? 'ENABLED' : 'DISABLED'}`);
  console.log(`💡 Run tests with: npm run test`);

  if (mode === 'off') {
    console.log(`⚡ Tests will now fail fast for immediate feedback`);
    console.log(`🔍 Use "npm run errors" to analyze failures`);
  } else {
    console.log(`🛡️  Tests will retry on failures for better stability`);
  }
  console.log('');
}

// Parse command line arguments
const args = process.argv.slice(2);
const mode = args[0];

if (!mode || !['on', 'off'].includes(mode)) {
  console.log(`
🔧 Retry Toggle Utility

Usage: node toggle-retries.js [on|off]

  on   - Enable retries for stability testing
  off  - Disable retries for fast feedback

Examples:
  node toggle-retries.js off    # Fast failure feedback
  node toggle-retries.js on     # Enable retries for stability

Current mode detection:
  Check playwright.config.ts retries value
  Check BasePage.ts retryAttempts value
`);
  process.exit(1);
}

toggleRetries(mode);
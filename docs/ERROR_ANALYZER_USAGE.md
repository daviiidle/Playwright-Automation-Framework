# Enhanced Error Analyzer Usage Guide

## Overview

The enhanced error analyzer now captures both **strict mode violations** and **assertion failures** with detailed analysis and actionable suggestions.

## Available Commands

```bash
# General error analysis
npx ts-node src/utils/ErrorAnalyzer.ts latest

# Strict mode violations analysis
npx ts-node src/utils/ErrorAnalyzer.ts strict

# Assertion failure analysis
npx ts-node src/utils/ErrorAnalyzer.ts assertions

# Error handler report
npx ts-node src/utils/ErrorAnalyzer.ts handler

# Historical trends
npx ts-node src/utils/ErrorAnalyzer.ts history

# Help
npx ts-node src/utils/ErrorAnalyzer.ts help
```

## Capturing Assertion Failures

### Method 1: Using TestAssertions Wrapper (Recommended)

```typescript
import { testAssert } from '../src/utils';

// In your test file
test('should show correct error message', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  // Use wrapper to capture assertion failures
  const errorMessage = await loginPage.getErrorMessage();
  await testAssert.expectToContain(
    page,
    'should show correct error message',
    errorMessage,
    'Please enter your email',
    'Error message should mention email requirement'
  );
});
```

### Method 2: Using Manual Capture

```typescript
import { TestHooks } from '../src/utils';

test('manual assertion capture', async ({ page }) => {
  try {
    const actualValue = await page.textContent('.error');
    expect(actualValue).toContain('Expected text');
  } catch (error) {
    await TestHooks.captureAssertionFailure(
      page,
      'manual assertion capture',
      error as Error,
      {
        expectedValue: 'Expected text',
        actualValue,
        operation: 'toContain',
        description: 'Error message validation'
      }
    );
    throw error; // Re-throw to fail the test
  }
});
```

### Method 3: Automatic Global Hooks

```typescript
// In playwright.config.ts or global setup
import { setupTestHooks } from './src/utils';

// This will automatically capture all test failures
setupTestHooks();
```

## Error Analysis Features

### Strict Mode Violations
- **Automatic detection** of multiple element matches
- **Detailed element information** showing what was found
- **Specific suggestions** for fixes (use `.first()`, improve selectors)
- **Recovery tracking** - logs when violations are automatically handled

### Assertion Failures
- **Expected vs actual values** comparison
- **Operation type** analysis (toContain, toBe, toBeVisible, etc.)
- **Specific suggestions** based on assertion type
- **Context capture** with screenshots and page state

## Example Analysis Output

### Strict Mode Analysis
```
🎯 STRICT MODE VIOLATIONS ANALYSIS
==================================================
❌ Found 8 strict mode violations:

1. Selector: div.message-error
   Occurrences: 4
   Elements found: 2
   Suggested fix: Use .first() or make the selector more specific to target only one element
   Found elements:
     1) <div class="message-error">…</div>
     2) <div class="validation-summary-errors">…</div>
   Test contexts:
     - isVisible (strict mode violation) on https://demowebshop.tricentis.com/login
     - getText (strict mode violation) on https://demowebshop.tricentis.com/login
```

### Assertion Analysis
```
⚡ ASSERTION FAILURE ANALYSIS
==================================================
❌ Found 3 assertion failures:

1. Operation: toContain
   Occurrences: 2
   Suggested fix: Check if the actual text contains the expected substring
   Common failures:
     - Expected: "Please enter your email"
       Actual: "Login was unsuccessful. Please correct the errors..."
       Test: should show error for empty email field
```

## Error Log Locations

- **Latest errors**: `test-results/error-logs/latest-handler-errors.json`
- **Daily logs**: `test-results/error-logs/error-handler-YYYY-MM-DD.log`
- **Session summaries**: `test-results/error-logs/session-summary-[sessionId].txt`
- **Screenshots**: `test-results/error-screenshots/`

## Key Benefits

✅ **Automatic Recovery** - Strict mode violations are automatically handled with `.first()`
✅ **Detailed Analysis** - Rich context about what went wrong and how to fix it
✅ **Pattern Detection** - Identifies recurring issues across test runs
✅ **Actionable Suggestions** - Specific guidance for each error type
✅ **Historical Tracking** - Track improvements over time

## Best Practices

1. **Use the enhanced TestAssertions** for better error capture
2. **Run analysis after test suites** to identify patterns
3. **Fix strict mode violations** by improving selector specificity
4. **Review assertion failures** to improve test reliability
5. **Use the debugging suggestions** provided in error reports
import { Page, Locator, expect } from '@playwright/test';
import { ErrorHandler, LogLevel } from '../utils/ErrorHandler';

export abstract class BasePage {
  protected page: Page;
  protected url: string;
  protected defaultTimeout: number = 15000;
  protected retryAttempts: number = 1; // Disabled retries for faster feedback - was: 3
  protected errorHandler: ErrorHandler;

  constructor(page: Page, url: string = '') {
    this.page = page;
    this.url = url;
    this.errorHandler = ErrorHandler.getInstance();
  }

  async goto(): Promise<void> {
    await this.retryOperation(async () => {
      await this.page.goto(this.url, { waitUntil: 'networkidle', timeout: this.defaultTimeout });
    }, 'goto');
  }

  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }

  async clickElement(locator: Locator): Promise<void> {
    await this.retryOperation(async () => {
      await locator.waitFor({ state: 'visible', timeout: this.defaultTimeout });
      await locator.click();
    }, 'click');
  }

  async fillInput(locator: Locator, text: string): Promise<void> {
    await this.retryOperation(async () => {
      await locator.waitFor({ state: 'visible', timeout: this.defaultTimeout });
      await locator.clear();
      await locator.fill(text);

      // Verify the text was filled correctly
      const actualValue = await locator.inputValue();
      if (actualValue !== text) {
        throw new Error(`Fill operation failed. Expected: "${text}", Got: "${actualValue}"`);
      }
    }, 'fill');
  }

  async selectOption(locator: Locator, value: string): Promise<void> {
    await locator.selectOption(value);
  }

  async waitForElement(locator: Locator, timeout: number = 10000): Promise<void> {
    await locator.waitFor({ timeout });
  }

  async isElementVisible(locator: Locator): Promise<boolean> {
    return await locator.isVisible();
  }

  async getElementText(locator: Locator): Promise<string> {
    return await locator.textContent() || '';
  }

  async scrollToElement(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
  }

  async hoverElement(locator: Locator): Promise<void> {
    await locator.hover();
  }

  async doubleClickElement(locator: Locator): Promise<void> {
    await locator.dblclick();
  }

  async rightClickElement(locator: Locator): Promise<void> {
    await locator.click({ button: 'right' });
  }

  async dragAndDrop(source: Locator, target: Locator): Promise<void> {
    await source.dragTo(target);
  }

  async uploadFile(locator: Locator, filePath: string): Promise<void> {
    await locator.setInputFiles(filePath);
  }

  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  async typeText(text: string): Promise<void> {
    await this.page.keyboard.type(text);
  }

  async refreshPage(): Promise<void> {
    await this.page.reload();
  }

  async goBack(): Promise<void> {
    await this.page.goBack();
  }

  async goForward(): Promise<void> {
    await this.page.goForward();
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  async acceptAlert(): Promise<void> {
    this.page.on('dialog', dialog => dialog.accept());
  }

  async dismissAlert(): Promise<void> {
    this.page.on('dialog', dialog => dialog.dismiss());
  }

  async waitForTimeout(timeout: number): Promise<void> {
    await this.page.waitForTimeout(timeout);
  }

  // Enhanced retry operation with intelligent error handling (retries disabled for faster feedback)
  protected async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries?: number
  ): Promise<T> {
    // Fast execution mode - single attempt only
    try {
      return await operation();
    } catch (error) {
      const lastError = error as Error;

      // Log the error but don't retry
      this.errorHandler.log(LogLevel.ERROR, `${operationName} failed on first attempt`, { error: lastError.message });

      // Handle error with error handler for logging
      await this.errorHandler.handleError(lastError, this.page, operationName);

      // Throw with simpler message since no retries
      throw new Error(`${operationName} failed: ${lastError.message}`);
    }
  }

  // Original retry operation (commented out - can be restored when needed)
  /*
  protected async retryOperationWithRetries<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries?: number
  ): Promise<T> {
    const attempts = maxRetries || this.retryAttempts;
    let lastError: Error;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        this.errorHandler.log(LogLevel.WARN, `${operationName} attempt ${attempt}/${attempts} failed`, { error: error.message });

        if (attempt === attempts) {
          await this.errorHandler.handleError(lastError, this.page, operationName);
          throw new Error(`${operationName} failed after ${attempts} attempts. Last error: ${lastError.message}`);
        }

        await this.page.waitForTimeout(500 * attempt);

        if (lastError.message.includes('Navigation timeout') || lastError.message.includes('net::ERR')) {
          await this.page.waitForTimeout(2000);
        }

        if (lastError.message.includes('detached') || lastError.message.includes('not connected')) {
          await this.page.waitForTimeout(1000);
        }
      }
    }

    throw lastError!;
  }
  */

  // Enhanced wait for element with intelligent retry and strict mode handling
  async waitForElementSafe(locator: Locator, timeout?: number): Promise<void> {
    await this.retryOperation(async () => {
      // For .or() locators, let Playwright handle the resolution
      // Only check for strict mode violations on simple locators
      try {
        await locator.waitFor({
          state: 'visible',
          timeout: timeout || this.defaultTimeout
        });
      } catch (error) {
        const errorMessage = (error as Error).message;

        // If it's a strict mode violation, provide helpful guidance with additional context
        if (errorMessage.includes('strict mode violation')) {
          const enhancedMessage = this.enhanceStrictModeErrorMessage(errorMessage);
          throw new Error(enhancedMessage);
        }

        // Otherwise, re-throw the original error
        throw error;
      }
    }, 'waitForElement');
  }

  // Safe element interaction with automatic retry
  async safeClick(locator: Locator): Promise<void> {
    await this.retryOperation(async () => {
      await this.waitForElementSafe(locator);
      await locator.click();
      // Wait a bit to ensure click is processed
      await this.page.waitForTimeout(100);
    }, 'safeClick');
  }

  // Safe text input with verification
  async safeFill(locator: Locator, text: string): Promise<void> {
    await this.retryOperation(async () => {
      await this.waitForElementSafe(locator);
      await locator.clear();
      await locator.fill(text);

      // Verify the text was entered correctly
      const actualValue = await locator.inputValue();
      if (actualValue !== text) {
        throw new Error(`Text verification failed. Expected: "${text}", Got: "${actualValue}"`);
      }
    }, 'safeFill');
  }

  // Enhanced error logging and debugging
  protected logError(operationName: string, error: Error, context?: any): void {
    console.error(`Operation ${operationName} failed:`, {
      message: error.message,
      stack: error.stack,
      context,
      url: this.page.url(),
      timestamp: new Date().toISOString()
    });
  }

  // Network stability check
  async waitForNetworkStability(timeout: number = 5000): Promise<void> {
    try {
      await this.page.waitForLoadState('networkidle', { timeout });
    } catch (error) {
      console.log('Network stability timeout, continuing...');
    }
  }

  // Utility method to handle strict mode violations by using first element
  async safeLocatorOperation<T>(
    locator: Locator,
    operation: (safeLocator: Locator) => Promise<T>,
    operationName: string
  ): Promise<T> {
    return await this.retryOperation(async () => {
      try {
        // First try the operation directly - let Playwright handle .or() locators
        return await operation(locator);
      } catch (error) {
        const errorMessage = (error as Error).message;

        // Only handle actual strict mode violations from Playwright
        if (errorMessage.includes('strict mode violation')) {
          // Log the strict mode violation and use first element
          this.errorHandler.log(LogLevel.WARN,
            `Strict mode violation detected for ${operationName}, using first element`,
            { error: errorMessage }
          );

          // Also log this to the error handler system for tracking
          await this.errorHandler.handleError(
            new Error(`Strict mode violation (recovered): ${errorMessage}`),
            this.page,
            `${operationName} (strict mode violation)`,
            {
              operation: operationName,
              recovered: true,
              solution: 'Used .first() element'
            }
          );

          return await operation(locator.first());
        }

        // For other errors, re-throw as-is
        throw error;
      }
    }, `safe locator operation: ${operationName}`);
  }

  // Enhanced safe click that handles multiple elements
  async strictSafeClick(locator: Locator): Promise<void> {
    await this.safeLocatorOperation(locator, async (safeLocator) => {
      await safeLocator.waitFor({ state: 'visible', timeout: this.defaultTimeout });
      await safeLocator.click();
      await this.page.waitForTimeout(100);
    }, 'click');
  }

  // Enhanced safe fill that handles multiple elements
  async strictSafeFill(locator: Locator, text: string): Promise<void> {
    await this.safeLocatorOperation(locator, async (safeLocator) => {
      await safeLocator.waitFor({ state: 'visible', timeout: this.defaultTimeout });
      await safeLocator.clear();
      await safeLocator.fill(text);

      // Verify the text was entered correctly
      const actualValue = await safeLocator.inputValue();
      if (actualValue !== text) {
        throw new Error(`Text verification failed. Expected: "${text}", Got: "${actualValue}"`);
      }
    }, 'fill');
  }

  // Enhanced safe visibility check that handles multiple elements
  async strictIsVisible(locator: Locator): Promise<boolean> {
    return await this.safeLocatorOperation(locator, async (safeLocator) => {
      return await safeLocator.isVisible();
    }, 'isVisible');
  }

  // Enhanced safe text content that handles multiple elements
  async strictGetText(locator: Locator): Promise<string> {
    return await this.safeLocatorOperation(locator, async (safeLocator) => {
      return await safeLocator.textContent() || '';
    }, 'getText');
  }

  // Enhanced safe input value that handles multiple elements
  async strictGetInputValue(locator: Locator): Promise<string> {
    return await this.safeLocatorOperation(locator, async (safeLocator) => {
      return await safeLocator.inputValue();
    }, 'getInputValue');
  }

  // Enhanced safe isChecked that handles multiple elements
  async strictIsChecked(locator: Locator): Promise<boolean> {
    return await this.safeLocatorOperation(locator, async (safeLocator) => {
      return await safeLocator.isChecked();
    }, 'isChecked');
  }

  // Helper method to enhance strict mode error messages with actionable guidance
  private enhanceStrictModeErrorMessage(originalMessage: string): string {
    const elementsFoundMatch = originalMessage.match(/resolved to (\d+) elements/);
    const elementCount = elementsFoundMatch ? parseInt(elementsFoundMatch[1]) : 0;

    let guidance = 'Strict mode violation detected. ';

    if (elementCount === 2) {
      guidance += 'Found 2 matching elements. ';
      guidance += 'Quick fix: Add .first() to select the first element, or use a more specific selector.';
    } else if (elementCount > 2) {
      guidance += `Found ${elementCount} matching elements. `;
      guidance += 'Recommendation: Use a more specific selector (ID, unique class, or attribute) to target exactly one element.';
    } else {
      guidance += 'Multiple elements found. ';
      guidance += 'Use .first() or create a more specific selector.';
    }

    guidance += '\n\nDebugging tips:';
    guidance += '\n- Use browser dev tools to inspect the elements';
    guidance += '\n- Add .first() as a quick fix: locator(\'selector\').first()';
    guidance += '\n- Make selector more specific: locator(\'#unique-id\') or locator(\'.parent .specific-child\')';
    guidance += '\n- Use role-based selectors: getByRole(\'button\', { name: \'exact text\' })';

    guidance += '\n\nOriginal error: ' + originalMessage;

    return guidance;
  }
}
import { Page, test as baseTest } from '@playwright/test';
import { UserManager } from './UserManager';
import { ErrorHandler } from './ErrorHandler';

export class TestIsolation {
  private static testCounter = 0;
  private static activeTests = new Set<string>();

  static generateTestId(): string {
    this.testCounter++;
    return `test_${Date.now()}_${this.testCounter}`;
  }

  static async beforeTest(page: Page, testName: string): Promise<string> {
    const testId = this.generateTestId();
    this.activeTests.add(testId);

    console.log(`[TEST] Starting test: ${testName} (${testId})`);

    try {
      // Clear all browser data for clean state
      await this.clearBrowserState(page);

      // Ensure user is logged out
      await UserManager.ensureUserLoggedOut(page);

      // Wait for page to be ready
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      console.log(`[OK] Test setup complete: ${testName}`);

    } catch (error) {
      console.error(`[ERROR] Test setup failed: ${testName}`, error);
      await ErrorHandler.getInstance().handleError(error as Error, page, testName);
      throw error;
    }

    return testId;
  }

  static async afterTest(page: Page, testName: string, testId: string): Promise<void> {
    console.log(`[CLEANUP] Cleaning up test: ${testName} (${testId})`);

    try {
      // Clear user session
      await UserManager.ensureUserLoggedOut(page);

      // Clear browser state
      await this.clearBrowserState(page);

      // Generate error report if there were errors
      const errorHandler = ErrorHandler.getInstance();
      const errors = errorHandler.getErrors();
      if (errors.length > 0) {
        console.log(errorHandler.generateErrorReport());
        errorHandler.clearErrors();
      }

      this.activeTests.delete(testId);
      console.log(`[OK] Test cleanup complete: ${testName}`);

    } catch (error) {
      console.error(`[ERROR] Test cleanup failed: ${testName}`, error);
    }
  }

  static async clearBrowserState(page: Page): Promise<void> {
    try {
      // Clear cookies
      await page.context().clearCookies();

      // Clear local storage and session storage
      await page.evaluate(() => {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (e) {
          console.warn('Failed to clear storage:', e);
        }
      });

      // Clear any cached data
      await page.evaluate(() => {
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => {
              caches.delete(name);
            });
          });
        }
      });

    } catch (error) {
      console.warn('Failed to clear browser state:', error);
    }
  }

  static async onTestFailure(page: Page, testName: string, error: Error): Promise<void> {
    console.error(`[FAIL] Test failure: ${testName}`);

    try {
      // Capture failure context
      const errorHandler = ErrorHandler.getInstance();
      await errorHandler.handleError(error, page, testName, {
        activeTests: Array.from(this.activeTests),
        timestamp: new Date().toISOString()
      });

      // Additional debug info
      console.log('[DEBUG] Debug info:', {
        url: page.url(),
        title: await page.title().catch(() => 'Unable to get title'),
        activeTests: Array.from(this.activeTests)
      });

    } catch (debugError) {
      console.error('Failed to capture failure context:', debugError);
    }
  }

  static getActiveTests(): string[] {
    return Array.from(this.activeTests);
  }

  static async waitForStableState(page: Page, timeout: number = 5000): Promise<void> {
    try {
      await page.waitForLoadState('networkidle', { timeout });
      await page.waitForTimeout(500); // Additional stability wait
    } catch (error) {
      console.warn('Page did not reach stable state within timeout');
    }
  }

  static async retryOnFailure<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.log(`Retry attempt ${attempt}/${maxRetries} failed:`, error);

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }

    throw lastError!;
  }
}
import { test, type Page } from '@playwright/test';
import { ErrorHandler } from './ErrorHandler';

/**
 * Test hooks for capturing failures and errors automatically
 */
export class TestHooks {
  private static errorHandler = ErrorHandler.getInstance();

  /**
   * Setup test hooks to capture failures automatically
   * Call this in your test setup (e.g., in playwright.config.ts or test files)
   */
  static setupGlobalHooks(): void {
    // Hook into test failures
    test.afterEach(async ({ page }, testInfo) => {
      // Only capture if test failed
      if (testInfo.status === 'failed') {
        const error = testInfo.errors?.[0];
        if (error) {
          await this.errorHandler.handleError(
            error,
            page,
            testInfo.title,
            {
              testFile: testInfo.file,
              testProject: testInfo.project.name,
              testDuration: testInfo.duration,
              testRetry: testInfo.retry,
              isTestFailure: true
            }
          );
        }
      }
    });
  }

  /**
   * Manual hook for capturing assertion failures in specific tests
   */
  static async captureAssertionFailure(
    page: Page,
    testName: string,
    error: Error,
    context?: {
      expectedValue?: any;
      actualValue?: any;
      operation?: string;
      description?: string;
    }
  ): Promise<void> {
    await this.errorHandler.handleError(
      error,
      page,
      testName,
      {
        ...context,
        isAssertionFailure: true,
        captureMethod: 'manual'
      }
    );
  }
}

// Export convenience function
export const setupTestHooks = TestHooks.setupGlobalHooks;
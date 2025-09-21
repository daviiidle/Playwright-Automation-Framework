import { expect, type Page } from '@playwright/test';
import { ErrorHandler } from './ErrorHandler';

export class TestAssertions {
  private static errorHandler = ErrorHandler.getInstance();

  /**
   * Enhanced expect wrapper that captures assertion failures
   */
  static async expectWithCapture(
    page: Page,
    testName: string,
    assertion: () => Promise<void> | void,
    context?: {
      description?: string;
      actualValue?: any;
      expectedValue?: any;
      operation?: string;
    }
  ): Promise<void> {
    try {
      await assertion();
    } catch (error) {
      // Capture the assertion failure
      await this.errorHandler.handleError(
        error as Error,
        page,
        testName,
        {
          assertionType: 'expect',
          description: context?.description,
          actualValue: context?.actualValue,
          expectedValue: context?.expectedValue,
          operation: context?.operation,
          isAssertionFailure: true
        }
      );

      // Re-throw the error so the test still fails
      throw error;
    }
  }

  /**
   * Wrapper for common string contains assertion
   */
  static async expectToContain(
    page: Page,
    testName: string,
    actualValue: string,
    expectedSubstring: string,
    description?: string
  ): Promise<void> {
    await this.expectWithCapture(
      page,
      testName,
      () => expect(actualValue).toContain(expectedSubstring),
      {
        description: description || `Expected "${actualValue}" to contain "${expectedSubstring}"`,
        actualValue,
        expectedValue: expectedSubstring,
        operation: 'toContain'
      }
    );
  }

  /**
   * Wrapper for common equality assertion
   */
  static async expectToBe(
    page: Page,
    testName: string,
    actualValue: any,
    expectedValue: any,
    description?: string
  ): Promise<void> {
    await this.expectWithCapture(
      page,
      testName,
      () => expect(actualValue).toBe(expectedValue),
      {
        description: description || `Expected "${actualValue}" to be "${expectedValue}"`,
        actualValue,
        expectedValue,
        operation: 'toBe'
      }
    );
  }

  /**
   * Wrapper for visibility assertions
   */
  static async expectToBeVisible(
    page: Page,
    testName: string,
    locator: any,
    description?: string
  ): Promise<void> {
    await this.expectWithCapture(
      page,
      testName,
      () => expect(locator).toBeVisible(),
      {
        description: description || 'Expected element to be visible',
        operation: 'toBeVisible'
      }
    );
  }

  /**
   * Wrapper for text content assertions
   */
  static async expectToHaveText(
    page: Page,
    testName: string,
    locator: any,
    expectedText: string,
    description?: string
  ): Promise<void> {
    await this.expectWithCapture(
      page,
      testName,
      () => expect(locator).toHaveText(expectedText),
      {
        description: description || `Expected element to have text "${expectedText}"`,
        expectedValue: expectedText,
        operation: 'toHaveText'
      }
    );
  }

  /**
   * Wrapper for URL assertions
   */
  static async expectToHaveURL(
    page: Page,
    testName: string,
    expectedUrl: string | RegExp,
    description?: string
  ): Promise<void> {
    await this.expectWithCapture(
      page,
      testName,
      () => expect(page).toHaveURL(expectedUrl),
      {
        description: description || `Expected page URL to match "${expectedUrl}"`,
        expectedValue: expectedUrl,
        operation: 'toHaveURL'
      }
    );
  }

  /**
   * Wrapper for count assertions
   */
  static async expectToHaveCount(
    page: Page,
    testName: string,
    locator: any,
    expectedCount: number,
    description?: string
  ): Promise<void> {
    await this.expectWithCapture(
      page,
      testName,
      () => expect(locator).toHaveCount(expectedCount),
      {
        description: description || `Expected to find ${expectedCount} elements`,
        expectedValue: expectedCount,
        operation: 'toHaveCount'
      }
    );
  }

  /**
   * Generic wrapper for any expect call
   */
  static async expectGeneric(
    page: Page,
    testName: string,
    expectCall: () => Promise<void> | void,
    description: string,
    context?: Record<string, any>
  ): Promise<void> {
    await this.expectWithCapture(
      page,
      testName,
      expectCall,
      {
        description,
        ...context
      }
    );
  }
}

export { TestAssertions as testAssert };
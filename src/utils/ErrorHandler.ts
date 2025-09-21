import { Page } from '@playwright/test';
import { writeFileSync, appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

export enum ErrorType {
  SELECTOR_NOT_FOUND = 'SELECTOR_NOT_FOUND',
  STRICT_MODE_VIOLATION = 'STRICT_MODE_VIOLATION',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  AUTHENTICATION_FAILURE = 'AUTHENTICATION_FAILURE',
  ELEMENT_NOT_INTERACTIVE = 'ELEMENT_NOT_INTERACTIVE',
  NAVIGATION_TIMEOUT = 'NAVIGATION_TIMEOUT',
  ASSERTION_FAILURE = 'ASSERTION_FAILURE',
  UNKNOWN = 'UNKNOWN'
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL'
}

export interface ErrorContext {
  url: string;
  timestamp: string;
  testName?: string;
  screenshotPath?: string;
  additionalInfo?: Record<string, any>;
  strictModeDetails?: StrictModeViolationDetails;
  assertionDetails?: AssertionFailureDetails;
}

export interface StrictModeViolationDetails {
  elementsFound: number;
  elementsExpected: number;
  selector: string;
  foundElements: string[];
  suggestedFix: string;
}

export interface AssertionFailureDetails {
  assertionType: string;
  operation: string;
  expectedValue: any;
  actualValue: any;
  description: string;
  suggestedFix: string;
}

export interface TestError {
  type: ErrorType;
  message: string;
  context: ErrorContext;
  recoveryAttempted: boolean;
  recoverySuccessful: boolean;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private logLevel: LogLevel = LogLevel.INFO;
  private errors: TestError[] = [];
  private errorLogDir: string = 'test-results/error-logs';
  private sessionId: string;

  private constructor() {
    // Private constructor for singleton
    this.sessionId = this.generateSessionId();
    this.ensureErrorLogDirectory();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  async handleError(
    error: Error,
    page: Page,
    testName?: string,
    additionalInfo?: Record<string, any>
  ): Promise<TestError> {
    const errorType = this.categorizeError(error);
    const context = await this.captureContext(page, testName, additionalInfo);

    // Add strict mode violation details if applicable
    if (errorType === ErrorType.STRICT_MODE_VIOLATION) {
      context.strictModeDetails = this.extractStrictModeDetails(error.message);
    }

    // Add assertion failure details if applicable
    if (errorType === ErrorType.ASSERTION_FAILURE && additionalInfo?.isAssertionFailure) {
      context.assertionDetails = this.extractAssertionFailureDetails(error.message, additionalInfo);
    }

    const testError: TestError = {
      type: errorType,
      message: error.message,
      context,
      recoveryAttempted: false,
      recoverySuccessful: false
    };

    // Capture screenshot on error
    try {
      const screenshotPath = await this.captureScreenshot(page, testName);
      testError.context.screenshotPath = screenshotPath;
    } catch (screenshotError) {
      this.log(LogLevel.WARN, 'Failed to capture screenshot', { error: screenshotError });
    }

    this.errors.push(testError);
    this.log(LogLevel.ERROR, `Test error occurred: ${error.message}`, testError);

    // Write error to dedicated error log file
    this.writeErrorToLog(testError);

    return testError;
  }

  private categorizeError(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    // Check for strict mode violations first (most specific)
    if (message.includes('strict mode violation') || message.includes('resolved to') && message.includes('elements')) {
      return ErrorType.STRICT_MODE_VIOLATION;
    }
    if (message.includes('locator') || message.includes('selector') || message.includes('not found')) {
      return ErrorType.SELECTOR_NOT_FOUND;
    }
    if (message.includes('timeout') && message.includes('navigation')) {
      return ErrorType.NAVIGATION_TIMEOUT;
    }
    if (message.includes('timeout') || message.includes('network')) {
      return ErrorType.NETWORK_TIMEOUT;
    }
    if (message.includes('login') || message.includes('authentication') || message.includes('credential')) {
      return ErrorType.AUTHENTICATION_FAILURE;
    }
    if (message.includes('not clickable') || message.includes('not visible') || message.includes('detached')) {
      return ErrorType.ELEMENT_NOT_INTERACTIVE;
    }
    if (message.includes('expect') || message.includes('assertion')) {
      return ErrorType.ASSERTION_FAILURE;
    }

    return ErrorType.UNKNOWN;
  }

  private extractStrictModeDetails(errorMessage: string): StrictModeViolationDetails {
    // Extract information from Playwright strict mode error messages
    const elementsFoundMatch = errorMessage.match(/resolved to (\d+) elements:/);
    const selectorMatch = errorMessage.match(/locator\('([^']+)'\)|locator\(([^)]+)\)/);

    const elementsFound = elementsFoundMatch ? parseInt(elementsFoundMatch[1]) : 0;
    const selector = selectorMatch ? (selectorMatch[1] || selectorMatch[2]) : 'unknown';

    // Extract the found elements descriptions
    const foundElements: string[] = [];
    const elementLines = errorMessage.split('\n').filter(line => line.trim().match(/^\d+\)/));
    elementLines.forEach(line => {
      const match = line.match(/\d+\)\s+(.+?)(?:\s+aka\s+(.+))?$/);
      if (match) {
        foundElements.push(match[1].trim());
      }
    });

    // Generate suggested fix based on the pattern
    let suggestedFix = 'Use .first() to select the first matching element';
    if (selector.includes('.or(')) {
      suggestedFix = 'Make selectors more specific or use .first() on the fallback selectors';
    } else if (elementsFound === 2) {
      suggestedFix = 'Use .first() or make the selector more specific to target only one element';
    } else if (elementsFound > 2) {
      suggestedFix = 'Use .first() or create a more specific selector to target the intended element';
    }

    return {
      elementsFound,
      elementsExpected: 1,
      selector,
      foundElements,
      suggestedFix
    };
  }

  private extractAssertionFailureDetails(errorMessage: string, additionalInfo: Record<string, any>): AssertionFailureDetails {
    const operation = additionalInfo.operation || 'unknown';
    const actualValue = additionalInfo.actualValue;
    const expectedValue = additionalInfo.expectedValue;
    const description = additionalInfo.description || errorMessage;

    // Generate specific suggestions based on the assertion type
    let suggestedFix = 'Review the expected vs actual values and adjust test expectations or application logic';

    if (operation === 'toContain') {
      suggestedFix = `Check if the actual text contains the expected substring. Consider using partial matches or updating expected text.`;
    } else if (operation === 'toBe') {
      suggestedFix = `Verify exact value match. Consider if values need normalization (trimming, case conversion, etc.)`;
    } else if (operation === 'toBeVisible') {
      suggestedFix = `Check if element is present and visible. Verify selector accuracy and wait conditions.`;
    } else if (operation === 'toHaveText') {
      suggestedFix = `Compare expected vs actual text content. Check for whitespace, formatting, or dynamic content issues.`;
    } else if (operation === 'toHaveURL') {
      suggestedFix = `Verify navigation worked correctly. Check for redirects, query parameters, or timing issues.`;
    } else if (operation === 'toHaveCount') {
      suggestedFix = `Check if the correct number of elements are present. Verify selector matches and element loading.`;
    }

    return {
      assertionType: 'expect',
      operation,
      expectedValue,
      actualValue,
      description,
      suggestedFix
    };
  }

  private async captureContext(
    page: Page,
    testName?: string,
    additionalInfo?: Record<string, any>
  ): Promise<ErrorContext> {
    return {
      url: page.url(),
      timestamp: new Date().toISOString(),
      testName,
      additionalInfo
    };
  }

  private async captureScreenshot(page: Page, testName?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `error-${testName || 'unknown'}-${timestamp}.png`;
    const filePath = `test-results/error-screenshots/${fileName}`;

    try {
      await page.screenshot({
        path: filePath,
        fullPage: true,
        type: 'png'
      });
      return filePath;
    } catch (error) {
      console.warn('Failed to capture screenshot:', error);
      return '';
    }
  }

  log(level: LogLevel, message: string, context?: any): void {
    if (this.shouldLog(level)) {
      console.log(`[${level}] ${message}`, context || '');
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  generateErrorReport(): string {
    const errorCounts = this.errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<ErrorType, number>);

    return `
=== ERROR REPORT ===
Total Errors: ${this.errors.length}
Error Types:
${Object.entries(errorCounts).map(([type, count]) => `  ${type}: ${count}`).join('\n')}

Recent Errors:
${this.errors.slice(-5).map(error => `  ${error.type}: ${error.message}`).join('\n')}
==================
`;
  }

  clearErrors(): void {
    this.errors = [];
  }

  getErrors(): TestError[] {
    return [...this.errors];
  }

  // New methods for enhanced error logging

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private ensureErrorLogDirectory(): void {
    if (!existsSync(this.errorLogDir)) {
      mkdirSync(this.errorLogDir, { recursive: true });
    }
  }

  private writeErrorToLog(testError: TestError): void {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const errorLogFile = join(this.errorLogDir, `error-handler-${timestamp}.log`);

      const errorEntry = {
        timestamp: testError.context.timestamp,
        sessionId: this.sessionId,
        testName: testError.context.testName || 'unknown',
        errorType: testError.type,
        message: testError.message,
        url: testError.context.url,
        screenshotPath: testError.context.screenshotPath,
        additionalInfo: testError.context.additionalInfo,
        strictModeDetails: testError.context.strictModeDetails,
        assertionDetails: testError.context.assertionDetails,
        recoveryAttempted: testError.recoveryAttempted,
        recoverySuccessful: testError.recoverySuccessful
      };

      // Write structured JSON log entry
      appendFileSync(errorLogFile, JSON.stringify(errorEntry) + '\n');

      // Also write to latest errors file for easy access
      const latestErrorsFile = join(this.errorLogDir, 'latest-handler-errors.json');
      const currentErrors = this.loadLatestErrors();
      currentErrors.push(errorEntry);

      // Keep only last 100 errors in latest file
      if (currentErrors.length > 100) {
        currentErrors.splice(0, currentErrors.length - 100);
      }

      writeFileSync(latestErrorsFile, JSON.stringify(currentErrors, null, 2));

    } catch (writeError) {
      console.warn('Failed to write error to log file:', writeError);
    }
  }

  private loadLatestErrors(): any[] {
    const latestErrorsFile = join(this.errorLogDir, 'latest-handler-errors.json');

    if (!existsSync(latestErrorsFile)) {
      return [];
    }

    try {
      const content = readFileSync(latestErrorsFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('Failed to read latest errors file:', error);
      return [];
    }
  }

  /**
   * Generate a detailed error summary with debugging information
   */
  generateDetailedErrorReport(): string {
    if (this.errors.length === 0) {
      return '✅ No errors recorded in this session!';
    }

    const errorCounts = this.errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<ErrorType, number>);

    const urlCounts = this.errors.reduce((acc, error) => {
      const url = error.context.url;
      acc[url] = (acc[url] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let report = '';
    report += '='.repeat(80) + '\n';
    report += '                    DETAILED ERROR HANDLER REPORT\n';
    report += '='.repeat(80) + '\n';
    report += `Session ID: ${this.sessionId}\n`;
    report += `Total Errors: ${this.errors.length}\n`;
    report += `Time Period: ${this.errors[0]?.context.timestamp} to ${this.errors[this.errors.length - 1]?.context.timestamp}\n\n`;

    report += '📊 ERROR TYPES:\n';
    report += '-'.repeat(40) + '\n';
    Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        const percentage = ((count / this.errors.length) * 100).toFixed(1);
        report += `${type}: ${count} (${percentage}%)\n`;
      });

    report += '\n🌐 PAGES WITH ERRORS:\n';
    report += '-'.repeat(40) + '\n';
    Object.entries(urlCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([url, count]) => {
        report += `${url}: ${count} errors\n`;
      });

    report += '\n💥 RECENT ERRORS:\n';
    report += '-'.repeat(40) + '\n';
    this.errors.slice(-10).forEach((error, index) => {
      report += `\n${index + 1}. ${error.context.testName || 'Unknown Test'}\n`;
      report += `   Type: ${error.type}\n`;
      report += `   Message: ${error.message}\n`;
      report += `   URL: ${error.context.url}\n`;
      report += `   Time: ${error.context.timestamp}\n`;
      if (error.context.screenshotPath) {
        report += `   Screenshot: ${error.context.screenshotPath}\n`;
      }
    });

    report += '\n' + '='.repeat(80) + '\n';
    report += `Error logs directory: ${this.errorLogDir}\n`;
    report += '='.repeat(80) + '\n';

    return report;
  }

  /**
   * Get debugging suggestions based on error patterns
   */
  getDebuggingSuggestions(): string[] {
    const suggestions: string[] = [];
    const errorCounts = this.errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<ErrorType, number>);

    if (errorCounts[ErrorType.STRICT_MODE_VIOLATION] > 0) {
      suggestions.push('🎯 Fix strict mode violations by adding .first() to selectors that match multiple elements');
      suggestions.push('🔧 Make selectors more specific to target unique elements');
      suggestions.push('📖 Review error details for specific selector suggestions');
      suggestions.push('🛠️ Consider using unique IDs or more specific CSS selectors');
    }

    if (errorCounts[ErrorType.SELECTOR_NOT_FOUND] > 0) {
      suggestions.push('🔍 Use Playwright Inspector: npx playwright test --debug');
      suggestions.push('📝 Check if selectors are correct and elements exist');
      suggestions.push('⏱️ Add explicit waits before element interactions');
    }

    if (errorCounts[ErrorType.NETWORK_TIMEOUT] > 0 || errorCounts[ErrorType.NAVIGATION_TIMEOUT] > 0) {
      suggestions.push('⏰ Increase timeout values in playwright.config.ts');
      suggestions.push('🌐 Check network conditions and server response times');
      suggestions.push('🔄 Use waitForLoadState() before interactions');
    }

    if (errorCounts[ErrorType.AUTHENTICATION_FAILURE] > 0) {
      suggestions.push('🔐 Verify login credentials and authentication flow');
      suggestions.push('🍪 Check session management and cookie handling');
      suggestions.push('🧪 Ensure proper test isolation between auth tests');
    }

    if (errorCounts[ErrorType.ASSERTION_FAILURE] > 0) {
      suggestions.push('📸 Review screenshots to understand page state during failure');
      suggestions.push('🔍 Compare expected vs actual values in assertion details');
      suggestions.push('📊 Check for timing issues - add waits before assertions');
      suggestions.push('🔤 Verify text formatting, whitespace, and case sensitivity');
      suggestions.push('📱 Consider dynamic content that might change between test runs');
      suggestions.push('🎯 Use more specific selectors or partial text matches');
    }

    if (suggestions.length === 0) {
      suggestions.push('📋 Review error messages and stack traces for specific guidance');
      suggestions.push('🎥 Check video recordings if available');
      suggestions.push('🗂️ Review trace files for detailed execution flow');
    }

    return suggestions;
  }

  /**
   * Write final session summary to log
   */
  writeSessionSummary(): void {
    if (this.errors.length === 0) {
      return;
    }

    try {
      const summaryFile = join(this.errorLogDir, `session-summary-${this.sessionId}.txt`);
      const report = this.generateDetailedErrorReport();
      const suggestions = this.getDebuggingSuggestions();

      let summary = report + '\n\n';
      summary += '💡 DEBUGGING SUGGESTIONS:\n';
      summary += '-'.repeat(40) + '\n';
      suggestions.forEach(suggestion => {
        summary += `${suggestion}\n`;
      });

      writeFileSync(summaryFile, summary);
    } catch (error) {
      console.warn('Failed to write session summary:', error);
    }
  }
}
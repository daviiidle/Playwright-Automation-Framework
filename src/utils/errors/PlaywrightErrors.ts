/**
 * Custom error types for Playwright test framework
 * Provides specific error categorization for better debugging and error handling
 */

export enum ErrorCategory {
  ELEMENT_NOT_FOUND = 'ELEMENT_NOT_FOUND',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  AUTHENTICATION_FAILURE = 'AUTHENTICATION_FAILURE',
  PAGE_LOAD_FAILURE = 'PAGE_LOAD_FAILURE',
  ELEMENT_INTERACTION_FAILURE = 'ELEMENT_INTERACTION_FAILURE',
  VALIDATION_FAILURE = 'VALIDATION_FAILURE',
  UNEXPECTED_STATE = 'UNEXPECTED_STATE',
  DATA_CORRUPTION = 'DATA_CORRUPTION',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  ENVIRONMENT_ERROR = 'ENVIRONMENT_ERROR',
  SCREENSHOT_FAILURE = 'SCREENSHOT_FAILURE',
  RETRY_EXHAUSTED = 'RETRY_EXHAUSTED'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ErrorContext {
  url?: string;
  selector?: string;
  element?: string;
  operation?: string;
  expectedValue?: any;
  actualValue?: any;
  browserInfo?: {
    name: string;
    version: string;
    viewport: { width: number; height: number };
  };
  networkRequests?: any[];
  pageState?: any;
  timestamp: string;
  testInfo?: {
    testName: string;
    filePath: string;
    projectName: string;
  };
  stackTrace?: string;
  retryAttempt?: number;
  maxRetries?: number;
}

export interface RecoveryStrategy {
  strategy: string;
  attempts: number;
  delay: number;
  condition?: () => boolean | Promise<boolean>;
}

export abstract class BasePlaywrightError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly isRecoverable: boolean;
  public readonly suggestedRecovery?: RecoveryStrategy[];
  public readonly timestamp: string;

  constructor(
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context: ErrorContext,
    isRecoverable: boolean = false,
    suggestedRecovery?: RecoveryStrategy[]
  ) {
    super(message);
    this.name = this.constructor.name;
    this.category = category;
    this.severity = severity;
    this.context = context;
    this.isRecoverable = isRecoverable;
    this.suggestedRecovery = suggestedRecovery;
    this.timestamp = new Date().toISOString();

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      context: this.context,
      isRecoverable: this.isRecoverable,
      suggestedRecovery: this.suggestedRecovery,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

export class ElementNotFoundError extends BasePlaywrightError {
  constructor(selector: string, context: ErrorContext) {
    const recoveryStrategies: RecoveryStrategy[] = [
      { strategy: 'wait_and_retry', attempts: 3, delay: 1000 },
      { strategy: 'refresh_page', attempts: 1, delay: 2000 },
      { strategy: 'check_alternative_selector', attempts: 1, delay: 500 }
    ];

    super(
      `Element not found: ${selector}`,
      ErrorCategory.ELEMENT_NOT_FOUND,
      ErrorSeverity.MEDIUM,
      { ...context, selector },
      true,
      recoveryStrategies
    );
  }
}

export class NetworkTimeoutError extends BasePlaywrightError {
  constructor(url: string, timeout: number, context: ErrorContext) {
    const recoveryStrategies: RecoveryStrategy[] = [
      { strategy: 'retry_with_increased_timeout', attempts: 2, delay: 1000 },
      { strategy: 'check_network_connectivity', attempts: 1, delay: 0 },
      { strategy: 'fallback_to_mock_data', attempts: 1, delay: 0 }
    ];

    super(
      `Network timeout after ${timeout}ms for URL: ${url}`,
      ErrorCategory.NETWORK_TIMEOUT,
      ErrorSeverity.HIGH,
      { ...context, url },
      true,
      recoveryStrategies
    );
  }
}

export class AuthenticationFailureError extends BasePlaywrightError {
  constructor(reason: string, context: ErrorContext) {
    const recoveryStrategies: RecoveryStrategy[] = [
      { strategy: 'refresh_credentials', attempts: 1, delay: 1000 },
      { strategy: 'clear_cookies_and_retry', attempts: 1, delay: 2000 },
      { strategy: 'use_backup_credentials', attempts: 1, delay: 1000 }
    ];

    super(
      `Authentication failed: ${reason}`,
      ErrorCategory.AUTHENTICATION_FAILURE,
      ErrorSeverity.HIGH,
      context,
      true,
      recoveryStrategies
    );
  }
}

export class PageLoadFailureError extends BasePlaywrightError {
  constructor(url: string, reason: string, context: ErrorContext) {
    const recoveryStrategies: RecoveryStrategy[] = [
      { strategy: 'retry_navigation', attempts: 3, delay: 2000 },
      { strategy: 'clear_cache_and_retry', attempts: 1, delay: 3000 },
      { strategy: 'check_page_availability', attempts: 1, delay: 1000 }
    ];

    super(
      `Page load failed for ${url}: ${reason}`,
      ErrorCategory.PAGE_LOAD_FAILURE,
      ErrorSeverity.HIGH,
      { ...context, url },
      true,
      recoveryStrategies
    );
  }
}

export class ElementInteractionFailureError extends BasePlaywrightError {
  constructor(operation: string, selector: string, reason: string, context: ErrorContext) {
    const recoveryStrategies: RecoveryStrategy[] = [
      { strategy: 'wait_for_element_stable', attempts: 2, delay: 1000 },
      { strategy: 'scroll_to_element', attempts: 1, delay: 500 },
      { strategy: 'force_interaction', attempts: 1, delay: 1000 }
    ];

    super(
      `${operation} failed on element ${selector}: ${reason}`,
      ErrorCategory.ELEMENT_INTERACTION_FAILURE,
      ErrorSeverity.MEDIUM,
      { ...context, operation, selector },
      true,
      recoveryStrategies
    );
  }
}

export class ValidationFailureError extends BasePlaywrightError {
  constructor(expected: any, actual: any, context: ErrorContext) {
    super(
      `Validation failed. Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`,
      ErrorCategory.VALIDATION_FAILURE,
      ErrorSeverity.HIGH,
      { ...context, expectedValue: expected, actualValue: actual },
      false
    );
  }
}

export class UnexpectedStateError extends BasePlaywrightError {
  constructor(description: string, context: ErrorContext) {
    const recoveryStrategies: RecoveryStrategy[] = [
      { strategy: 'reset_to_known_state', attempts: 1, delay: 2000 },
      { strategy: 'refresh_page', attempts: 1, delay: 1000 }
    ];

    super(
      `Unexpected state: ${description}`,
      ErrorCategory.UNEXPECTED_STATE,
      ErrorSeverity.MEDIUM,
      context,
      true,
      recoveryStrategies
    );
  }
}

export class DataCorruptionError extends BasePlaywrightError {
  constructor(dataType: string, description: string, context: ErrorContext) {
    super(
      `Data corruption detected in ${dataType}: ${description}`,
      ErrorCategory.DATA_CORRUPTION,
      ErrorSeverity.CRITICAL,
      context,
      false
    );
  }
}

export class ConfigurationError extends BasePlaywrightError {
  constructor(configName: string, reason: string, context: ErrorContext) {
    super(
      `Configuration error in ${configName}: ${reason}`,
      ErrorCategory.CONFIGURATION_ERROR,
      ErrorSeverity.HIGH,
      context,
      false
    );
  }
}

export class EnvironmentError extends BasePlaywrightError {
  constructor(description: string, context: ErrorContext) {
    super(
      `Environment error: ${description}`,
      ErrorCategory.ENVIRONMENT_ERROR,
      ErrorSeverity.HIGH,
      context,
      false
    );
  }
}

export class ScreenshotFailureError extends BasePlaywrightError {
  constructor(reason: string, context: ErrorContext) {
    super(
      `Screenshot capture failed: ${reason}`,
      ErrorCategory.SCREENSHOT_FAILURE,
      ErrorSeverity.LOW,
      context,
      true
    );
  }
}

export class RetryExhaustedError extends BasePlaywrightError {
  constructor(operation: string, attempts: number, lastError: Error, context: ErrorContext) {
    super(
      `Operation '${operation}' failed after ${attempts} attempts. Last error: ${lastError.message}`,
      ErrorCategory.RETRY_EXHAUSTED,
      ErrorSeverity.HIGH,
      { ...context, operation, retryAttempt: attempts },
      false
    );
  }
}

// Error factory for creating appropriate error types based on error patterns
export class ErrorFactory {
  static createFromPlaywrightError(error: Error, context: ErrorContext): BasePlaywrightError {
    const message = error.message.toLowerCase();

    if (message.includes('timeout') && message.includes('network')) {
      return new NetworkTimeoutError(context.url || 'unknown', 30000, context);
    }

    if (message.includes('waiting for element') || message.includes('element not found')) {
      return new ElementNotFoundError(context.selector || 'unknown', context);
    }

    if (message.includes('navigation') && message.includes('timeout')) {
      return new PageLoadFailureError(context.url || 'unknown', error.message, context);
    }

    if (message.includes('click') || message.includes('fill') || message.includes('interaction')) {
      return new ElementInteractionFailureError(
        context.operation || 'unknown',
        context.selector || 'unknown',
        error.message,
        context
      );
    }

    if (message.includes('authentication') || message.includes('login') || message.includes('unauthorized')) {
      return new AuthenticationFailureError(error.message, context);
    }

    // Default to unexpected state error
    return new UnexpectedStateError(error.message, context);
  }
}
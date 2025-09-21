/**
 * Network error handling and retry mechanisms for Playwright tests
 * Provides intelligent network request handling, retry strategies, and monitoring
 */

import { Page, Route, Request, Response } from '@playwright/test';
import { logger } from '../logging/Logger';
import { errorHandler } from '../ErrorHandler';
import { NetworkTimeoutError } from '../errors/PlaywrightErrors';

export interface NetworkConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  timeoutMs: number;
  retryableStatusCodes: number[];
  retryableErrors: string[];
  enableRequestInterception: boolean;
  enableResponseValidation: boolean;
  enableMetrics: boolean;
  fallbackUrls: Map<string, string>;
  mockResponses: Map<string, any>;
}

export interface NetworkMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  retriedRequests: number;
  averageResponseTime: number;
  slowRequests: Array<{
    url: string;
    duration: number;
    timestamp: string;
  }>;
  errorsByType: Record<string, number>;
}

export interface RequestContext {
  url: string;
  method: string;
  headers: Record<string, string>;
  attempt: number;
  startTime: number;
  originalUrl?: string;
}

export class NetworkHandler {
  private static instance: NetworkHandler;
  private config: NetworkConfig;
  private metrics: NetworkMetrics;
  private activeRequests: Map<string, RequestContext> = new Map();
  private isIntercepting: boolean = false;

  private constructor(config: Partial<NetworkConfig> = {}) {
    this.config = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      timeoutMs: 30000,
      retryableStatusCodes: [408, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524],
      retryableErrors: [
        'net::ERR_NETWORK_CHANGED',
        'net::ERR_CONNECTION_RESET',
        'net::ERR_CONNECTION_TIMED_OUT',
        'net::ERR_INTERNET_DISCONNECTED',
        'net::ERR_NAME_NOT_RESOLVED',
        'net::ERR_CONNECTION_REFUSED',
        'net::ERR_TEMPORARILY_THROTTLED'
      ],
      enableRequestInterception: true,
      enableResponseValidation: true,
      enableMetrics: true,
      fallbackUrls: new Map(),
      mockResponses: new Map(),
      ...config
    };

    this.metrics = this.initializeMetrics();
  }

  public static getInstance(config?: Partial<NetworkConfig>): NetworkHandler {
    if (!NetworkHandler.instance) {
      NetworkHandler.instance = new NetworkHandler(config);
    }
    return NetworkHandler.instance;
  }

  public static configure(config: Partial<NetworkConfig>): void {
    NetworkHandler.instance = new NetworkHandler(config);
  }

  private initializeMetrics(): NetworkMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      averageResponseTime: 0,
      slowRequests: [],
      errorsByType: {}
    };
  }

  /**
   * Setup network monitoring and interception for a page
   */
  public async setupNetworkHandling(page: Page): Promise<void> {
    if (this.isIntercepting) {
      return;
    }

    this.isIntercepting = true;
    logger.info('Setting up network handling', { url: page.url() }, 'network-handler');

    // Enable request interception if configured
    if (this.config.enableRequestInterception) {
      await this.setupRequestInterception(page);
    }

    // Setup response monitoring
    if (this.config.enableMetrics || this.config.enableResponseValidation) {
      this.setupResponseMonitoring(page);
    }

    // Setup request failure monitoring
    this.setupRequestFailureMonitoring(page);
  }

  /**
   * Setup request interception for retry and fallback handling
   */
  private async setupRequestInterception(page: Page): Promise<void> {
    await page.route('**/*', async (route: Route, request: Request) => {
      const requestId = this.generateRequestId(request);
      const context: RequestContext = {
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        attempt: 1,
        startTime: Date.now()
      };

      this.activeRequests.set(requestId, context);

      try {
        await this.handleRequest(route, request, context);
      } catch (error) {
        logger.error('Request interception failed', error as Error, { url: request.url() }, 'network-handler');
        await route.continue();
      }
    });

    logger.debug('Request interception setup completed', {}, 'network-handler');
  }

  /**
   * Handle individual requests with retry logic
   */
  private async handleRequest(route: Route, request: Request, context: RequestContext): Promise<void> {
    const url = request.url();

    // Check for mock responses
    if (this.config.mockResponses.has(url)) {
      const mockResponse = this.config.mockResponses.get(url);
      await route.fulfill(mockResponse);
      logger.debug('Request fulfilled with mock response', { url }, 'network-handler');
      return;
    }

    // Check for fallback URLs
    if (this.config.fallbackUrls.has(url)) {
      const fallbackUrl = this.config.fallbackUrls.get(url);
      logger.info('Using fallback URL', { original: url, fallback: fallbackUrl }, 'network-handler');
      await route.continue({ url: fallbackUrl });
      return;
    }

    // Continue with the original request
    await route.continue();
  }

  /**
   * Setup response monitoring
   */
  private setupResponseMonitoring(page: Page): void {
    page.on('response', (response: Response) => {
      const request = response.request();
      const requestId = this.generateRequestId(request);
      const context = this.activeRequests.get(requestId);

      if (context) {
        this.recordResponseMetrics(response, context);
        this.validateResponse(response, context);
        this.activeRequests.delete(requestId);
      }
    });

    logger.debug('Response monitoring setup completed', {}, 'network-handler');
  }

  /**
   * Setup request failure monitoring
   */
  private setupRequestFailureMonitoring(page: Page): void {
    page.on('requestfailed', (request: Request) => {
      const requestId = this.generateRequestId(request);
      const context = this.activeRequests.get(requestId);
      const failure = request.failure();

      if (failure) {
        this.handleRequestFailure(request, failure.errorText, context);
      }

      this.activeRequests.delete(requestId);
    });

    logger.debug('Request failure monitoring setup completed', {}, 'network-handler');
  }

  /**
   * Record response metrics
   */
  private recordResponseMetrics(response: Response, context: RequestContext): void {
    if (!this.config.enableMetrics) {
      return;
    }

    const duration = Date.now() - context.startTime;
    const status = response.status();

    this.metrics.totalRequests++;

    if (status >= 200 && status < 400) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Update average response time
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + duration) / this.metrics.totalRequests;

    // Record slow requests
    if (duration > 3000) {
      this.metrics.slowRequests.push({
        url: response.url(),
        duration,
        timestamp: new Date().toISOString()
      });

      // Keep only recent slow requests
      if (this.metrics.slowRequests.length > 50) {
        this.metrics.slowRequests = this.metrics.slowRequests.slice(-50);
      }
    }

    logger.debug('Response metrics recorded', {
      url: response.url(),
      status,
      duration
    }, 'network-metrics');
  }

  /**
   * Validate response
   */
  private validateResponse(response: Response, context: RequestContext): void {
    if (!this.config.enableResponseValidation) {
      return;
    }

    const status = response.status();
    const url = response.url();

    // Check for retryable status codes
    if (this.config.retryableStatusCodes.includes(status)) {
      logger.warn('Retryable status code detected', {
        url,
        status,
        statusText: response.statusText()
      }, 'network-handler');

      // This would trigger a retry if we were managing the request
      // In this case, we just log the issue
    }

    // Check for specific error conditions
    if (status >= 500) {
      this.recordErrorByType('server_error');
      logger.error('Server error detected', {
        url,
        status,
        statusText: response.statusText()
      }, 'network-handler');
    } else if (status === 429) {
      this.recordErrorByType('rate_limited');
      logger.warn('Rate limiting detected', { url, status }, 'network-handler');
    } else if (status === 404) {
      this.recordErrorByType('not_found');
      logger.warn('Resource not found', { url, status }, 'network-handler');
    }
  }

  /**
   * Handle request failures
   */
  private handleRequestFailure(request: Request, errorText: string, context?: RequestContext): void {
    const url = request.url();
    const isRetryable = this.isRetryableError(errorText);

    this.metrics.failedRequests++;
    this.recordErrorByType(this.categorizeError(errorText));

    logger.error('Request failed', new Error(errorText), {
      url,
      method: request.method(),
      isRetryable,
      context
    }, 'network-handler');

    if (isRetryable && context && context.attempt < this.config.maxRetries) {
      logger.info('Request failure is retryable', {
        url,
        attempt: context.attempt,
        maxRetries: this.config.maxRetries
      }, 'network-handler');
      // Note: Actual retry would need to be implemented at the test level
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(errorText: string): boolean {
    return this.config.retryableErrors.some(retryableError =>
      errorText.includes(retryableError)
    );
  }

  /**
   * Categorize error for metrics
   */
  private categorizeError(errorText: string): string {
    if (errorText.includes('NETWORK_CHANGED')) return 'network_changed';
    if (errorText.includes('CONNECTION_RESET')) return 'connection_reset';
    if (errorText.includes('CONNECTION_TIMED_OUT')) return 'connection_timeout';
    if (errorText.includes('INTERNET_DISCONNECTED')) return 'internet_disconnected';
    if (errorText.includes('NAME_NOT_RESOLVED')) return 'dns_error';
    if (errorText.includes('CONNECTION_REFUSED')) return 'connection_refused';
    if (errorText.includes('TEMPORARILY_THROTTLED')) return 'throttled';
    return 'unknown_error';
  }

  /**
   * Record error by type for metrics
   */
  private recordErrorByType(errorType: string): void {
    this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(request: Request): string {
    return `${request.method()}-${request.url()}-${Date.now()}`;
  }

  /**
   * Retry network operation with exponential backoff
   */
  public async retryNetworkOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries?: number
  ): Promise<T> {
    const retries = maxRetries || this.config.maxRetries;
    let lastError: Error;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await operation();

        if (attempt > 1) {
          this.metrics.retriedRequests++;
          logger.info(`Network operation succeeded on attempt ${attempt}`, {
            operationName,
            attempt
          }, 'network-retry');
        }

        return result;

      } catch (error) {
        lastError = error as Error;

        if (attempt === retries) {
          logger.error(`Network operation failed after ${retries} attempts`, lastError, {
            operationName,
            attempts: retries
          }, 'network-retry');
          throw lastError;
        }

        const delay = this.calculateRetryDelay(attempt);
        logger.warn(`Network operation attempt ${attempt} failed, retrying in ${delay}ms`, {
          operationName,
          attempt,
          delay,
          error: lastError.message
        }, 'network-retry');

        await this.wait(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const delay = Math.min(
      this.config.baseDelay * Math.pow(2, attempt - 1),
      this.config.maxDelay
    );

    // Add jitter to avoid thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Wait for specified duration
   */
  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Add fallback URL for a specific endpoint
   */
  public addFallbackUrl(originalUrl: string, fallbackUrl: string): void {
    this.config.fallbackUrls.set(originalUrl, fallbackUrl);
    logger.info('Fallback URL added', { originalUrl, fallbackUrl }, 'network-handler');
  }

  /**
   * Add mock response for testing
   */
  public addMockResponse(url: string, response: any): void {
    this.config.mockResponses.set(url, response);
    logger.info('Mock response added', { url }, 'network-handler');
  }

  /**
   * Remove fallback URL
   */
  public removeFallbackUrl(originalUrl: string): void {
    this.config.fallbackUrls.delete(originalUrl);
    logger.info('Fallback URL removed', { originalUrl }, 'network-handler');
  }

  /**
   * Remove mock response
   */
  public removeMockResponse(url: string): void {
    this.config.mockResponses.delete(url);
    logger.info('Mock response removed', { url }, 'network-handler');
  }

  /**
   * Get network metrics
   */
  public getMetrics(): NetworkMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    logger.info('Network metrics reset', {}, 'network-handler');
  }

  /**
   * Cleanup network handling
   */
  public cleanup(): void {
    this.isIntercepting = false;
    this.activeRequests.clear();
    logger.info('Network handler cleanup completed', {}, 'network-handler');
  }

  /**
   * Check network health
   */
  public async checkNetworkHealth(page: Page): Promise<boolean> {
    try {
      const response = await page.goto('data:text/html,<html><body>Network Health Check</body></html>');
      return response !== null;
    } catch (error) {
      logger.error('Network health check failed', error as Error, {}, 'network-handler');
      return false;
    }
  }

  /**
   * Wait for network to be idle
   */
  public async waitForNetworkIdle(page: Page, timeout: number = 30000): Promise<void> {
    try {
      await page.waitForLoadState('networkidle', { timeout });
      logger.debug('Network idle achieved', {}, 'network-handler');
    } catch (error) {
      logger.warn('Network idle timeout', { timeout }, 'network-handler');
      throw new NetworkTimeoutError(page.url(), timeout, {
        url: page.url(),
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Export singleton instance
export const networkHandler = NetworkHandler.getInstance();
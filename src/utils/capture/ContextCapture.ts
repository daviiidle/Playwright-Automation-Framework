/**
 * Context capture utilities for debugging and error analysis
 * Captures page state, network information, and other debugging data
 */

import { Page, Browser, Request, Response } from '@playwright/test';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { logger } from '../logging/Logger';
import { ErrorContext } from '../errors/PlaywrightErrors';

export interface CapturedContext {
  timestamp: string;
  sessionId: string;
  url: string;
  title: string;
  viewport: { width: number; height: number };
  browserInfo: {
    name: string;
    version: string;
  };
  pageState: {
    readyState: string;
    visibility: string;
    hasFocus: boolean;
  };
  networkRequests: NetworkRequest[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  cookies: any[];
  console: ConsoleMessage[];
  performance: PerformanceMetrics;
  accessibility: AccessibilityInfo;
  domSnapshot?: string;
  screenshot?: {
    path: string;
    fullPage: boolean;
  };
}

export interface NetworkRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  postData?: string;
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body?: string;
  };
  timing: {
    startTime: number;
    endTime: number;
    duration: number;
  };
  resourceType: string;
  failure?: string;
}

export interface ConsoleMessage {
  type: string;
  text: string;
  timestamp: number;
  args: any[];
  location: {
    url: string;
    lineNumber: number;
    columnNumber: number;
  };
}

export interface PerformanceMetrics {
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

export interface AccessibilityInfo {
  violations: any[];
  summary: {
    violationCount: number;
    elementCount: number;
    testedElementCount: number;
  };
}

export class ContextCapture {
  private captureDir: string;
  private networkRequests: Map<string, NetworkRequest> = new Map();
  private consoleMessages: ConsoleMessage[] = [];
  private isListening: boolean = false;

  constructor(captureDir: string = './captures') {
    this.captureDir = captureDir;
    this.ensureCaptureDirectory();
  }

  private ensureCaptureDirectory(): void {
    if (!existsSync(this.captureDir)) {
      mkdirSync(this.captureDir, { recursive: true });
    }
  }

  public async startListening(page: Page): Promise<void> {
    if (this.isListening) {
      return;
    }

    this.isListening = true;
    logger.debug('Started context capture listeners', { url: page.url() }, 'context-capture');

    // Listen to network requests
    page.on('request', (request: Request) => {
      const requestData: NetworkRequest = {
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData() || undefined,
        timing: {
          startTime: Date.now(),
          endTime: 0,
          duration: 0
        },
        resourceType: request.resourceType()
      };

      this.networkRequests.set(request.url(), requestData);
    });

    page.on('response', (response: Response) => {
      const request = this.networkRequests.get(response.url());
      if (request) {
        const endTime = Date.now();
        request.timing.endTime = endTime;
        request.timing.duration = endTime - request.timing.startTime;
        request.response = {
          status: response.status(),
          statusText: response.statusText(),
          headers: response.headers(),
        };

        // Capture response body for failed requests
        if (response.status() >= 400) {
          response.text().then(body => {
            if (request.response) {
              request.response.body = body;
            }
          }).catch(() => {
            // Ignore if body cannot be captured
          });
        }
      }
    });

    page.on('requestfailed', (request: Request) => {
      const requestData = this.networkRequests.get(request.url());
      if (requestData) {
        requestData.failure = request.failure()?.errorText || 'Unknown failure';
      }
    });

    // Listen to console messages
    page.on('console', (msg) => {
      this.consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now(),
        args: msg.args().map(arg => arg.toString()),
        location: msg.location()
      });
    });

    // Listen to page errors
    page.on('pageerror', (error) => {
      logger.error('Page error detected', error, { url: page.url() }, 'page-error');
    });
  }

  public stopListening(): void {
    this.isListening = false;
    logger.debug('Stopped context capture listeners', {}, 'context-capture');
  }

  public async captureFullContext(
    page: Page,
    reason: string,
    includeScreenshot: boolean = true,
    includeDOM: boolean = false
  ): Promise<CapturedContext> {
    const startTime = Date.now();
    logger.info(`Capturing full context: ${reason}`, { url: page.url() }, 'context-capture');

    try {
      // Basic page information
      const url = page.url();
      const title = await page.title().catch(() => 'Unknown');
      const viewport = page.viewportSize() || { width: 0, height: 0 };

      // Browser information
      const browserInfo = await this.getBrowserInfo(page);

      // Page state
      const pageState = await this.getPageState(page);

      // Performance metrics
      const performance = await this.getPerformanceMetrics(page);

      // Storage data
      const localStorage = await this.getLocalStorage(page);
      const sessionStorage = await this.getSessionStorage(page);
      const cookies = await page.context().cookies();

      // Screenshot
      let screenshot: { path: string; fullPage: boolean } | undefined;
      if (includeScreenshot) {
        screenshot = await this.captureScreenshot(page, reason);
      }

      // DOM snapshot
      let domSnapshot: string | undefined;
      if (includeDOM) {
        domSnapshot = await this.captureDOMSnapshot(page);
      }

      // Accessibility information
      const accessibility = await this.getAccessibilityInfo(page);

      const context: CapturedContext = {
        timestamp: new Date().toISOString(),
        sessionId: logger.getSessionId(),
        url,
        title,
        viewport,
        browserInfo,
        pageState,
        networkRequests: Array.from(this.networkRequests.values()),
        localStorage,
        sessionStorage,
        cookies,
        console: [...this.consoleMessages],
        performance,
        accessibility,
        domSnapshot,
        screenshot
      };

      // Save context to file
      await this.saveContext(context, reason);

      const duration = Date.now() - startTime;
      logger.info(`Context capture completed in ${duration}ms`, {
        reason,
        duration,
        includeScreenshot,
        includeDOM
      }, 'context-capture');

      return context;

    } catch (error) {
      logger.error('Failed to capture context', error as Error, { reason }, 'context-capture');
      throw error;
    }
  }

  private async getBrowserInfo(page: Page): Promise<{ name: string; version: string }> {
    try {
      const userAgent = await page.evaluate(() => navigator.userAgent);
      const name = await page.evaluate(() => {
        if (navigator.userAgent.includes('Chrome')) return 'Chrome';
        if (navigator.userAgent.includes('Firefox')) return 'Firefox';
        if (navigator.userAgent.includes('Safari')) return 'Safari';
        return 'Unknown';
      });

      return {
        name,
        version: userAgent
      };
    } catch {
      return { name: 'Unknown', version: 'Unknown' };
    }
  }

  private async getPageState(page: Page): Promise<any> {
    try {
      return await page.evaluate(() => ({
        readyState: document.readyState,
        visibility: document.visibilityState,
        hasFocus: document.hasFocus()
      }));
    } catch {
      return { readyState: 'unknown', visibility: 'unknown', hasFocus: false };
    }
  }

  private async getPerformanceMetrics(page: Page): Promise<PerformanceMetrics> {
    try {
      return await page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paintEntries = performance.getEntriesByType('paint');

        let firstPaint, firstContentfulPaint;
        paintEntries.forEach(entry => {
          if (entry.name === 'first-paint') firstPaint = entry.startTime;
          if (entry.name === 'first-contentful-paint') firstContentfulPaint = entry.startTime;
        });

        const memoryInfo = (performance as any).memory;

        return {
          navigationStart: perfData.navigationStart || 0,
          domContentLoaded: perfData.domContentLoadedEventEnd || 0,
          loadComplete: perfData.loadEventEnd || 0,
          firstPaint,
          firstContentfulPaint,
          memoryUsage: memoryInfo ? {
            usedJSHeapSize: memoryInfo.usedJSHeapSize,
            totalJSHeapSize: memoryInfo.totalJSHeapSize,
            jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit
          } : undefined
        };
      });
    } catch {
      return {
        navigationStart: 0,
        domContentLoaded: 0,
        loadComplete: 0
      };
    }
  }

  private async getLocalStorage(page: Page): Promise<Record<string, string>> {
    try {
      return await page.evaluate(() => {
        const storage: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            storage[key] = localStorage.getItem(key) || '';
          }
        }
        return storage;
      });
    } catch {
      return {};
    }
  }

  private async getSessionStorage(page: Page): Promise<Record<string, string>> {
    try {
      return await page.evaluate(() => {
        const storage: Record<string, string> = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) {
            storage[key] = sessionStorage.getItem(key) || '';
          }
        }
        return storage;
      });
    } catch {
      return {};
    }
  }

  private async captureScreenshot(page: Page, reason: string): Promise<{ path: string; fullPage: boolean }> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${timestamp}-${reason.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
      const path = join(this.captureDir, filename);

      await page.screenshot({
        path,
        fullPage: true,
        timeout: 10000
      });

      logger.logScreenshot(path, reason);

      return { path, fullPage: true };
    } catch (error) {
      logger.error('Failed to capture screenshot', error as Error, { reason }, 'screenshot');
      throw error;
    }
  }

  private async captureDOMSnapshot(page: Page): Promise<string> {
    try {
      return await page.content();
    } catch (error) {
      logger.error('Failed to capture DOM snapshot', error as Error, {}, 'dom-capture');
      return 'Failed to capture DOM';
    }
  }

  private async getAccessibilityInfo(page: Page): Promise<AccessibilityInfo> {
    try {
      // This is a basic implementation - you might want to integrate with axe-core
      const snapshot = await page.accessibility.snapshot();
      return {
        violations: [], // Would be populated by accessibility scanner
        summary: {
          violationCount: 0,
          elementCount: 0,
          testedElementCount: 0
        }
      };
    } catch {
      return {
        violations: [],
        summary: {
          violationCount: 0,
          elementCount: 0,
          testedElementCount: 0
        }
      };
    }
  }

  private async saveContext(context: CapturedContext, reason: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `context-${timestamp}-${reason.replace(/[^a-zA-Z0-9]/g, '-')}.json`;
      const path = join(this.captureDir, filename);

      writeFileSync(path, JSON.stringify(context, null, 2));
      logger.debug('Context saved to file', { path, reason }, 'context-capture');
    } catch (error) {
      logger.error('Failed to save context', error as Error, { reason }, 'context-capture');
    }
  }

  public clearNetworkHistory(): void {
    this.networkRequests.clear();
    logger.debug('Network history cleared', {}, 'context-capture');
  }

  public clearConsoleHistory(): void {
    this.consoleMessages = [];
    logger.debug('Console history cleared', {}, 'context-capture');
  }

  public getNetworkRequests(): NetworkRequest[] {
    return Array.from(this.networkRequests.values());
  }

  public getConsoleMessages(): ConsoleMessage[] {
    return [...this.consoleMessages];
  }

  public async createErrorContext(page: Page, selector?: string, operation?: string): Promise<ErrorContext> {
    try {
      const context: ErrorContext = {
        url: page.url(),
        selector,
        operation,
        timestamp: new Date().toISOString(),
        browserInfo: await this.getBrowserInfo(page),
        networkRequests: this.getNetworkRequests(),
        pageState: await this.getPageState(page)
      };

      return context;
    } catch (error) {
      logger.error('Failed to create error context', error as Error, {}, 'error-context');
      return {
        url: page.url(),
        selector,
        operation,
        timestamp: new Date().toISOString()
      };
    }
  }
}
/**
 * Debugging utilities for Playwright test framework
 * Provides comprehensive debugging tools for troubleshooting test failures
 */

import { Page, Locator, ElementHandle } from '@playwright/test';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { logger } from '../logging/Logger';
import { ContextCapture } from '../capture/ContextCapture';

export interface DebugConfig {
  enableVerboseLogging: boolean;
  enableElementHighlighting: boolean;
  enableStepByStepMode: boolean;
  enablePerformanceMonitoring: boolean;
  debugOutputDir: string;
  highlightColor: string;
  highlightDuration: number;
  stepDelay: number;
}

export interface ElementDebugInfo {
  selector: string;
  isVisible: boolean;
  isEnabled: boolean;
  isAttached: boolean;
  boundingBox: any;
  innerText: string;
  innerHTML: string;
  attributes: Record<string, string>;
  computedStyles: Record<string, string>;
  parentElements: string[];
  childElements: string[];
}

export interface PageDebugInfo {
  url: string;
  title: string;
  readyState: string;
  loadState: string;
  viewport: { width: number; height: number };
  scrollPosition: { x: number; y: number };
  focusedElement: string | null;
  visibleElements: number;
  totalElements: number;
  consoleErrors: any[];
  networkFailures: any[];
  performanceMetrics: any;
}

export interface StepDebugInfo {
  stepNumber: number;
  stepName: string;
  timestamp: string;
  duration: number;
  status: 'success' | 'failure' | 'skipped';
  error?: Error;
  beforeState: any;
  afterState: any;
  artifacts: {
    screenshot?: string;
    pageSource?: string;
    elementInfo?: ElementDebugInfo[];
  };
}

export class DebugUtils {
  private static instance: DebugUtils;
  private config: DebugConfig;
  private debugDir: string;
  private contextCapture: ContextCapture;
  private stepHistory: StepDebugInfo[] = [];
  private stepCounter: number = 0;
  private isDebugging: boolean = false;

  private constructor(config: Partial<DebugConfig> = {}) {
    this.config = {
      enableVerboseLogging: false,
      enableElementHighlighting: false,
      enableStepByStepMode: false,
      enablePerformanceMonitoring: false,
      debugOutputDir: './debug-output',
      highlightColor: '#ff0000',
      highlightDuration: 2000,
      stepDelay: 1000,
      ...config
    };

    this.debugDir = this.config.debugOutputDir;
    this.ensureDebugDirectory();
    this.contextCapture = new ContextCapture(join(this.debugDir, 'contexts'));
  }

  public static getInstance(config?: Partial<DebugConfig>): DebugUtils {
    if (!DebugUtils.instance) {
      DebugUtils.instance = new DebugUtils(config);
    }
    return DebugUtils.instance;
  }

  public static configure(config: Partial<DebugConfig>): void {
    DebugUtils.instance = new DebugUtils(config);
  }

  private ensureDebugDirectory(): void {
    if (!existsSync(this.debugDir)) {
      mkdirSync(this.debugDir, { recursive: true });
    }
  }

  /**
   * Start debugging session
   */
  public async startDebugging(page: Page): Promise<void> {
    this.isDebugging = true;
    this.stepCounter = 0;
    this.stepHistory = [];

    logger.info('Debug session started', { url: page.url() }, 'debug-utils');

    if (this.config.enablePerformanceMonitoring) {
      await this.startPerformanceMonitoring(page);
    }

    await this.contextCapture.startListening(page);
  }

  /**
   * Stop debugging session
   */
  public async stopDebugging(): Promise<void> {
    this.isDebugging = false;
    this.contextCapture.stopListening();

    // Generate debug report
    await this.generateDebugReport();

    logger.info('Debug session ended', {
      totalSteps: this.stepHistory.length,
      failedSteps: this.stepHistory.filter(s => s.status === 'failure').length
    }, 'debug-utils');
  }

  /**
   * Debug a specific step with comprehensive information capture
   */
  public async debugStep<T>(
    stepName: string,
    operation: () => Promise<T>,
    page: Page,
    captureArtifacts: boolean = true
  ): Promise<T> {
    if (!this.isDebugging) {
      return await operation();
    }

    this.stepCounter++;
    const startTime = Date.now();

    logger.info(`🔍 Debug Step ${this.stepCounter}: ${stepName}`, {}, 'debug-step');

    let beforeState: any;
    let afterState: any;
    let result: T;
    let error: Error | undefined;
    let artifacts: any = {};

    try {
      // Capture before state
      if (captureArtifacts) {
        beforeState = await this.capturePageState(page);
      }

      // Step-by-step mode pause
      if (this.config.enableStepByStepMode) {
        await this.pauseForStepByStep(stepName);
      }

      // Execute operation
      result = await operation();

      // Capture after state
      if (captureArtifacts) {
        afterState = await this.capturePageState(page);
        artifacts = await this.captureStepArtifacts(page, stepName);
      }

      const duration = Date.now() - startTime;

      const stepInfo: StepDebugInfo = {
        stepNumber: this.stepCounter,
        stepName,
        timestamp: new Date().toISOString(),
        duration,
        status: 'success',
        beforeState,
        afterState,
        artifacts
      };

      this.stepHistory.push(stepInfo);

      logger.info(`✅ Step completed: ${stepName} (${duration}ms)`, {
        stepNumber: this.stepCounter,
        duration
      }, 'debug-step');

      return result;

    } catch (err) {
      error = err as Error;
      const duration = Date.now() - startTime;

      if (captureArtifacts) {
        afterState = await this.capturePageState(page);
        artifacts = await this.captureStepArtifacts(page, `${stepName}-error`, true);
      }

      const stepInfo: StepDebugInfo = {
        stepNumber: this.stepCounter,
        stepName,
        timestamp: new Date().toISOString(),
        duration,
        status: 'failure',
        error,
        beforeState,
        afterState,
        artifacts
      };

      this.stepHistory.push(stepInfo);

      logger.error(`❌ Step failed: ${stepName} (${duration}ms)`, error, {
        stepNumber: this.stepCounter,
        duration
      }, 'debug-step');

      throw error;
    }
  }

  /**
   * Debug element interactions with detailed element information
   */
  public async debugElement(
    page: Page,
    selector: string,
    operation?: (locator: Locator) => Promise<void>,
    highlightElement: boolean = true
  ): Promise<ElementDebugInfo> {
    logger.debug(`🔍 Debugging element: ${selector}`, {}, 'debug-element');

    const locator = page.locator(selector);
    const elementInfo = await this.getElementDebugInfo(page, selector);

    // Log element information
    logger.debug('Element debug info', elementInfo, 'debug-element');

    // Highlight element if configured
    if (highlightElement && this.config.enableElementHighlighting) {
      await this.highlightElement(page, selector);
    }

    // Perform operation if provided
    if (operation) {
      try {
        await operation(locator);
        logger.debug(`✅ Element operation completed: ${selector}`, {}, 'debug-element');
      } catch (error) {
        logger.error(`❌ Element operation failed: ${selector}`, error as Error, {}, 'debug-element');
        throw error;
      }
    }

    return elementInfo;
  }

  /**
   * Get comprehensive element debug information
   */
  public async getElementDebugInfo(page: Page, selector: string): Promise<ElementDebugInfo> {
    try {
      const locator = page.locator(selector);

      const [
        isVisible,
        isEnabled,
        isAttached,
        boundingBox,
        innerText,
        innerHTML,
        attributes,
        computedStyles
      ] = await Promise.all([
        locator.isVisible().catch(() => false),
        locator.isEnabled().catch(() => false),
        locator.isAttached().catch(() => false),
        locator.boundingBox().catch(() => null),
        locator.innerText().catch(() => ''),
        locator.innerHTML().catch(() => ''),
        this.getElementAttributes(page, selector),
        this.getElementComputedStyles(page, selector)
      ]);

      const parentElements = await this.getParentElements(page, selector);
      const childElements = await this.getChildElements(page, selector);

      return {
        selector,
        isVisible,
        isEnabled,
        isAttached,
        boundingBox,
        innerText,
        innerHTML,
        attributes,
        computedStyles,
        parentElements,
        childElements
      };
    } catch (error) {
      logger.error('Failed to get element debug info', error as Error, { selector }, 'debug-element');
      throw error;
    }
  }

  /**
   * Get comprehensive page debug information
   */
  public async getPageDebugInfo(page: Page): Promise<PageDebugInfo> {
    try {
      const [
        url,
        title,
        readyState,
        viewport,
        scrollPosition,
        focusedElement,
        elementCounts,
        consoleErrors,
        performanceMetrics
      ] = await Promise.all([
        page.url(),
        page.title().catch(() => 'Unknown'),
        page.evaluate(() => document.readyState),
        page.viewportSize(),
        page.evaluate(() => ({ x: window.scrollX, y: window.scrollY })),
        this.getFocusedElement(page),
        this.getElementCounts(page),
        this.getConsoleErrors(page),
        this.getPerformanceMetrics(page)
      ]);

      return {
        url,
        title,
        readyState,
        loadState: 'unknown', // This would need to be tracked
        viewport: viewport || { width: 0, height: 0 },
        scrollPosition,
        focusedElement,
        visibleElements: elementCounts.visible,
        totalElements: elementCounts.total,
        consoleErrors,
        networkFailures: [], // This would be populated from network monitoring
        performanceMetrics
      };
    } catch (error) {
      logger.error('Failed to get page debug info', error as Error, {}, 'debug-page');
      throw error;
    }
  }

  /**
   * Highlight element on page for visual debugging
   */
  public async highlightElement(page: Page, selector: string): Promise<void> {
    try {
      await page.evaluate((sel, color, duration) => {
        const element = document.querySelector(sel);
        if (element) {
          const originalStyle = element.style.cssText;
          element.style.cssText += `outline: 3px solid ${color}; outline-offset: 2px;`;

          setTimeout(() => {
            element.style.cssText = originalStyle;
          }, duration);
        }
      }, selector, this.config.highlightColor, this.config.highlightDuration);

      logger.debug(`Element highlighted: ${selector}`, {}, 'debug-highlight');
    } catch (error) {
      logger.error('Failed to highlight element', error as Error, { selector }, 'debug-highlight');
    }
  }

  /**
   * Capture page state for debugging
   */
  private async capturePageState(page: Page): Promise<any> {
    try {
      return await this.getPageDebugInfo(page);
    } catch (error) {
      logger.error('Failed to capture page state', error as Error, {}, 'debug-capture');
      return {};
    }
  }

  /**
   * Capture step artifacts (screenshots, DOM, etc.)
   */
  private async captureStepArtifacts(page: Page, stepName: string, isError: boolean = false): Promise<any> {
    const artifacts: any = {};

    try {
      // Screenshot
      const screenshotPath = join(this.debugDir, 'screenshots', `step-${this.stepCounter}-${stepName}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      artifacts.screenshot = screenshotPath;

      // Page source
      const pageSource = await page.content();
      const sourcePath = join(this.debugDir, 'sources', `step-${this.stepCounter}-${stepName}.html`);
      writeFileSync(sourcePath, pageSource);
      artifacts.pageSource = sourcePath;

      // Element information if error
      if (isError) {
        artifacts.elementInfo = await this.captureVisibleElements(page);
      }

    } catch (error) {
      logger.error('Failed to capture step artifacts', error as Error, { stepName }, 'debug-capture');
    }

    return artifacts;
  }

  /**
   * Capture information about visible elements
   */
  private async captureVisibleElements(page: Page): Promise<ElementDebugInfo[]> {
    try {
      const visibleSelectors = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        return elements
          .filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
          })
          .map(el => {
            // Generate a unique selector for the element
            let selector = el.tagName.toLowerCase();
            if (el.id) selector += `#${el.id}`;
            if (el.className) selector += `.${el.className.split(' ').join('.')}`;
            return selector;
          })
          .slice(0, 20); // Limit to first 20 visible elements
      });

      const elementInfos: ElementDebugInfo[] = [];
      for (const selector of visibleSelectors) {
        try {
          const info = await this.getElementDebugInfo(page, selector);
          elementInfos.push(info);
        } catch (error) {
          // Skip elements that can't be debugged
          continue;
        }
      }

      return elementInfos;
    } catch (error) {
      logger.error('Failed to capture visible elements', error as Error, {}, 'debug-capture');
      return [];
    }
  }

  /**
   * Helper methods for gathering element information
   */
  private async getElementAttributes(page: Page, selector: string): Promise<Record<string, string>> {
    try {
      return await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) return {};

        const attrs: Record<string, string> = {};
        for (const attr of element.attributes) {
          attrs[attr.name] = attr.value;
        }
        return attrs;
      }, selector);
    } catch {
      return {};
    }
  }

  private async getElementComputedStyles(page: Page, selector: string): Promise<Record<string, string>> {
    try {
      return await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) return {};

        const styles = window.getComputedStyle(element);
        const importantStyles = [
          'display', 'visibility', 'opacity', 'position', 'width', 'height',
          'top', 'left', 'z-index', 'overflow', 'pointer-events'
        ];

        const result: Record<string, string> = {};
        importantStyles.forEach(prop => {
          result[prop] = styles.getPropertyValue(prop);
        });
        return result;
      }, selector);
    } catch {
      return {};
    }
  }

  private async getParentElements(page: Page, selector: string): Promise<string[]> {
    try {
      return await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) return [];

        const parents: string[] = [];
        let parent = element.parentElement;
        while (parent && parent !== document.body) {
          let parentSelector = parent.tagName.toLowerCase();
          if (parent.id) parentSelector += `#${parent.id}`;
          if (parent.className) parentSelector += `.${parent.className.split(' ').join('.')}`;
          parents.push(parentSelector);
          parent = parent.parentElement;
        }
        return parents;
      }, selector);
    } catch {
      return [];
    }
  }

  private async getChildElements(page: Page, selector: string): Promise<string[]> {
    try {
      return await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) return [];

        const children: string[] = [];
        Array.from(element.children).forEach(child => {
          let childSelector = child.tagName.toLowerCase();
          if (child.id) childSelector += `#${child.id}`;
          if (child.className) childSelector += `.${child.className.split(' ').join('.')}`;
          children.push(childSelector);
        });
        return children.slice(0, 10); // Limit to first 10 children
      }, selector);
    } catch {
      return [];
    }
  }

  private async getFocusedElement(page: Page): Promise<string | null> {
    try {
      return await page.evaluate(() => {
        const focused = document.activeElement;
        if (!focused || focused === document.body) return null;

        let selector = focused.tagName.toLowerCase();
        if (focused.id) selector += `#${focused.id}`;
        if (focused.className) selector += `.${focused.className.split(' ').join('.')}`;
        return selector;
      });
    } catch {
      return null;
    }
  }

  private async getElementCounts(page: Page): Promise<{ total: number; visible: number }> {
    try {
      return await page.evaluate(() => {
        const allElements = document.querySelectorAll('*');
        const visibleElements = Array.from(allElements).filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        });

        return {
          total: allElements.length,
          visible: visibleElements.length
        };
      });
    } catch {
      return { total: 0, visible: 0 };
    }
  }

  private async getConsoleErrors(page: Page): Promise<any[]> {
    // This would return console errors captured during the session
    return [];
  }

  private async getPerformanceMetrics(page: Page): Promise<any> {
    try {
      return await page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          loadTime: perfData.loadEventEnd - perfData.navigationStart,
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
        };
      });
    } catch {
      return {};
    }
  }

  /**
   * Performance monitoring
   */
  private async startPerformanceMonitoring(page: Page): Promise<void> {
    // Implementation for performance monitoring
    logger.debug('Performance monitoring started', {}, 'debug-performance');
  }

  /**
   * Step-by-step mode
   */
  private async pauseForStepByStep(stepName: string): Promise<void> {
    logger.info(`⏸️  Step-by-step pause: ${stepName} (Press any key to continue)`, {}, 'debug-step');
    await this.wait(this.config.stepDelay);
  }

  /**
   * Generate comprehensive debug report
   */
  private async generateDebugReport(): Promise<void> {
    try {
      const report = {
        sessionInfo: {
          startTime: this.stepHistory[0]?.timestamp,
          endTime: this.stepHistory[this.stepHistory.length - 1]?.timestamp,
          totalSteps: this.stepHistory.length,
          successfulSteps: this.stepHistory.filter(s => s.status === 'success').length,
          failedSteps: this.stepHistory.filter(s => s.status === 'failure').length
        },
        steps: this.stepHistory,
        summary: {
          totalDuration: this.stepHistory.reduce((sum, step) => sum + step.duration, 0),
          averageStepDuration: this.stepHistory.length > 0
            ? this.stepHistory.reduce((sum, step) => sum + step.duration, 0) / this.stepHistory.length
            : 0,
          slowestStep: this.stepHistory.reduce((slowest, step) =>
            step.duration > slowest.duration ? step : slowest, { duration: 0 }),
          errorPatterns: this.analyzeErrorPatterns()
        }
      };

      const reportPath = join(this.debugDir, `debug-report-${Date.now()}.json`);
      writeFileSync(reportPath, JSON.stringify(report, null, 2));

      logger.info('Debug report generated', { reportPath }, 'debug-utils');
    } catch (error) {
      logger.error('Failed to generate debug report', error as Error, {}, 'debug-utils');
    }
  }

  private analyzeErrorPatterns(): any {
    const failures = this.stepHistory.filter(s => s.status === 'failure');
    const patterns = {
      commonErrors: failures.reduce((acc, step) => {
        const errorType = step.error?.name || 'Unknown';
        acc[errorType] = (acc[errorType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      failureSequences: [] // Could analyze sequences of failures
    };

    return patterns;
  }

  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Public utility methods
   */
  public getStepHistory(): StepDebugInfo[] {
    return [...this.stepHistory];
  }

  public clearStepHistory(): void {
    this.stepHistory = [];
    this.stepCounter = 0;
  }

  public isDebuggingEnabled(): boolean {
    return this.isDebugging;
  }

  public getConfig(): DebugConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const debugUtils = DebugUtils.getInstance();
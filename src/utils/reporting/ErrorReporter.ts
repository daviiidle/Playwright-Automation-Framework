/**
 * Error reporting and analytics system for Playwright tests
 * Provides comprehensive error tracking, aggregation, and reporting capabilities
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { logger } from '../logging/Logger';
import { BasePlaywrightError, ErrorCategory, ErrorSeverity } from '../errors/PlaywrightErrors';

export interface ErrorReport {
  id: string;
  timestamp: string;
  sessionId: string;
  testInfo: {
    testName: string;
    testFile: string;
    projectName: string;
    duration: number;
    status: 'passed' | 'failed' | 'skipped';
  };
  error: {
    name: string;
    message: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
    isRecoverable: boolean;
    context: any;
    stackTrace?: string;
  };
  environment: {
    browser: string;
    browserVersion: string;
    os: string;
    nodeVersion: string;
    playwrightVersion: string;
    viewport: { width: number; height: number };
  };
  artifacts: {
    screenshot?: string;
    video?: string;
    trace?: string;
    context?: string;
    logs?: string;
  };
  recovery: {
    attempted: boolean;
    strategies: string[];
    successful: boolean;
    attempts: number;
  };
  metadata: Record<string, any>;
}

export interface ErrorAnalytics {
  summary: {
    totalErrors: number;
    period: string;
    mostCommonCategory: string;
    mostCommonSeverity: string;
    recoverablePercentage: number;
    successfulRecoveryRate: number;
  };
  trends: {
    errorsByDay: Record<string, number>;
    errorsByHour: Record<string, number>;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    errorsByBrowser: Record<string, number>;
    errorsByTest: Record<string, number>;
  };
  patterns: {
    commonFailureSequences: Array<{
      pattern: string[];
      frequency: number;
      averageDuration: number;
    }>;
    timeBasedPatterns: Array<{
      timeRange: string;
      errorRate: number;
      categories: string[];
    }>;
    environmentalFactors: Array<{
      factor: string;
      correlation: number;
      description: string;
    }>;
  };
  recommendations: Array<{
    type: 'infrastructure' | 'test-design' | 'environment' | 'recovery';
    priority: 'high' | 'medium' | 'low';
    description: string;
    impact: string;
    effort: string;
  }>;
}

export interface ReporterConfig {
  enabled: boolean;
  outputDir: string;
  enableRealTimeReporting: boolean;
  enableAnalytics: boolean;
  retentionDays: number;
  aggregationInterval: number; // minutes
  webhooks: Array<{
    url: string;
    events: string[];
    headers?: Record<string, string>;
  }>;
  emailNotifications: {
    enabled: boolean;
    recipients: string[];
    severityThreshold: ErrorSeverity;
    rateLimitMinutes: number;
  };
  slackIntegration: {
    enabled: boolean;
    webhookUrl: string;
    channel: string;
    severityThreshold: ErrorSeverity;
  };
}

export class ErrorReporter {
  private static instance: ErrorReporter;
  private config: ReporterConfig;
  private reportDir: string;
  private analyticsDir: string;
  private reports: Map<string, ErrorReport> = new Map();
  private sessionErrors: ErrorReport[] = [];

  private constructor(config: Partial<ReporterConfig> = {}) {
    this.config = {
      enabled: true,
      outputDir: './error-reports',
      enableRealTimeReporting: true,
      enableAnalytics: true,
      retentionDays: 30,
      aggregationInterval: 60, // 1 hour
      webhooks: [],
      emailNotifications: {
        enabled: false,
        recipients: [],
        severityThreshold: ErrorSeverity.HIGH,
        rateLimitMinutes: 60
      },
      slackIntegration: {
        enabled: false,
        webhookUrl: '',
        channel: '#test-failures',
        severityThreshold: ErrorSeverity.HIGH
      },
      ...config
    };

    this.reportDir = join(this.config.outputDir, 'reports');
    this.analyticsDir = join(this.config.outputDir, 'analytics');
    this.ensureDirectories();
  }

  public static getInstance(config?: Partial<ReporterConfig>): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter(config);
    }
    return ErrorReporter.instance;
  }

  public static configure(config: Partial<ReporterConfig>): void {
    ErrorReporter.instance = new ErrorReporter(config);
  }

  private ensureDirectories(): void {
    [this.reportDir, this.analyticsDir].forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Report an error with comprehensive context
   */
  public async reportError(
    error: BasePlaywrightError,
    testInfo: {
      testName: string;
      testFile: string;
      projectName: string;
      duration: number;
      status: 'passed' | 'failed' | 'skipped';
    },
    environment: any,
    artifacts: any = {},
    recovery: any = {},
    metadata: Record<string, any> = {}
  ): Promise<string> {
    if (!this.config.enabled) {
      return '';
    }

    const reportId = this.generateReportId();

    const report: ErrorReport = {
      id: reportId,
      timestamp: new Date().toISOString(),
      sessionId: logger.getSessionId(),
      testInfo,
      error: {
        name: error.name,
        message: error.message,
        category: error.category,
        severity: error.severity,
        isRecoverable: error.isRecoverable,
        context: error.context,
        stackTrace: error.stack
      },
      environment,
      artifacts,
      recovery: {
        attempted: false,
        strategies: [],
        successful: false,
        attempts: 0,
        ...recovery
      },
      metadata
    };

    this.reports.set(reportId, report);
    this.sessionErrors.push(report);

    // Save report to file
    await this.saveReport(report);

    // Send notifications if configured
    await this.sendNotifications(report);

    // Real-time analytics update
    if (this.config.enableRealTimeReporting) {
      await this.updateRealTimeAnalytics(report);
    }

    logger.info('Error report created', { reportId, category: error.category }, 'error-reporter');

    return reportId;
  }

  /**
   * Update error report with recovery information
   */
  public async updateErrorReport(
    reportId: string,
    recovery: {
      attempted: boolean;
      strategies: string[];
      successful: boolean;
      attempts: number;
    }
  ): Promise<void> {
    const report = this.reports.get(reportId);
    if (report) {
      report.recovery = recovery;
      await this.saveReport(report);

      logger.debug('Error report updated with recovery info', { reportId, recovery }, 'error-reporter');
    }
  }

  /**
   * Generate comprehensive analytics
   */
  public async generateAnalytics(days: number = 7): Promise<ErrorAnalytics> {
    logger.info('Generating error analytics', { days }, 'error-reporter');

    const reports = await this.loadReportsFromPeriod(days);

    const analytics: ErrorAnalytics = {
      summary: this.generateSummary(reports),
      trends: this.analyzeTrends(reports),
      patterns: this.identifyPatterns(reports),
      recommendations: this.generateRecommendations(reports)
    };

    // Save analytics
    await this.saveAnalytics(analytics, days);

    logger.info('Error analytics generated', {
      totalErrors: analytics.summary.totalErrors,
      period: analytics.summary.period
    }, 'error-reporter');

    return analytics;
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(reports: ErrorReport[]): ErrorAnalytics['summary'] {
    const total = reports.length;
    const recoverable = reports.filter(r => r.error.isRecoverable).length;
    const successfulRecoveries = reports.filter(r => r.recovery.successful).length;

    const categoryCounts = this.groupBy(reports, r => r.error.category);
    const severityCounts = this.groupBy(reports, r => r.error.severity);

    return {
      totalErrors: total,
      period: `Last ${Math.ceil((Date.now() - new Date(reports[0]?.timestamp || Date.now()).getTime()) / (24 * 60 * 60 * 1000))} days`,
      mostCommonCategory: this.getMostCommon(categoryCounts),
      mostCommonSeverity: this.getMostCommon(severityCounts),
      recoverablePercentage: total > 0 ? (recoverable / total) * 100 : 0,
      successfulRecoveryRate: recoverable > 0 ? (successfulRecoveries / recoverable) * 100 : 0
    };
  }

  /**
   * Analyze trends over time
   */
  private analyzeTrends(reports: ErrorReport[]): ErrorAnalytics['trends'] {
    const errorsByDay: Record<string, number> = {};
    const errorsByHour: Record<string, number> = {};
    const errorsByCategory: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    const errorsByBrowser: Record<string, number> = {};
    const errorsByTest: Record<string, number> = {};

    reports.forEach(report => {
      const date = new Date(report.timestamp);
      const day = date.toISOString().split('T')[0];
      const hour = date.getHours().toString();

      errorsByDay[day] = (errorsByDay[day] || 0) + 1;
      errorsByHour[hour] = (errorsByHour[hour] || 0) + 1;
      errorsByCategory[report.error.category] = (errorsByCategory[report.error.category] || 0) + 1;
      errorsBySeverity[report.error.severity] = (errorsBySeverity[report.error.severity] || 0) + 1;
      errorsByBrowser[report.environment.browser] = (errorsByBrowser[report.environment.browser] || 0) + 1;
      errorsByTest[report.testInfo.testName] = (errorsByTest[report.testInfo.testName] || 0) + 1;
    });

    return {
      errorsByDay,
      errorsByHour,
      errorsByCategory,
      errorsBySeverity,
      errorsByBrowser,
      errorsByTest
    };
  }

  /**
   * Identify patterns in errors
   */
  private identifyPatterns(reports: ErrorReport[]): ErrorAnalytics['patterns'] {
    return {
      commonFailureSequences: this.findFailureSequences(reports),
      timeBasedPatterns: this.findTimeBasedPatterns(reports),
      environmentalFactors: this.findEnvironmentalFactors(reports)
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(reports: ErrorReport[]): ErrorAnalytics['recommendations'] {
    const recommendations: ErrorAnalytics['recommendations'] = [];

    const categoryCounts = this.groupBy(reports, r => r.error.category);

    // High frequency element not found errors
    if (categoryCounts[ErrorCategory.ELEMENT_NOT_FOUND] > reports.length * 0.3) {
      recommendations.push({
        type: 'test-design',
        priority: 'high',
        description: 'High frequency of element not found errors detected',
        impact: 'Reduced test reliability and increased maintenance overhead',
        effort: 'Medium - Review and improve element selectors'
      });
    }

    // Network timeout issues
    if (categoryCounts[ErrorCategory.NETWORK_TIMEOUT] > reports.length * 0.2) {
      recommendations.push({
        type: 'infrastructure',
        priority: 'high',
        description: 'Frequent network timeouts suggest infrastructure issues',
        impact: 'Test flakiness and reduced confidence in results',
        effort: 'High - Investigate network infrastructure and increase timeouts'
      });
    }

    // Low recovery success rate
    const recoverableErrors = reports.filter(r => r.error.isRecoverable);
    const successfulRecoveries = recoverableErrors.filter(r => r.recovery.successful);
    if (recoverableErrors.length > 0 && successfulRecoveries.length / recoverableErrors.length < 0.5) {
      recommendations.push({
        type: 'recovery',
        priority: 'medium',
        description: 'Low recovery success rate indicates need for better recovery strategies',
        impact: 'Missed opportunities for automatic error recovery',
        effort: 'Medium - Improve recovery strategy implementations'
      });
    }

    return recommendations;
  }

  /**
   * Find common failure sequences
   */
  private findFailureSequences(reports: ErrorReport[]): Array<{
    pattern: string[];
    frequency: number;
    averageDuration: number;
  }> {
    // Group reports by test and analyze sequences
    const testReports = this.groupBy(reports, r => r.testInfo.testName);
    const sequences: Array<{ pattern: string[]; frequency: number; averageDuration: number }> = [];

    Object.values(testReports).forEach(testReports => {
      if (testReports.length >= 2) {
        const pattern = testReports.map(r => r.error.category);
        const avgDuration = testReports.reduce((sum, r) => sum + r.testInfo.duration, 0) / testReports.length;

        sequences.push({
          pattern,
          frequency: testReports.length,
          averageDuration: avgDuration
        });
      }
    });

    return sequences.sort((a, b) => b.frequency - a.frequency).slice(0, 10);
  }

  /**
   * Find time-based patterns
   */
  private findTimeBasedPatterns(reports: ErrorReport[]): Array<{
    timeRange: string;
    errorRate: number;
    categories: string[];
  }> {
    const patterns: Array<{ timeRange: string; errorRate: number; categories: string[] }> = [];

    // Analyze by hour of day
    const hourlyErrors = this.groupBy(reports, r => new Date(r.timestamp).getHours().toString());

    Object.entries(hourlyErrors).forEach(([hour, hourReports]) => {
      const categories = [...new Set(hourReports.map(r => r.error.category))];
      patterns.push({
        timeRange: `${hour}:00-${hour}:59`,
        errorRate: hourReports.length,
        categories
      });
    });

    return patterns.sort((a, b) => b.errorRate - a.errorRate).slice(0, 5);
  }

  /**
   * Find environmental factors
   */
  private findEnvironmentalFactors(reports: ErrorReport[]): Array<{
    factor: string;
    correlation: number;
    description: string;
  }> {
    const factors: Array<{ factor: string; correlation: number; description: string }> = [];

    // Browser correlation
    const browserErrors = this.groupBy(reports, r => r.environment.browser);
    const totalReports = reports.length;

    Object.entries(browserErrors).forEach(([browser, browserReports]) => {
      const correlation = browserReports.length / totalReports;
      factors.push({
        factor: `Browser: ${browser}`,
        correlation,
        description: `${(correlation * 100).toFixed(1)}% of errors occur in ${browser}`
      });
    });

    return factors.sort((a, b) => b.correlation - a.correlation);
  }

  /**
   * Utility methods
   */
  private groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      groups[key] = groups[key] || [];
      groups[key].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  private getMostCommon(counts: Record<string, any[]>): string {
    return Object.entries(counts)
      .sort(([,a], [,b]) => b.length - a.length)[0]?.[0] || 'unknown';
  }

  private generateReportId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * File operations
   */
  private async saveReport(report: ErrorReport): Promise<void> {
    try {
      const filename = `${report.id}.json`;
      const filepath = join(this.reportDir, filename);
      writeFileSync(filepath, JSON.stringify(report, null, 2));
    } catch (error) {
      logger.error('Failed to save error report', error as Error, { reportId: report.id }, 'error-reporter');
    }
  }

  private async saveAnalytics(analytics: ErrorAnalytics, days: number): Promise<void> {
    try {
      const filename = `analytics_${days}d_${new Date().toISOString().split('T')[0]}.json`;
      const filepath = join(this.analyticsDir, filename);
      writeFileSync(filepath, JSON.stringify(analytics, null, 2));
    } catch (error) {
      logger.error('Failed to save analytics', error as Error, {}, 'error-reporter');
    }
  }

  private async loadReportsFromPeriod(days: number): Promise<ErrorReport[]> {
    // This would load reports from the last N days
    // For now, return current session errors
    return this.sessionErrors;
  }

  /**
   * Notification methods
   */
  private async sendNotifications(report: ErrorReport): Promise<void> {
    if (report.error.severity === ErrorSeverity.CRITICAL || report.error.severity === ErrorSeverity.HIGH) {
      await this.sendSlackNotification(report);
      await this.sendWebhookNotifications(report);
    }
  }

  private async sendSlackNotification(report: ErrorReport): Promise<void> {
    if (!this.config.slackIntegration.enabled || !this.config.slackIntegration.webhookUrl) {
      return;
    }

    // Implement Slack notification logic
    logger.debug('Slack notification would be sent', { reportId: report.id }, 'error-reporter');
  }

  private async sendWebhookNotifications(report: ErrorReport): Promise<void> {
    for (const webhook of this.config.webhooks) {
      if (webhook.events.includes('error') || webhook.events.includes('*')) {
        // Implement webhook notification logic
        logger.debug('Webhook notification would be sent', {
          reportId: report.id,
          webhookUrl: webhook.url
        }, 'error-reporter');
      }
    }
  }

  private async updateRealTimeAnalytics(report: ErrorReport): Promise<void> {
    // Update real-time analytics dashboard
    logger.debug('Real-time analytics updated', { reportId: report.id }, 'error-reporter');
  }

  /**
   * Public methods for accessing data
   */
  public getSessionErrors(): ErrorReport[] {
    return [...this.sessionErrors];
  }

  public getReport(reportId: string): ErrorReport | undefined {
    return this.reports.get(reportId);
  }

  public clearSession(): void {
    this.sessionErrors = [];
    this.reports.clear();
    logger.info('Error reporter session cleared', {}, 'error-reporter');
  }

  public getConfig(): ReporterConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const errorReporter = ErrorReporter.getInstance();
/**
 * Utility for analyzing test failures and generating debugging insights
 * Helps identify patterns, common failures, and provides debugging hints
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { ErrorSummary, ErrorLogEntry } from '../reporters/ErrorOnlyReporter';

export interface FailurePattern {
  pattern: string;
  count: number;
  percentage: number;
  examples: string[];
  debuggingHints: string[];
}

export interface FailureInsight {
  category: string;
  description: string;
  affectedTests: string[];
  recommendations: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface HistoricalAnalysis {
  totalRuns: number;
  averageFailureRate: number;
  trendingErrors: FailurePattern[];
  flakyTests: string[];
  consistentFailures: string[];
}

export class FailureSummary {
  private errorLogsDir: string;

  constructor(errorLogsDir = 'test-results/error-logs') {
    this.errorLogsDir = errorLogsDir;
  }

  /**
   * Generate failure analysis from the latest error log
   */
  public generateLatestAnalysis(): FailureInsight[] | null {
    const latestErrorsPath = join(this.errorLogsDir, 'latest-errors.json');

    if (!existsSync(latestErrorsPath)) {
      console.warn('No latest errors file found. Run tests to generate error logs.');
      return null;
    }

    try {
      const errorData: ErrorSummary = JSON.parse(readFileSync(latestErrorsPath, 'utf-8'));
      return this.analyzeErrors(errorData.errors);
    } catch (error) {
      console.error('Failed to parse error log:', error);
      return null;
    }
  }

  /**
   * Generate historical analysis from all error logs
   */
  public generateHistoricalAnalysis(): HistoricalAnalysis | null {
    if (!existsSync(this.errorLogsDir)) {
      console.warn('Error logs directory not found.');
      return null;
    }

    const errorFiles = readdirSync(this.errorLogsDir)
      .filter(file => file.startsWith('errors-') && file.endsWith('.json'))
      .sort();

    if (errorFiles.length === 0) {
      console.warn('No historical error logs found.');
      return null;
    }

    const allErrorSummaries: ErrorSummary[] = [];

    for (const file of errorFiles) {
      try {
        const errorData: ErrorSummary = JSON.parse(
          readFileSync(join(this.errorLogsDir, file), 'utf-8')
        );
        allErrorSummaries.push(errorData);
      } catch (error) {
        console.warn(`Failed to parse ${file}:`, error);
      }
    }

    return this.analyzeHistoricalData(allErrorSummaries);
  }

  /**
   * Analyze current errors and generate insights
   */
  private analyzeErrors(errors: ErrorLogEntry[]): FailureInsight[] {
    const insights: FailureInsight[] = [];

    // Group errors by common patterns
    const patterns = this.identifyPatterns(errors);

    // Analyze timeout issues
    const timeoutErrors = errors.filter(e =>
      e.error.message.toLowerCase().includes('timeout')
    );
    if (timeoutErrors.length > 0) {
      insights.push({
        category: 'Timeout Issues',
        description: `${timeoutErrors.length} tests failed due to timeouts`,
        affectedTests: timeoutErrors.map(e => e.testName),
        recommendations: [
          'Increase timeout values in playwright.config.ts',
          'Check for slow network conditions or server response times',
          'Review if selectors are waiting for the correct elements',
          'Consider using waitForLoadState() before interactions'
        ],
        priority: timeoutErrors.length > errors.length * 0.3 ? 'high' : 'medium'
      });
    }

    // Analyze selector/locator issues
    const selectorErrors = errors.filter(e => {
      const msg = e.error.message.toLowerCase();
      return msg.includes('locator') || msg.includes('selector') || msg.includes('not found');
    });
    if (selectorErrors.length > 0) {
      insights.push({
        category: 'Element Location Issues',
        description: `${selectorErrors.length} tests failed to find elements`,
        affectedTests: selectorErrors.map(e => e.testName),
        recommendations: [
          'Verify selectors are correct and elements exist on the page',
          'Use more stable selectors (data-testid, role-based selectors)',
          'Add explicit waits before element interactions',
          'Check if elements are dynamically loaded or in different viewport',
          'Use playwright inspector: npx playwright test --debug'
        ],
        priority: selectorErrors.length > errors.length * 0.4 ? 'high' : 'medium'
      });
    }

    // Analyze assertion failures
    const assertionErrors = errors.filter(e => {
      const msg = e.error.message.toLowerCase();
      return msg.includes('expect') || msg.includes('assertion') || msg.includes('received');
    });
    if (assertionErrors.length > 0) {
      insights.push({
        category: 'Assertion Failures',
        description: `${assertionErrors.length} tests failed due to unexpected values`,
        affectedTests: assertionErrors.map(e => e.testName),
        recommendations: [
          'Review expected vs actual values in test output',
          'Check if application behavior has changed',
          'Verify test data and environment state',
          'Consider adding more specific assertions',
          'Review screenshots to understand page state during failure'
        ],
        priority: 'medium'
      });
    }

    // Analyze authentication/login issues
    const authErrors = errors.filter(e => {
      const msg = e.error.message.toLowerCase();
      return msg.includes('login') || msg.includes('auth') || msg.includes('credential') ||
             msg.includes('permission') || e.testName.toLowerCase().includes('login');
    });
    if (authErrors.length > 0) {
      insights.push({
        category: 'Authentication Issues',
        description: `${authErrors.length} tests failed during authentication`,
        affectedTests: authErrors.map(e => e.testName),
        recommendations: [
          'Verify login credentials are correct',
          'Check if authentication service is available',
          'Review session management and cookie handling',
          'Ensure proper test isolation between auth tests',
          'Consider using authentication state setup in beforeEach'
        ],
        priority: 'high'
      });
    }

    // Analyze retry patterns
    const retriedTests = errors.filter(e => e.context.retry > 0);
    if (retriedTests.length > 0) {
      insights.push({
        category: 'Flaky Tests',
        description: `${retriedTests.length} tests required retries (potential flakiness)`,
        affectedTests: retriedTests.map(e => e.testName),
        recommendations: [
          'Investigate why these tests are unstable',
          'Add better wait conditions and element visibility checks',
          'Review test data setup and cleanup',
          'Consider test isolation improvements',
          'Reduce dependencies on external services during tests'
        ],
        priority: 'medium'
      });
    }

    // Analyze project-specific issues
    const projectGroups = this.groupBy(errors, e => e.projectName);
    Object.entries(projectGroups).forEach(([project, projectErrors]) => {
      if (projectErrors.length > errors.length * 0.8 && Object.keys(projectGroups).length > 1) {
        insights.push({
          category: 'Project-Specific Issues',
          description: `Most failures (${projectErrors.length}) occurred in ${project} project`,
          affectedTests: projectErrors.map(e => e.testName),
          recommendations: [
            `Review ${project} browser-specific configurations`,
            'Check for browser compatibility issues',
            'Verify project-specific settings in playwright.config.ts',
            'Test locally with the same browser configuration'
          ],
          priority: 'medium'
        });
      }
    });

    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Analyze historical data for trends and patterns
   */
  private analyzeHistoricalData(summaries: ErrorSummary[]): HistoricalAnalysis {
    const totalRuns = summaries.length;
    const averageFailureRate = summaries.reduce((sum, s) => sum + s.failureRate, 0) / totalRuns;

    // Find trending errors
    const allErrors = summaries.flatMap(s => s.errors);
    const errorPatterns = this.identifyPatterns(allErrors);
    const trendingErrors = Object.entries(errorPatterns)
      .map(([pattern, errors]): FailurePattern => ({
        pattern,
        count: errors.length,
        percentage: (errors.length / allErrors.length) * 100,
        examples: errors.slice(0, 3).map(e => e.error.message),
        debuggingHints: this.getDebuggingHints(pattern)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Find flaky tests (appear in multiple runs but not consistently)
    const testOccurrences = new Map<string, number>();
    summaries.forEach(summary => {
      const testNames = new Set(summary.errors.map(e => e.testName));
      testNames.forEach(testName => {
        testOccurrences.set(testName, (testOccurrences.get(testName) || 0) + 1);
      });
    });

    const flakyTests = Array.from(testOccurrences.entries())
      .filter(([, count]) => count > 1 && count < totalRuns * 0.8)
      .map(([testName]) => testName)
      .slice(0, 10);

    // Find consistently failing tests
    const consistentFailures = Array.from(testOccurrences.entries())
      .filter(([, count]) => count >= totalRuns * 0.8)
      .map(([testName]) => testName);

    return {
      totalRuns,
      averageFailureRate,
      trendingErrors,
      flakyTests,
      consistentFailures
    };
  }

  /**
   * Identify error patterns and group similar errors
   */
  private identifyPatterns(errors: ErrorLogEntry[]): Record<string, ErrorLogEntry[]> {
    const patterns: Record<string, ErrorLogEntry[]> = {};

    errors.forEach(error => {
      const message = error.error.message.toLowerCase();
      let patternKey = 'Other';

      if (message.includes('timeout')) {
        patternKey = 'Timeout Errors';
      } else if (message.includes('locator') || message.includes('selector')) {
        patternKey = 'Element Not Found';
      } else if (message.includes('expect') || message.includes('assertion')) {
        patternKey = 'Assertion Failures';
      } else if (message.includes('network') || message.includes('request')) {
        patternKey = 'Network Issues';
      } else if (message.includes('navigation')) {
        patternKey = 'Navigation Errors';
      } else if (message.includes('login') || message.includes('auth')) {
        patternKey = 'Authentication Errors';
      }

      if (!patterns[patternKey]) {
        patterns[patternKey] = [];
      }
      patterns[patternKey].push(error);
    });

    return patterns;
  }

  /**
   * Get debugging hints for specific error patterns
   */
  private getDebuggingHints(pattern: string): string[] {
    const hints: Record<string, string[]> = {
      'Timeout Errors': [
        'Increase timeout values in playwright.config.ts',
        'Use waitForLoadState() before interactions',
        'Check network conditions and server response times'
      ],
      'Element Not Found': [
        'Use playwright inspector: npx playwright test --debug',
        'Check if selectors are correct and elements exist',
        'Add explicit waits before element interactions'
      ],
      'Assertion Failures': [
        'Review expected vs actual values in error messages',
        'Check if application behavior has changed',
        'Verify test data and environment state'
      ],
      'Network Issues': [
        'Check if external services are available',
        'Review network configurations and proxies',
        'Consider mocking external dependencies'
      ],
      'Navigation Errors': [
        'Verify URLs are correct and accessible',
        'Check for redirects or authentication requirements',
        'Increase navigation timeout values'
      ],
      'Authentication Errors': [
        'Verify login credentials and authentication flow',
        'Check session management and cookie handling',
        'Ensure proper test isolation'
      ]
    };

    return hints[pattern] || ['Review error details and stack trace for specific guidance'];
  }

  /**
   * Utility function to group array items by a key
   */
  private groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      (groups[key] = groups[key] || []).push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  /**
   * Generate a formatted report of insights
   */
  public formatInsightsReport(insights: FailureInsight[]): string {
    if (!insights || insights.length === 0) {
      return 'No failure insights available. All tests may have passed!';
    }

    let report = '';
    report += '🔍 FAILURE ANALYSIS REPORT\n';
    report += '='.repeat(50) + '\n\n';

    insights.forEach((insight, index) => {
      const priorityEmoji = insight.priority === 'high' ? '🔥' :
                           insight.priority === 'medium' ? '⚠️' : 'ℹ️';

      report += `${index + 1}. ${priorityEmoji} ${insight.category}\n`;
      report += `   ${insight.description}\n\n`;

      if (insight.affectedTests.length > 0) {
        report += `   Affected Tests (${insight.affectedTests.length}):\n`;
        insight.affectedTests.slice(0, 5).forEach(test => {
          report += `   • ${test}\n`;
        });
        if (insight.affectedTests.length > 5) {
          report += `   • ... and ${insight.affectedTests.length - 5} more\n`;
        }
        report += '\n';
      }

      report += `   Recommendations:\n`;
      insight.recommendations.forEach(rec => {
        report += `   • ${rec}\n`;
      });
      report += '\n' + '-'.repeat(50) + '\n\n';
    });

    return report;
  }

  /**
   * Generate a quick debugging command summary
   */
  public generateDebuggingCommands(): string {
    return `
🛠️  QUICK DEBUGGING COMMANDS:

# Run failed tests in debug mode
npx playwright test --last-failed --debug

# Run with headed browser to see what's happening
npx playwright test --headed

# Generate and view HTML report
npx playwright show-report

# Run specific failing test
npx playwright test <test-file-name> --debug

# Check test results with trace viewer
npx playwright show-trace <trace-file-path>

# Run tests with maximum verbosity
npx playwright test --reporter=line --verbose
`;
  }
}

export default FailureSummary;
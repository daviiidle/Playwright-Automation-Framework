#!/usr/bin/env node

/**
 * Command-line utility for analyzing test failure logs
 * Usage: npx ts-node src/utils/ErrorAnalyzer.ts [command]
 */

import { FailureSummary } from './FailureSummary';
import { ErrorHandler } from './ErrorHandler';

class ErrorAnalyzer {
  private failureSummary: FailureSummary;
  private errorHandler: ErrorHandler;

  constructor() {
    this.failureSummary = new FailureSummary();
    this.errorHandler = ErrorHandler.getInstance();
  }

  public showLatestErrors(): void {
    console.log('🔍 LATEST ERROR ANALYSIS');
    console.log('='.repeat(50));

    const insights = this.failureSummary.generateLatestAnalysis();

    if (!insights) {
      console.log('✅ No recent errors found! All tests are passing.');
      return;
    }

    const report = this.failureSummary.formatInsightsReport(insights);
    console.log(report);

    console.log(this.failureSummary.generateDebuggingCommands());
  }

  public showHistoricalAnalysis(): void {
    console.log('📊 HISTORICAL ERROR ANALYSIS');
    console.log('='.repeat(50));

    const analysis = this.failureSummary.generateHistoricalAnalysis();

    if (!analysis) {
      console.log('📂 No historical error data found.');
      return;
    }

    console.log(`📈 Total test runs analyzed: ${analysis.totalRuns}`);
    console.log(`📊 Average failure rate: ${analysis.averageFailureRate.toFixed(1)}%\n`);

    if (analysis.trendingErrors.length > 0) {
      console.log('🔥 TRENDING ERROR PATTERNS:');
      console.log('-'.repeat(30));
      analysis.trendingErrors.slice(0, 5).forEach((pattern, index) => {
        console.log(`${index + 1}. ${pattern.pattern}: ${pattern.count} occurrences (${pattern.percentage.toFixed(1)}%)`);
        if (pattern.examples.length > 0) {
          console.log(`   Example: ${pattern.examples[0]}`);
        }
      });
      console.log('');
    }

    if (analysis.flakyTests.length > 0) {
      console.log('🌪️  FLAKY TESTS (intermittent failures):');
      console.log('-'.repeat(30));
      analysis.flakyTests.forEach(test => console.log(`• ${test}`));
      console.log('');
    }

    if (analysis.consistentFailures.length > 0) {
      console.log('💥 CONSISTENT FAILURES:');
      console.log('-'.repeat(30));
      analysis.consistentFailures.forEach(test => console.log(`• ${test}`));
      console.log('');
    }
  }

  public showErrorHandlerReport(): void {
    console.log('🛠️  ERROR HANDLER REPORT');
    console.log('='.repeat(50));

    const report = this.errorHandler.generateDetailedErrorReport();
    console.log(report);

    const suggestions = this.errorHandler.getDebuggingSuggestions();
    if (suggestions.length > 0) {
      console.log('\n💡 DEBUGGING SUGGESTIONS:');
      console.log('-'.repeat(30));
      suggestions.forEach(suggestion => console.log(suggestion));
    }
  }

  public showStrictModeAnalysis(): void {
    console.log('🎯 STRICT MODE VIOLATIONS ANALYSIS');
    console.log('='.repeat(50));

    const strictModeErrors = this.analyzeStrictModeViolations();

    if (strictModeErrors.length === 0) {
      console.log('✅ No strict mode violations found! All selectors are working correctly.');
      return;
    }

    console.log(`❌ Found ${strictModeErrors.length} strict mode violations:\n`);

    // Group by selector patterns
    const selectorGroups = this.groupStrictModeErrorsBySelector(strictModeErrors);

    Object.entries(selectorGroups).forEach(([selector, errors], index) => {
      console.log(`${index + 1}. Selector: ${selector}`);
      console.log(`   Occurrences: ${errors.length}`);
      console.log(`   Elements found: ${errors[0].strictModeDetails?.elementsFound || 'unknown'}`);
      console.log(`   Suggested fix: ${errors[0].strictModeDetails?.suggestedFix || 'Use .first() method'}`);

      if (errors[0].strictModeDetails?.foundElements?.length) {
        console.log('   Found elements:');
        errors[0].strictModeDetails.foundElements.forEach((element: string, i: number) => {
          console.log(`     ${i + 1}) ${element}`);
        });
      }

      console.log('   Test contexts:');
      errors.slice(0, 3).forEach(error => {
        console.log(`     - ${error.testName} on ${error.url}`);
      });
      if (errors.length > 3) {
        console.log(`     ... and ${errors.length - 3} more`);
      }
      console.log('');
    });

    console.log('🔧 RECOMMENDED ACTIONS:');
    console.log('-'.repeat(30));
    console.log('1. Add .first() to selectors that match multiple elements');
    console.log('2. Use more specific selectors (IDs, unique classes, attributes)');
    console.log('3. Prioritize more specific selectors in .or() chains');
    console.log('4. Use getByRole() with exact matches where appropriate');
    console.log('');
  }

  private analyzeStrictModeViolations(): any[] {
    const errors = this.errorHandler.getErrors();
    return errors
      .filter(error => error.type === 'STRICT_MODE_VIOLATION')
      .map(error => ({
        ...error,
        testName: error.context.testName,
        url: error.context.url,
        strictModeDetails: error.context.strictModeDetails
      }));
  }

  private groupStrictModeErrorsBySelector(errors: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {};

    errors.forEach(error => {
      const selector = error.strictModeDetails?.selector || 'unknown';
      if (!groups[selector]) {
        groups[selector] = [];
      }
      groups[selector].push(error);
    });

    // Sort groups by frequency (most common first)
    const sortedGroups: Record<string, any[]> = {};
    Object.entries(groups)
      .sort(([,a], [,b]) => b.length - a.length)
      .forEach(([selector, errorList]) => {
        sortedGroups[selector] = errorList;
      });

    return sortedGroups;
  }

  public showAssertionFailureAnalysis(): void {
    console.log('⚡ ASSERTION FAILURE ANALYSIS');
    console.log('='.repeat(50));

    const assertionErrors = this.analyzeAssertionFailures();

    if (assertionErrors.length === 0) {
      console.log('✅ No assertion failures found! All test expectations are passing.');
      return;
    }

    console.log(`❌ Found ${assertionErrors.length} assertion failures:\n`);

    // Group by assertion operation type
    const operationGroups = this.groupAssertionFailuresByOperation(assertionErrors);

    Object.entries(operationGroups).forEach(([operation, errors], index) => {
      console.log(`${index + 1}. Operation: ${operation}`);
      console.log(`   Occurrences: ${errors.length}`);
      console.log(`   Suggested fix: ${errors[0].assertionDetails?.suggestedFix || 'Review expected vs actual values'}`);

      // Show some examples
      console.log('   Common failures:');
      errors.slice(0, 3).forEach(error => {
        console.log(`     - Expected: "${error.assertionDetails?.expectedValue || 'N/A'}"`);
        console.log(`       Actual: "${error.assertionDetails?.actualValue || 'N/A'}"`);
        console.log(`       Test: ${error.testName}`);
        console.log('');
      });

      if (errors.length > 3) {
        console.log(`     ... and ${errors.length - 3} more\n`);
      }
    });

    console.log('🔧 RECOMMENDED ACTIONS:');
    console.log('-'.repeat(30));
    console.log('1. Review expected vs actual values for patterns');
    console.log('2. Add explicit waits before assertions (await page.waitForLoadState())');
    console.log('3. Use partial text matches instead of exact matches where appropriate');
    console.log('4. Normalize text (trim whitespace, convert case) before comparison');
    console.log('5. Check for dynamic content that changes between test runs');
    console.log('6. Use more flexible selectors or locator strategies');
    console.log('');
  }

  private analyzeAssertionFailures(): any[] {
    const errors = this.errorHandler.getErrors();
    return errors
      .filter(error => error.type === 'ASSERTION_FAILURE')
      .map(error => ({
        ...error,
        testName: error.context.testName,
        url: error.context.url,
        assertionDetails: error.context.assertionDetails
      }));
  }

  private groupAssertionFailuresByOperation(errors: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {};

    errors.forEach(error => {
      const operation = error.assertionDetails?.operation || 'unknown';
      if (!groups[operation]) {
        groups[operation] = [];
      }
      groups[operation].push(error);
    });

    // Sort groups by frequency (most common first)
    const sortedGroups: Record<string, any[]> = {};
    Object.entries(groups)
      .sort(([,a], [,b]) => b.length - a.length)
      .forEach(([operation, errorList]) => {
        sortedGroups[operation] = errorList;
      });

    return sortedGroups;
  }

  public showHelp(): void {
    console.log('🔧 ERROR ANALYZER - Help');
    console.log('='.repeat(30));
    console.log('Available commands:');
    console.log('  latest     - Show latest error analysis');
    console.log('  history    - Show historical error trends');
    console.log('  handler    - Show error handler report');
    console.log('  strict     - Show strict mode violations analysis');
    console.log('  assertions - Show assertion failure analysis');
    console.log('  help       - Show this help message');
    console.log('');
    console.log('Usage examples:');
    console.log('  npx ts-node src/utils/ErrorAnalyzer.ts latest');
    console.log('  npx ts-node src/utils/ErrorAnalyzer.ts history');
    console.log('  npx ts-node src/utils/ErrorAnalyzer.ts handler');
    console.log('  npx ts-node src/utils/ErrorAnalyzer.ts strict');
    console.log('  npx ts-node src/utils/ErrorAnalyzer.ts assertions');
    console.log('');
    console.log('Error log files location: test-results/error-logs/');
  }

  public run(command?: string): void {
    const cmd = command || process.argv[2] || 'latest';

    switch (cmd.toLowerCase()) {
      case 'latest':
        this.showLatestErrors();
        break;
      case 'history':
        this.showHistoricalAnalysis();
        break;
      case 'handler':
        this.showErrorHandlerReport();
        break;
      case 'strict':
        this.showStrictModeAnalysis();
        break;
      case 'assertions':
      case 'assert':
        this.showAssertionFailureAnalysis();
        break;
      case 'help':
      case '--help':
      case '-h':
        this.showHelp();
        break;
      default:
        console.log(`❌ Unknown command: ${cmd}`);
        console.log('Run "npx ts-node src/utils/ErrorAnalyzer.ts help" for available commands.');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const analyzer = new ErrorAnalyzer();
  analyzer.run();
}

export default ErrorAnalyzer;
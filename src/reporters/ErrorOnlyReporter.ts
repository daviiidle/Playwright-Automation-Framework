/**
 * Custom Playwright reporter that captures only failed tests and errors
 * Generates clean, consolidated error logs for easier debugging
 */

import { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface ErrorLogEntry {
  testName: string;
  testFile: string;
  projectName: string;
  error: {
    message: string;
    stack?: string;
    location?: string;
  };
  context: {
    url?: string;
    duration: number;
    retry: number;
    timestamp: string;
  };
  artifacts: {
    screenshot?: string;
    video?: string;
    trace?: string;
  };
}

export interface ErrorSummary {
  totalTests: number;
  totalFailed: number;
  totalPassed: number;
  totalSkipped: number;
  failureRate: number;
  testRunInfo: {
    startTime: string;
    endTime: string;
    duration: number;
    workers: number;
  };
  errors: ErrorLogEntry[];
  errorPatterns: {
    [pattern: string]: number;
  };
}

export class ErrorOnlyReporter implements Reporter {
  private errors: ErrorLogEntry[] = [];
  private totalTests = 0;
  private totalPassed = 0;
  private totalFailed = 0;
  private totalSkipped = 0;
  private startTime = '';
  private endTime = '';
  private outputDir = 'test-results/error-logs';

  constructor(options: { outputDir?: string } = {}) {
    if (options.outputDir) {
      this.outputDir = options.outputDir;
    }
    this.ensureOutputDirectory();
  }

  private ensureOutputDirectory(): void {
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.startTime = new Date().toISOString();
    console.log(`🔍 ErrorOnlyReporter: Starting error collection...`);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.totalTests++;

    if (result.status === 'passed') {
      this.totalPassed++;
    } else if (result.status === 'skipped') {
      this.totalSkipped++;
    } else if (result.status === 'failed' || result.status === 'timedOut') {
      this.totalFailed++;
      this.captureError(test, result);
    }
  }

  private captureError(test: TestCase, result: TestResult): void {
    const error = result.error;
    if (!error) return;

    // Extract test location
    const location = test.location;
    const testFile = location ? `${location.file}:${location.line}:${location.column}` : 'unknown';

    // Get project name
    const projectName = test.parent?.project()?.name || 'unknown';

    // Find artifacts
    const artifacts = this.extractArtifacts(result);

    const errorEntry: ErrorLogEntry = {
      testName: test.title,
      testFile,
      projectName,
      error: {
        message: error.message || 'Unknown error',
        stack: error.stack,
        location: testFile
      },
      context: {
        duration: result.duration,
        retry: result.retry,
        timestamp: new Date().toISOString()
      },
      artifacts
    };

    // Try to extract URL from error message or stack
    const urlMatch = error.message?.match(/(?:url|URL).*?(https?:\/\/[^\s]+)/);
    if (urlMatch) {
      errorEntry.context.url = urlMatch[1];
    }

    this.errors.push(errorEntry);
  }

  private extractArtifacts(result: TestResult): ErrorLogEntry['artifacts'] {
    const artifacts: ErrorLogEntry['artifacts'] = {};

    for (const attachment of result.attachments) {
      if (attachment.name === 'screenshot' && attachment.path) {
        artifacts.screenshot = attachment.path;
      } else if (attachment.name === 'video' && attachment.path) {
        artifacts.video = attachment.path;
      } else if (attachment.name === 'trace' && attachment.path) {
        artifacts.trace = attachment.path;
      }
    }

    return artifacts;
  }

  private generateErrorPatterns(): { [pattern: string]: number } {
    const patterns: { [pattern: string]: number } = {};

    this.errors.forEach(error => {
      const message = error.error.message.toLowerCase();

      // Common error patterns
      if (message.includes('timeout')) {
        patterns['Timeout errors'] = (patterns['Timeout errors'] || 0) + 1;
      }
      if (message.includes('locator') || message.includes('selector')) {
        patterns['Element not found'] = (patterns['Element not found'] || 0) + 1;
      }
      if (message.includes('expect') || message.includes('assertion')) {
        patterns['Assertion failures'] = (patterns['Assertion failures'] || 0) + 1;
      }
      if (message.includes('network') || message.includes('request')) {
        patterns['Network issues'] = (patterns['Network issues'] || 0) + 1;
      }
      if (message.includes('navigation')) {
        patterns['Navigation errors'] = (patterns['Navigation errors'] || 0) + 1;
      }
      if (message.includes('login') || message.includes('auth')) {
        patterns['Authentication errors'] = (patterns['Authentication errors'] || 0) + 1;
      }
    });

    return patterns;
  }

  onEnd(result: FullResult): void {
    this.endTime = new Date().toISOString();

    if (this.totalFailed === 0) {
      console.log(`✅ ErrorOnlyReporter: No failures detected! All ${this.totalPassed} tests passed.`);
      return;
    }

    const summary = this.generateSummary();
    this.writeErrorLogs(summary);
    console.log(`❌ ErrorOnlyReporter: Captured ${this.totalFailed} failures. Error logs written to ${this.outputDir}`);
  }

  private generateSummary(): ErrorSummary {
    const startTime = new Date(this.startTime);
    const endTime = new Date(this.endTime);

    return {
      totalTests: this.totalTests,
      totalFailed: this.totalFailed,
      totalPassed: this.totalPassed,
      totalSkipped: this.totalSkipped,
      failureRate: this.totalTests > 0 ? (this.totalFailed / this.totalTests) * 100 : 0,
      testRunInfo: {
        startTime: this.startTime,
        endTime: this.endTime,
        duration: endTime.getTime() - startTime.getTime(),
        workers: 1 // TODO: Extract from config if needed
      },
      errors: this.errors,
      errorPatterns: this.generateErrorPatterns()
    };
  }

  private writeErrorLogs(summary: ErrorSummary): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Write detailed JSON log
    const jsonLogPath = join(this.outputDir, `errors-${timestamp}.json`);
    writeFileSync(jsonLogPath, JSON.stringify(summary, null, 2));

    // Write human-readable summary
    const textLogPath = join(this.outputDir, `errors-${timestamp}.txt`);
    writeFileSync(textLogPath, this.formatTextSummary(summary));

    // Write latest errors (always overwrite for easy access)
    const latestJsonPath = join(this.outputDir, 'latest-errors.json');
    const latestTextPath = join(this.outputDir, 'latest-errors.txt');
    writeFileSync(latestJsonPath, JSON.stringify(summary, null, 2));
    writeFileSync(latestTextPath, this.formatTextSummary(summary));
  }

  private formatTextSummary(summary: ErrorSummary): string {
    const { testRunInfo, errors, errorPatterns } = summary;
    const duration = Math.round(testRunInfo.duration / 1000);

    let output = '';
    output += '='.repeat(80) + '\n';
    output += '                           TEST FAILURE SUMMARY\n';
    output += '='.repeat(80) + '\n';
    output += `Test Run: ${testRunInfo.startTime}\n`;
    output += `Duration: ${duration}s\n`;
    output += `Total Tests: ${summary.totalTests}\n`;
    output += `✅ Passed: ${summary.totalPassed}\n`;
    output += `❌ Failed: ${summary.totalFailed}\n`;
    output += `⏭️  Skipped: ${summary.totalSkipped}\n`;
    output += `📊 Failure Rate: ${summary.failureRate.toFixed(1)}%\n`;
    output += '\n';

    if (Object.keys(errorPatterns).length > 0) {
      output += '📈 ERROR PATTERNS:\n';
      output += '-'.repeat(40) + '\n';
      Object.entries(errorPatterns)
        .sort(([,a], [,b]) => b - a)
        .forEach(([pattern, count]) => {
          output += `${pattern}: ${count}\n`;
        });
      output += '\n';
    }

    output += '💥 DETAILED FAILURES:\n';
    output += '-'.repeat(40) + '\n';

    errors.forEach((error, index) => {
      output += `\n${index + 1}. ${error.testName}\n`;
      output += `   📁 File: ${error.testFile}\n`;
      output += `   🚀 Project: ${error.projectName}\n`;
      output += `   ⏱️  Duration: ${Math.round(error.context.duration)}ms\n`;
      if (error.context.retry > 0) {
        output += `   🔄 Retry: ${error.context.retry}\n`;
      }
      if (error.context.url) {
        output += `   🌐 URL: ${error.context.url}\n`;
      }
      output += `   ❌ Error: ${error.error.message}\n`;

      if (error.artifacts.screenshot) {
        output += `   📸 Screenshot: ${error.artifacts.screenshot}\n`;
      }
      if (error.artifacts.video) {
        output += `   🎥 Video: ${error.artifacts.video}\n`;
      }
      if (error.artifacts.trace) {
        output += `   🔍 Trace: ${error.artifacts.trace}\n`;
      }

      if (error.error.stack) {
        output += `   📚 Stack Trace:\n`;
        const stackLines = error.error.stack.split('\n').slice(0, 5);
        stackLines.forEach(line => {
          output += `      ${line}\n`;
        });
      }
    });

    output += '\n' + '='.repeat(80) + '\n';
    output += `Generated on: ${new Date().toISOString()}\n`;
    output += `Error logs location: ${this.outputDir}\n`;
    output += '='.repeat(80) + '\n';

    return output;
  }
}

export default ErrorOnlyReporter;
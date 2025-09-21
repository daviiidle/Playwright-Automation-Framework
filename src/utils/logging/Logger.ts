/**
 * Structured logging system for Playwright test framework
 * Provides different log levels and structured output for better debugging
 */

import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ErrorContext, BasePlaywrightError } from '../errors/PlaywrightErrors';

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  levelName: string;
  message: string;
  context?: any;
  category?: string;
  testInfo?: {
    testName?: string;
    filePath?: string;
    projectName?: string;
  };
  error?: {
    name: string;
    message: string;
    stack?: string;
    category?: string;
    severity?: string;
  };
  performance?: {
    duration: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
  metadata?: Record<string, any>;
}

export interface LoggerConfig {
  level: LogLevel;
  outputDir: string;
  enableConsole: boolean;
  enableFile: boolean;
  enableStructuredOutput: boolean;
  maxFileSize: number; // in MB
  maxFiles: number;
  includeTimestamp: boolean;
  includeStackTrace: boolean;
  dateFormat: string;
  environment: 'development' | 'staging' | 'production' | 'test';
}

export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private logDir: string;
  private currentLogFile: string;
  private sessionId: string;

  private constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      outputDir: './logs',
      enableConsole: true,
      enableFile: true,
      enableStructuredOutput: true,
      maxFileSize: 10, // MB
      maxFiles: 5,
      includeTimestamp: true,
      includeStackTrace: true,
      dateFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
      environment: (process.env.NODE_ENV as any) || 'development',
      ...config
    };

    this.sessionId = this.generateSessionId();
    this.logDir = this.config.outputDir;
    this.ensureLogDirectory();
    this.currentLogFile = this.createLogFileName();
    this.initializeLogFile();
  }

  public static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  public static configure(config: Partial<LoggerConfig>): void {
    Logger.instance = new Logger(config);
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private ensureLogDirectory(): void {
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  private createLogFileName(): string {
    const date = new Date().toISOString().split('T')[0];
    return join(this.logDir, `playwright-test-${date}-${this.sessionId}.log`);
  }

  private initializeLogFile(): void {
    if (this.config.enableFile) {
      const sessionInfo = {
        sessionId: this.sessionId,
        startTime: new Date().toISOString(),
        environment: this.config.environment,
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch
      };

      this.writeToFile('='.repeat(80));
      this.writeToFile(`NEW TEST SESSION STARTED`);
      this.writeToFile(`Session Info: ${JSON.stringify(sessionInfo, null, 2)}`);
      this.writeToFile('='.repeat(80));
    }
  }

  private writeToFile(content: string): void {
    if (this.config.enableFile) {
      try {
        appendFileSync(this.currentLogFile, content + '\n');
      } catch (error) {
        console.error('Failed to write to log file:', error);
      }
    }
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatConsoleMessage(entry: LogEntry): string {
    const colors = {
      [LogLevel.TRACE]: '\x1b[37m', // White
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.FATAL]: '\x1b[35m'  // Magenta
    };

    const reset = '\x1b[0m';
    const color = colors[entry.level] || colors[LogLevel.INFO];

    let message = `${color}[${entry.timestamp}] ${entry.levelName}: ${entry.message}${reset}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      message += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
    }

    if (entry.error) {
      message += `\n  Error: ${entry.error.name} - ${entry.error.message}`;
      if (this.config.includeStackTrace && entry.error.stack) {
        message += `\n  Stack: ${entry.error.stack}`;
      }
    }

    return message;
  }

  private formatFileMessage(entry: LogEntry): string {
    if (this.config.enableStructuredOutput) {
      return JSON.stringify(entry);
    } else {
      let message = `[${entry.timestamp}] ${entry.levelName}: ${entry.message}`;

      if (entry.context) {
        message += ` | Context: ${JSON.stringify(entry.context)}`;
      }

      if (entry.error) {
        message += ` | Error: ${entry.error.name} - ${entry.error.message}`;
        if (this.config.includeStackTrace && entry.error.stack) {
          message += ` | Stack: ${entry.error.stack}`;
        }
      }

      return message;
    }
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: any,
    category?: string,
    error?: BasePlaywrightError | Error,
    metadata?: Record<string, any>
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      levelName: LogLevel[level],
      message,
      category,
      metadata
    };

    if (context) {
      entry.context = context;
    }

    if (error) {
      if (error instanceof BasePlaywrightError) {
        entry.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
          category: error.category,
          severity: error.severity
        };
        entry.context = { ...entry.context, ...error.context };
      } else {
        entry.error = {
          name: error.name,
          message: error.message,
          stack: error.stack
        };
      }
    }

    // Add performance information
    entry.performance = {
      duration: 0, // This would be set by the caller if needed
      memoryUsage: process.memoryUsage()
    };

    return entry;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private log(level: LogLevel, message: string, context?: any, category?: string, error?: BasePlaywrightError | Error, metadata?: Record<string, any>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry = this.createLogEntry(level, message, context, category, error, metadata);

    if (this.config.enableConsole) {
      console.log(this.formatConsoleMessage(entry));
    }

    if (this.config.enableFile) {
      this.writeToFile(this.formatFileMessage(entry));
    }
  }

  public trace(message: string, context?: any, category?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.TRACE, message, context, category, undefined, metadata);
  }

  public debug(message: string, context?: any, category?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context, category, undefined, metadata);
  }

  public info(message: string, context?: any, category?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context, category, undefined, metadata);
  }

  public warn(message: string, context?: any, category?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context, category, undefined, metadata);
  }

  public error(message: string, error?: BasePlaywrightError | Error, context?: any, category?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, category, error, metadata);
  }

  public fatal(message: string, error?: BasePlaywrightError | Error, context?: any, category?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.FATAL, message, context, category, error, metadata);
  }

  // Specialized logging methods
  public logTestStart(testName: string, testFile: string, projectName?: string): void {
    this.info('Test started', {
      testName,
      testFile,
      projectName,
      startTime: new Date().toISOString()
    }, 'test-lifecycle');
  }

  public logTestEnd(testName: string, status: 'passed' | 'failed' | 'skipped', duration: number, error?: Error): void {
    const level = status === 'failed' ? LogLevel.ERROR : LogLevel.INFO;
    this.log(level, `Test ${status}`, {
      testName,
      status,
      duration,
      endTime: new Date().toISOString()
    }, 'test-lifecycle', error);
  }

  public logPageNavigation(url: string, loadTime?: number): void {
    this.info('Page navigation', {
      url,
      loadTime,
      timestamp: new Date().toISOString()
    }, 'page-navigation');
  }

  public logElementInteraction(action: string, selector: string, success: boolean, duration?: number): void {
    const level = success ? LogLevel.DEBUG : LogLevel.WARN;
    this.log(level, `Element ${action}`, {
      action,
      selector,
      success,
      duration
    }, 'element-interaction');
  }

  public logNetworkRequest(url: string, method: string, status: number, duration: number): void {
    const level = status >= 400 ? LogLevel.WARN : LogLevel.DEBUG;
    this.log(level, 'Network request', {
      url,
      method,
      status,
      duration
    }, 'network');
  }

  public logScreenshot(path: string, reason: string): void {
    this.debug('Screenshot captured', {
      path,
      reason,
      timestamp: new Date().toISOString()
    }, 'screenshot');
  }

  public logRetryAttempt(operation: string, attempt: number, maxAttempts: number, error?: Error): void {
    this.warn(`Retry attempt ${attempt}/${maxAttempts} for ${operation}`, {
      operation,
      attempt,
      maxAttempts,
      error: error?.message
    }, 'retry');
  }

  public setLogLevel(level: LogLevel): void {
    this.config.level = level;
    this.info(`Log level changed to ${LogLevel[level]}`, { level }, 'configuration');
  }

  public setTestInfo(testName: string, filePath: string, projectName: string): void {
    // This will be included in subsequent log entries
    this.config = {
      ...this.config,
      // Store test info for inclusion in logs
    };
  }

  public createChildLogger(category: string): Logger {
    // Create a new logger instance with the same config but different category
    const childLogger = new Logger(this.config);
    return childLogger;
  }

  public getLogFile(): string {
    return this.currentLogFile;
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public flush(): void {
    // Ensure all logs are written to file
    this.writeToFile(''); // Force flush
  }

  public cleanup(): void {
    this.info('Logger session ended', {
      sessionId: this.sessionId,
      endTime: new Date().toISOString()
    }, 'session');
    this.flush();
  }
}

// Export a default logger instance
export const logger = Logger.getInstance();

// Export helper functions
export function getLogger(category?: string): Logger {
  return category ? Logger.getInstance().createChildLogger(category) : Logger.getInstance();
}

export function configureLogger(config: Partial<LoggerConfig>): void {
  Logger.configure(config);
}
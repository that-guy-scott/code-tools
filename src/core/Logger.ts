import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = 'info';

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public debug(message: string, context?: string): void {
    if (this.shouldLog('debug')) {
      const prefix = context ? `[${context}] ` : '';
      console.log(chalk.gray(`🐛 ${prefix}${message}`));
    }
  }

  public info(message: string, context?: string): void {
    if (this.shouldLog('info')) {
      const prefix = context ? `[${context}] ` : '';
      console.log(chalk.blue(`ℹ️  ${prefix}${message}`));
    }
  }

  public warn(message: string, context?: string): void {
    if (this.shouldLog('warn')) {
      const prefix = context ? `[${context}] ` : '';
      console.log(chalk.yellow(`⚠️  ${prefix}${message}`));
    }
  }

  public error(message: string, error?: Error, context?: string): void {
    if (this.shouldLog('error')) {
      const prefix = context ? `[${context}] ` : '';
      console.error(chalk.red(`❌ ${prefix}${message}`));
      if (error) {
        console.error(chalk.red(`   ${error.message}`));
        if (error.stack && this.logLevel === 'debug') {
          console.error(chalk.gray(error.stack));
        }
      }
    }
  }

  public success(message: string, context?: string): void {
    if (this.shouldLog('success')) {
      const prefix = context ? `[${context}] ` : '';
      console.log(chalk.green(`✅ ${prefix}${message}`));
    }
  }

  // Structured output methods for UI consistency
  public section(title: string, context?: string): void {
    const prefix = context ? `[${context}] ` : '';
    console.log(chalk.blue.bold(`${prefix}${title}`));
  }

  public item(message: string, level: 'primary' | 'secondary' = 'primary'): void {
    const color = level === 'primary' ? chalk.cyan : chalk.gray;
    console.log(color(message));
  }

  public separator(): void {
    console.log();
  }

  public keyValue(key: string, value: string, level: 'primary' | 'secondary' = 'secondary'): void {
    const valueColor = level === 'primary' ? chalk.cyan : chalk.gray;
    console.log(valueColor(`${key}: ${value}`));
  }

  // Original color methods for backward compatibility
  public gray(message: string): void {
    console.log(chalk.gray(message));
  }

  public cyan(message: string): void {
    console.log(chalk.cyan(message));
  }

  public white(message: string): void {
    console.log(chalk.white(message));
  }

  public bold(message: string, color: 'green' | 'blue' | 'red' | 'yellow' | 'cyan' | 'white' = 'white'): void {
    const coloredChalk = color === 'white' ? chalk.bold : chalk.bold[color];
    console.log(coloredChalk(message));
  }

  public progress(current: number, total: number, label: string): void {
    const percentage = Math.round((current / total) * 100);
    const progressBar = this.createProgressBar(percentage);
    const message = `${progressBar} ${percentage}% ${label} (${current}/${total})`;
    
    // Use carriage return to overwrite the line
    process.stdout.write(`\r${message}`);
    
    // Add newline when complete
    if (current === total) {
      process.stdout.write('\n');
    }
  }

  private createProgressBar(percentage: number): string {
    const width = 20;
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    
    return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'success'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    // Success is always shown, debug only if explicitly set
    if (level === 'success') return true;
    if (level === 'debug') return this.logLevel === 'debug';
    
    return messageLevelIndex >= currentLevelIndex;
  }

  // Utility methods for legacy compatibility
  public logError(context: string, error: Error): void {
    this.error(`${context}:`, error);
  }

  public logWarning(message: string): void {
    this.warn(message);
  }

  public logSuccess(message: string): void {
    this.success(message);
  }
}
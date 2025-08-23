/**
 * Custom error classes for the application
 */

export class CLIError extends Error {
  constructor(
    message: string,
    public readonly context: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

export class MCPError extends Error {
  constructor(
    message: string,
    public readonly serverName: string,
    public readonly toolName?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

export class KnowledgeError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly filePath?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'KnowledgeError';
  }
}
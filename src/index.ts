#!/usr/bin/env node

import { CLIApp } from './core/CLIApp.js';
import { Logger } from './core/Logger.js';

async function main(): Promise<void> {
  const logger = Logger.getInstance();
  
  // Set up signal handlers for graceful shutdown
  const app = new CLIApp();
  
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await app.shutdown();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await app.shutdown();
    process.exit(0);
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', reason as Error);
    process.exit(1);
  });
  
  try {
    await app.run(process.argv);
  } catch (error) {
    logger.error('Application failed to start', error as Error);
    process.exit(1);
  }
}

// Only run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { CLIApp } from './core/CLIApp.js';
export { Config } from './core/Config.js';
export { Logger } from './core/Logger.js';
export { MCPManager } from './mcp/MCPManager.js';
export * from './types/index.js';
#!/usr/bin/env node
/**
 * Universal LLM CLI v2 - Local Project Version
 * Adapted for project-local Claude infrastructure
 */

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

const program = new Command();

// Project context
const PROJECT_NAME = process.env.CLAUDE_PROJECT_NAME || path.basename(process.cwd());
const PROJECT_ROOT = process.env.CLAUDE_PROJECT_ROOT || process.cwd();
const CLAUDE_DIR = path.join(PROJECT_ROOT, '.claude');

// Configuration
const DEFAULT_CONFIG = {
  ollama: {
    host: 'http://172.31.240.1:11434',
    defaultModel: 'gpt-oss:latest'
  },
  gemini: {
    defaultModel: 'gemini-2.0-flash'
  }
};

program
  .name('llm')
  .description(`Universal LLM CLI v2 - Local for ${PROJECT_NAME}`)
  .version('2.0.0-local');

program
  .argument('[prompt]', 'Prompt to send to the LLM')
  .option('-p, --provider <provider>', 'LLM provider (ollama, gemini, openai, anthropic)', 'auto')
  .option('-m, --model <model>', 'Model to use')
  .option('-t, --temperature <number>', 'Temperature (0.0-1.0)', parseFloat, 0.7)
  .option('-o, --output <format>', 'Output format (text, json)', 'text')
  .option('-s, --stream', 'Enable streaming output', false)
  .option('--list-providers', 'List available providers')
  .option('--list-models', 'List available models')
  .option('--list-tools', 'List available MCP tools')
  .option('--project-info', 'Show project information')
  .action(async (prompt, options) => {
    try {
      if (options.projectInfo) {
        showProjectInfo();
        return;
      }

      if (options.listProviders) {
        showProviders();
        return;
      }

      if (options.listModels) {
        await showModels();
        return;
      }

      if (options.listTools) {
        await showMCPTools();
        return;
      }

      if (!prompt) {
        console.log(chalk.yellow('No prompt provided. Use --help for usage information.'));
        return;
      }

      await processPrompt(prompt, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

function showProjectInfo() {
  console.log(chalk.green.bold(`🚀 Claude Local Infrastructure`));
  console.log(chalk.cyan(`Project: ${PROJECT_NAME}`));
  console.log(chalk.cyan(`Root: ${PROJECT_ROOT}`));
  console.log(chalk.cyan(`Claude Dir: ${CLAUDE_DIR}`));
  console.log(chalk.cyan(`Local Mode: Enabled`));
  console.log('');
  console.log(chalk.yellow('Database Services:'));
  console.log('  • PostgreSQL: localhost:5432');
  console.log('  • Neo4j: localhost:7474 (Web) / localhost:7687 (Bolt)');
  console.log('  • Redis: localhost:6379');
  console.log('  • Qdrant: localhost:6333');
  console.log('');
  console.log(chalk.yellow('Memory Isolation: Project-Only'));
}

function showProviders() {
  console.log(chalk.green.bold('Available Providers:'));
  console.log('  • ollama (default)');
  console.log('  • gemini');
  console.log('  • openai');
  console.log('  • anthropic');
}

async function showModels() {
  console.log(chalk.green.bold('Available Models:'));
  console.log(chalk.cyan('Ollama:'));
  console.log('  • gpt-oss:latest (default)');
  console.log('  • qwen3-coder:latest');
  console.log('  • gemma3:27b');
  console.log('');
  console.log(chalk.cyan('Gemini:'));
  console.log('  • gemini-2.0-flash (default)');
  console.log('  • gemini-2.5-pro');
}

async function showMCPTools() {
  console.log(chalk.green.bold('Available MCP Tools (Project-Local):'));
  console.log('  • neo4j-agent-memory (Project knowledge graph)');
  console.log('  • neo4j-server (Graph operations)');
  console.log('  • postgres (Project database)');
  console.log('  • redis (Project cache)');
  console.log('  • qdrant (Project vectors)');
  console.log('  • github (Repository operations)');
  console.log('  • puppeteer (Browser automation)');
  console.log('  • docker-mcp (Container management)');
}

async function processPrompt(prompt, options) {
  console.log(chalk.green(`🤖 Processing with ${options.provider} provider...`));
  console.log(chalk.cyan(`Project: ${PROJECT_NAME}`));
  console.log('');
  
  // For now, show that it would process the prompt
  // In a real implementation, this would call the actual LLM APIs
  console.log(chalk.yellow('Prompt:'), prompt);
  console.log(chalk.yellow('Provider:'), options.provider);
  console.log(chalk.yellow('Model:'), options.model || 'default');
  console.log(chalk.yellow('Temperature:'), options.temperature);
  console.log('');
  console.log(chalk.gray('Note: This is the local CLI template. Implement actual LLM calls here.'));
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

program.parse();
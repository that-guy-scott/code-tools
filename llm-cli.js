#!/usr/bin/env node

import 'dotenv/config';
import { program } from 'commander';
import chalk from 'chalk';
import { createInterface } from 'readline';

class ProviderInterface {
  constructor() {
    if (this.constructor === ProviderInterface) {
      throw new Error('ProviderInterface is abstract and cannot be instantiated');
    }
  }

  async getAvailableModels() {
    throw new Error('getAvailableModels() must be implemented by provider');
  }

  async generateResponse(prompt, options) {
    throw new Error('generateResponse() must be implemented by provider');
  }

  async callFunction(functionCall, context) {
    throw new Error('callFunction() must be implemented by provider');
  }

  validateModel(modelName) {
    throw new Error('validateModel() must be implemented by provider');
  }

  formatToolsForProvider(tools) {
    throw new Error('formatToolsForProvider() must be implemented by provider');
  }
}

program
  .name('llm-cli')
  .description('Universal CLI for multiple LLM providers with MCP integration')
  .version('2.0.0')
  .argument('[prompt]', 'The prompt to send to the model')
  .option('-p, --provider <provider>', 'LLM provider (ollama, gemini, openai, anthropic)', 'ollama')
  .option('-m, --model <model>', 'Model to use')
  .option('--tools <tools>', 'Comma-separated list of MCP tools to enable')
  .option('--no-tools', 'Disable all tool calling')
  .option('--list-tools', 'List available MCP tools and exit')
  .option('--list-models', 'List available models for provider and exit')
  .option('--list-providers', 'List available providers and exit')
  .option('-o, --output <format>', 'Output format (text, json, raw)', 'text')
  .option('-q, --quiet', 'Minimal output')
  .option('-v, --verbose', 'Detailed output')
  .option('--debug', 'Debug logging')
  .option('--config <path>', 'Path to configuration file')
  .option('-t, --temperature <temperature>', 'Generation temperature (0.0-2.0)', parseFloat, 0.7)
  .option('--max-tokens <tokens>', 'Maximum tokens to generate', parseInt)
  .option('--top-p <top_p>', 'Top-p sampling parameter', parseFloat)
  .option('--stream', 'Enable streaming output')
  .option('--stdin', 'Read prompt from stdin')
  .parse();

const options = program.opts();
const args = program.args;

async function readFromStdin() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const lines = [];
  for await (const line of rl) {
    lines.push(line);
  }
  
  return lines.join('\n');
}

async function main() {
  try {
    console.log(chalk.blue('Universal LLM CLI v2.0.0'));
    console.log(chalk.yellow('🚧 Implementation in progress...'));
    
    if (options.listProviders) {
      console.log(chalk.green('Available providers:'));
      console.log('  • ollama (local Ollama instance)');
      console.log('  • gemini (Google Gemini API)');
      console.log('  • openai (OpenAI API) - Coming soon');
      console.log('  • anthropic (Anthropic API) - Coming soon');
      process.exit(0);
    }
    
    console.log(chalk.yellow('Provider abstraction layer and MCP integration coming in next commits...'));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
#!/usr/bin/env node

import 'dotenv/config';
import { program } from 'commander';
import chalk from 'chalk';
import { createInterface } from 'readline';
import { Ollama } from 'ollama';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

class OllamaProvider extends ProviderInterface {
  constructor(config = {}) {
    super();
    this.host = config.host || process.env.OLLAMA_HOST || 'http://172.31.240.1:11434';
    this.ollama = new Ollama({ host: this.host });
    this.availableModels = [
      'gpt-oss:latest',
      'qwen3:30b', 
      'qwen3-coder:latest',
      'gemma3:27b',
      'qwen2.5-coder:32b',
      'nomic-embed-text:latest'
    ];
  }

  async getAvailableModels() {
    try {
      const response = await this.ollama.list();
      return response.models.map(model => model.name);
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not fetch models from Ollama, using defaults'));
      return this.availableModels;
    }
  }

  async generateResponse(prompt, options) {
    const config = {
      model: options.model || 'gpt-oss:latest',
      prompt: prompt,
      stream: options.stream || false,
      options: {
        temperature: options.temperature || 0.7,
        num_predict: options.maxTokens,
        top_p: options.topP,
        top_k: options.topK
      }
    };

    if (options.tools && options.tools.length > 0) {
      config.tools = this.formatToolsForProvider(options.tools);
    }

    return await this.ollama.generate(config);
  }

  async callFunction(functionCall, context) {
    throw new Error('Function calling not yet implemented for OllamaProvider');
  }

  validateModel(modelName) {
    return this.availableModels.includes(modelName);
  }

  formatToolsForProvider(tools) {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }
}

class GeminiProvider extends ProviderInterface {
  constructor(config = {}) {
    super();
    this.apiKey = config.apiKey || process.env.GOOGLE_AI_API_KEY;
    if (!this.apiKey) {
      throw new Error('Google AI API key required. Set GOOGLE_AI_API_KEY environment variable.');
    }
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.availableModels = [
      'gemini-2.0-flash',
      'gemini-2.5-flash', 
      'gemini-2.5-pro'
    ];
  }

  async getAvailableModels() {
    try {
      const models = await this.genAI.listModels();
      return models.map(model => model.name.replace('models/', ''));
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not fetch models from Gemini, using defaults'));
      return this.availableModels;
    }
  }

  async generateResponse(prompt, options) {
    const modelName = options.model || 'gemini-2.0-flash';
    const model = this.genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.maxTokens,
        topP: options.topP,
        topK: options.topK
      }
    });

    if (options.tools && options.tools.length > 0) {
      const tools = this.formatToolsForProvider(options.tools);
      const chat = model.startChat({ tools });
      const result = await chat.sendMessage(prompt);
      return result.response;
    } else {
      const result = await model.generateContent(prompt);
      return result.response;
    }
  }

  async callFunction(functionCall, context) {
    throw new Error('Function calling not yet implemented for GeminiProvider');
  }

  validateModel(modelName) {
    return this.availableModels.includes(modelName);
  }

  formatToolsForProvider(tools) {
    return tools.map(tool => ({
      functionDeclarations: [{
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }]
    }));
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
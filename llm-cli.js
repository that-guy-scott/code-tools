#!/usr/bin/env node

import 'dotenv/config';
import { program } from 'commander';
import chalk from 'chalk';
import { createInterface } from 'readline';
import { Ollama } from 'ollama';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { homedir } from 'os';

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

class ConfigManager {
  constructor() {
    this.defaultConfig = {
      defaultProvider: 'ollama',
      providers: {
        ollama: {
          host: 'http://172.31.240.1:11434',
          defaultModel: 'gpt-oss:latest'
        },
        gemini: {
          defaultModel: 'gemini-2.0-flash'
        }
      },
      tools: {
        default: [],
        development: ['github', 'postgres', 'docker', 'jetbrains'],
        research: ['github', 'qdrant', 'neo4j-agent-memory']
      },
      output: {
        format: 'text',
        verbose: false
      }
    };
  }

  loadConfig(configPath = null) {
    const configs = [];
    
    if (configPath && existsSync(configPath)) {
      configs.push(JSON.parse(readFileSync(configPath, 'utf8')));
    } else {
      const configPaths = [
        './.llm-cli.json',
        join(homedir(), '.llm-cli.json'),
        join(homedir(), '.config', 'llm-cli', 'config.json')
      ];
      
      for (const path of configPaths) {
        if (existsSync(path)) {
          configs.push(JSON.parse(readFileSync(path, 'utf8')));
          break;
        }
      }
    }

    configs.push(this.defaultConfig);
    return this.mergeConfigs(...configs);
  }

  mergeConfigs(...configs) {
    return configs.reduceRight((merged, config) => {
      return this.deepMerge(merged, config);
    }, {});
  }

  deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  applyEnvironmentOverrides(config) {
    if (process.env.LLM_CLI_PROVIDER) {
      config.defaultProvider = process.env.LLM_CLI_PROVIDER;
    }
    if (process.env.LLM_CLI_MODEL) {
      config.defaultModel = process.env.LLM_CLI_MODEL;
    }
    if (process.env.LLM_CLI_TOOLS) {
      config.defaultTools = process.env.LLM_CLI_TOOLS.split(',');
    }
    return config;
  }
}

class MCPManager {
  constructor() {
    this.mcpServers = {};
    this.discoveredTools = {};
    this.connectionStatus = {};
  }

  async discoverServers(mcpConfigPath = './.mcp.json') {
    try {
      if (!existsSync(mcpConfigPath)) {
        console.warn(chalk.yellow(`Warning: MCP config file not found at ${mcpConfigPath}`));
        return {};
      }

      const mcpConfig = JSON.parse(readFileSync(mcpConfigPath, 'utf8'));
      this.mcpServers = mcpConfig.mcpServers || {};
      
      console.log(chalk.blue(`Discovered ${Object.keys(this.mcpServers).length} MCP servers:`));
      for (const [name, config] of Object.entries(this.mcpServers)) {
        console.log(chalk.gray(`  • ${name}: ${config.command} ${config.args?.join(' ') || ''}`));
      }

      return this.mcpServers;
    } catch (error) {
      console.error(chalk.red('Error loading MCP configuration:'), error.message);
      return {};
    }
  }

  async healthCheck(serverName) {
    if (!this.mcpServers[serverName]) {
      return { status: 'not_found', message: `Server ${serverName} not found` };
    }

    try {
      return { status: 'configured', message: `Server ${serverName} is configured` };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  async getAvailableTools(serverFilter = null) {
    const tools = [];
    const availableServers = serverFilter 
      ? serverFilter.split(',').filter(name => this.mcpServers[name])
      : Object.keys(this.mcpServers);

    for (const serverName of availableServers) {
      const serverTools = this.getServerToolsPlaceholder(serverName);
      tools.push(...serverTools);
    }

    return tools;
  }

  getServerToolsPlaceholder(serverName) {
    const toolMap = {
      'jetbrains': [
        { name: 'get_file_text', description: 'Read file contents from IDE', server: 'jetbrains' },
        { name: 'list_files', description: 'List files in project directory', server: 'jetbrains' }
      ],
      'github': [
        { name: 'get_repository', description: 'Get repository information', server: 'github' },
        { name: 'create_issue', description: 'Create GitHub issue', server: 'github' }
      ],
      'postgres': [
        { name: 'execute_query', description: 'Execute SQL query', server: 'postgres' }
      ],
      'neo4j-agent-memory': [
        { name: 'search_memories', description: 'Search knowledge graph', server: 'neo4j-agent-memory' },
        { name: 'create_memory', description: 'Create memory entity', server: 'neo4j-agent-memory' }
      ]
    };

    return toolMap[serverName] || [
      { name: `${serverName}_placeholder`, description: `Placeholder tool for ${serverName}`, server: serverName }
    ];
  }

  formatToolForProvider(tool, providerType) {
    const baseFormat = {
      name: `${tool.server}__${tool.name}`,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    };

    return baseFormat;
  }
}

class ToolManager {
  constructor(mcpManager) {
    this.mcpManager = mcpManager;
    this.activeTools = [];
    this.toolResults = new Map();
  }

  async discoverTools(toolFilter = null) {
    try {
      this.activeTools = await this.mcpManager.getAvailableTools(toolFilter);
      return this.activeTools;
    } catch (error) {
      console.error(chalk.red('Error discovering tools:'), error.message);
      return [];
    }
  }

  filterTools(toolList, filterCriteria) {
    if (!filterCriteria || filterCriteria.length === 0) {
      return toolList;
    }

    if (typeof filterCriteria === 'string') {
      filterCriteria = filterCriteria.split(',').map(s => s.trim());
    }

    return toolList.filter(tool => {
      return filterCriteria.some(criteria => {
        return tool.server === criteria || 
               tool.name.includes(criteria) ||
               tool.description.toLowerCase().includes(criteria.toLowerCase());
      });
    });
  }

  async executeFunction(functionCall, context = {}) {
    try {
      const { name, arguments: args } = functionCall;
      
      if (!name.includes('__')) {
        throw new Error(`Invalid function call format. Expected 'server__function' but got '${name}'`);
      }

      const [serverName, functionName] = name.split('__', 2);
      
      if (!this.mcpManager.mcpServers[serverName]) {
        throw new Error(`MCP server '${serverName}' not found`);
      }

      console.log(chalk.blue(`Executing ${name} on ${serverName} server...`));
      
      const result = await this.executeMCPFunction(serverName, functionName, args, context);
      
      this.toolResults.set(name, {
        timestamp: new Date().toISOString(),
        result,
        success: true
      });

      return result;
    } catch (error) {
      console.error(chalk.red(`Tool execution error for ${functionCall.name}:`), error.message);
      
      this.toolResults.set(functionCall.name, {
        timestamp: new Date().toISOString(),
        error: error.message,
        success: false
      });

      throw error;
    }
  }

  async executeMCPFunction(serverName, functionName, args, context) {
    console.log(chalk.yellow(`🚧 MCP function calling not yet implemented`));
    console.log(chalk.gray(`Server: ${serverName}, Function: ${functionName}`));
    console.log(chalk.gray(`Args: ${JSON.stringify(args, null, 2)}`));
    
    return {
      status: 'placeholder',
      message: `Function ${functionName} on ${serverName} would be executed with args: ${JSON.stringify(args)}`,
      timestamp: new Date().toISOString()
    };
  }

  getToolResults(toolName = null) {
    if (toolName) {
      return this.toolResults.get(toolName);
    }
    return Object.fromEntries(this.toolResults);
  }

  async validateTools(tools) {
    const validation = {
      valid: [],
      invalid: [],
      warnings: []
    };

    for (const tool of tools) {
      if (!tool.name || !tool.server) {
        validation.invalid.push({
          tool,
          reason: 'Missing required name or server field'
        });
        continue;
      }

      if (!this.mcpManager.mcpServers[tool.server]) {
        validation.warnings.push({
          tool,
          reason: `Server '${tool.server}' not configured in MCP`
        });
      }

      validation.valid.push(tool);
    }

    return validation;
  }

  formatToolsForProvider(tools, providerType) {
    return tools.map(tool => {
      switch (providerType) {
        case 'ollama':
          return {
            type: 'function',
            function: {
              name: `${tool.server}__${tool.name}`,
              description: tool.description,
              parameters: tool.parameters || {
                type: 'object',
                properties: {},
                required: []
              }
            }
          };
        case 'gemini':
          return {
            functionDeclarations: [{
              name: `${tool.server}__${tool.name}`,
              description: tool.description,
              parameters: tool.parameters || {
                type: 'object',
                properties: {},
                required: []
              }
            }]
          };
        default:
          return tool;
      }
    });
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
    
    const configManager = new ConfigManager();
    const config = configManager.applyEnvironmentOverrides(configManager.loadConfig(options.config));
    
    const mcpManager = new MCPManager();
    await mcpManager.discoverServers();
    
    const toolManager = new ToolManager(mcpManager);
    
    if (options.listProviders) {
      console.log(chalk.green('Available providers:'));
      console.log('  • ollama (local Ollama instance)');
      console.log('  • gemini (Google Gemini API)');
      console.log('  • openai (OpenAI API) - Coming soon');
      console.log('  • anthropic (Anthropic API) - Coming soon');
      process.exit(0);
    }
    
    if (options.listTools) {
      console.log(chalk.green('Available MCP tools:'));
      const tools = await toolManager.discoverTools(options.tools);
      if (tools.length === 0) {
        console.log(chalk.yellow('  No tools discovered. Check MCP server configuration.'));
      } else {
        for (const tool of tools) {
          console.log(chalk.gray(`  • ${tool.server}__${tool.name}: ${tool.description}`));
        }
      }
      process.exit(0);
    }
    
    const provider = options.provider || config.defaultProvider;
    
    if (options.listModels) {
      console.log(chalk.green(`Available models for ${provider}:`));
      try {
        let providerInstance;
        if (provider === 'ollama') {
          providerInstance = new OllamaProvider(config.providers.ollama);
        } else if (provider === 'gemini') {
          providerInstance = new GeminiProvider(config.providers.gemini);
        } else {
          throw new Error(`Provider ${provider} not yet implemented`);
        }
        
        const models = await providerInstance.getAvailableModels();
        for (const model of models) {
          console.log(chalk.gray(`  • ${model}`));
        }
      } catch (error) {
        console.error(chalk.red('Error fetching models:'), error.message);
        process.exit(1);
      }
      process.exit(0);
    }
    
    let prompt = args[0] || options.prompt;
    
    if (options.stdin) {
      prompt = await readFromStdin();
    }
    
    if (!prompt) {
      console.error(chalk.red('Error: No prompt provided'));
      console.log(chalk.gray('Use: llm-cli "your prompt" or --stdin to read from stdin'));
      process.exit(1);
    }
    
    console.log(chalk.blue(`Generating response with ${provider}...`));
    
    try {
      let providerInstance;
      if (provider === 'ollama') {
        providerInstance = new OllamaProvider(config.providers.ollama);
      } else if (provider === 'gemini') {
        providerInstance = new GeminiProvider(config.providers.gemini);
      } else {
        throw new Error(`Provider ${provider} not yet implemented`);
      }
      
      const model = options.model || config.providers[provider]?.defaultModel;
      console.log(chalk.gray(`Using model: ${model}`));
      
      const generateOptions = {
        model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        topP: options.topP,
        topK: options.topK,
        stream: options.stream
      };
      
      if (options.tools && !options.noTools) {
        const tools = await toolManager.discoverTools(options.tools);
        if (tools.length > 0) {
          console.log(chalk.blue(`Using ${tools.length} tools: ${tools.map(t => t.server).join(', ')}`));
          generateOptions.tools = tools;
        }
      }
      
      const response = await providerInstance.generateResponse(prompt, generateOptions);
      
      if (options.output === 'json') {
        console.log(JSON.stringify({
          provider,
          model,
          prompt,
          response: response.response?.text || response.text || response,
          timestamp: new Date().toISOString()
        }, null, 2));
      } else if (options.output === 'raw') {
        console.log(response.response?.text || response.text || response);
      } else {
        console.log(chalk.green('\n📝 Response:'));
        console.log(response.response?.text || response.text || response);
      }
      
    } catch (error) {
      console.error(chalk.red('Generation failed:'), error.message);
      if (options.debug) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
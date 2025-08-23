import { Command } from 'commander';
import type { CLIOptions, PromptContext } from '../types/index.js';
import { Config } from './Config.js';
import { Logger } from './Logger.js';
import { MCPManager } from '../mcp/MCPManager.js';
import { InfoCommand } from '../commands/InfoCommand.js';
import { SearchCommand } from '../commands/SearchCommand.js';
import { IndexCommand } from '../commands/IndexCommand.js';
import { PromptCommand } from '../commands/PromptCommand.js';

export class CLIApp {
  private program: Command;
  private config: Config;
  private logger: Logger;
  private mcpManager: MCPManager;

  // Commands
  private infoCommand: InfoCommand;
  private searchCommand: SearchCommand;
  private indexCommand: IndexCommand;
  private promptCommand: PromptCommand;

  constructor() {
    this.config = Config.getInstance();
    this.logger = Logger.getInstance();
    this.mcpManager = new MCPManager();
    
    // Initialize commands
    this.infoCommand = new InfoCommand();
    this.searchCommand = new SearchCommand();
    this.indexCommand = new IndexCommand();
    this.promptCommand = new PromptCommand();

    this.program = new Command();
    this.setupCommands();
  }

  private setupCommands(): void {
    const projectName = this.config.app.project.name;
    
    this.program
      .name('llm')
      .description(`Universal LLM CLI v2 - Local for ${projectName}`)
      .version('2.0.0-local');

    this.program
      .argument('[prompt]', 'Prompt to send to the LLM')
      .option('-p, --provider <provider>', 'LLM provider (ollama, gemini, openai, anthropic)', 'auto')
      .option('-m, --model <model>', 'Model to use')
      .option('-t, --temperature <number>', 'Temperature (0.0-1.0)', parseFloat, 0.7)
      .option('-o, --output <format>', 'Output format (text, json)', 'text')
      .option('-s, --stream', 'Enable streaming output', false)
      .option('--list-providers', 'List available providers')
      .option('--list-models', 'List available models')
      .option('--list-ollama-models', 'List available Ollama models from server')
      .option('--list-tools', 'List available MCP tools')
      .option('--project-info', 'Show project information')
      .option('--semantic-search <query>', 'Search project knowledge semantically')
      .option('--search-all', 'Search across all project collections')
      .option('--list-collections', 'List all available project collections')
      .option('--knowledge-search <query>', 'Hybrid search: Neo4j + semantic')
      .option('--index [path]', 'Index files for semantic search. Optionally specify a file/directory path (defaults to current directory)')
      .action(async (prompt: string | undefined, options: CLIOptions) => {
        try {
          await this.handleCommand(prompt, options);
        } catch (error) {
          this.logger.error('CLI Error', error as Error);
          process.exit(1);
        }
      });
  }

  private async handleCommand(prompt: string | undefined, options: CLIOptions): Promise<void> {
    // Handle info commands first
    if (options.projectInfo) {
      await this.infoCommand.showProjectInfo();
      return;
    }

    if (options.listProviders) {
      await this.infoCommand.showProviders();
      return;
    }

    if (options.listModels) {
      await this.infoCommand.showModels();
      return;
    }

    if (options.listOllamaModels) {
      await this.infoCommand.showOllamaModels();
      return;
    }

    if (options.listTools) {
      await this.infoCommand.showMCPTools();
      return;
    }

    if (options.listCollections) {
      await this.searchCommand.listProjectCollections();
      return;
    }

    // Handle search commands
    if (options.semanticSearch) {
      await this.searchCommand.performSemanticSearch(options.semanticSearch, options.searchAll);
      return;
    }

    if (options.knowledgeSearch) {
      await this.searchCommand.performKnowledgeSearch(options.knowledgeSearch);
      return;
    }

    // Handle indexing command
    if (options.index !== undefined) {
      const indexPath = options.index || process.cwd();
      await this.indexCommand.indexProjectKnowledge(indexPath);
      return;
    }

    // Handle stdin input (for piping)
    const stdinData = await this.readStdinData();
    
    // Combine stdin data with prompt if both exist
    let finalPrompt = prompt || '';
    if (stdinData.trim()) {
      if (finalPrompt) {
        finalPrompt = `Input data:\n${stdinData.trim()}\n\nPrompt: ${finalPrompt}`;
      } else {
        finalPrompt = stdinData.trim();
      }
    }

    if (!finalPrompt) {
      this.logger.warn('No prompt provided. Use --help for usage information.');
      return;
    }

    // Handle main prompt processing
    const context: PromptContext = {
      prompt: finalPrompt,
      stdinData: stdinData.trim() || undefined,
      options
    };

    await this.promptCommand.processPrompt(context);
  }

  private async readStdinData(): Promise<string> {
    if (process.stdin.isTTY) {
      return '';
    }

    let stdinData = '';
    process.stdin.setEncoding('utf8');
    
    for await (const chunk of process.stdin) {
      stdinData += chunk;
    }
    
    return stdinData;
  }

  public async run(argv: string[]): Promise<void> {
    try {
      await this.program.parseAsync(argv);
    } catch (error) {
      this.logger.error('Failed to parse command', error as Error);
      process.exit(1);
    }
  }

  public async shutdown(): Promise<void> {
    await this.mcpManager.disconnect();
  }
}
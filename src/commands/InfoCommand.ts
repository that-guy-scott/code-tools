import chalk from 'chalk';
import { Config } from '../core/Config.js';
import { Logger } from '../core/Logger.js';
import { MCPManager } from '../mcp/MCPManager.js';
import { MCPTools } from '../mcp/MCPTools.js';

export class InfoCommand {
  private config = Config.getInstance();
  private logger = Logger.getInstance();
  private mcpManager = new MCPManager();
  private mcpTools = new MCPTools(this.mcpManager);

  public async showProjectInfo(): Promise<void> {
    const projectConfig = this.config.app.project;
    const collectionName = this.config.getCollectionName();

    console.log(chalk.blue.bold('📋 Project Information:'));
    console.log(chalk.cyan(`Project Name: ${projectConfig.name}`));
    console.log(chalk.gray(`Project Root: ${projectConfig.root}`));
    console.log(chalk.gray(`Claude Directory: ${projectConfig.claudeDir}`));
    console.log(chalk.gray(`Collection Name: ${collectionName}`));
    console.log();

    console.log(chalk.blue.bold('🔧 Configuration:'));
    console.log(chalk.gray(`Ollama Host: ${this.config.app.ollama.host}`));
    console.log(chalk.gray(`Ollama Default Model: ${this.config.app.ollama.defaultModel}`));
    console.log(chalk.gray(`Gemini Default Model: ${this.config.app.gemini.defaultModel}`));
    console.log();

    console.log(chalk.blue.bold('💾 Database Connections:'));
    console.log(chalk.gray(`Neo4j: ${this.config.app.neo4j.uri}`));
    console.log(chalk.gray(`Qdrant: ${this.config.app.qdrant.url}`));
    console.log(chalk.gray(`Redis: ${this.config.app.redis.url}`));
    console.log(chalk.gray(`PostgreSQL: ${this.config.app.postgres.connectionString.replace(/:[^:@]*@/, ':***@')}`));
  }

  public async showProviders(): Promise<void> {
    console.log(chalk.blue.bold('Available LLM Providers:'));
    console.log(chalk.white('  • ollama (default)'));
    console.log(chalk.white('  • gemini'));
    console.log(chalk.gray('  • openai (not implemented)'));
    console.log(chalk.gray('  • anthropic (not implemented)'));
  }

  public async showModels(): Promise<void> {
    console.log(chalk.blue.bold('Available Models:'));
    console.log(chalk.cyan('Ollama:'));
    console.log(chalk.gray(`  Default: ${this.config.app.ollama.defaultModel}`));
    console.log(chalk.cyan('Gemini:'));
    console.log(chalk.gray(`  Default: ${this.config.app.gemini.defaultModel}`));
    console.log();
    console.log(chalk.yellow('Use --list-ollama-models to see available Ollama models'));
  }

  public async showOllamaModels(): Promise<void> {
    // TODO: Implement Ollama API call to list models
    this.logger.info('Ollama model listing not yet implemented');
    console.log(chalk.gray('This feature will be implemented with the LLM provider architecture'));
  }

  public async showMCPTools(): Promise<void> {
    await this.mcpTools.displayAvailableTools();
  }
}
import { Config } from '../core/Config.js';
import { Logger } from '../core/Logger.js';
import { MCPManager } from '../mcp/MCPManager.js';
import { MCPTools } from '../mcp/MCPTools.js';

/**
 * Command handler for displaying system information and status.
 * 
 * This class provides various information commands including project details,
 * provider status, available models, and MCP tool information.
 * 
 * @example
 * ```typescript
 * const infoCommand = new InfoCommand(mcpManager);
 * await infoCommand.showProjectInfo();
 * ```
 */
export class InfoCommand {
  private config = Config.getInstance();
  private logger = Logger.getInstance();
  private mcpManager: MCPManager;
  private mcpTools: MCPTools;

  constructor(mcpManager: MCPManager) {
    this.mcpManager = mcpManager;
    this.mcpTools = new MCPTools(this.mcpManager);
  }

  /**
   * Display comprehensive project information including configuration and database connections.
   * 
   * Shows project details, configuration settings, and sanitized database connection strings.
   */
  public async showProjectInfo(): Promise<void> {
    const projectConfig = this.config.app.project;
    const collectionName = this.config.getCollectionName();

    this.logger.section('📋 Project Information:');
    this.logger.item(`Project Name: ${projectConfig.name}`, 'primary');
    this.logger.keyValue('Project Root', projectConfig.root);
    this.logger.keyValue('Claude Directory', projectConfig.claudeDir);
    this.logger.keyValue('Collection Name', collectionName);
    this.logger.separator();

    this.logger.section('🔧 Configuration:');
    this.logger.keyValue('Ollama Host', this.config.app.ollama.host);
    this.logger.keyValue('Ollama Default Model', this.config.app.ollama.defaultModel);
    this.logger.keyValue('Gemini Default Model', this.config.app.gemini.defaultModel);
    this.logger.separator();

    this.logger.section('💾 Database Connections:');
    this.logger.keyValue('Neo4j', this.config.app.neo4j.uri);
    this.logger.keyValue('Qdrant', this.config.app.qdrant.url);
    this.logger.keyValue('Redis', this.config.app.redis.url);
    this.logger.keyValue('PostgreSQL', this.config.app.postgres.connectionString.replace(/:[^:@]*@/, ':***@'));
  }

  /**
   * Display the status and availability of all LLM providers.
   * 
   * Delegates to PromptCommand's provider listing functionality.
   */
  public async showProviders(): Promise<void> {
    const promptCommand = new (await import('./PromptCommand.js')).PromptCommand(this.mcpManager);
    await promptCommand.listProviders();
  }

  /**
   * Display all available models from all providers.
   * 
   * Delegates to PromptCommand's model listing functionality.
   */
  public async showModels(): Promise<void> {
    const promptCommand = new (await import('./PromptCommand.js')).PromptCommand(this.mcpManager);
    await promptCommand.listAllModels();
  }

  /**
   * Display available models specifically from the Ollama provider.
   * 
   * Delegates to PromptCommand's provider-specific model listing.
   */
  public async showOllamaModels(): Promise<void> {
    const promptCommand = new (await import('./PromptCommand.js')).PromptCommand(this.mcpManager);
    await promptCommand.listModelsForProvider('ollama');
  }

  /**
   * Display all available MCP (Model Context Protocol) tools and their capabilities.
   * 
   * Uses the MCPTools utility to show tool information from all connected MCP servers.
   */
  public async showMCPTools(): Promise<void> {
    await this.mcpTools.displayAvailableTools();
  }
}
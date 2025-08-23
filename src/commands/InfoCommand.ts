import { Config } from '../core/Config.js';
import { Logger } from '../core/Logger.js';
import { MCPManager } from '../mcp/MCPManager.js';
import { MCPTools } from '../mcp/MCPTools.js';

export class InfoCommand {
  private config = Config.getInstance();
  private logger = Logger.getInstance();
  private mcpManager: MCPManager;
  private mcpTools: MCPTools;

  constructor(mcpManager: MCPManager) {
    this.mcpManager = mcpManager;
    this.mcpTools = new MCPTools(this.mcpManager);
  }

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

  public async showProviders(): Promise<void> {
    this.logger.section('Available LLM Providers:');
    this.logger.item('  • ollama (default)', 'primary');
    this.logger.item('  • gemini', 'primary');
    this.logger.item('  • openai (not implemented)', 'secondary');
    this.logger.item('  • anthropic (not implemented)', 'secondary');
  }

  public async showModels(): Promise<void> {
    this.logger.section('Available Models:');
    this.logger.item('Ollama:', 'primary');
    this.logger.keyValue('  Default', this.config.app.ollama.defaultModel);
    this.logger.item('Gemini:', 'primary');
    this.logger.keyValue('  Default', this.config.app.gemini.defaultModel);
    this.logger.separator();
    this.logger.warn('Use --list-ollama-models to see available Ollama models');
  }

  public async showOllamaModels(): Promise<void> {
    // TODO: Implement Ollama API call to list models
    this.logger.info('Ollama model listing not yet implemented');
    this.logger.item('This feature will be implemented with the LLM provider architecture', 'secondary');
  }

  public async showMCPTools(): Promise<void> {
    await this.mcpTools.displayAvailableTools();
  }
}
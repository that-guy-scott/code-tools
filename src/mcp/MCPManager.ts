import type { MCPConfig, MCPToolResult } from '../types/index.js';
import { MCPError } from '../core/errors.js';
import { MCPClient } from './MCPClient.js';
import { Config } from '../core/Config.js';
import { Logger } from '../core/Logger.js';

export class MCPManager {
  private clients = new Map<string, MCPClient>();
  private config: Config;
  private logger: Logger;
  private mcpConfig: MCPConfig | null = null;

  constructor() {
    this.config = Config.getInstance();
    this.logger = Logger.getInstance();
  }

  public async loadConfig(): Promise<boolean> {
    try {
      this.mcpConfig = this.config.mcp;
      return true;
    } catch (error) {
      this.logger.warn(`Failed to load MCP config: ${error}, using defaults`);
      return false;
    }
  }

  public async connectToServer(serverName: string): Promise<MCPClient> {
    // Return existing client if already connected
    const existingClient = this.clients.get(serverName);
    if (existingClient?.connected) {
      return existingClient;
    }

    // Ensure config is loaded
    if (!this.mcpConfig) {
      await this.loadConfig();
    }

    if (!this.mcpConfig?.mcpServers?.[serverName]) {
      throw new MCPError(`Server ${serverName} not found in MCP config`, serverName);
    }

    const serverConfig = this.mcpConfig.mcpServers[serverName];

    try {
      // Create new client if needed
      let client = this.clients.get(serverName);
      if (!client) {
        client = new MCPClient(serverName, serverConfig);
        this.clients.set(serverName, client);
      }

      // Connect the client
      await client.connect();
      return client;

    } catch (error) {
      // Remove failed client
      this.clients.delete(serverName);
      throw error;
    }
  }

  public async callTool(
    serverName: string, 
    toolName: string, 
    args: Record<string, unknown>
  ): Promise<MCPToolResult> {
    try {
      const client = await this.connectToServer(serverName);
      return await client.callTool(toolName, args);
    } catch (error) {
      if (error instanceof MCPError) {
        throw error;
      }
      throw new MCPError(
        `Failed to call tool ${toolName} on server ${serverName}`,
        serverName,
        toolName,
        error as Error
      );
    }
  }

  public async listAllTools(): Promise<Record<string, string[]>> {
    const allTools: Record<string, string[]> = {};

    if (!this.mcpConfig) {
      await this.loadConfig();
    }

    if (!this.mcpConfig?.mcpServers) {
      return allTools;
    }

    const serverNames = Object.keys(this.mcpConfig.mcpServers);

    for (const serverName of serverNames) {
      try {
        const client = await this.connectToServer(serverName);
        const tools = await client.listTools();
        allTools[serverName] = tools;
      } catch (error) {
        this.logger.warn(`Failed to list tools for ${serverName}: ${error}`);
        allTools[serverName] = [];
      }
    }

    return allTools;
  }

  public async getConnectedServers(): Promise<string[]> {
    const connected: string[] = [];
    
    for (const [serverName, client] of this.clients) {
      if (client.connected) {
        connected.push(serverName);
      }
    }
    
    return connected;
  }

  public async testConnection(serverName: string): Promise<boolean> {
    try {
      await this.connectToServer(serverName);
      return true;
    } catch (error) {
      this.logger.debug(`Connection test failed for ${serverName}: ${error}`);
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    const disconnectPromises: Promise<void>[] = [];

    for (const [serverName, client] of this.clients.entries()) {
      disconnectPromises.push(
        client.disconnect().catch(error => {
          this.logger.warn(`Error disconnecting ${serverName}: ${error}`);
        })
      );
    }

    await Promise.all(disconnectPromises);
    this.clients.clear();
  }

  public async disconnectServer(serverName: string): Promise<void> {
    const client = this.clients.get(serverName);
    if (client) {
      await client.disconnect();
      this.clients.delete(serverName);
    }
  }

  public getServerNames(): string[] {
    return this.mcpConfig?.mcpServers ? Object.keys(this.mcpConfig.mcpServers) : [];
  }

  public isServerConfigured(serverName: string): boolean {
    return this.mcpConfig?.mcpServers?.[serverName] !== undefined;
  }

  public reloadConfig(): void {
    this.config.reloadMCPConfig();
    this.mcpConfig = null;
  }
}
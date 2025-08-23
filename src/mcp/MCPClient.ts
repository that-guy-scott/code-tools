import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { MCPServerConfig, MCPToolCall, MCPToolResult } from '../types/index.js';
import { MCPError } from '../core/errors.js';
import { Logger } from '../core/Logger.js';

export class MCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private readonly logger = Logger.getInstance();
  private isConnected = false;

  constructor(
    private readonly serverName: string,
    private readonly config: MCPServerConfig
  ) {}

  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      // Create transport based on server config
      this.transport = new StdioClientTransport({
        command: this.config.command,
        args: this.config.args || [],
        env: { 
          ...Object.fromEntries(
            Object.entries(process.env).filter(([_, v]) => v !== undefined) as [string, string][]
          ), 
          ...(this.config.env || {}) 
        }
      });

      // Create and connect client
      this.client = new Client({
        name: 'code-tools',
        version: '2.0.0'
      });

      await this.client.connect(this.transport);
      this.isConnected = true;

      this.logger.gray(`  ✓ Connected to MCP server: ${this.serverName}`);

    } catch (error) {
      this.isConnected = false;
      const errorMessage = `Could not connect to ${this.serverName}: ${error}`;
      this.logger.warn(errorMessage);
      throw new MCPError(errorMessage, this.serverName, undefined, error as Error);
    }
  }

  public async callTool(toolName: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }

    if (!this.client) {
      throw new MCPError(`Client not connected for ${this.serverName}`, this.serverName, toolName);
    }

    try {
      const result = await this.client.callTool({
        name: toolName,
        arguments: args
      });
      return result as MCPToolResult;

    } catch (error) {
      const errorMessage = `MCP call failed (${this.serverName}/${toolName}): ${error}`;
      this.logger.warn(errorMessage);
      throw new MCPError(errorMessage, this.serverName, toolName, error as Error);
    }
  }

  public async listTools(): Promise<string[]> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }

    if (!this.client) {
      throw new MCPError(`Client not connected for ${this.serverName}`, this.serverName);
    }

    try {
      const tools = await this.client.listTools();
      return tools.tools?.map(tool => tool.name) || [];
    } catch (error) {
      this.logger.warn(`Failed to list tools for ${this.serverName}: ${error}`);
      return [];
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        await this.client.close();
      } catch (error) {
        this.logger.warn(`Failed to close ${this.serverName}: ${error}`);
      } finally {
        this.client = null;
        this.transport = null;
        this.isConnected = false;
      }
    }
  }

  public get connected(): boolean {
    return this.isConnected;
  }

  public get name(): string {
    return this.serverName;
  }
}
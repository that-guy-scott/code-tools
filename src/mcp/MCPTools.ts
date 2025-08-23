import type { MCPManager } from './MCPManager.js';
import { Logger } from '../core/Logger.js';

export class MCPTools {
  private logger = Logger.getInstance();

  constructor(private mcpManager: MCPManager) {}

  public async displayAvailableTools(): Promise<void> {
    this.logger.info('Available MCP tools:', 'MCP');

    try {
      await this.mcpManager.loadConfig();
      const allTools = await this.mcpManager.listAllTools();

      if (Object.keys(allTools).length === 0) {
        this.logger.warn('No MCP servers configured');
        return;
      }

      for (const [serverName, tools] of Object.entries(allTools)) {
        this.logger.separator();
        if (tools.length === 0) {
          this.logger.item(`${serverName}: (connection failed)`, 'secondary');
        } else {
          this.logger.item(`${serverName}:`, 'primary');
          for (const tool of tools) {
            this.logger.item(`  • ${tool}`, 'primary');
          }
        }
      }

    } catch (error) {
      this.logger.error('Failed to list MCP tools', error as Error);
    }
  }

  public async testAllConnections(): Promise<void> {
    this.logger.info('Testing MCP server connections:', 'MCP');

    const serverNames = this.mcpManager.getServerNames();
    
    if (serverNames.length === 0) {
      this.logger.warn('No MCP servers configured');
      return;
    }

    const results: Array<{ server: string; connected: boolean; error?: string }> = [];

    for (const serverName of serverNames) {
      try {
        const connected = await this.mcpManager.testConnection(serverName);
        results.push({ server: serverName, connected });
      } catch (error) {
        results.push({ 
          server: serverName, 
          connected: false, 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    this.logger.separator();
    for (const result of results) {
      const status = result.connected ? '✓ Connected' : '✗ Failed';
      const level = result.connected ? 'primary' : 'secondary';
      
      this.logger.item(`  ${result.server}: ${status}`, level);
      
      if (!result.connected && result.error) {
        this.logger.item(`    ${result.error}`, 'secondary');
      }
    }

    const connectedCount = results.filter(r => r.connected).length;
    const totalCount = results.length;

    this.logger.separator();
    if (connectedCount === totalCount) {
      this.logger.success(`All ${totalCount} MCP servers connected successfully`);
    } else {
      this.logger.warn(`${connectedCount}/${totalCount} MCP servers connected`);
    }
  }

  public async getServerStatus(): Promise<Array<{
    name: string;
    configured: boolean;
    connected: boolean;
    tools: string[];
  }>> {
    const serverNames = this.mcpManager.getServerNames();
    const connectedServers = await this.mcpManager.getConnectedServers();
    const allTools = await this.mcpManager.listAllTools();

    return serverNames.map(name => ({
      name,
      configured: this.mcpManager.isServerConfigured(name),
      connected: connectedServers.includes(name),
      tools: allTools[name] || []
    }));
  }

  public async displayServerStatus(): Promise<void> {
    this.logger.info('MCP server status:', 'MCP');
    
    const status = await this.getServerStatus();
    
    if (status.length === 0) {
      this.logger.warn('No MCP servers configured');
      return;
    }

    this.logger.separator();
    for (const server of status) {
      const configStatus = server.configured ? '✓' : '✗';
      const connStatus = server.connected ? '✓' : '○';
      const toolCount = server.tools.length;
      
      this.logger.item(`  ${server.name}:`, 'primary');
      this.logger.item(`    Config: ${configStatus} | Connected: ${connStatus} | Tools: ${toolCount}`, 'secondary');
      
      if (server.connected && toolCount > 0) {
        const toolList = server.tools.slice(0, 3).join(', ');
        const moreTools = toolCount > 3 ? `... (+${toolCount - 3} more)` : '';
        this.logger.item(`    Available: ${toolList}${moreTools}`, 'secondary');
      }
    }
  }
}
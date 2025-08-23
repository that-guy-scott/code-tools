import chalk from 'chalk';
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
        console.log(chalk.yellow('No MCP servers configured'));
        return;
      }

      for (const [serverName, tools] of Object.entries(allTools)) {
        if (tools.length === 0) {
          console.log(chalk.gray(`\n${serverName}: (connection failed)`));
        } else {
          console.log(chalk.cyan(`\n${serverName}:`));
          for (const tool of tools) {
            console.log(chalk.white(`  • ${tool}`));
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
      console.log(chalk.yellow('No MCP servers configured'));
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

    console.log();
    for (const result of results) {
      const status = result.connected 
        ? chalk.green('✓ Connected') 
        : chalk.red('✗ Failed');
      
      console.log(`  ${result.server}: ${status}`);
      
      if (!result.connected && result.error) {
        console.log(chalk.gray(`    ${result.error}`));
      }
    }

    const connectedCount = results.filter(r => r.connected).length;
    const totalCount = results.length;

    console.log();
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
      console.log(chalk.yellow('No MCP servers configured'));
      return;
    }

    console.log();
    for (const server of status) {
      const configStatus = server.configured ? chalk.green('✓') : chalk.red('✗');
      const connStatus = server.connected ? chalk.green('✓') : chalk.gray('○');
      const toolCount = server.tools.length;
      
      console.log(`  ${server.name}:`);
      console.log(`    Config: ${configStatus} | Connected: ${connStatus} | Tools: ${toolCount}`);
      
      if (server.connected && toolCount > 0) {
        const toolList = server.tools.slice(0, 3).join(', ');
        const moreTools = toolCount > 3 ? `... (+${toolCount - 3} more)` : '';
        console.log(chalk.gray(`    Available: ${toolList}${moreTools}`));
      }
    }
  }
}
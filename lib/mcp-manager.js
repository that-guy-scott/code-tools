import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

// Constants from main CLI
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOOL_ROOT = path.dirname(__dirname); 
const PROJECT_ROOT = process.env.CLAUDE_PROJECT_ROOT || process.cwd();

// Default configuration
const DEFAULT_CONFIG = {
    neo4j: {
        uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
        username: process.env.NEO4J_USERNAME || 'neo4j',
        password: process.env.NEO4J_PASSWORD || 'dev_password_123'
    },
    qdrant: {
        url: process.env.QDRANT_URL || 'http://localhost:6333'
    },
    postgres: {
        connectionString: process.env.POSTGRES_CONNECTION_STRING || 'postgresql://dev_user:dev_password_123@localhost:5432/code_tools_dev'
    },
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    }
};

const DEFAULT_MCP_CONFIG = {
    mcpServers: {
        "neo4j-agent-memory": {
            "command": "npx",
            "args": ["@knowall-ai/mcp-neo4j-agent-memory"],
            "env": {
                "NEO4J_URI": DEFAULT_CONFIG.neo4j.uri,
                "NEO4J_USERNAME": DEFAULT_CONFIG.neo4j.username,
                "NEO4J_PASSWORD": DEFAULT_CONFIG.neo4j.password
            }
        },
        "qdrant": {
            "command": "npx",
            "args": ["better-qdrant-mcp-server"],
            "env": {
                "QDRANT_URL": DEFAULT_CONFIG.qdrant.url
            }
        },
        "postgres": {
            "command": "npx",
            "args": ["-y", "@henkey/postgres-mcp-server", DEFAULT_CONFIG.postgres.connectionString]
        },
        "redis": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-redis", DEFAULT_CONFIG.redis.url]
        }
    }
};

/**
 * MCP Client Manager - extracted from main CLI for testing
 */
export class MCPManager {
    constructor() {
        this.clients = new Map();
        this.mcpConfig = null;
    }

    async loadConfig() {
        try {
            // Look for .mcp.json in order: tool directory, then project directory, then use defaults
            const configPaths = [
                path.join(TOOL_ROOT, '.mcp.json'),
                path.join(PROJECT_ROOT, '.mcp.json')
            ];

            let configData = null;

            for (const configPath of configPaths) {
                if (fs.existsSync(configPath)) {
                    console.log(chalk.gray(`  Using MCP config: ${configPath}`));
                    configData = fs.readFileSync(configPath, 'utf8');
                    break;
                }
            }

            if (configData) {
                this.mcpConfig = JSON.parse(configData);
            } else {
                console.log(chalk.gray('  Using built-in MCP configuration'));
                this.mcpConfig = DEFAULT_MCP_CONFIG;
            }

            return true;
        } catch (error) {
            console.log(chalk.yellow(`Failed to load MCP config: ${error.message}, using defaults`));
            this.mcpConfig = DEFAULT_MCP_CONFIG;
            return true;
        }
    }

    async connectToServer(serverName) {
        if (this.clients.has(serverName)) {
            return this.clients.get(serverName);
        }

        if (!this.mcpConfig || !this.mcpConfig.mcpServers || !this.mcpConfig.mcpServers[serverName]) {
            throw new Error(`Server ${serverName} not found in MCP config`);
        }

        const serverConfig = this.mcpConfig.mcpServers[serverName];

        try {
            // Create transport based on server config
            const transport = new StdioClientTransport({
                command: serverConfig.command,
                args: serverConfig.args || [],
                env: {...process.env, ...serverConfig.env}
            });

            // Create and connect client
            const client = new Client({
                name: 'llm-cli',
                version: '2.0.0'
            });

            await client.connect(transport);
            this.clients.set(serverName, client);

            console.log(chalk.gray(`  ✓ Connected to MCP server: ${serverName}`));
            return client;

        } catch (error) {
            console.log(chalk.yellow(`  Warning: Could not connect to ${serverName}: ${error.message}`));
            throw error;
        }
    }

    async callTool(serverName, toolName, args) {
        try {
            const client = await this.connectToServer(serverName);
            return await client.callTool({name: toolName, arguments: args});
        } catch (error) {
            console.log(chalk.yellow(`MCP call failed (${serverName}/${toolName}): ${error.message}`));
            throw error;
        }
    }

    async disconnect() {
        for (const [serverName, client] of this.clients.entries()) {
            try {
                await client.close();
            } catch (error) {
                console.log(chalk.yellow(`Warning: Failed to close ${serverName}: ${error.message}`));
            }
        }
        this.clients.clear();
    }
}

export { DEFAULT_CONFIG, DEFAULT_MCP_CONFIG };
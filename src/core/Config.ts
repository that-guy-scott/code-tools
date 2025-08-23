import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { AppConfig, MCPConfig, ProjectConfig } from '../types/index.js';
import { CONFIG_DEFAULTS, NETWORK_DEFAULTS, DEFAULT_MODELS, DATABASE_DEFAULTS, CONNECTION_BUILDERS } from './constants.js';

export class Config {
  private static instance: Config;
  private _appConfig: AppConfig;
  private _mcpConfig: MCPConfig;

  private constructor() {
    // Get the actual source directory, not the compiled directory
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // If running from dist/, go up to project root; otherwise go up from src/
    const isCompiledVersion = __dirname.includes('/dist/');
    const toolRoot = isCompiledVersion 
      ? path.resolve(__dirname, '..', '..') // from dist/core/ to root
      : path.resolve(__dirname, '..', '..', '..'); // from src/core/ to root

    // Build project configuration
    const projectName = process.env.CLAUDE_PROJECT_NAME || path.basename(process.cwd());
    const projectRoot = process.env.CLAUDE_PROJECT_ROOT || process.cwd();
    const claudeDir = path.join(projectRoot, '.claude');

    const project: ProjectConfig = {
      name: projectName,
      root: projectRoot,
      claudeDir,
      toolRoot
    };

    // Build application configuration with environment variable fallbacks
    this._appConfig = {
      project,
      maxFileSize: CONFIG_DEFAULTS.MAX_FILE_SIZE,
      chunkSize: CONFIG_DEFAULTS.CHUNK_SIZE,
      chunkOverlap: CONFIG_DEFAULTS.CHUNK_OVERLAP,
      maxChunkSize: CONFIG_DEFAULTS.MAX_CHUNK_SIZE,
      minChunkSize: CONFIG_DEFAULTS.MIN_CHUNK_SIZE,
      batchSize: CONFIG_DEFAULTS.BATCH_SIZE,
      embeddingDimensions: CONFIG_DEFAULTS.EMBEDDING_DIMENSIONS,
      
      postgres: {
        connectionString: process.env.POSTGRES_CONNECTION_STRING || CONNECTION_BUILDERS.postgres()
      },
      neo4j: {
        uri: process.env.NEO4J_URI || CONNECTION_BUILDERS.neo4j(),
        username: process.env.NEO4J_USERNAME || DATABASE_DEFAULTS.NEO4J_USER,
        password: process.env.NEO4J_PASSWORD || DATABASE_DEFAULTS.NEO4J_PASSWORD
      },
      qdrant: {
        url: process.env.QDRANT_URL || CONNECTION_BUILDERS.qdrant()
      },
      redis: {
        url: process.env.REDIS_URL || CONNECTION_BUILDERS.redis()
      },
      ollama: {
        host: process.env.OLLAMA_HOST || NETWORK_DEFAULTS.OLLAMA_HOST,
        defaultModel: process.env.OLLAMA_DEFAULT_MODEL || DEFAULT_MODELS.OLLAMA
      },
      gemini: {
        defaultModel: process.env.GEMINI_DEFAULT_MODEL || DEFAULT_MODELS.GEMINI
      }
    };

    // Load MCP configuration
    this._mcpConfig = this.loadMCPConfig();
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  public get app(): AppConfig {
    return this._appConfig;
  }

  public get mcp(): MCPConfig {
    return this._mcpConfig;
  }

  public getCollectionName(): string {
    // Sanitize project name for Qdrant collection naming
    const sanitized = this._appConfig.project.name
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return `${sanitized}-docs`;
  }

  private loadMCPConfig(): MCPConfig {
    try {
      // Look for .mcp.json in order: tool directory, then project directory, then use defaults
      const configPaths = [
        path.join(this._appConfig.project.toolRoot, '.mcp.json'),
        path.join(this._appConfig.project.root, '.mcp.json')
      ];

      for (const configPath of configPaths) {
        if (fs.existsSync(configPath)) {
          console.log(`Using MCP config: ${configPath}`);
          const configData = fs.readFileSync(configPath, 'utf8');
          return JSON.parse(configData);
        }
      }

      console.log('Using built-in MCP configuration');
      return this.getDefaultMCPConfig();

    } catch (error) {
      console.log(`Failed to load MCP config: ${error}, using defaults`);
      return this.getDefaultMCPConfig();
    }
  }

  private getDefaultMCPConfig(): MCPConfig {
    return {
      mcpServers: {
        "neo4j-agent-memory": {
          command: "npx",
          args: ["@knowall-ai/mcp-neo4j-agent-memory"],
          env: {
            NEO4J_URI: this._appConfig.neo4j.uri,
            NEO4J_USERNAME: this._appConfig.neo4j.username,
            NEO4J_PASSWORD: this._appConfig.neo4j.password
          }
        },
        "qdrant": {
          command: "npx",
          args: ["better-qdrant-mcp-server"],
          env: {
            QDRANT_URL: this._appConfig.qdrant.url
          }
        },
        "postgres": {
          command: "npx",
          args: ["-y", "@henkey/postgres-mcp-server", this._appConfig.postgres.connectionString]
        },
        "redis": {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-redis", this._appConfig.redis.url]
        }
      }
    };
  }

  public reloadMCPConfig(): void {
    this._mcpConfig = this.loadMCPConfig();
  }
}
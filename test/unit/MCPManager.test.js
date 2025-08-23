import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import sinon from 'sinon';
import { MCPManager, DEFAULT_CONFIG, DEFAULT_MCP_CONFIG } from '../../lib/mcp-manager.js';

// Mock the MCP SDK modules
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: class MockClient {
    constructor(config) {
      this.config = config;
      this.isConnected = false;
    }
    async connect() { this.isConnected = true; }
    async close() { this.isConnected = false; }
    async callTool() { return { content: [{ type: 'text', text: '{}' }] }; }
  }
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: class MockTransport {
    constructor(config) {
      this.config = config;
    }
  }
}));

// Mock filesystem
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn()
  },
  existsSync: vi.fn(),
  readFileSync: vi.fn()
}));

describe('MCPManager', () => {
  let mcpManager;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    mcpManager = new MCPManager();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Configuration Loading', () => {
    it('should load MCP configuration from file', async () => {
      const mockConfig = { mcpServers: { 'test-server': { command: 'test' } } };
      const fs = await import('fs');
      fs.default.existsSync.mockReturnValue(true);
      fs.default.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const result = await mcpManager.loadConfig();
      
      expect(result).toBe(true);
      expect(mcpManager.mcpConfig).toEqual(mockConfig);
      expect(fs.default.existsSync).toHaveBeenCalled();
      expect(fs.default.readFileSync).toHaveBeenCalled();
    });

    it('should use default config when no file exists', async () => {
      const fs = await import('fs');
      fs.default.existsSync.mockReturnValue(false);

      const result = await mcpManager.loadConfig();
      
      expect(result).toBe(true);
      expect(mcpManager.mcpConfig).toEqual(DEFAULT_MCP_CONFIG);
      expect(mcpManager.mcpConfig.mcpServers).toBeDefined();
      expect(mcpManager.mcpConfig.mcpServers['neo4j-agent-memory']).toBeDefined();
    });

    it('should handle invalid JSON gracefully', async () => {
      const fs = await import('fs');
      fs.default.existsSync.mockReturnValue(true);
      fs.default.readFileSync.mockReturnValue('invalid json');

      const result = await mcpManager.loadConfig();
      
      expect(result).toBe(true);
      // Should fall back to default config
      expect(mcpManager.mcpConfig).toEqual(DEFAULT_MCP_CONFIG);
    });
  });

  describe('Server Connection Management', () => {
    beforeEach(async () => {
      const fs = await import('fs');
      fs.default.existsSync.mockReturnValue(false);
      await mcpManager.loadConfig();
    });

    it('should connect to a configured server', async () => {
      const client = await mcpManager.connectToServer('neo4j-agent-memory');
      
      expect(client).toBeDefined();
      expect(client.isConnected).toBe(true);
      expect(mcpManager.clients.has('neo4j-agent-memory')).toBe(true);
    });

    it('should reuse existing connection', async () => {
      const client1 = await mcpManager.connectToServer('neo4j-agent-memory');
      const client2 = await mcpManager.connectToServer('neo4j-agent-memory');
      
      expect(client1).toBe(client2);
    });

    it('should throw error for unknown server', async () => {
      await expect(mcpManager.connectToServer('unknown-server'))
        .rejects.toThrow('Server unknown-server not found in MCP config');
    });
  });

  describe('Tool Calls', () => {
    beforeEach(async () => {
      const fs = await import('fs');
      fs.default.existsSync.mockReturnValue(false);
      await mcpManager.loadConfig();
    });

    it('should successfully call MCP tools', async () => {
      const result = await mcpManager.callTool('neo4j-agent-memory', 'create_memory', {
        label: 'test',
        properties: { name: 'test-entity' }
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('{}');
    });

    it('should throw error for unknown server in tool call', async () => {
      await expect(mcpManager.callTool('unknown-server', 'test_tool', {}))
        .rejects.toThrow('Server unknown-server not found in MCP config');
    });
  });

  describe('Connection Management', () => {
    beforeEach(async () => {
      const fs = await import('fs');
      fs.default.existsSync.mockReturnValue(false);
      await mcpManager.loadConfig();
    });

    it('should disconnect all clients', async () => {
      // Connect to servers
      await mcpManager.connectToServer('neo4j-agent-memory');
      await mcpManager.connectToServer('qdrant');

      // Verify connections exist
      expect(mcpManager.clients.size).toBe(2);

      await mcpManager.disconnect();

      // Verify all clients are cleared
      expect(mcpManager.clients.size).toBe(0);
    });
  });

  describe('Configuration Validation', () => {
    it('should have proper default configuration structure', () => {
      expect(DEFAULT_CONFIG).toBeDefined();
      expect(DEFAULT_CONFIG.neo4j).toBeDefined();
      expect(DEFAULT_CONFIG.qdrant).toBeDefined();
      expect(DEFAULT_CONFIG.postgres).toBeDefined();
      expect(DEFAULT_CONFIG.redis).toBeDefined();
    });

    it('should have proper MCP server configuration', () => {
      expect(DEFAULT_MCP_CONFIG).toBeDefined();
      expect(DEFAULT_MCP_CONFIG.mcpServers).toBeDefined();
      expect(DEFAULT_MCP_CONFIG.mcpServers['neo4j-agent-memory']).toBeDefined();
      expect(DEFAULT_MCP_CONFIG.mcpServers['qdrant']).toBeDefined();
      expect(DEFAULT_MCP_CONFIG.mcpServers['postgres']).toBeDefined();
      expect(DEFAULT_MCP_CONFIG.mcpServers['redis']).toBeDefined();
    });
  });
});
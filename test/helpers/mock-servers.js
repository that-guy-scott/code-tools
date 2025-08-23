import sinon from 'sinon';

/**
 * Mock MCP Client for testing MCP integrations
 */
export class MockMCPClient {
  constructor() {
    this.isConnected = false;
    this.tools = new Map();
    this.callHistory = [];
  }

  async connect() {
    this.isConnected = true;
  }

  async close() {
    this.isConnected = false;
  }

  async callTool({ name, arguments: args }) {
    this.callHistory.push({ name, arguments: args });
    
    // Mock responses based on tool name
    switch (name) {
      case 'create_memory':
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              id: Math.floor(Math.random() * 1000),
              success: true,
              label: args.label,
              properties: args.properties
            })
          }]
        };
      
      case 'search_memories':
        return {
          content: [{
            type: 'text', 
            text: JSON.stringify([
              {
                memory: {
                  _id: 1,
                  name: 'test-memory',
                  ...args.properties
                }
              }
            ])
          }]
        };

      case 'create_connection':
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              fromId: args.fromMemoryId,
              toId: args.toMemoryId,
              type: args.type
            })
          }]
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  getCallHistory() {
    return this.callHistory;
  }

  clearHistory() {
    this.callHistory = [];
  }
}

/**
 * Mock Ollama HTTP responses
 */
export async function setupOllamaMocks() {
  const nock = await import('nock');
  
  return nock('http://localhost:11434')
    .persist()
    .post('/api/embeddings')
    .reply(200, {
      embedding: new Array(768).fill(0).map(() => Math.random())
    })
    .get('/api/tags')
    .reply(200, {
      models: [
        { name: 'gpt-oss:latest', size: 1000000 }
      ]
    });
}

/**
 * Mock Qdrant HTTP responses  
 */
export async function setupQdrantMocks() {
  const nock = await import('nock');
  
  return nock('http://localhost:6333')
    .persist()
    // Collection exists check
    .get(/\/collections\/.*/)
    .reply(200, {
      result: {
        points_count: 0,
        status: 'green'
      }
    })
    // Create collection
    .put(/\/collections\/.*/)
    .reply(200, { result: true })
    // Search points
    .post(/\/collections\/.*\/points\/search/)
    .reply(200, {
      result: [
        {
          id: 1,
          score: 0.8,
          payload: {
            file_path: 'test/sample.js',
            file_name: 'sample.js',
            chunk_index: 0,
            chunk_text: 'function test() { return true; }'
          }
        }
      ]
    })
    // Add points
    .put(/\/collections\/.*\/points/)
    .reply(200, { result: { status: 'acknowledged' } });
}

/**
 * Creates a mock MCPManager with stubbed clients
 */
export function createMockMCPManager() {
  const mockClients = new Map();
  
  // Create mock clients for each server type
  ['neo4j-agent-memory', 'qdrant', 'postgres', 'redis'].forEach(serverName => {
    mockClients.set(serverName, new MockMCPClient());
  });

  return {
    clients: mockClients,
    mcpConfig: {
      mcpServers: {
        'neo4j-agent-memory': { command: 'mock-neo4j' },
        'qdrant': { command: 'mock-qdrant' },
        'postgres': { command: 'mock-postgres' },
        'redis': { command: 'mock-redis' }
      }
    },
    
    async loadConfig() {
      return true;
    },

    async connectToServer(serverName) {
      const client = mockClients.get(serverName);
      if (!client) {
        throw new Error(`Server ${serverName} not found`);
      }
      await client.connect();
      return client;
    },

    async callTool(serverName, toolName, args) {
      const client = await this.connectToServer(serverName);
      return client.callTool({ name: toolName, arguments: args });
    },

    async disconnect() {
      for (const client of mockClients.values()) {
        await client.close();
      }
    }
  };
}
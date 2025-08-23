import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import sinon from 'sinon';
import { vol } from 'memfs';
import nock from 'nock';
import { createMockMCPManager, MockMCPClient } from '../helpers/mock-servers.js';
import { createTestFileSystem, waitFor } from '../helpers/test-utils.js';

// Mock modules for error testing
vi.mock('fs', async () => {
  const memfs = await import('memfs');
  return memfs.fs;
});

describe('Error Handling and Edge Cases', () => {
  let mcpManager;
  let mockConsole;

  beforeEach(() => {
    createTestFileSystem();
    mcpManager = createMockMCPManager();
    
    // Mock console methods to capture error logs
    mockConsole = {
      log: sinon.stub(console, 'log'),
      error: sinon.stub(console, 'error'),
      warn: sinon.stub(console, 'warn')
    };
  });

  afterEach(() => {
    vol.reset();
    sinon.restore();
    nock.cleanAll();
  });

  describe('MCP Connection Failures', () => {
    it('should handle Neo4j connection timeout', async () => {
      const failingClient = new MockMCPClient();
      failingClient.connect = sinon.stub().callsFake(async () => {
        await waitFor(100);
        throw new Error('Connection timeout');
      });

      mcpManager.clients.set('neo4j-agent-memory', failingClient);

      await expect(mcpManager.connectToServer('neo4j-agent-memory'))
        .rejects.toThrow('Connection timeout');
    });

    it('should handle Qdrant server unavailable', async () => {
      nock('http://localhost:6333')
        .get('/collections/test-docs')
        .reply(500, { error: 'Internal Server Error' });

      const checkCollectionExists = async (collectionName) => {
        try {
          const axios = await import('axios');
          await axios.default.get(`http://localhost:6333/collections/${collectionName}`);
          return true;
        } catch (error) {
          if (error.response?.status === 500) {
            throw new Error('Qdrant server unavailable');
          }
          return false;
        }
      };

      await expect(checkCollectionExists('test-docs'))
        .rejects.toThrow('Qdrant server unavailable');
    });

    it('should handle partial MCP server failures gracefully', async () => {
      // Neo4j works, Qdrant fails
      const workingClient = new MockMCPClient();
      const failingClient = new MockMCPClient();
      failingClient.connect = sinon.stub().rejects(new Error('Service unavailable'));

      mcpManager.clients.set('neo4j-agent-memory', workingClient);
      mcpManager.clients.set('qdrant', failingClient);

      // Should be able to use Neo4j even if Qdrant fails
      const neo4jResult = await mcpManager.callTool('neo4j-agent-memory', 'create_memory', {
        label: 'test'
      });
      expect(neo4jResult).toBeDefined();

      // Qdrant should fail
      await expect(mcpManager.callTool('qdrant', 'search', {}))
        .rejects.toThrow('Service unavailable');
    });
  });

  describe('File System Errors', () => {
    it('should handle permission denied errors', () => {
      vol.writeFileSync('/test/readonly.js', 'const x = 1;');
      
      // Mock permission error
      const originalReadFileSync = vol.readFileSync;
      vol.readFileSync = sinon.stub().callsFake((path) => {
        if (path === '/test/readonly.js') {
          const error = new Error('EACCES: permission denied');
          error.code = 'EACCES';
          throw error;
        }
        return originalReadFileSync.call(vol, path);
      });

      const readFileWithErrorHandling = (filePath) => {
        try {
          return vol.readFileSync(filePath, 'utf8');
        } catch (error) {
          if (error.code === 'EACCES') {
            return { error: 'Permission denied', code: 'EACCES' };
          }
          throw error;
        }
      };

      const result = readFileWithErrorHandling('/test/readonly.js');
      expect(result.error).toBe('Permission denied');
      expect(result.code).toBe('EACCES');
    });

    it('should handle disk full errors during indexing', async () => {
      // Mock disk full error during write operations
      const originalWriteFileSync = vol.writeFileSync;
      vol.writeFileSync = sinon.stub().callsFake(() => {
        const error = new Error('ENOSPC: no space left on device');
        error.code = 'ENOSPC';
        throw error;
      });

      const writeWithErrorHandling = (path, content) => {
        try {
          vol.writeFileSync(path, content);
          return { success: true };
        } catch (error) {
          if (error.code === 'ENOSPC') {
            return { error: 'Disk full', code: 'ENOSPC' };
          }
          throw error;
        }
      };

      const result = writeWithErrorHandling('/test/output.json', '{}');
      expect(result.error).toBe('Disk full');
    });

    it('should handle corrupted files gracefully', () => {
      // Create file with invalid content
      vol.writeFileSync('/test/corrupted.js', Buffer.from([0xFF, 0xFE, 0x00, 0x00]));

      const readFileWithValidation = (filePath) => {
        try {
          const content = vol.readFileSync(filePath, 'utf8');
          
          // Check for invalid characters or encoding issues
          if (content.includes('\uFFFD') || content.length === 0) {
            return { error: 'File appears to be corrupted or binary' };
          }
          
          return { content };
        } catch (error) {
          return { error: error.message };
        }
      };

      const result = readFileWithValidation('/test/corrupted.js');
      expect(result.error).toContain('corrupted or binary');
    });
  });

  describe('Network Errors', () => {
    it('should handle Ollama server offline', async () => {
      nock('http://localhost:11434')
        .post('/api/embeddings')
        .replyWithError('ECONNREFUSED');

      const generateEmbedding = async (text) => {
        try {
          const axios = await import('axios');
          const response = await axios.default.post('http://localhost:11434/api/embeddings', {
            model: 'nomic-embed-text',
            prompt: text
          });
          return response.data.embedding;
        } catch (error) {
          if (error.code === 'ECONNREFUSED') {
            throw new Error('Ollama server is not running');
          }
          throw error;
        }
      };

      await expect(generateEmbedding('test text'))
        .rejects.toThrow('Ollama server is not running');
    });

    it('should handle network timeouts', async () => {
      nock('http://localhost:6333')
        .get('/collections')
        .delay(5000) // 5 second delay
        .reply(200, { result: [] });

      const fetchWithTimeout = async (url, timeoutMs = 1000) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const axios = await import('axios');
          const response = await axios.default.get(url, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          return response.data;
        } catch (error) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            throw new Error('Request timeout');
          }
          throw error;
        }
      };

      await expect(fetchWithTimeout('http://localhost:6333/collections', 500))
        .rejects.toThrow('Request timeout');
    });

    it('should retry failed requests with exponential backoff', async () => {
      let callCount = 0;
      nock('http://localhost:6333')
        .persist()
        .get('/collections/test')
        .reply(() => {
          callCount++;
          if (callCount < 3) {
            return [500, { error: 'Internal Server Error' }];
          }
          return [200, { result: { status: 'ok' } }];
        });

      const retryRequest = async (url, maxRetries = 3) => {
        let attempt = 0;
        
        while (attempt < maxRetries) {
          try {
            const axios = await import('axios');
            const response = await axios.default.get(url);
            return response.data;
          } catch (error) {
            attempt++;
            if (attempt >= maxRetries) {
              throw new Error(`Max retries (${maxRetries}) exceeded`);
            }
            
            // Exponential backoff: 100ms, 200ms, 400ms
            const delay = Math.pow(2, attempt - 1) * 100;
            await waitFor(delay);
          }
        }
      };

      const result = await retryRequest('http://localhost:6333/collections/test');
      expect(result.result.status).toBe('ok');
      expect(callCount).toBe(3);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should handle out of memory scenarios', () => {
      const processLargeFile = (content) => {
        try {
          // Simulate memory-intensive operation
          const chunks = [];
          const chunkSize = 1000;
          
          for (let i = 0; i < content.length; i += chunkSize) {
            const chunk = content.slice(i, i + chunkSize);
            chunks.push(chunk);
            
            // Simulate memory check
            if (chunks.length > 1000) {
              throw new Error('ENOMEM: not enough memory');
            }
          }
          
          return chunks;
        } catch (error) {
          if (error.message.includes('ENOMEM')) {
            return { error: 'Not enough memory to process file' };
          }
          throw error;
        }
      };

      // Create large content that would trigger memory error
      const largeContent = 'x'.repeat(1001000); // 1001 chunks
      const result = processLargeFile(largeContent);
      
      expect(result.error).toBe('Not enough memory to process file');
    });

    it('should clean up resources on process termination', async () => {
      const resourceManager = {
        connections: [],
        timers: [],
        
        addConnection(conn) {
          this.connections.push(conn);
        },
        
        addTimer(timer) {
          this.timers.push(timer);
        },
        
        cleanup() {
          this.connections.forEach(conn => {
            if (conn.close) conn.close();
          });
          this.timers.forEach(timer => clearTimeout(timer));
          this.connections = [];
          this.timers = [];
        }
      };

      // Add mock resources
      const mockConnection = { close: sinon.stub() };
      resourceManager.addConnection(mockConnection);
      
      const timer = setTimeout(() => {}, 1000);
      resourceManager.addTimer(timer);

      // Simulate cleanup
      resourceManager.cleanup();

      expect(mockConnection.close.called).toBe(true);
      expect(resourceManager.connections).toHaveLength(0);
      expect(resourceManager.timers).toHaveLength(0);
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle malformed JSON configuration', () => {
      vol.writeFileSync('/.mcp.json', '{ "servers": { "invalid": json } }');

      const loadConfig = (path) => {
        try {
          const content = vol.readFileSync(path, 'utf8');
          return JSON.parse(content);
        } catch (error) {
          if (error instanceof SyntaxError) {
            return { 
              error: 'Invalid JSON configuration',
              fallback: true,
              mcpServers: {}
            };
          }
          throw error;
        }
      };

      const result = loadConfig('/.mcp.json');
      expect(result.error).toBe('Invalid JSON configuration');
      expect(result.fallback).toBe(true);
      expect(result.mcpServers).toEqual({});
    });

    it('should handle missing required environment variables', () => {
      delete process.env.NEO4J_PASSWORD;
      delete process.env.QDRANT_URL;

      const validateConfig = () => {
        const errors = [];
        
        if (!process.env.NEO4J_PASSWORD) {
          errors.push('NEO4J_PASSWORD not set');
        }
        
        if (!process.env.QDRANT_URL) {
          errors.push('QDRANT_URL not set');
        }

        return {
          valid: errors.length === 0,
          errors,
          config: {
            neo4j: {
              password: process.env.NEO4J_PASSWORD || 'default_password'
            },
            qdrant: {
              url: process.env.QDRANT_URL || 'http://localhost:6333'
            }
          }
        };
      };

      const result = validateConfig();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('NEO4J_PASSWORD not set');
      expect(result.errors).toContain('QDRANT_URL not set');
      expect(result.config.neo4j.password).toBe('default_password');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent MCP tool calls', async () => {
      const client = new MockMCPClient();
      let callsInProgress = 0;
      
      // Mock slow tool calls
      const originalCallTool = client.callTool;
      client.callTool = async (args) => {
        callsInProgress++;
        await waitFor(100);
        callsInProgress--;
        return originalCallTool.call(client, args);
      };

      mcpManager.clients.set('neo4j-agent-memory', client);

      // Make concurrent calls
      const promises = [
        mcpManager.callTool('neo4j-agent-memory', 'create_memory', { label: 'test1' }),
        mcpManager.callTool('neo4j-agent-memory', 'create_memory', { label: 'test2' }),
        mcpManager.callTool('neo4j-agent-memory', 'create_memory', { label: 'test3' })
      ];

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.content).toBeDefined();
      });
    });

    it('should handle race conditions in file operations', async () => {
      const fileOperations = {
        operationsInProgress: 0,
        
        async readFile(path) {
          this.operationsInProgress++;
          try {
            await waitFor(Math.random() * 50); // Simulate variable read time
            const content = vol.readFileSync(path, 'utf8');
            return content;
          } finally {
            this.operationsInProgress--;
          }
        },
        
        async writeFile(path, content) {
          this.operationsInProgress++;
          try {
            await waitFor(Math.random() * 50); // Simulate variable write time
            vol.writeFileSync(path, content);
            return true;
          } finally {
            this.operationsInProgress--;
          }
        }
      };

      // Setup test files
      vol.writeFileSync('/test/file1.js', 'original content 1');
      vol.writeFileSync('/test/file2.js', 'original content 2');

      // Concurrent operations
      const operations = [
        fileOperations.readFile('/test/file1.js'),
        fileOperations.writeFile('/test/file1.js', 'modified content 1'),
        fileOperations.readFile('/test/file2.js'),
        fileOperations.writeFile('/test/file2.js', 'modified content 2')
      ];

      const results = await Promise.all(operations);
      
      expect(results).toHaveLength(4);
      expect(fileOperations.operationsInProgress).toBe(0);
    });
  });
});
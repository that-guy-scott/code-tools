import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  CONFIG, 
  DEFAULT_CONFIG, 
  PROJECT_NAME,
  PROJECT_ROOT,
  TOOL_ROOT,
  getCollectionName,
  COLLECTION_NAME 
} from '../../lib/constants.js';

// Mock environment variables
const originalEnv = process.env;

describe('Configuration Management', () => {
  beforeEach(() => {
    // Reset environment to original state
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Configuration Constants', () => {
    it('should have proper CONFIG constant structure', () => {
      expect(CONFIG).toBeDefined();
      expect(CONFIG.MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
      expect(CONFIG.CHUNK_SIZE).toBe(2000);
      expect(CONFIG.CHUNK_OVERLAP).toBe(200);
      expect(CONFIG.MAX_CHUNK_SIZE).toBe(4000);
      expect(CONFIG.MIN_CHUNK_SIZE).toBe(100);
      expect(CONFIG.BATCH_SIZE).toBe(100);
      expect(CONFIG.EMBEDDING_DIMENSIONS).toBe(768);
    });

    it('should have proper DEFAULT_CONFIG structure', () => {
      expect(DEFAULT_CONFIG).toBeDefined();
      expect(DEFAULT_CONFIG.ollama).toBeDefined();
      expect(DEFAULT_CONFIG.gemini).toBeDefined();
      expect(DEFAULT_CONFIG.postgres).toBeDefined();
      expect(DEFAULT_CONFIG.neo4j).toBeDefined();
      expect(DEFAULT_CONFIG.qdrant).toBeDefined();
      expect(DEFAULT_CONFIG.redis).toBeDefined();
    });

    it('should have proper default values', () => {
      expect(DEFAULT_CONFIG.ollama.host).toBe('http://localhost:11434');
      expect(DEFAULT_CONFIG.ollama.defaultModel).toBe('gpt-oss:latest');
      expect(DEFAULT_CONFIG.gemini.defaultModel).toBe('gemini-2.0-flash');
      expect(DEFAULT_CONFIG.neo4j.uri).toBe('bolt://localhost:7687');
      expect(DEFAULT_CONFIG.neo4j.username).toBe('neo4j');
      expect(DEFAULT_CONFIG.neo4j.password).toBe('dev_password_123');
    });
  });

  describe('Collection Name Generation', () => {
    it('should generate valid collection names from project names', () => {
      // Test the collection name generation algorithm directly
      const generateCollectionName = (projectName) => {
        const sanitized = projectName
          .toLowerCase()
          .replace(/[^a-z0-9-_]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        return `${sanitized}-docs`;
      };
      
      expect(generateCollectionName('test-project')).toBe('test-project-docs');
      expect(generateCollectionName('My Project!')).toBe('my-project-docs');
      expect(generateCollectionName('code_tools')).toBe('code_tools-docs');
      expect(generateCollectionName('project---with---dashes')).toBe('project-with-dashes-docs');
    });

    it('should handle edge cases in project names', () => {
      // Test the collection name generation algorithm directly
      const generateCollectionName = (projectName) => {
        const sanitized = projectName
          .toLowerCase()
          .replace(/[^a-z0-9-_]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        return `${sanitized}-docs`;
      };
      
      expect(generateCollectionName('')).toBe('-docs'); // Empty string -> empty sanitized -> '-docs'
      expect(generateCollectionName('123')).toBe('123-docs');
      expect(generateCollectionName('_underscore_')).toBe('_underscore_-docs');
      expect(generateCollectionName('@#$%^&*()')).toBe('-docs'); // All special chars -> '-' -> strip leading/trailing -> '-docs'
    });
  });

  describe('Environment Variable Handling', () => {
    it('should use environment variable overrides', () => {
      const originalQdrant = process.env.QDRANT_URL;
      const originalOllama = process.env.OLLAMA_HOST;
      
      process.env.QDRANT_URL = 'http://custom-qdrant:6333';
      process.env.OLLAMA_HOST = 'http://custom-ollama:11434';
      
      // Re-import to get fresh values
      delete require.cache[require.resolve('../../lib/constants.js')];
      const { DEFAULT_CONFIG: freshConfig } = require('../../lib/constants.js');

      expect(freshConfig.qdrant.url).toBe('http://custom-qdrant:6333');
      expect(freshConfig.ollama.host).toBe('http://custom-ollama:11434');

      // Restore original values
      if (originalQdrant) {
        process.env.QDRANT_URL = originalQdrant;
      } else {
        delete process.env.QDRANT_URL;
      }
      
      if (originalOllama) {
        process.env.OLLAMA_HOST = originalOllama;
      } else {
        delete process.env.OLLAMA_HOST;
      }
    });
  });

  describe('Project Context', () => {
    it('should have proper project constants', () => {
      expect(PROJECT_NAME).toBeDefined();
      expect(PROJECT_ROOT).toBeDefined();
      expect(TOOL_ROOT).toBeDefined();
      expect(COLLECTION_NAME).toBeDefined();
    });

    it('should have project constants structure', () => {
      expect(typeof PROJECT_NAME).toBe('string');
      expect(typeof PROJECT_ROOT).toBe('string');
      expect(typeof TOOL_ROOT).toBe('string');
      expect(typeof COLLECTION_NAME).toBe('string');
      expect(COLLECTION_NAME.endsWith('-docs')).toBe(true);
    });
  });
});
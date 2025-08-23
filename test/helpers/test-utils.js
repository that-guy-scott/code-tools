import { vol } from 'memfs';
import path from 'path';

/**
 * Creates a virtual filesystem for testing file operations
 */
export function createTestFileSystem(files = {}) {
  vol.reset();
  vol.fromJSON(files);
  return vol;
}

/**
 * Sample JavaScript files for testing code analysis
 */
export const SAMPLE_FILES = {
  '/test/simple.js': [
    'const fs = require("fs");',
    '',
    'function greet(name) {',
    '  return "Hello, " + name + "!";',
    '}',
    '',
    'module.exports = greet;'
  ].join('\n'),

  '/test/class.js': [
    'const EventEmitter = require("events");',
    '',
    'class TestClass extends EventEmitter {',
    '  constructor(name) {',
    '    super();',
    '    this.name = name;',
    '    this.count = 0;',
    '  }',
    '',
    '  async process() {',
    '    this.count++;',
    '    this.emit("processed", this.count);',
    '    return this.count;',
    '  }',
    '',
    '  static create(name) {',
    '    return new TestClass(name);',
    '  }',
    '}',
    '',
    'module.exports = TestClass;'
  ].join('\n'),

  '/test/complex.js': [
    'import axios from "axios";',
    'import { createHash } from "crypto";',
    '',
    'const API_URL = "https://api.example.com";',
    'const MAX_RETRIES = 3;',
    '',
    'class DataProcessor {',
    '  constructor(options = {}) {',
    '    this.apiUrl = options.apiUrl || API_URL;',
    '    this.retries = options.retries || MAX_RETRIES;',
    '    this.cache = new Map();',
    '  }',
    '',
    '  async fetchData(id) {',
    '    const cacheKey = createHash("md5").update(id).digest("hex");',
    '    if (this.cache.has(cacheKey)) {',
    '      return this.cache.get(cacheKey);',
    '    }',
    '    const response = await axios.get(this.apiUrl + "/data/" + id);',
    '    return response.data;',
    '  }',
    '}',
    '',
    'export default DataProcessor;'
  ].join('\n'),

  '/test/package.json': JSON.stringify({
    name: 'test-package',
    version: '1.0.0',
    type: 'module',
    dependencies: {
      'axios': '^1.0.0'
    }
  }, null, 2)
};

/**
 * Mock MCP configuration for testing
 */
export const MOCK_MCP_CONFIG = {
  mcpServers: {
    'neo4j-agent-memory': {
      command: 'npx',
      args: ['@knowall-ai/mcp-neo4j-agent-memory'],
      env: {
        NEO4J_URI: 'bolt://localhost:7687',
        NEO4J_USERNAME: 'neo4j',
        NEO4J_PASSWORD: 'test_password'
      }
    },
    'qdrant': {
      command: 'npx',
      args: ['better-qdrant-mcp-server'],
      env: {
        QDRANT_URL: 'http://localhost:6333'
      }
    }
  }
};

/**
 * Utility to wait for async operations in tests
 */
export function waitFor(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a spy that tracks function calls with arguments
 */
export function createCallTracker() {
  const calls = [];
  
  const tracker = (...args) => {
    calls.push(args);
    return tracker.defaultReturn;
  };
  
  tracker.calls = calls;
  tracker.defaultReturn = undefined;
  tracker.clearCalls = () => calls.length = 0;
  tracker.callCount = () => calls.length;
  
  return tracker;
}

/**
 * Validates that an object matches expected structure
 */
export function expectObjectStructure(obj, expectedKeys) {
  for (const key of expectedKeys) {
    if (!(key in obj)) {
      throw new Error(`Missing expected key: ${key}`);
    }
  }
  return true;
}
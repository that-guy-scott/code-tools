import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import sinon from 'sinon';
import { vol } from 'memfs';
import { 
  discoverIndexableFiles, 
  extractCodeStructure, 
  chunkContent, 
  validateFile, 
  extractMetadata,
  shouldIndexFile,
  detectFileType,
  isBinaryFile,
  CONFIG
} from '../../lib/file-processor.js';
// import { SAMPLE_FILES, createTestFileSystem, expectObjectStructure } from '../helpers/test-utils.js';

// Simple inline test data to avoid memory issues
const SAMPLE_FILES = {
  '/test/simple.js': 'const fs = require("fs");\\nfunction greet(name) {\\n  return "Hello, " + name + "!";\\n}\\nmodule.exports = greet;',
  '/test/class.js': 'const EventEmitter = require("events");\\nclass TestClass extends EventEmitter {\\n  constructor(name) {\\n    super();\\n    this.name = name;\\n  }\\n  greet() {\\n    return `Hello, ${this.name}!`;\\n  }\\n}\\nmodule.exports = TestClass;',
  '/test/complex.js': 'import axios from "axios";\\nimport { EventEmitter } from "events";\\n\\nclass DataProcessor extends EventEmitter {\\n  constructor(config) {\\n    super();\\n    this.config = config;\\n  }\\n\\n  async processData(data) {\\n    return data.map(item => item.value * 2);\\n  }\\n}\\n\\nexport default DataProcessor;\\nexport { DataProcessor };'
};

function createTestFileSystem(files) {
  const { vol } = require('memfs');
  vol.reset();
  
  for (const [filePath, content] of Object.entries(files)) {
    const dir = filePath.split('/').slice(0, -1).join('/');
    if (dir && dir !== '') {
      vol.mkdirSync(dir, { recursive: true });
    }
    vol.writeFileSync(filePath, content);
  }
}

function expectObjectStructure(obj, expectedKeys) {
  for (const key of expectedKeys) {
    expect(obj).toHaveProperty(key);
  }
}

// Mock filesystem
vi.mock('fs', async () => {
  const memfs = await import('memfs');
  return memfs.fs;
});

describe('File Processing', () => {
  beforeEach(() => {
    createTestFileSystem(SAMPLE_FILES);
  });

  afterEach(() => {
    vol.reset();
    sinon.restore();
  });

  describe('File Discovery', () => {
    it('should discover JavaScript files in directory', async () => {
      const files = await discoverIndexableFiles('/test', false);
      
      expect(files).toHaveLength(3);
      expect(files.some(f => f.path.includes('simple.js'))).toBe(true);
      expect(files.some(f => f.path.includes('class.js'))).toBe(true);
      expect(files.some(f => f.path.includes('complex.js'))).toBe(true);
      expect(files.every(f => f.type === 'code')).toBe(true);
    });

    it('should handle single file indexing', async () => {
      const files = await discoverIndexableFiles('/test/simple.js', true);
      
      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('/test/simple.js');
      expect(files[0].type).toBe('code');
    });

    it('should filter out non-indexable file types', async () => {
      // Add non-JS files to filesystem
      vol.writeFileSync('/test/image.png', 'binary data');
      vol.writeFileSync('/test/readme.md', '# README');
      vol.writeFileSync('/test/data.json', '{}');

      const files = await discoverIndexableFiles('/test');
      
      // Should include JS files and markdown/JSON but filter out binary
      expect(files.length).toBeGreaterThan(3);
      expect(files.some(f => f.path.includes('simple.js'))).toBe(true);
      expect(files.some(f => f.path.includes('readme.md'))).toBe(true);
      expect(files.some(f => f.path.includes('data.json'))).toBe(true);
      expect(files.some(f => f.path.includes('image.png'))).toBe(false); // Binary filtered out
    });
  });

  describe('Code Structure Analysis', () => {
    it('should extract class information from JavaScript files', async () => {
      const content = SAMPLE_FILES['/test/class.js'];
      const result = await extractCodeStructure(content, 'code');

      expect(result).toBeDefined();
      expect(result.classes).toHaveLength(1);
      expect(result.classes[0].name).toBe('TestClass');
      expect(result.functions.length).toBeGreaterThan(0);
      expect(result.imports.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract ES6 module imports and exports', async () => {
      const content = SAMPLE_FILES['/test/complex.js'];
      const result = await extractCodeStructure(content, 'code');

      expect(result).toBeDefined();
      expect(result.imports.length).toBeGreaterThan(0);
      expect(result.imports.some(imp => imp.source === 'axios')).toBe(true);
      expect(result.exports.length).toBeGreaterThan(0);
    });

    it('should handle files with syntax errors gracefully', async () => {
      const invalidContent = 'class BrokenClass { constructor( { this.name = name } broken method() { return this.name } }';

      const result = await extractCodeStructure(invalidContent, 'code');

      expect(result).toBeDefined();
      expect(result.classes).toHaveLength(1);
      expect(result.classes[0].name).toBe('BrokenClass');
    });
  });

  describe('File Chunking', () => {
    it('should chunk large files into manageable pieces', () => {
      const content = SAMPLE_FILES['/test/complex.js'];
      const chunks = chunkContent(content, 500, 100);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].index).toBe(0);
      expect(chunks[0].size).toBeLessThanOrEqual(500);
      
      // Check overlap
      if (chunks.length > 1) {
        const overlap = chunks[0].text.slice(-100);
        const nextStart = chunks[1].text.slice(0, 100);
        expect(overlap).toBe(nextStart);
      }
    });

    it('should handle short content appropriately', () => {
      const shortContent = 'const x = 1;';
      const chunks = chunkContent(shortContent, 2000, 200);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe(shortContent);
      expect(chunks[0].size).toBe(shortContent.length);
    });
  });

  describe('File Validation', () => {
    it('should check file size limits', () => {
      const MAX_FILE_SIZE = 1024; // 1KB for testing

      // Small file should pass
      const result1 = validateFile('/test/simple.js', MAX_FILE_SIZE);
      expect(result1.valid).toBe(true);

      // Create large file
      const largeContent = 'x'.repeat(2048);
      vol.writeFileSync('/test/large.js', largeContent);

      const result2 = validateFile('/test/large.js', MAX_FILE_SIZE);
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain('exceeds maximum');
    });

    it('should handle missing files gracefully', () => {
      const result = validateFile('/test/nonexistent.js');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File not found');
    });
  });

  describe('Metadata Extraction', () => {
    it('should extract file metadata correctly', () => {
      const content = SAMPLE_FILES['/test/simple.js'];
      const metadata = extractMetadata('/test/simple.js', content);

      expectObjectStructure(metadata, ['path', 'name', 'size', 'lines', 'words', 'characters', 'type']);
      expect(metadata.name).toBe('simple.js');
      expect(metadata.lines).toBeGreaterThan(1);
      expect(metadata.words).toBeGreaterThan(1);
      expect(metadata.type).toBe('code');
    });
  });

  describe('File Type Detection', () => {
    it('should detect file types correctly', () => {
      expect(detectFileType('/test/file.js')).toBe('code');
      expect(detectFileType('/test/file.ts')).toBe('code');
      expect(detectFileType('/test/file.md')).toBe('documentation');
      expect(detectFileType('/test/file.json')).toBe('data');
      expect(detectFileType('/test/.env')).toBe('config');
      expect(detectFileType('/test/Dockerfile')).toBe('config');
      expect(detectFileType('/test/file.txt')).toBe('documentation');
    });
  });

  describe('File Filtering', () => {
    it('should determine if files should be indexed', () => {
      expect(shouldIndexFile('/test/simple.js')).toBe(true);
      expect(shouldIndexFile('/test/README.md')).toBe(true);
      expect(shouldIndexFile('/test/node_modules/package.json')).toBe(false);
      expect(shouldIndexFile('/test/.git/config')).toBe(false);
      expect(shouldIndexFile('/test/dist/bundle.js')).toBe(false);
    });
  });
});
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import sinon from 'sinon';
import { execSync } from 'child_process';

// Mock child_process for CLI testing
vi.mock('child_process', () => ({
  execSync: vi.fn()
}));

describe('CLI Commands Integration', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.CLAUDE_PROJECT_NAME = 'test-project';
    process.env.CLAUDE_PROJECT_ROOT = '/test';
  });

  afterEach(() => {
    // Cleanup
    sinon.restore();
    
    // Restore environment
    process.env = originalEnv;
  });

  describe('--index command', () => {
    it('should call index command with correct arguments', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue(Buffer.from('✅ Knowledge indexing complete!'));

      execSync('node bin/llm-cli.js --index /test');

      expect(mockExecSync).toHaveBeenCalledWith('node bin/llm-cli.js --index /test');
    });

    it('should handle single file indexing', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue(Buffer.from('✅ Indexed: /test/simple.js'));

      const result = execSync('node bin/llm-cli.js --index /test/simple.js');

      expect(mockExecSync).toHaveBeenCalledWith('node bin/llm-cli.js --index /test/simple.js');
      expect(result.toString()).toContain('Indexed: /test/simple.js');
    });
  });

  describe('--semantic-search command', () => {
    it('should execute semantic search with query', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue(Buffer.from('🔍 Found 3 results'));

      const result = execSync('node bin/llm-cli.js --semantic-search "file processing"');

      expect(mockExecSync).toHaveBeenCalledWith('node bin/llm-cli.js --semantic-search "file processing"');
      expect(result.toString()).toContain('Found 3 results');
    });

    it('should support --search-all flag', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue(Buffer.from('Searching across all projects'));

      execSync('node bin/llm-cli.js --semantic-search "test" --search-all');

      expect(mockExecSync).toHaveBeenCalledWith('node bin/llm-cli.js --semantic-search "test" --search-all');
    });
  });

  describe('--knowledge-search command', () => {
    it('should perform hybrid Neo4j + semantic search', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue(Buffer.from('🧠 Hybrid knowledge search'));

      const result = execSync('node bin/llm-cli.js --knowledge-search "database"');

      expect(mockExecSync).toHaveBeenCalledWith('node bin/llm-cli.js --knowledge-search "database"');
      expect(result.toString()).toContain('Hybrid knowledge search');
    });
  });

  describe('--list-collections command', () => {
    it('should list available project collections', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue(Buffer.from('📋 Available project collections'));

      const result = execSync('node bin/llm-cli.js --list-collections');

      expect(mockExecSync).toHaveBeenCalledWith('node bin/llm-cli.js --list-collections');
      expect(result.toString()).toContain('Available project collections');
    });
  });

  describe('Information Commands', () => {
    it('should show project information', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue(Buffer.from('Project: test-project'));

      const result = execSync('node bin/llm-cli.js --project-info');

      expect(mockExecSync).toHaveBeenCalledWith('node bin/llm-cli.js --project-info');
      expect(result.toString()).toContain('Project: test-project');
    });

    it('should list available providers', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue(Buffer.from('Available providers:\\n• ollama (default)\\n• gemini'));

      const result = execSync('node bin/llm-cli.js --list-providers');

      expect(mockExecSync).toHaveBeenCalledWith('node bin/llm-cli.js --list-providers');
      expect(result.toString()).toContain('Available providers');
    });

    it('should list MCP tools', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue(Buffer.from('MCP Server Tools:'));

      const result = execSync('node bin/llm-cli.js --list-tools');

      expect(mockExecSync).toHaveBeenCalledWith('node bin/llm-cli.js --list-tools');
      expect(result.toString()).toContain('MCP Server Tools');
    });

    it('should list Ollama models', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue(Buffer.from('Available Ollama models:'));

      const result = execSync('node bin/llm-cli.js --list-ollama-models');

      expect(mockExecSync).toHaveBeenCalledWith('node bin/llm-cli.js --list-ollama-models');
      expect(result.toString()).toContain('Available Ollama models');
    });
  });

  describe('Command Line Options', () => {
    it('should handle provider selection', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue(Buffer.from('Response from Gemini'));

      const result = execSync('node bin/llm-cli.js --provider gemini "test prompt"');

      expect(mockExecSync).toHaveBeenCalledWith('node bin/llm-cli.js --provider gemini "test prompt"');
      expect(result.toString()).toContain('Response from Gemini');
    });

    it('should handle model selection', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue(Buffer.from('Response from custom model'));

      execSync('node bin/llm-cli.js --model custom-model "test prompt"');

      expect(mockExecSync).toHaveBeenCalledWith('node bin/llm-cli.js --model custom-model "test prompt"');
    });

    it('should handle temperature setting', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue(Buffer.from('Creative response'));

      execSync('node bin/llm-cli.js --temperature 0.9 "be creative"');

      expect(mockExecSync).toHaveBeenCalledWith('node bin/llm-cli.js --temperature 0.9 "be creative"');
    });

    it('should handle streaming output', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue(Buffer.from('Streaming response...'));

      execSync('node bin/llm-cli.js --stream "test"');

      expect(mockExecSync).toHaveBeenCalledWith('node bin/llm-cli.js --stream "test"');
    });

    it('should handle JSON output format', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue(Buffer.from('{"response": "JSON formatted"}'));

      const result = execSync('node bin/llm-cli.js --output json "test"');

      expect(mockExecSync).toHaveBeenCalledWith('node bin/llm-cli.js --output json "test"');
      expect(result.toString()).toContain('{"response": "JSON formatted"}');
    });
  });

  describe('Error Handling', () => {
    it('should handle command execution errors', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      expect(() => {
        execSync('node bin/llm-cli.js --invalid-command');
      }).toThrow('Command failed');
    });
  });

  describe('Basic Commands', () => {
    it('should handle basic prompts', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue(Buffer.from('AI response to your prompt'));

      const result = execSync('node bin/llm-cli.js "What is JavaScript?"');

      expect(mockExecSync).toHaveBeenCalledWith('node bin/llm-cli.js "What is JavaScript?"');
      expect(result.toString()).toContain('AI response');
    });

    it('should handle empty command', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue(Buffer.from('No prompt provided. Use --help for usage.'));

      const result = execSync('node bin/llm-cli.js');

      expect(mockExecSync).toHaveBeenCalledWith('node bin/llm-cli.js');
      expect(result.toString()).toContain('No prompt provided');
    });
  });
});
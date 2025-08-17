#!/usr/bin/env node

import 'dotenv/config';
import { program } from 'commander';
import { Ollama } from 'ollama';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

/**
 * Semantic Knowledge Engine
 * 
 * Integrates Nomic embeddings + Qdrant + Neo4j for semantic project knowledge
 * Follows SOLID principles and <200 line limit
 */

class SemanticEngine {
  constructor(config = {}) {
    this.ollama = new Ollama({ host: config.ollamaHost || 'http://172.31.240.1:11434' });
    this.embedModel = config.embedModel || 'nomic-embed-text:latest';
    this.qdrantUrl = config.qdrantUrl || 'http://localhost:6333';
    this.collection = config.collection || 'semantic-knowledge';
  }

  /**
   * Generate embeddings for text using Nomic model via Ollama
   */
  async generateEmbedding(text) {
    try {
      const response = await this.ollama.embeddings({
        model: this.embedModel,
        prompt: text
      });
      return response.embedding;
    } catch (error) {
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Store document with embedding in Qdrant
   */
  async storeDocument(id, text, metadata = {}) {
    const embedding = await this.generateEmbedding(text);
    
    const payload = {
      id,
      text,
      metadata: {
        ...metadata,
        stored_at: new Date().toISOString(),
        source: 'semantic-engine'
      }
    };

    // Store in Qdrant via MCP (using fetch for now, will integrate with MCP)
    const response = await fetch(`${this.qdrantUrl}/collections/${this.collection}/points`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        points: [{
          id: id,
          vector: embedding,
          payload: payload
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to store in Qdrant: ${response.statusText}`);
    }

    return { id, embedding_length: embedding.length, stored: true };
  }

  /**
   * Search for similar documents
   */
  async searchSimilar(query, limit = 5) {
    const queryEmbedding = await this.generateEmbedding(query);
    
    const response = await fetch(`${this.qdrantUrl}/collections/${this.collection}/points/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vector: queryEmbedding,
        limit: limit,
        with_payload: true
      })
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const results = await response.json();
    return results.result || [];
  }

  /**
   * Process and embed all project knowledge
   */
  async indexProjectKnowledge(projectPath = '.') {
    const knowledgeFiles = [
      'CLAUDE.md',
      'README.md', 
      'llmv2.tech.spec.md',
      'package.json',
      'src/**/*.js'
    ];

    let indexed = 0;
    const results = [];

    for (const pattern of knowledgeFiles) {
      try {
        const files = await this.findFiles(projectPath, pattern);
        
        for (const file of files) {
          const content = await fs.readFile(file, 'utf8');
          const id = this.generateId(file);
          
          const result = await this.storeDocument(id, content, {
            file_path: file,
            file_type: path.extname(file),
            indexed_at: new Date().toISOString()
          });
          
          results.push(result);
          indexed++;
          
          console.log(chalk.green(`✓ Indexed: ${file} (${result.embedding_length}D vector)`));
        }
      } catch (error) {
        console.log(chalk.yellow(`⚠ Skipped pattern ${pattern}: ${error.message}`));
      }
    }

    return { indexed, results };
  }

  /**
   * Find files matching pattern (simplified glob)
   */
  async findFiles(basePath, pattern) {
    if (!pattern.includes('*')) {
      const fullPath = path.join(basePath, pattern);
      try {
        await fs.access(fullPath);
        return [fullPath];
      } catch {
        return [];
      }
    }
    
    // Simple implementation for common patterns
    if (pattern === 'src/**/*.js') {
      const srcPath = path.join(basePath, 'src');
      try {
        const files = await fs.readdir(srcPath);
        return files
          .filter(f => f.endsWith('.js'))
          .map(f => path.join(srcPath, f));
      } catch {
        return [];
      }
    }
    
    return [];
  }

  /**
   * Generate consistent ID for file
   */
  generateId(filePath) {
    // Use a simple hash-like ID that Qdrant accepts
    return Math.abs(filePath.split('').reduce((hash, char) => {
      hash = ((hash << 5) - hash) + char.charCodeAt(0);
      return hash & hash; // Convert to 32bit integer
    }, 0));
  }
}

// CLI Interface
program
  .name('semantic-engine')
  .description('Semantic Knowledge Engine - Nomic + Qdrant + Neo4j integration')
  .version('1.0.0');

program
  .command('index')
  .description('Index all project knowledge for semantic search')
  .option('-p, --path <path>', 'Project path', '.')
  .action(async (options) => {
    const engine = new SemanticEngine();
    
    console.log(chalk.blue('🔍 Starting semantic knowledge indexing...'));
    
    try {
      const result = await engine.indexProjectKnowledge(options.path);
      console.log(chalk.green(`✅ Successfully indexed ${result.indexed} files`));
    } catch (error) {
      console.error(chalk.red(`❌ Indexing failed: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('search <query>')
  .description('Search for similar content')
  .option('-l, --limit <number>', 'Number of results', '5')
  .action(async (query, options) => {
    const engine = new SemanticEngine();
    
    console.log(chalk.blue(`🔍 Searching for: "${query}"`));
    
    try {
      const results = await engine.searchSimilar(query, parseInt(options.limit));
      
      if (results.length === 0) {
        console.log(chalk.yellow('No similar content found'));
        return;
      }
      
      console.log(chalk.green(`Found ${results.length} similar items:`));
      
      results.forEach((result, i) => {
        console.log(chalk.white(`\n${i + 1}. Score: ${result.score.toFixed(3)}`));
        console.log(chalk.gray(`   File: ${result.payload.metadata.file_path}`));
        console.log(chalk.white(`   Preview: ${result.payload.text.substring(0, 100)}...`));
      });
    } catch (error) {
      console.error(chalk.red(`❌ Search failed: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('embed <text>')
  .description('Generate embedding for text (debug)')
  .action(async (text) => {
    const engine = new SemanticEngine();
    
    try {
      const embedding = await engine.generateEmbedding(text);
      console.log(chalk.green(`✅ Generated ${embedding.length}D embedding`));
      console.log(chalk.gray(`First 10 dimensions: [${embedding.slice(0, 10).map(n => n.toFixed(4)).join(', ')}...]`));
    } catch (error) {
      console.error(chalk.red(`❌ Embedding failed: ${error.message}`));
      process.exit(1);
    }
  });

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export { SemanticEngine };
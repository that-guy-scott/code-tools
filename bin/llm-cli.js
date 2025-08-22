#!/usr/bin/env node
/**
 * Universal LLM CLI v2 - Local Project Version
 * Adapted for project-local Claude infrastructure
 */

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// MCP imports
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

dotenv.config();

const program = new Command();

// Tool directory and default config
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOOL_ROOT = path.dirname(__dirname); // Parent directory of bin/

// Default MCP configuration
const DEFAULT_MCP_CONFIG = {
  mcpServers: {
    "neo4j-agent-memory": {
      "command": "npx",
      "args": ["@knowall-ai/mcp-neo4j-agent-memory"],
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USERNAME": "neo4j",
        "NEO4J_PASSWORD": "dev_password_123"
      }
    },
    "qdrant": {
      "command": "npx",
      "args": ["better-qdrant-mcp-server"],
      "env": {
        "QDRANT_URL": "http://localhost:6333"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://dev_user:dev_password_123@localhost:5432/code_tools_dev"]
    },
    "redis": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-redis", "redis://localhost:6379"]
    }
  }
};

// Project context
const PROJECT_NAME = process.env.CLAUDE_PROJECT_NAME || path.basename(process.cwd());
const PROJECT_ROOT = process.env.CLAUDE_PROJECT_ROOT || process.cwd();
const CLAUDE_DIR = path.join(PROJECT_ROOT, '.claude');

// Generate project-specific collection name
function getCollectionName() {
  // Sanitize project name for Qdrant collection naming
  const sanitized = PROJECT_NAME
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  return `${sanitized}-docs`;
}

const COLLECTION_NAME = getCollectionName();

// MCP Client Manager
class MCPManager {
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
      let configSource = null;
      
      for (const configPath of configPaths) {
        if (fs.existsSync(configPath)) {
          console.log(chalk.gray(`  Using MCP config: ${configPath}`));
          configData = fs.readFileSync(configPath, 'utf8');
          configSource = configPath;
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
        env: { ...process.env, ...serverConfig.env }
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
      return await client.callTool({ name: toolName, arguments: args });
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

// Global MCP manager instance
const mcpManager = new MCPManager();

// Configuration
const DEFAULT_CONFIG = {
  ollama: {
    host: process.env.OLLAMA_HOST || 'http://localhost:11434',
    defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'gpt-oss:latest'
  },
  gemini: {
    defaultModel: 'gemini-2.0-flash'
  }
};

program
  .name('llm')
  .description(`Universal LLM CLI v2 - Local for ${PROJECT_NAME}`)
  .version('2.0.0-local');

program
  .argument('[prompt]', 'Prompt to send to the LLM')
  .option('-p, --provider <provider>', 'LLM provider (ollama, gemini, openai, anthropic)', 'auto')
  .option('-m, --model <model>', 'Model to use')
  .option('-t, --temperature <number>', 'Temperature (0.0-1.0)', parseFloat, 0.7)
  .option('-o, --output <format>', 'Output format (text, json)', 'text')
  .option('-s, --stream', 'Enable streaming output', false)
  .option('--list-providers', 'List available providers')
  .option('--list-models', 'List available models')
  .option('--list-ollama-models', 'List available Ollama models from server')
  .option('--list-tools', 'List available MCP tools')
  .option('--project-info', 'Show project information')
  .option('--semantic-search <query>', 'Search project knowledge semantically')
  .option('--search-all', 'Search across all project collections')
  .option('--list-collections', 'List all available project collections')
  .option('--knowledge-search <query>', 'Hybrid search: Neo4j + semantic')
  .option('--index-knowledge', 'Index project files for semantic search')
  .action(async (prompt, options) => {
    try {
      if (options.projectInfo) {
        showProjectInfo();
        return;
      }

      if (options.listProviders) {
        showProviders();
        return;
      }

      if (options.listModels) {
        await showModels();
        return;
      }

      if (options.listOllamaModels) {
        await showOllamaModels();
        return;
      }

      if (options.listTools) {
        await showMCPTools();
        return;
      }

      if (options.semanticSearch) {
        await performSemanticSearch(options.semanticSearch, options.searchAll);
        return;
      }

      if (options.knowledgeSearch) {
        await performKnowledgeSearch(options.knowledgeSearch);
        return;
      }

      if (options.indexKnowledge) {
        await indexProjectKnowledge();
        return;
      }

      if (options.listCollections) {
        await listProjectCollections();
        return;
      }

      // Handle stdin input (for piping)
      let stdinData = '';
      if (!process.stdin.isTTY) {
        process.stdin.setEncoding('utf8');
        for await (const chunk of process.stdin) {
          stdinData += chunk;
        }
      }

      // Combine stdin data with prompt if both exist
      let finalPrompt = prompt || '';
      if (stdinData.trim()) {
        if (finalPrompt) {
          finalPrompt = `Input data:\n${stdinData.trim()}\n\nPrompt: ${finalPrompt}`;
        } else {
          finalPrompt = stdinData.trim();
        }
      }

      if (!finalPrompt) {
        console.log(chalk.yellow('No prompt provided. Use --help for usage information.'));
        return;
      }

      await processPrompt(finalPrompt, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Semantic Knowledge Functions
async function listProjectCollections() {
  console.log(chalk.blue('📋 Available project collections:'));
  
  try {
    const response = await axios.get('http://localhost:6333/collections');
    
    if (response.data && response.data.result && response.data.result.collections) {
      const collections = response.data.result.collections;
      const projectCollections = collections.filter(col => col.name.endsWith('-docs'));
      
      if (projectCollections.length === 0) {
        console.log(chalk.yellow('No project collections found. Run --index-knowledge to create one.'));
        return;
      }
      
      console.log(chalk.green(`Found ${projectCollections.length} project collections:\\n`));
      
      for (const collection of projectCollections) {
        const projectName = collection.name.replace('-docs', '');
        const isCurrent = collection.name === COLLECTION_NAME;
        const marker = isCurrent ? chalk.cyan(' (current)') : '';
        
        console.log(`  • ${chalk.white(projectName)}${marker}`);
        
        // Get collection stats
        try {
          const statsResponse = await axios.get(`http://localhost:6333/collections/${collection.name}`);
          const pointsCount = statsResponse.data.result.points_count;
          console.log(chalk.gray(`    Collection: ${collection.name} (${pointsCount} vectors)`));
        } catch (error) {
          console.log(chalk.gray(`    Collection: ${collection.name}`));
        }
      }
    }
  } catch (error) {
    console.error(chalk.red('Error listing collections:'), error.message);
  }
}

async function ensureCollectionExists(collectionName) {
  try {
    // Check if collection exists
    const response = await axios.get(`http://localhost:6333/collections/${collectionName}`);
    return true; // Collection exists
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // Collection doesn't exist, create it
      console.log(chalk.gray(`  Creating collection: ${collectionName}`));
      
      try {
        await axios.put(`http://localhost:6333/collections/${collectionName}`, {
          vectors: { size: 768, distance: 'Cosine' }
        }, {
          headers: { 'Content-Type': 'application/json' }
        });
        
        console.log(chalk.green(`  ✓ Created collection: ${collectionName}`));
        return true;
      } catch (createError) {
        console.error(chalk.red(`Failed to create collection ${collectionName}:`), createError.message);
        return false;
      }
    } else {
      console.error(chalk.red(`Error checking collection ${collectionName}:`), error.message);
      return false;
    }
  }
}

async function performSemanticSearch(query, searchAll = false) {
  const searchScope = searchAll ? 'all projects' : `project: ${PROJECT_NAME}`;
  console.log(chalk.blue(`🔍 Semantic search: "${query}" (${searchScope})`));
  
  try {
    // Generate embedding for the search query
    console.log(chalk.gray('Generating query embedding...'));
    const queryEmbedding = await generateOllamaEmbedding(query);
    
    let allResults = [];
    
    if (searchAll) {
      // Search across all project collections
      console.log(chalk.gray('Searching across all project collections...'));
      const collectionsResponse = await axios.get('http://localhost:6333/collections');
      const projectCollections = collectionsResponse.data.result.collections
        .filter(col => col.name.endsWith('-docs'));
        
      if (projectCollections.length === 0) {
        console.log(chalk.yellow('No project collections found. Run --index-knowledge to create one.'));
        return;
      }
      
      for (const collection of projectCollections) {
        try {
          const results = await searchQdrant(queryEmbedding, 3, collection.name);
          const projectName = collection.name.replace('-docs', '');
          
          // Add project context to results
          results.forEach(result => {
            result.project = projectName;
            result.collection = collection.name;
          });
          
          allResults.push(...results);
        } catch (error) {
          console.log(chalk.yellow(`  Warning: Could not search ${collection.name}`));
        }
      }
      
      // Sort all results by score descending
      allResults.sort((a, b) => b.score - a.score);
      allResults = allResults.slice(0, 5); // Top 5 across all projects
      
    } else {
      // Search only current project's collection
      console.log(chalk.gray(`Searching collection: ${COLLECTION_NAME}...`));
      
      // Ensure collection exists
      const collectionExists = await ensureCollectionExists(COLLECTION_NAME);
      if (!collectionExists) {
        console.log(chalk.yellow('Collection not found. Run --index-knowledge first.'));
        return;
      }
      
      allResults = await searchQdrant(queryEmbedding, 5, COLLECTION_NAME);
    }
    
    const searchResults = allResults;
    
    if (searchResults.length === 0) {
      console.log(chalk.yellow('No results found. Try indexing some documents first with --index-knowledge'));
      return;
    }
    
    const resultLabel = searchAll ? `${searchResults.length} results across projects` : `${searchResults.length} results`;
    console.log(chalk.green.bold(`\n📋 Found ${resultLabel}:`));
    
    searchResults.forEach((result, index) => {
      const score = (result.score * 100).toFixed(1);
      const payload = result.payload;
      const projectLabel = result.project ? `[${result.project}] ` : '';
      
      console.log(chalk.cyan(`\n${index + 1}. ${projectLabel}${payload.file_name} (${score}% match)`));
      console.log(chalk.gray(`   Path: ${payload.file_path}`));
      console.log(chalk.gray(`   Chunk: ${payload.chunk_index + 1}`));
      
      // Show a preview of the matching text
      const preview = payload.chunk_text.substring(0, 200).replace(/\n/g, ' ');
      console.log(chalk.white(`   Preview: ${preview}${payload.chunk_text.length > 200 ? '...' : ''}\n`));
    });
    
  } catch (error) {
    console.error(chalk.red('Semantic search error:'), error.message);
  }
}

async function searchQdrant(queryEmbedding, limit = 5, collectionName = COLLECTION_NAME) {
  try {
    const response = await axios.post(`http://localhost:6333/collections/${collectionName}/points/search`, {
      vector: queryEmbedding,
      limit: limit,
      with_payload: true,
      with_vector: false
    });
    
    if (response.data && response.data.result) {
      return response.data.result;
    } else {
      throw new Error('No results returned from Qdrant');
    }
  } catch (error) {
    console.error(chalk.red('Qdrant search error:'), error.message);
    throw error;
  }
}

async function performKnowledgeSearch(query) {
  console.log(chalk.blue(`🧠 Hybrid knowledge search: "${query}"`));
  
  // Phase 1: Search Neo4j graph knowledge
  console.log(chalk.gray('Searching Neo4j knowledge graph...'));
  // In real implementation: call MCP Neo4j agent memory
  
  // Phase 2: Search semantic vectors
  console.log(chalk.gray('Searching semantic vectors...'));
  // In real implementation: call MCP Qdrant
  
  // Phase 3: Combine and rank results
  console.log(chalk.green('✅ Hybrid results would combine graph + semantic matches'));
  console.log(chalk.gray('Note: Uses existing Neo4j + Qdrant MCP servers'));
}

async function indexProjectKnowledge() {
  console.log(chalk.blue('📚 Indexing project knowledge...'));
  console.log(chalk.gray(`Project: ${PROJECT_NAME}`));
  console.log(chalk.gray(`Collection: ${COLLECTION_NAME}`));
  
  try {
    // Initialize MCP manager
    const mcpAvailable = await mcpManager.loadConfig();
    if (mcpAvailable) {
      console.log(chalk.gray('MCP configuration loaded - Neo4j integration enabled'));
    }
    
    // Ensure project-specific collection exists
    const collectionExists = await ensureCollectionExists(COLLECTION_NAME);
    if (!collectionExists) {
      console.error(chalk.red('Failed to create collection. Cannot proceed with indexing.'));
      return;
    }
    
    // Discover indexable files
    const filesToIndex = await discoverIndexableFiles();
    console.log(chalk.gray(`Found ${filesToIndex.length} files to index`));
    
    let indexed = 0;
    let failed = 0;
    
    for (const filePath of filesToIndex) {
      try {
        console.log(chalk.cyan(`🔄 Indexing: ${filePath}`));
        
        // Check if file is already indexed
        const alreadyIndexed = await checkIfFileIndexed(filePath);
        if (alreadyIndexed) {
          console.log(chalk.yellow(`⚠️  Already indexed, skipping: ${path.basename(filePath)}`));
          continue;
        }
        
        // Read file content
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.trim().length === 0) {
          console.log(chalk.yellow(`⚠️  Skipping empty file: ${filePath}`));
          continue;
        }
        
        // Use MCP Qdrant to add document with Ollama embeddings
        const vectorData = await indexFileWithMCP(filePath, content);
        
        // Create Neo4j entity for the document with vector metadata
        await createDocumentEntity(filePath, content.length, vectorData);
        
        console.log(chalk.green(`✅ Indexed: ${filePath}`));
        indexed++;
        
      } catch (error) {
        console.error(chalk.red(`❌ Failed to index ${filePath}:`), error.message);
        failed++;
      }
    }
    
    console.log('');
    console.log(chalk.green.bold(`✅ Knowledge indexing complete!`));
    console.log(chalk.cyan(`📊 Results: ${indexed} indexed, ${failed} failed`));
    console.log(chalk.gray('Documents are now searchable via --semantic-search'));
    
    // Clean up MCP connections
    await mcpManager.disconnect();
    
  } catch (error) {
    console.error(chalk.red('Error during knowledge indexing:'), error.message);
    await mcpManager.disconnect();
  }
}

function loadGitignorePatterns() {
  const gitignorePath = path.join(PROJECT_ROOT, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    return [];
  }
  
  try {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(pattern => {
        // Normalize patterns for matching
        if (pattern.endsWith('/')) {
          return pattern.slice(0, -1); // Remove trailing slash
        }
        return pattern;
      });
  } catch (error) {
    console.log(chalk.yellow(`Warning: Could not read .gitignore: ${error.message}`));
    return [];
  }
}

function isGitignored(filePath, patterns) {
  for (const pattern of patterns) {
    if (matchesGitignorePattern(filePath, pattern)) {
      return true;
    }
  }
  return false;
}

function matchesGitignorePattern(filePath, pattern) {
  // Handle negation patterns
  if (pattern.startsWith('!')) {
    return false; // Negation patterns are complex, skip for now
  }
  
  // Convert gitignore pattern to regex
  let regex = pattern
    .replace(/\./g, '\\.')  // Escape dots
    .replace(/\*/g, '[^/]*') // * matches anything except /
    .replace(/\*\*/g, '.*')  // ** matches anything including /
    .replace(/\?/g, '[^/]'); // ? matches single char except /
  
  // If pattern doesn't start with /, it can match at any directory level
  if (!pattern.startsWith('/')) {
    regex = `(^|/)${regex}`;
  } else {
    regex = regex.slice(1); // Remove leading / from pattern
  }
  
  // If pattern doesn't end with specific file, it matches directories too
  if (!pattern.includes('.') && !pattern.endsWith('*')) {
    regex += '(/|$)';
  }
  
  const regexPattern = new RegExp(regex);
  return regexPattern.test(filePath);
}

async function discoverIndexableFiles() {
  // Load .gitignore patterns
  const gitignorePatterns = loadGitignorePatterns();
  
  // Common exclusion patterns (fallback if no .gitignore)
  const defaultExcludes = [
    'node_modules', '.git', 'dist', 'build', '.env', '.env.*',
    '*.log', '*.tmp', '*.cache', '.DS_Store', 'Thumbs.db',
    '.vscode', '.idea', '__pycache__', '*.pyc', '.pytest_cache',
    'target/', 'bin/', 'obj/', '.gradle/', '.mvn/'
  ];
  
  function isBinaryFile(filePath) {
    try {
      // Read first 1024 bytes to detect binary content
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(1024);
      const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
      fs.closeSync(fd);
      
      if (bytesRead === 0) return false; // Empty file is text
      
      // Check for null bytes (common in binary files)
      for (let i = 0; i < bytesRead; i++) {
        if (buffer[i] === 0) return true;
      }
      
      // Check for high percentage of non-printable characters
      let nonPrintable = 0;
      for (let i = 0; i < bytesRead; i++) {
        const byte = buffer[i];
        if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
          nonPrintable++;
        }
      }
      
      return (nonPrintable / bytesRead) > 0.3; // More than 30% non-printable
    } catch (error) {
      return true; // If we can't read it, assume binary
    }
  }
  
  function shouldIndex(filePath) {
    const relativePath = path.relative(PROJECT_ROOT, filePath);
    const fileName = path.basename(filePath);
    
    // Skip binary files
    if (isBinaryFile(filePath)) return false;
    
    // Check against .gitignore patterns
    if (gitignorePatterns.length > 0) {
      return !isGitignored(relativePath, gitignorePatterns);
    }
    
    // Fallback to default exclusion patterns
    return !defaultExcludes.some(pattern => {
      if (pattern.includes('*')) {
        // Simple glob matching
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(fileName) || regex.test(relativePath);
      }
      return relativePath.includes(pattern) || fileName.includes(pattern);
    });
  }
  
  function scanDirectory(dir, files = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Check if directory should be indexed (using same logic as files)
        const relativePath = path.relative(PROJECT_ROOT, fullPath);
        
        // Skip directories that match gitignore or default exclusion patterns
        let shouldSkip = false;
        
        if (gitignorePatterns.length > 0) {
          shouldSkip = isGitignored(relativePath, gitignorePatterns);
        } else {
          shouldSkip = defaultExcludes.some(pattern => {
            if (pattern.includes('*')) {
              const regex = new RegExp(pattern.replace(/\*/g, '.*'));
              return regex.test(entry.name) || regex.test(relativePath);
            }
            return entry.name.includes(pattern) || relativePath.includes(pattern);
          });
        }
        
        if (!shouldSkip) {
          scanDirectory(fullPath, files);
        }
      } else if (entry.isFile() && shouldIndex(fullPath)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }
  
  return scanDirectory(PROJECT_ROOT);
}

async function indexFileWithMCP(filePath, content) {
  const fileName = path.basename(filePath);
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  
  // Chunk the content
  const chunks = chunkText(content, 2000, 200);
  console.log(chalk.gray(`  Processing ${chunks.length} chunks for ${fileName}...`));
  
  const points = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    // Generate embedding using Ollama
    console.log(chalk.gray(`    Generating embedding for chunk ${i + 1}/${chunks.length}...`));
    const embedding = await generateOllamaEmbedding(chunk);
    
    // Create point for Qdrant (use numeric ID)
    const pointId = Date.now() * 1000 + i; // Generate unique numeric ID
    points.push({
      id: pointId,
      vector: embedding,
      payload: {
        file_path: relativePath,
        full_path: filePath,
        file_name: fileName,
        chunk_index: i,
        chunk_text: chunk,
        content_length: chunk.length,
        indexed_at: new Date().toISOString()
      }
    });
  }
  
  // Store all points in Qdrant
  console.log(chalk.gray(`  Storing ${points.length} vectors in Qdrant...`));
  await storeInQdrant(points);
  
  return { chunks: chunks.length, vectors_stored: points.length };
}

function chunkText(text, chunkSize, overlap) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    
    if (end === text.length) break;
    start = end - overlap;
  }
  
  return chunks;
}

async function generateOllamaEmbedding(text) {
  try {
    const response = await axios.post(`${DEFAULT_CONFIG.ollama.host}/api/embeddings`, {
      model: 'nomic-embed-text',
      prompt: text
    });
    
    if (response.data && response.data.embedding) {
      return response.data.embedding;
    } else {
      throw new Error('No embedding returned from Ollama');
    }
  } catch (error) {
    console.error(chalk.red(`Ollama embedding error:`), error.message);
    throw error;
  }
}

async function checkIfFileIndexed(filePath) {
  try {
    const relativePath = path.relative(PROJECT_ROOT, filePath);
    
    // Search for vectors with this file path
    const response = await axios.post(`http://localhost:6333/collections/${COLLECTION_NAME}/points/search`, {
      vector: Array(768).fill(0), // Dummy vector for search
      limit: 1,
      filter: {
        must: [
          {
            key: "file_path",
            match: { value: relativePath }
          }
        ]
      }
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    return response.data && response.data.result && response.data.result.length > 0;
  } catch (error) {
    // If collection doesn't exist or search fails, assume not indexed
    return false;
  }
}

async function storeInQdrant(points) {
  try {
    const response = await axios.put(`http://localhost:6333/collections/${COLLECTION_NAME}/points`, {
      points: points
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.data && response.data.status === 'ok') {
      return response.data;
    } else {
      throw new Error('Failed to store in Qdrant');
    }
  } catch (error) {
    if (error.response && error.response.data) {
      console.error(chalk.red(`Qdrant API error:`), JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(chalk.red(`Qdrant storage error:`), error.message);
    }
    throw error;
  }
}

async function createProjectEntity(projectName) {
  try {
    console.log(chalk.gray(`  Creating/finding project entity: ${projectName}...`));
    
    // First search for existing project entity
    const searchResult = await mcpManager.callTool(
      'neo4j-agent-memory',
      'search_memories',
      {
        query: projectName,
        label: 'project',
        limit: 1,
        depth: 1
      }
    );
    
    if (searchResult && searchResult.content && searchResult.content[0]) {
      const searchData = JSON.parse(searchResult.content[0].text);
      if (searchData.length > 0) {
        const existingProject = searchData[0];
        if (existingProject.memory && existingProject.memory.name === projectName) {
          console.log(chalk.gray(`  ✓ Found existing project entity: ${existingProject.memory._id}`));
          return existingProject.memory._id;
        }
      }
    }
    
    // Create new project entity
    const projectData = {
      name: projectName,
      type: 'indexed_project',
      indexed_at: new Date().toISOString(),
      vector_collection: COLLECTION_NAME,
      status: 'active',
      location: PROJECT_ROOT
    };
    
    const createResult = await mcpManager.callTool(
      'neo4j-agent-memory',
      'create_memory',
      {
        label: 'project',
        properties: projectData
      }
    );
    
    if (createResult && createResult.content && createResult.content[0]) {
      const memory = JSON.parse(createResult.content[0].text);
      const projectId = memory.memory._id;
      
      console.log(chalk.gray(`  ✓ Created project entity: ${projectId}`));
      
      // Link CLI tool to this project with INDEXES relationship
      await mcpManager.callTool(
        'neo4j-agent-memory',
        'create_connection',
        {
          fromMemoryId: 10, // llm-cli application entity
          toMemoryId: projectId,
          type: 'INDEXES',
          properties: {
            indexed_at: new Date().toISOString(),
            tool_version: '2.0.0-local'
          }
        }
      );
      
      console.log(chalk.gray(`  ✓ Project linked to CLI with INDEXES relationship`));
      
      return projectId;
    }
    
    throw new Error('Failed to create project entity');
    
  } catch (error) {
    console.error(chalk.red(`Failed to create project entity: ${error.message}`));
    return null;
  }
}

async function createDocumentEntity(filePath, contentLength, vectorData) {
  try {
    const relativePath = path.relative(PROJECT_ROOT, filePath);
    const fileName = path.basename(filePath);
    const fileExt = path.extname(filePath);
    const stats = fs.statSync(filePath);
    
    // Get or create project entity first
    const projectId = await createProjectEntity(PROJECT_NAME);
    if (!projectId) {
      throw new Error('Failed to create/find project entity');
    }
    
    // Create document entity in Neo4j with REAL MCP calls
    const documentData = {
      name: fileName,
      file_path: relativePath,
      full_path: filePath,
      file_extension: fileExt,
      content_length: contentLength,
      size_bytes: stats.size,
      last_modified: stats.mtime.toISOString(),
      indexed_at: new Date().toISOString(),
      vector_collection: COLLECTION_NAME,
      chunk_count: vectorData.chunks,
      vector_count: vectorData.vectors_stored,
      status: 'indexed'
    };
    
    console.log(chalk.gray(`  Creating Neo4j document entity for ${fileName}...`));
    
    // Try to use MCP Neo4j integration
    try {
      console.log(chalk.gray(`  Creating Neo4j document entity...`));
      
      // Call MCP Neo4j agent memory to create document
      const createResult = await mcpManager.callTool(
        'neo4j-agent-memory',
        'create_memory',
        {
          label: 'document',
          properties: documentData
        }
      );
      
      if (createResult && createResult.content && createResult.content[0]) {
        const memory = JSON.parse(createResult.content[0].text);
        const documentId = memory.memory._id;
        
        console.log(chalk.gray(`  ✓ Neo4j entity created: ${documentId}`));
        
        // Link document to PROJECT (not main CLI tool)
        await mcpManager.callTool(
          'neo4j-agent-memory',
          'create_connection',
          {
            fromMemoryId: projectId, // Link to project entity instead of main CLI
            toMemoryId: documentId,
            type: 'CONTAINS',
            properties: {
              indexed_at: new Date().toISOString(),
              vector_count: vectorData.vectors_stored,
              chunk_count: vectorData.chunks
            }
          }
        );
        
        console.log(chalk.gray(`  ✓ Document linked to project in Neo4j`));
        return { status: 'indexed', entity_created: true, entity_id: documentId };
      } else {
        throw new Error('Invalid response from Neo4j MCP server');
      }
      
    } catch (error) {
      console.log(chalk.yellow(`  Neo4j MCP integration failed: ${error.message}`));
      console.log(chalk.gray(`  ✓ Document metadata prepared (Neo4j integration failed)`));
      return { 
        status: 'indexed', 
        entity_created: false, 
        metadata: documentData,
        error: error.message
      };
    }
    
  } catch (error) {
    console.error(chalk.red(`Neo4j error for ${filePath}:`), error.message);
    // Don't throw - indexing can continue even if Neo4j fails
    return { status: 'indexed', entity_created: false, error: error.message };
  }
}

function showProjectInfo() {
  console.log(chalk.green.bold(`🚀 Claude Local Infrastructure`));
  console.log(chalk.cyan(`Project: ${PROJECT_NAME}`));
  console.log(chalk.cyan(`Root: ${PROJECT_ROOT}`));
  console.log(chalk.cyan(`Claude Dir: ${CLAUDE_DIR}`));
  console.log(chalk.cyan(`Ollama Host: ${DEFAULT_CONFIG.ollama.host}`));
  console.log('');
  console.log(chalk.yellow('Database Services:'));
  console.log('  • PostgreSQL: localhost:5432');
  console.log('  • Neo4j: localhost:7474 (Web) / localhost:7687 (Bolt)');
  console.log('  • Redis: localhost:6379');
  console.log('  • Qdrant: localhost:6333');
  console.log('');
  console.log(chalk.yellow('LLM Services:'));
  console.log(`  • Ollama: ${DEFAULT_CONFIG.ollama.host}`);
  console.log(`  • Default Model: ${DEFAULT_CONFIG.ollama.defaultModel}`);
  console.log('');
  console.log(chalk.yellow('Memory Isolation: Project-Only'));
}

function showProviders() {
  console.log(chalk.green.bold('Available Providers:'));
  console.log('  • ollama (default)');
  console.log('  • gemini');
  console.log('  • openai');
  console.log('  • anthropic');
}

async function showModels() {
  console.log(chalk.green.bold('Available Models:'));
  console.log(chalk.cyan('Ollama:'));
  console.log('  • gpt-oss:latest (default)');
  console.log('  • qwen3-coder:latest');
  console.log('  • gemma3:27b');
  console.log('');
  console.log(chalk.cyan('Gemini:'));
  console.log('  • gemini-2.0-flash (default)');
  console.log('  • gemini-2.5-pro');
  console.log('');
  console.log(chalk.gray('Use --list-ollama-models to see actual Ollama models on your server'));
}

async function showOllamaModels() {
  try {
    console.log(chalk.blue('🔍 Querying Ollama server for available models...'));
    const response = await axios.get(`${DEFAULT_CONFIG.ollama.host}/api/tags`);
    
    if (response.data && response.data.models && response.data.models.length > 0) {
      console.log(chalk.green.bold('Available Ollama Models:'));
      response.data.models.forEach(model => {
        const isDefault = model.name === DEFAULT_CONFIG.ollama.defaultModel;
        const marker = isDefault ? chalk.yellow(' (default)') : '';
        console.log(`  • ${model.name}${marker}`);
        if (model.size) {
          const sizeMB = (model.size / (1024 * 1024)).toFixed(1);
          console.log(chalk.gray(`    Size: ${sizeMB} MB`));
        }
      });
    } else {
      console.log(chalk.yellow('No models found on Ollama server'));
    }
  } catch (error) {
    console.error(chalk.red('Error connecting to Ollama server:'), error.message);
    console.log(chalk.gray(`Trying to connect to: ${DEFAULT_CONFIG.ollama.host}`));
    console.log(chalk.gray('Make sure Ollama is running with: ollama serve'));
  }
}

async function showMCPTools() {
  console.log(chalk.green.bold('Available MCP Tools (Project-Local):'));
  console.log('  • neo4j-agent-memory (Project knowledge graph)');
  console.log('  • postgres (Project database)');
  console.log('  • redis (Project cache)');
  console.log('  • qdrant (Project vectors)');
  console.log('  • github (Repository operations)');
  console.log('  • puppeteer (Browser automation)');
  console.log('  • jetbrains (IntelliJ IDEA integration)');
}

async function processPrompt(prompt, options) {
  const provider = options.provider === 'auto' ? 'ollama' : options.provider;
  
  console.log(chalk.green(`🤖 Processing with ${provider} provider...`));
  
  try {
    if (provider === 'ollama') {
      await processOllamaPrompt(prompt, options);
    } else {
      console.log(chalk.yellow(`Provider '${provider}' not yet implemented. Currently only Ollama is supported.`));
      console.log(chalk.gray('Supported providers: ollama'));
    }
  } catch (error) {
    console.error(chalk.red('Error processing prompt:'), error.message);
  }
}

async function processOllamaPrompt(prompt, options) {
  const model = options.model || DEFAULT_CONFIG.ollama.defaultModel;
  const temperature = options.temperature || 0.7;
  
  console.log(chalk.cyan(`Model: ${model}`));
  console.log(chalk.cyan(`Temperature: ${temperature}`));
  console.log('');
  
  try {
    const requestData = {
      model: model,
      prompt: prompt,
      stream: options.stream || false,
      options: {
        temperature: temperature
      }
    };

    if (options.stream) {
      // Streaming response
      const response = await axios.post(`${DEFAULT_CONFIG.ollama.host}/api/generate`, requestData, {
        responseType: 'stream'
      });
      
      console.log(chalk.blue('Response:'));
      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              process.stdout.write(data.response);
            }
          } catch (e) {
            // Ignore parsing errors for partial chunks
          }
        });
      });
      
      response.data.on('end', () => {
        console.log('\n');
      });
    } else {
      // Non-streaming response
      const response = await axios.post(`${DEFAULT_CONFIG.ollama.host}/api/generate`, requestData);
      
      if (response.data && response.data.response) {
        console.log(chalk.blue('Response:'));
        console.log(response.data.response);
      } else {
        console.log(chalk.yellow('No response received from Ollama'));
      }
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error(chalk.red('Cannot connect to Ollama server.'));
      console.log(chalk.gray(`Trying to connect to: ${DEFAULT_CONFIG.ollama.host}`));
      console.log(chalk.gray('Make sure Ollama is running with: ollama serve'));
    } else if (error.response && error.response.status === 404) {
      console.error(chalk.red(`Model '${model}' not found on Ollama server.`));
      console.log(chalk.gray('Use --list-ollama-models to see available models'));
      console.log(chalk.gray(`Or install the model with: ollama pull ${model}`));
    } else {
      console.error(chalk.red('Ollama API error:'), error.message);
    }
  }
}

// Handle uncaught errors
process.on('uncaughtException', async (error) => {
  console.error(chalk.red('Uncaught Exception:'), error.message);
  await mcpManager.disconnect();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  await mcpManager.disconnect();
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log(chalk.yellow('\nReceived SIGINT. Cleaning up...'));
  await mcpManager.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(chalk.yellow('\nReceived SIGTERM. Cleaning up...'));
  await mcpManager.disconnect();
  process.exit(0);
});

program.parse();
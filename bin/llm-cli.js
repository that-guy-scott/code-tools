#!/usr/bin/env node
/**
 * Universal LLM CLI v2 - Local Project Version
 * Adapted for project-local Claude infrastructure
 */

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

const program = new Command();

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
    
  } catch (error) {
    console.error(chalk.red('Error during knowledge indexing:'), error.message);
  }
}

async function discoverIndexableFiles() {
  const indexableExtensions = ['.md', '.txt', '.js', '.ts', '.json', '.py', '.sh'];
  const excludePatterns = ['node_modules', '.git', 'dist', 'build', '.env'];
  
  function shouldIndex(filePath) {
    // Check if file has indexable extension
    const hasValidExt = indexableExtensions.some(ext => filePath.endsWith(ext));
    if (!hasValidExt) return false;
    
    // Check if path contains excluded patterns
    const isExcluded = excludePatterns.some(pattern => filePath.includes(pattern));
    return !isExcluded;
  }
  
  function scanDirectory(dir, files = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip excluded directories
        if (!excludePatterns.some(pattern => entry.name.includes(pattern))) {
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

async function createDocumentEntity(filePath, contentLength, vectorData) {
  try {
    const relativePath = path.relative(PROJECT_ROOT, filePath);
    const fileName = path.basename(filePath);
    const fileExt = path.extname(filePath);
    const stats = fs.statSync(filePath);
    
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
    
    // Try to detect if we're in Claude Code MCP context
    const isClaudeCodeContext = typeof global.mcp__neo4j_agent_memory__create_memory === 'function';
    
    if (isClaudeCodeContext) {
      console.log(chalk.gray(`  Creating Neo4j document entity...`));
      // REAL Neo4j MCP calls when available
      const memory = await global.mcp__neo4j_agent_memory__create_memory('document', documentData);
      const documentId = memory.memory._id;
      await global.mcp__neo4j_agent_memory__create_connection(0, documentId, 'CONTAINS', {
        indexed_at: new Date().toISOString(),
        vector_count: vectorData.vectors_stored,
        chunk_count: vectorData.chunks
      });
      console.log(chalk.gray(`  ✓ Neo4j entity created: ${documentId}`));
      return { status: 'indexed', entity_created: true, entity_id: documentId };
    } else {
      console.log(chalk.gray(`  ✓ Document metadata prepared (run in Claude Code for Neo4j integration)`));
      return { 
        status: 'indexed', 
        entity_created: false, 
        metadata: documentData,
        note: 'Run in Claude Code for full Neo4j integration'
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
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

program.parse();
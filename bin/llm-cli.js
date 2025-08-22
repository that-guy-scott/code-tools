#!/usr/bin/env node
/**
 * Universal LLM CLI v2 - Local Project Version
 * Adapted for project-local Claude infrastructure
 */

import {Command} from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import {fileURLToPath} from 'url';

// MCP imports
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';

// AST parsing imports
import * as acorn from 'acorn';
import {parse as babelParse} from '@babel/parser';
import babelTraverse from '@babel/traverse';

const program = new Command();

// Tool directory and default config
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOOL_ROOT = path.dirname(__dirname); // Parent directory of bin/

// Configuration constants
const CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    CHUNK_SIZE: 2000,
    CHUNK_OVERLAP: 200,
    MAX_CHUNK_SIZE: 4000,
    MIN_CHUNK_SIZE: 100,
    BATCH_SIZE: 100,
    EMBEDDING_DIMENSIONS: 768
};

// Configuration with sane defaults (no .env required)
const DEFAULT_CONFIG = {
    ollama: {
        host: process.env.OLLAMA_HOST || 'http://localhost:11434',
        defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'gpt-oss:latest'
    },
    gemini: {
        defaultModel: process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.0-flash'
    },
    postgres: {
        connectionString: process.env.POSTGRES_CONNECTION_STRING || 'postgresql://dev_user:dev_password_123@localhost:5432/code_tools_dev'
    },
    neo4j: {
        uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
        username: process.env.NEO4J_USERNAME || 'neo4j',
        password: process.env.NEO4J_PASSWORD || 'dev_password_123'
    },
    qdrant: {
        url: process.env.QDRANT_URL || 'http://localhost:6333'
    },
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    }
};

// Default MCP configuration with environment variable fallbacks
const DEFAULT_MCP_CONFIG = {
    mcpServers: {
        "neo4j-agent-memory": {
            "command": "npx",
            "args": ["@knowall-ai/mcp-neo4j-agent-memory"],
            "env": {
                "NEO4J_URI": DEFAULT_CONFIG.neo4j.uri,
                "NEO4J_USERNAME": DEFAULT_CONFIG.neo4j.username,
                "NEO4J_PASSWORD": DEFAULT_CONFIG.neo4j.password
            }
        },
        "qdrant": {
            "command": "npx",
            "args": ["better-qdrant-mcp-server"],
            "env": {
                "QDRANT_URL": DEFAULT_CONFIG.qdrant.url
            }
        },
        "postgres": {
            "command": "npx",
            "args": ["-y", "@henkey/postgres-mcp-server", DEFAULT_CONFIG.postgres.connectionString]
        },
        "redis": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-redis", DEFAULT_CONFIG.redis.url]
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

// Logging utilities
function logError(context, error) {
    console.error(chalk.red(`❌ ${context}:`), error.message);
}

function logWarning(message) {
    console.log(chalk.yellow(`⚠️  ${message}`));
}

function logSuccess(message) {
    console.log(chalk.green(`✅ ${message}`));
}

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
                env: {...process.env, ...serverConfig.env}
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
            return await client.callTool({name: toolName, arguments: args});
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

// Configuration (self-contained, no .env required)
const OLLAMA_CONFIG = {
    ollama: {
        host: process.env.OLLAMA_HOST || 'http://localhost:11434',
        defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'gpt-oss:latest'
    },
    gemini: {
        defaultModel: process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.0-flash'
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
    .option('--index [path]', 'Index files for semantic search. Optionally specify a file/directory path (defaults to current directory)')
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

            if (options.index !== undefined) {
                const indexPath = options.index || process.cwd();
                await indexProjectKnowledge(indexPath);
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
            logError('CLI Error', error);
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
                console.log(chalk.yellow('No project collections found. Run --index to create one.'));
                return;
            }

            console.log(chalk.green(`Found ${projectCollections.length} project collections:\n`));

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
        logError('Error listing collections', error);
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
                    vectors: {size: CONFIG.EMBEDDING_DIMENSIONS, distance: 'Cosine'}
                }, {
                    headers: {'Content-Type': 'application/json'}
                });

                logSuccess(`Created collection: ${collectionName}`);
                return true;
            } catch (createError) {
                logError(`Failed to create collection ${collectionName}`, createError);
                return false;
            }
        } else {
            logError(`Error checking collection ${collectionName}`, error);
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
                console.log(chalk.yellow('No project collections found. Run --index to create one.'));
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
                console.log(chalk.yellow('Collection not found. Run --index first.'));
                return;
            }

            allResults = await searchQdrant(queryEmbedding, 5, COLLECTION_NAME);
        }

        const searchResults = allResults;

        if (searchResults.length === 0) {
            console.log(chalk.yellow('No results found. Try indexing some documents first with --index'));
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
        logError('Semantic search error', error);
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
        logError('Qdrant search error', error);
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

async function indexProjectKnowledge(indexPath = null) {
    // Use provided path or default to current working directory
    const targetPath = indexPath ? path.resolve(indexPath) : PROJECT_ROOT;

    // Check if target path exists
    if (!fs.existsSync(targetPath)) {
        logError('Index path does not exist', new Error(`Path not found: ${targetPath}`));
        return;
    }

    // Check if it's a file or directory
    const stats = fs.statSync(targetPath);
    const isFile = stats.isFile();
    const isDirectory = stats.isDirectory();

    if (!isFile && !isDirectory) {
        logError('Invalid index path', new Error(`Path is neither a file nor directory: ${targetPath}`));
        return;
    }

    console.log(chalk.blue('📚 Indexing project knowledge...'));
    console.log(chalk.gray(`Project: ${PROJECT_NAME}`));
    console.log(chalk.gray(`Collection: ${COLLECTION_NAME}`));
    console.log(chalk.gray(`Target: ${isFile ? 'Single file' : 'Directory'} - ${targetPath}`));

    try {
        // Initialize MCP manager
        const mcpAvailable = await mcpManager.loadConfig();
        if (mcpAvailable) {
            console.log(chalk.gray('MCP configuration loaded - Neo4j integration enabled'));
        }

        // Setup PostgreSQL tables and create session
        const postgresAvailable = await ensurePostgreSQLTables();
        let sessionId = null;
        if (postgresAvailable) {
            sessionId = await createIndexingSession();
        }

        // Ensure project-specific collection exists
        const collectionExists = await ensureCollectionExists(COLLECTION_NAME);
        if (!collectionExists) {
            logError('Failed to create collection. Cannot proceed with indexing', new Error('Collection creation failed'));
            return;
        }

        // Discover indexable files
        const filesToIndex = await discoverIndexableFiles(targetPath, isFile);
        console.log(chalk.gray(`Found ${filesToIndex.length} files to index`));

        // PHASE 1: Index files and create basic entities
        console.log(chalk.blue('\n📋 Phase 1: Creating file entities and extracting symbols...'));
        const indexedFiles = [];
        let indexed = 0;
        let failed = 0;

        for (const fileInfo of filesToIndex) {
            const {path: filePath, type: fileType} = fileInfo;
            try {
                console.log(chalk.cyan(`📄 Indexing (${fileType}): ${filePath}`));

                // Check file size
                const stats = fs.statSync(filePath);
                if (stats.size > CONFIG.MAX_FILE_SIZE) {
                    console.log(chalk.yellow(`⚠️  Skipping large file: ${path.basename(filePath)} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`));
                    continue;
                }

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

                // Use MCP Qdrant to add document with intelligent chunking
                const vectorData = await indexFileWithMCP(filePath, content, fileType, mcpManager);

                // Create Neo4j entity for the document with vector metadata and code structure
                const neo4jResult = await createDocumentEntity(filePath, content.length, vectorData, mcpManager);

                // Create rich code structure entities if available
                if (vectorData.codeStructure && neo4jResult && neo4jResult.documentId) {
                    await createCodeStructureEntities(neo4jResult.documentId, vectorData.codeStructure, mcpManager);
                }

                // Store metadata in PostgreSQL with cross-references
                if (sessionId && neo4jResult && neo4jResult.success) {
                    await createPostgreSQLRecords(
                        sessionId,
                        filePath,
                        content.length,
                        vectorData,
                        neo4jResult.documentId,
                        neo4jResult.projectId
                    );
                }

                // Store file info for phase 2 processing
                indexedFiles.push({
                    filePath,
                    fileType,
                    content,
                    codeStructure: vectorData.codeStructure,
                    documentId: neo4jResult?.documentId,
                    projectId: neo4jResult?.projectId
                });

                logSuccess(`Indexed: ${filePath}`);
                indexed++;

            } catch (error) {
                logError(`Failed to index ${filePath}`, error);
                failed++;
            }
        }

        // PHASE 2: Create cross-file relationships
        console.log(chalk.blue('\n🔗 Phase 2: Building cross-file relationships...'));
        if (indexedFiles.length > 1) {
            await buildCrossFileRelationships(indexedFiles, mcpManager);
        } else {
            console.log(chalk.gray('Skipping cross-file analysis (single file or no files indexed)'));
        }

        // PHASE 3: Create dependency graph
        console.log(chalk.blue('\n📊 Phase 3: Creating dependency graph...'));
        if (indexedFiles.length > 0) {
            await createDependencyGraph(indexedFiles, mcpManager);
        }

        // Update PostgreSQL session with final results
        if (sessionId) {
            await updateIndexingSession(sessionId, indexed, failed);
        }

        console.log('');
        console.log(chalk.green.bold(`✅ Knowledge indexing complete!`));
        console.log(chalk.cyan(`📊 Results: ${indexed} indexed, ${failed} failed`));
        console.log(chalk.gray('Documents are now searchable via --semantic-search'));

        // Clean up MCP connections
        await mcpManager.disconnect();

    } catch (error) {
        logError('Error during knowledge indexing', error);
        await mcpManager.disconnect();
    }
}

// ===== COMPREHENSIVE CROSS-FILE RELATIONSHIP BUILDING =====

async function buildCrossFileRelationships(indexedFiles, mcpManager) {
    console.log(chalk.gray(`Building relationships across ${indexedFiles.length} files...`));

    // Create symbol registry for all files
    const symbolRegistry = await buildSymbolRegistry(indexedFiles);
    console.log(chalk.gray(`Found ${symbolRegistry.exports.size} exports and ${symbolRegistry.imports.size} imports`));

    // Build import-to-export relationships
    await linkImportsToExports(symbolRegistry, mcpManager);

    // Build function call relationships
    await linkFunctionCallsToDefinitions(indexedFiles, symbolRegistry, mcpManager);

    // Build inheritance relationships
    await linkInheritanceRelationships(indexedFiles, symbolRegistry, mcpManager);

    // Build module dependency relationships
    await createModuleDependencies(symbolRegistry, mcpManager);
}

async function buildSymbolRegistry(indexedFiles) {
    const registry = {
        exports: new Map(), // file -> { classes: [], functions: [], variables: [] }
        imports: new Map(), // file -> { source: string, symbols: [] }
        files: new Map(),   // filePath -> fileInfo
        pathResolver: new Map() // normalized path -> actual filePath
    };

    // First pass: collect all files and exports
    for (const fileInfo of indexedFiles) {
        const {filePath, codeStructure} = fileInfo;
        const normalizedPath = path.resolve(filePath);

        registry.files.set(filePath, fileInfo);
        registry.pathResolver.set(normalizedPath, filePath);

        if (codeStructure) {
            // Collect exports
            const fileExports = {
                classes: [],
                functions: [],
                variables: [],
                defaultExport: null
            };

            // Add classes as potential exports
            codeStructure.classes.forEach(cls => {
                fileExports.classes.push({
                    name: cls.name,
                    type: 'class',
                    line: cls.line,
                    methods: cls.methods,
                    entityId: null // Will be populated later
                });
            });

            // Add functions as potential exports
            codeStructure.functions.forEach(func => {
                fileExports.functions.push({
                    name: func.name,
                    type: 'function',
                    line: func.line,
                    async: func.async,
                    entityId: null // Will be populated later
                });
            });

            // Parse explicit exports from AST if available
            if (codeStructure.exports) {
                codeStructure.exports.forEach(exp => {
                    if (exp.type === 'ExportDefaultDeclaration') {
                        fileExports.defaultExport = {
                            type: exp.declaration,
                            line: exp.line
                        };
                    }
                    // Named exports are handled by the classes/functions above
                });
            }

            registry.exports.set(filePath, fileExports);

            // Collect imports
            const fileImports = [];
            if (codeStructure.imports) {
                codeStructure.imports.forEach(imp => {
                    const resolvedPath = resolveImportPath(imp.source, filePath);
                    fileImports.push({
                        source: imp.source,
                        resolvedPath: resolvedPath,
                        specifiers: imp.specifiers,
                        line: imp.line,
                        entityId: null // Will be populated later
                    });
                });
            }

            registry.imports.set(filePath, fileImports);
        }
    }

    return registry;
}

function resolveImportPath(importSource, fromFile) {
    try {
        // Handle relative imports
        if (importSource.startsWith('.')) {
            const fromDir = path.dirname(fromFile);
            let resolvedPath = path.resolve(fromDir, importSource);

            // Try different extensions
            const extensions = ['.js', '.ts', '.jsx', '.tsx', '.json'];

            // First try exact path
            if (fs.existsSync(resolvedPath)) {
                return resolvedPath;
            }

            // Try with extensions
            for (const ext of extensions) {
                const pathWithExt = resolvedPath + ext;
                if (fs.existsSync(pathWithExt)) {
                    return pathWithExt;
                }
            }

            // Try index files
            for (const ext of extensions) {
                const indexPath = path.join(resolvedPath, `index${ext}`);
                if (fs.existsSync(indexPath)) {
                    return indexPath;
                }
            }

            return resolvedPath; // Return best guess
        }

        // Handle absolute/package imports - for now, return as-is
        // In a complete implementation, you'd resolve node_modules paths
        return importSource;

    } catch (error) {
        logWarning(`Failed to resolve import path: ${importSource} from ${fromFile}`);
        return importSource;
    }
}

async function linkImportsToExports(symbolRegistry, mcpManager) {
    console.log(chalk.gray('Linking imports to exports...'));

    let linksCreated = 0;
    let linksFailed = 0;

    for (const [filePath, imports] of symbolRegistry.imports) {
        for (const importInfo of imports) {
            try {
                const {resolvedPath, specifiers} = importInfo;

                // Find the target file in our registry
                const targetFile = symbolRegistry.pathResolver.get(path.resolve(resolvedPath)) ||
                    symbolRegistry.files.get(resolvedPath);

                if (!targetFile) {
                    // External import or file not in our index
                    continue;
                }

                const targetFilePath = targetFile.filePath;
                const targetExports = symbolRegistry.exports.get(targetFilePath);

                if (!targetExports) continue;

                // Link each imported symbol to its export
                for (const spec of specifiers) {
                    const symbolName = spec.imported || spec.local;
                    let targetSymbol = null;

                    // Find the symbol in target exports
                    if (spec.type === 'ImportDefaultSpecifier') {
                        targetSymbol = targetExports.defaultExport;
                    } else {
                        // Named import - search in classes and functions
                        targetSymbol = targetExports.classes.find(c => c.name === symbolName) ||
                            targetExports.functions.find(f => f.name === symbolName) ||
                            targetExports.variables.find(v => v.name === symbolName);
                    }

                    if (targetSymbol) {
                        // Create Neo4j relationship
                        await createImportExportRelationship(
                            filePath,
                            targetFilePath,
                            importInfo,
                            targetSymbol,
                            spec,
                            mcpManager
                        );
                        linksCreated++;
                    }
                }

            } catch (error) {
                logError(`Failed to link import in ${filePath}`, error);
                linksFailed++;
            }
        }
    }

    console.log(chalk.gray(`✓ Created ${linksCreated} import-export links (${linksFailed} failed)`));
}

async function createImportExportRelationship(fromFile, toFile, importInfo, targetSymbol, specifier, mcpManager) {
    try {
        // Create a relationship entity that represents this import-export link
        const linkData = {
            name: `${path.basename(fromFile)}-imports-${specifier.imported || specifier.local}-from-${path.basename(toFile)}`,
            import_source: importInfo.source,
            import_line: importInfo.line,
            symbol_name: specifier.imported || specifier.local,
            local_name: specifier.local,
            import_type: specifier.type,
            target_symbol_type: targetSymbol.type,
            target_line: targetSymbol.line,
            from_file: fromFile,
            to_file: toFile
        };

        const result = await mcpManager.callTool('neo4j-agent-memory', 'create_memory', {
            label: 'import_export_link',
            properties: linkData
        });

        if (result.content && result.content[0]?.text) {
            const response = JSON.parse(result.content[0].text);
            const linkId = response.id;

            // Find the import entity for this file and create relationship
            const importEntityId = await findImportEntityId(fromFile, importInfo.source, mcpManager);
            if (importEntityId) {
                await mcpManager.callTool('neo4j-agent-memory', 'create_connection', {
                    fromMemoryId: importEntityId,
                    toMemoryId: linkId,
                    type: 'RESOLVES_TO',
                    properties: {
                        symbol_name: specifier.imported || specifier.local
                    }
                });
            }

            // Find the target symbol entity and create relationship
            const targetEntityId = await findSymbolEntityId(toFile, targetSymbol, mcpManager);
            if (targetEntityId) {
                await mcpManager.callTool('neo4j-agent-memory', 'create_connection', {
                    fromMemoryId: linkId,
                    toMemoryId: targetEntityId,
                    type: 'IMPORTS_SYMBOL',
                    properties: {
                        symbol_type: targetSymbol.type
                    }
                });
            }

            return linkId;
        }

    } catch (error) {
        logError('Failed to create import-export relationship', error);
        throw error;
    }
}

async function findImportEntityId(filePath, importSource, mcpManager) {
    try {
        const searchResult = await mcpManager.callTool('neo4j-agent-memory', 'search_memories', {
            query: `${importSource} ${path.basename(filePath)}`,
            label: 'import',
            limit: 5
        });

        if (searchResult?.content?.[0]) {
            const results = JSON.parse(searchResult.content[0].text);
            // Find the import entity that matches this file and source
            for (const result of results) {
                const memory = result.memory;
                if (memory.source_module === importSource && memory.file_path && memory.file_path.includes(path.basename(filePath))) {
                    return memory._id;
                }
            }
        }

    } catch (error) {
        logWarning(`Failed to find import entity for ${importSource} in ${filePath}`);
    }
    return null;
}

async function findSymbolEntityId(filePath, symbol, mcpManager) {
    try {
        const label = symbol.type === 'class' ? 'class' : 'function';
        const searchResult = await mcpManager.callTool('neo4j-agent-memory', 'search_memories', {
            query: `${symbol.name} ${path.basename(filePath)}`,
            label: label,
            limit: 5
        });

        if (searchResult?.content?.[0]) {
            const results = JSON.parse(searchResult.content[0].text);
            // Find the entity that matches this symbol in this file
            for (const result of results) {
                const memory = result.memory;
                if (memory.name === symbol.name && memory.line_number === symbol.line) {
                    return memory._id;
                }
            }
        }

    } catch (error) {
        logWarning(`Failed to find symbol entity for ${symbol.name} in ${filePath}`);
    }
    return null;
}

async function linkFunctionCallsToDefinitions(indexedFiles, symbolRegistry, mcpManager) {
    console.log(chalk.gray('Linking function calls to definitions...'));

    let linksCreated = 0;

    for (const fileInfo of indexedFiles) {
        const {filePath, codeStructure} = fileInfo;

        if (!codeStructure?.calls) continue;

        for (const call of codeStructure.calls) {
            try {
                // First, try to find the function in the same file
                let targetFunction = codeStructure.functions?.find(f => f.name === call.function);
                let targetFile = filePath;

                // If not found locally, search in imported symbols
                if (!targetFunction) {
                    const imports = symbolRegistry.imports.get(filePath) || [];
                    for (const imp of imports) {
                        const spec = imp.specifiers.find(s => s.local === call.function || s.imported === call.function);
                        if (spec) {
                            const targetFilePath = symbolRegistry.pathResolver.get(path.resolve(imp.resolvedPath));
                            if (targetFilePath) {
                                const targetExports = symbolRegistry.exports.get(targetFilePath);
                                targetFunction = targetExports?.functions.find(f => f.name === (spec.imported || spec.local));
                                targetFile = targetFilePath;
                                break;
                            }
                        }
                    }
                }

                if (targetFunction) {
                    await createFunctionCallRelationship(
                        filePath,
                        targetFile,
                        call,
                        targetFunction,
                        mcpManager
                    );
                    linksCreated++;
                }

            } catch (error) {
                logError(`Failed to link function call ${call.function} in ${filePath}`, error);
            }
        }
    }

    console.log(chalk.gray(`✓ Created ${linksCreated} function call links`));
}

async function createFunctionCallRelationship(fromFile, toFile, call, targetFunction, mcpManager) {
    try {
        // Find the function call entity
        const callEntityId = await findFunctionCallEntityId(fromFile, call.function, mcpManager);

        // Find the target function entity
        const functionEntityId = await findSymbolEntityId(toFile, targetFunction, mcpManager);

        if (callEntityId && functionEntityId) {
            await mcpManager.callTool('neo4j-agent-memory', 'create_connection', {
                fromMemoryId: callEntityId,
                toMemoryId: functionEntityId,
                type: 'CALLS_FUNCTION',
                properties: {
                    call_line: call.line,
                    target_line: targetFunction.line,
                    cross_file: fromFile !== toFile
                }
            });
        }

    } catch (error) {
        logError('Failed to create function call relationship', error);
    }
}

async function findFunctionCallEntityId(filePath, functionName, mcpManager) {
    try {
        const searchResult = await mcpManager.callTool('neo4j-agent-memory', 'search_memories', {
            query: `call-${functionName} ${path.basename(filePath)}`,
            label: 'function_call',
            limit: 5
        });

        if (searchResult?.content?.[0]) {
            const results = JSON.parse(searchResult.content[0].text);
            for (const result of results) {
                const memory = result.memory;
                if (memory.function_name === functionName && memory.file_path && memory.file_path.includes(path.basename(filePath))) {
                    return memory._id;
                }
            }
        }

    } catch (error) {
        logWarning(`Failed to find function call entity for ${functionName} in ${filePath}`);
    }
    return null;
}

async function linkInheritanceRelationships(indexedFiles, symbolRegistry, mcpManager) {
    console.log(chalk.gray('Linking inheritance relationships...'));

    let linksCreated = 0;

    for (const fileInfo of indexedFiles) {
        const {filePath, codeStructure} = fileInfo;

        if (!codeStructure?.classes) continue;

        for (const cls of codeStructure.classes) {
            if (!cls.superClass) continue;

            try {
                // Find the parent class
                let parentClass = null;
                let parentFile = filePath;

                // First, check in the same file
                parentClass = codeStructure.classes.find(c => c.name === cls.superClass);

                // If not found locally, search in imported symbols
                if (!parentClass) {
                    const imports = symbolRegistry.imports.get(filePath) || [];
                    for (const imp of imports) {
                        const spec = imp.specifiers.find(s => s.local === cls.superClass || s.imported === cls.superClass);
                        if (spec) {
                            const targetFilePath = symbolRegistry.pathResolver.get(path.resolve(imp.resolvedPath));
                            if (targetFilePath) {
                                const targetExports = symbolRegistry.exports.get(targetFilePath);
                                parentClass = targetExports?.classes.find(c => c.name === (spec.imported || spec.local));
                                parentFile = targetFilePath;
                                break;
                            }
                        }
                    }
                }

                if (parentClass) {
                    await createInheritanceRelationship(
                        filePath,
                        parentFile,
                        cls,
                        parentClass,
                        mcpManager
                    );
                    linksCreated++;
                }

            } catch (error) {
                logError(`Failed to link inheritance for ${cls.name} in ${filePath}`, error);
            }
        }
    }

    console.log(chalk.gray(`✓ Created ${linksCreated} inheritance links`));
}

async function createInheritanceRelationship(fromFile, toFile, childClass, parentClass, mcpManager) {
    try {
        // Find the child class entity
        const childEntityId = await findSymbolEntityId(fromFile, childClass, mcpManager);

        // Find the parent class entity
        const parentEntityId = await findSymbolEntityId(toFile, parentClass, mcpManager);

        if (childEntityId && parentEntityId) {
            await mcpManager.callTool('neo4j-agent-memory', 'create_connection', {
                fromMemoryId: childEntityId,
                toMemoryId: parentEntityId,
                type: 'INHERITS_FROM',
                properties: {
                    child_line: childClass.line,
                    parent_line: parentClass.line,
                    cross_file: fromFile !== toFile
                }
            });
        }

    } catch (error) {
        logError('Failed to create inheritance relationship', error);
    }
}

async function createModuleDependencies(symbolRegistry, mcpManager) {
    console.log(chalk.gray('Creating module dependency graph...'));

    let dependenciesCreated = 0;

    for (const [filePath, imports] of symbolRegistry.imports) {
        const dependsOn = new Set();

        for (const imp of imports) {
            const targetFile = symbolRegistry.pathResolver.get(path.resolve(imp.resolvedPath));
            if (targetFile && targetFile !== filePath) {
                dependsOn.add(targetFile);
            }
        }

        // Create module dependency entities
        for (const targetFile of dependsOn) {
            try {
                await createModuleDependency(filePath, targetFile, mcpManager);
                dependenciesCreated++;
            } catch (error) {
                logError(`Failed to create module dependency from ${filePath} to ${targetFile}`, error);
            }
        }
    }

    console.log(chalk.gray(`✓ Created ${dependenciesCreated} module dependencies`));
}

async function createModuleDependency(fromFile, toFile, mcpManager) {
    try {
        const dependencyData = {
            name: `${path.basename(fromFile)}-depends-on-${path.basename(toFile)}`,
            from_file: fromFile,
            to_file: toFile,
            dependency_type: 'import',
            created_at: new Date().toISOString()
        };

        const result = await mcpManager.callTool('neo4j-agent-memory', 'create_memory', {
            label: 'module_dependency',
            properties: dependencyData
        });

        if (result.content && result.content[0]?.text) {
            const response = JSON.parse(result.content[0].text);
            const depId = response.id;

            // Find document entities for both files
            const fromDocId = await findDocumentEntityId(fromFile, mcpManager);
            const toDocId = await findDocumentEntityId(toFile, mcpManager);

            if (fromDocId && toDocId) {
                // Create relationship from source document to dependency
                await mcpManager.callTool('neo4j-agent-memory', 'create_connection', {
                    fromMemoryId: fromDocId,
                    toMemoryId: depId,
                    type: 'HAS_DEPENDENCY',
                    properties: {}
                });

                // Create relationship from dependency to target document
                await mcpManager.callTool('neo4j-agent-memory', 'create_connection', {
                    fromMemoryId: depId,
                    toMemoryId: toDocId,
                    type: 'DEPENDS_ON',
                    properties: {}
                });
            }
        }

    } catch (error) {
        logError('Failed to create module dependency', error);
    }
}

async function findDocumentEntityId(filePath, mcpManager) {
    try {
        const fileName = path.basename(filePath);
        const searchResult = await mcpManager.callTool('neo4j-agent-memory', 'search_memories', {
            query: fileName,
            label: 'document',
            limit: 5
        });

        if (searchResult?.content?.[0]) {
            const results = JSON.parse(searchResult.content[0].text);
            for (const result of results) {
                const memory = result.memory;
                if (memory.name === fileName && memory.full_path === filePath) {
                    return memory._id;
                }
            }
        }

    } catch (error) {
        logWarning(`Failed to find document entity for ${filePath}`);
    }
    return null;
}

async function createDependencyGraph(indexedFiles, mcpManager) {
    console.log(chalk.gray('Creating project dependency graph...'));

    try {
        // Create a project-level dependency graph entity
        const graphData = {
            name: `${PROJECT_NAME}-dependency-graph`,
            project_name: PROJECT_NAME,
            file_count: indexedFiles.length,
            created_at: new Date().toISOString(),
            graph_type: 'project_dependencies'
        };

        const result = await mcpManager.callTool('neo4j-agent-memory', 'create_memory', {
            label: 'dependency_graph',
            properties: graphData
        });

        if (result.content && result.content[0]?.text) {
            const response = JSON.parse(result.content[0].text);
            const graphId = response.id;

            // Link all documents to this dependency graph
            for (const fileInfo of indexedFiles) {
                const docId = await findDocumentEntityId(fileInfo.filePath, mcpManager);
                if (docId) {
                    await mcpManager.callTool('neo4j-agent-memory', 'create_connection', {
                        fromMemoryId: graphId,
                        toMemoryId: docId,
                        type: 'INCLUDES_FILE',
                        properties: {
                            file_type: fileInfo.fileType
                        }
                    });
                }
            }

            console.log(chalk.gray(`✓ Created project dependency graph: ${graphId}`));
        }

    } catch (error) {
        logError('Failed to create dependency graph', error);
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
        logWarning(`Could not read .gitignore: ${error.message}`);
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

async function discoverIndexableFiles(targetPath = PROJECT_ROOT, isFile = false) {
    // If target is a single file, just return it (after validation)
    if (isFile) {
        if (shouldIndexFile(targetPath)) {
            const fileType = detectFileType(targetPath);
            return [{path: targetPath, type: fileType}];
        } else {
            console.log(chalk.yellow(`File ${targetPath} is not indexable (binary or excluded)`));
            return [];
        }
    }

    // Otherwise, scan directory
    return scanDirectoryForFiles(targetPath);
}

function shouldIndexFile(filePath) {
    const fileName = path.basename(filePath);

    // Skip binary files
    if (isBinaryFile(filePath)) return false;

    // Load .gitignore patterns for the project root (not the target path)
    const gitignorePatterns = loadGitignorePatterns();

    // Check against .gitignore patterns (relative to project root)
    const relativePath = path.relative(PROJECT_ROOT, filePath);
    if (gitignorePatterns.length > 0) {
        return !isGitignored(relativePath, gitignorePatterns);
    }

    // Fallback to default exclusion patterns
    const defaultExcludes = [
        'node_modules', '.git', 'dist', 'build', '.env', '.env.*',
        '*.log', '*.tmp', '*.cache', '.DS_Store', 'Thumbs.db',
        '.vscode', '.idea', '__pycache__', '*.pyc', '.pytest_cache',
        'target/', 'bin/', 'obj/', '.gradle/', '.mvn/'
    ];

    return !defaultExcludes.some(pattern => {
        if (pattern.includes('*')) {
            // Simple glob matching
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return regex.test(fileName) || regex.test(relativePath);
        }
        return relativePath.includes(pattern) || fileName.includes(pattern);
    });
}

function scanDirectoryForFiles(targetPath) {
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

    function detectFileType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const fileName = path.basename(filePath).toLowerCase();

        // Code files
        if (['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt'].includes(ext)) {
            return 'code';
        }

        // Markup/Documentation
        if (['.md', '.mdx', '.rst', '.txt', '.adoc', '.org'].includes(ext) || fileName === 'readme') {
            return 'markup';
        }

        // Data files
        if (['.json', '.yaml', '.yml', '.xml', '.csv', '.tsv', '.toml', '.ini', '.conf'].includes(ext)) {
            return 'data';
        }

        // Config files
        if (['.env', '.config', '.cfg', '.properties'].includes(ext) || fileName.includes('config') || fileName.startsWith('.')) {
            return 'config';
        }

        // Scripts
        if (['.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd'].includes(ext)) {
            return 'script';
        }

        // Web files
        if (['.html', '.htm', '.css', '.scss', '.sass', '.less'].includes(ext)) {
            return 'web';
        }

        // Default to text for unknown extensions
        return 'text';
    }

    function shouldIndex(filePath) {
        const relativePath = path.relative(PROJECT_ROOT, filePath);
        const fileName = path.basename(filePath);

        // Skip binary files
        if (isBinaryFile(filePath)) return false;

        // Detect file type for metadata
        const fileType = detectFileType(filePath);

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
        const entries = fs.readdirSync(dir, {withFileTypes: true});

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
                const fileType = detectFileType(fullPath);
                files.push({path: fullPath, type: fileType});
            }
        }

        return files;
    }

    return scanDirectory(targetPath);
}

// Standalone file type detection function (used by both file and directory indexing)
function detectFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath).toLowerCase();

    // Code files
    if (['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt'].includes(ext)) {
        return 'code';
    }

    // Markup/Documentation
    if (['.md', '.mdx', '.rst', '.txt', '.adoc', '.org'].includes(ext) || fileName === 'readme') {
        return 'markup';
    }

    // Data files
    if (['.json', '.yaml', '.yml', '.xml', '.csv', '.tsv', '.toml', '.ini', '.conf'].includes(ext)) {
        return 'data';
    }

    // Config files
    if (['.env', '.config', '.cfg', '.properties'].includes(ext) || fileName.includes('config') || fileName.startsWith('.')) {
        return 'config';
    }

    // Scripts
    if (['.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd'].includes(ext)) {
        return 'script';
    }

    // Web files
    if (['.html', '.htm', '.css', '.scss', '.sass', '.less'].includes(ext)) {
        return 'web';
    }

    // Default to text for unknown extensions
    return 'text';
}

// Binary file detection function (used by both file and directory indexing)
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

async function indexFileWithMCP(filePath, content, fileType, mcpManager) {
    const fileName = path.basename(filePath);
    const relativePath = path.relative(PROJECT_ROOT, filePath);

    // Use intelligent chunking based on file type
    console.log(chalk.gray(`  Analyzing ${fileName} for semantic boundaries...`));
    const chunks = await intelligentChunk(content, fileType, filePath);
    console.log(chalk.gray(`  Created ${chunks.length} semantic chunks for ${fileName}`));

    // Extract code structure if it's a supported programming language
    let codeStructure = null;
    if (fileType === 'code') {
        codeStructure = await extractCodeStructure(filePath, content, fileType);
        if (codeStructure) {
            console.log(chalk.gray(`    📊 Found: ${codeStructure.classes.length} classes, ${codeStructure.functions.length} functions, ${codeStructure.imports.length} imports`));
        }
    }

    const points = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        try {
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
        } catch (error) {
            logError(`Failed to generate embedding for chunk ${i}`, error);
            continue; // Skip this chunk but continue processing
        }
    }

    // Store all points in Qdrant in batches
    console.log(chalk.gray(`  Storing ${points.length} vectors in Qdrant...`));
    await storeInQdrantBatched(points);

    return {
        chunks: chunks.length,
        vectors_stored: points.length,
        codeStructure: codeStructure
    };
}

// Legacy basic chunking (fallback)
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

// Intelligent semantic chunking with LLM assistance
async function intelligentChunk(text, fileType, filePath) {
    try {
        // For very small files, don't chunk
        if (text.length <= 1000) {
            return [text];
        }

        // Get chunking strategy from Ollama
        const strategy = await getChunkingStrategy(text, fileType, filePath);

        if (strategy && strategy.boundaries && strategy.boundaries.length > 0) {
            return createSemanticChunks(text, strategy.boundaries);
        } else {
            // Fallback to basic chunking if LLM analysis fails
            return chunkText(text, CONFIG.CHUNK_SIZE, CONFIG.CHUNK_OVERLAP);
        }

    } catch (error) {
        logWarning(`Intelligent chunking failed, using basic chunking: ${error.message}`);
        return chunkText(text, CONFIG.CHUNK_SIZE, CONFIG.CHUNK_OVERLAP);
    }
}

// Get chunking strategy from Ollama
async function getChunkingStrategy(text, fileType, filePath) {
    const fileName = path.basename(filePath);

    // Create file-type specific prompt
    const prompt = createChunkingPrompt(text, fileType, fileName);

    try {
        const response = await axios.post(`${OLLAMA_CONFIG.ollama.host}/api/generate`, {
            model: OLLAMA_CONFIG.ollama.defaultModel,
            prompt: prompt,
            stream: false,
            options: {
                temperature: 0.1,  // Low temperature for consistent analysis
                num_predict: 500   // Limit response length
            }
        });

        if (response.data && response.data.response) {
            return parseChunkingResponse(response.data.response, text);
        }

        return null;
    } catch (error) {
        logWarning(`Ollama chunking analysis failed: ${error.message}`);
        return null;
    }
}

// Create file-type specific chunking prompts
function createChunkingPrompt(text, fileType, fileName) {
    const textPreview = text.length > 3000 ? text.substring(0, 3000) + "..." : text;

    const basePrompt = `Analyze this ${fileType} file and identify optimal chunk boundaries for semantic search.
File: ${fileName}
Content preview:
${textPreview}

`;

    switch (fileType) {
        case 'code':
            return basePrompt + `For code files, identify boundaries at:
- Function/method definitions
- Class definitions  
- Import/export sections
- Major code blocks
- Comment blocks

Respond with line numbers where chunks should split (0-indexed). Format: BOUNDARIES: 0,15,45,78`;

        case 'markup':
            return basePrompt + `For markup/documentation, identify boundaries at:
- Heading sections (##, ###)
- Paragraph breaks
- Code block boundaries
- List sections
- Topic changes

Respond with character positions where chunks should split. Format: BOUNDARIES: 0,250,680,1200`;

        case 'data':
            return basePrompt + `For data files, identify boundaries at:
- Record groups
- Section headers
- Logical data divisions
- Schema changes

Respond with character positions where chunks should split. Format: BOUNDARIES: 0,300,750,1100`;

        default:
            return basePrompt + `Identify natural boundaries at:
- Paragraph breaks
- Section changes
- Topic shifts
- Logical divisions

Respond with character positions where chunks should split. Format: BOUNDARIES: 0,400,850,1300`;
    }
}

// Parse Ollama response for chunk boundaries
function parseChunkingResponse(response, text) {
    try {
        // Look for BOUNDARIES: pattern
        const boundaryMatch = response.match(/BOUNDARIES:\s*([0-9,\s]+)/i);

        if (boundaryMatch) {
            const boundaries = boundaryMatch[1]
                .split(',')
                .map(b => parseInt(b.trim()))
                .filter(b => !isNaN(b) && b >= 0 && b < text.length)
                .sort((a, b) => a - b);

            // Ensure we start at 0 and end at text length
            if (boundaries[0] !== 0) boundaries.unshift(0);
            if (boundaries[boundaries.length - 1] !== text.length) boundaries.push(text.length);

            return {boundaries};
        }

        return null;
    } catch (error) {
        logWarning(`Failed to parse chunking response: ${error.message}`);
        return null;
    }
}

// Create semantic chunks from boundaries
function createSemanticChunks(text, boundaries) {
    const chunks = [];

    for (let i = 0; i < boundaries.length - 1; i++) {
        const start = boundaries[i];
        const end = boundaries[i + 1];
        const chunk = text.slice(start, end).trim();

        if (chunk.length > 0) {
            chunks.push(chunk);
        }
    }

    // Validate chunk quality
    const validatedChunks = validateChunkQuality(chunks, text);

    return validatedChunks.length > 0 ? validatedChunks : [text]; // Fallback to full text if no valid chunks
}

// Validate chunk quality and merge if necessary
function validateChunkQuality(chunks, originalText) {
    const validatedChunks = [];

    for (let i = 0; i < chunks.length; i++) {
        let chunk = chunks[i];

        // Skip empty or whitespace-only chunks
        if (chunk.trim().length === 0) continue;

        // If chunk is too small, try to merge with next chunk
        if (chunk.length < CONFIG.MIN_CHUNK_SIZE && i < chunks.length - 1) {
            const nextChunk = chunks[i + 1];
            if (nextChunk && (chunk.length + nextChunk.length) <= CONFIG.MAX_CHUNK_SIZE) {
                chunk = chunk + '\n\n' + nextChunk;
                i++; // Skip the next chunk since we merged it
            }
        }

        // If chunk is too large, split it using basic chunking
        if (chunk.length > CONFIG.MAX_CHUNK_SIZE) {
            const subChunks = chunkText(chunk, CONFIG.CHUNK_SIZE, CONFIG.CHUNK_OVERLAP);
            validatedChunks.push(...subChunks);
        } else if (chunk.trim().length >= CONFIG.MIN_CHUNK_SIZE) {
            validatedChunks.push(chunk);
        }
    }

    // Quality check: ensure we haven't lost significant content
    const totalOriginalLength = originalText.length;
    const totalChunkLength = validatedChunks.join('').length;
    const retentionRatio = totalChunkLength / totalOriginalLength;

    // If we lost more than 20% of content, fall back to basic chunking
    if (retentionRatio < 0.8) {
        logWarning(`Content retention too low (${(retentionRatio * 100).toFixed(1)}%), using basic chunking`);
        return chunkText(originalText, CONFIG.CHUNK_SIZE, CONFIG.CHUNK_OVERLAP);
    }

    return validatedChunks;
}

async function generateOllamaEmbedding(text) {
    try {
        const response = await axios.post(`${OLLAMA_CONFIG.ollama.host}/api/embeddings`, {
            model: 'nomic-embed-text',
            prompt: text
        });

        if (response.data && response.data.embedding) {
            return response.data.embedding;
        } else {
            throw new Error('No embedding returned from Ollama');
        }
    } catch (error) {
        logError('Ollama embedding error', error);
        throw error;
    }
}

// ===== AST PARSING AND CODE ANALYSIS =====

// Detect programming language from file extension and content
function detectProgrammingLanguage(filePath, content) {
    const ext = path.extname(filePath).toLowerCase();
    const firstLine = content.split('\n')[0].toLowerCase();

    // JavaScript/TypeScript detection
    if (['.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
        return 'javascript';
    }
    if (['.ts', '.tsx'].includes(ext)) {
        return 'typescript';
    }

    // Python detection
    if (['.py', '.pyw', '.pyc', '.pyo', '.pyd', '.pyz'].includes(ext)) {
        return 'python';
    }

    // Shebang detection
    if (firstLine.includes('#!/usr/bin/env node') || firstLine.includes('#!/usr/bin/node')) {
        return 'javascript';
    }
    if (firstLine.includes('#!/usr/bin/env python') || firstLine.includes('#!/usr/bin/python')) {
        return 'python';
    }

    return null; // Not a supported language for AST parsing
}

// Extract code structure using AST parsing
async function extractCodeStructure(filePath, content, fileType) {
    try {
        const language = detectProgrammingLanguage(filePath, content);

        if (!language) {
            return null; // Not a supported language
        }

        console.log(chalk.gray(`    🔍 Analyzing ${language} code structure...`));

        switch (language) {
            case 'javascript':
                return await extractJavaScriptStructure(filePath, content);
            case 'typescript':
                return await extractTypeScriptStructure(filePath, content);
            case 'python':
                return await extractPythonStructure(filePath, content);
            default:
                return null;
        }
    } catch (error) {
        logWarning(`AST parsing failed for ${path.basename(filePath)}: ${error.message}`);
        return null;
    }
}

// Extract JavaScript structure using Acorn
async function extractJavaScriptStructure(filePath, content) {
    try {
        const ast = acorn.parse(content, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            allowImportExportEverywhere: true,
            allowAwaitOutsideFunction: true,
            allowReturnOutsideFunction: true
        });

        const structure = {
            language: 'javascript',
            file: filePath,
            imports: [],
            exports: [],
            classes: [],
            functions: [],
            variables: [],
            calls: []
        };

        // Walk the AST to extract structure
        walkAST(ast, structure);

        return structure;
    } catch (error) {
        // Fallback: try as script instead of module
        try {
            const ast = acorn.parse(content, {
                ecmaVersion: 'latest',
                sourceType: 'script'
            });

            const structure = {
                language: 'javascript',
                file: filePath,
                imports: [],
                exports: [],
                classes: [],
                functions: [],
                variables: [],
                calls: []
            };

            walkAST(ast, structure);
            return structure;
        } catch (fallbackError) {
            throw new Error(`JavaScript parsing failed: ${error.message}`);
        }
    }
}

// Extract TypeScript structure using Babel
async function extractTypeScriptStructure(filePath, content) {
    try {
        const ast = babelParse(content, {
            sourceType: 'module',
            allowImportExportEverywhere: true,
            allowAwaitOutsideFunction: true,
            allowReturnOutsideFunction: true,
            plugins: [
                'typescript',
                'jsx',
                'decorators-legacy',
                'classProperties',
                'asyncGenerators',
                'functionBind',
                'exportDefaultFrom',
                'exportNamespaceFrom',
                'dynamicImport',
                'nullishCoalescingOperator',
                'optionalChaining'
            ]
        });

        const structure = {
            language: 'typescript',
            file: filePath,
            imports: [],
            exports: [],
            classes: [],
            functions: [],
            variables: [],
            calls: [],
            interfaces: [],
            types: []
        };

        // Use Babel traverse to walk the AST
        const traverse = babelTraverse.default || babelTraverse;
        traverse(ast, {
            ImportDeclaration(path) {
                structure.imports.push({
                    source: path.node.source.value,
                    specifiers: path.node.specifiers.map(spec => ({
                        type: spec.type,
                        local: spec.local?.name,
                        imported: spec.imported?.name || spec.local?.name
                    })),
                    line: path.node.loc?.start.line
                });
            },

            ExportDeclaration(path) {
                if (path.isExportNamedDeclaration() || path.isExportDefaultDeclaration()) {
                    structure.exports.push({
                        type: path.node.type,
                        declaration: path.node.declaration?.type,
                        source: path.node.source?.value,
                        line: path.node.loc?.start.line
                    });
                }
            },

            ClassDeclaration(path) {
                const methods = [];
                path.traverse({
                    ClassMethod(methodPath) {
                        methods.push({
                            name: methodPath.node.key.name,
                            kind: methodPath.node.kind, // constructor, method, get, set
                            static: methodPath.node.static,
                            async: methodPath.node.async,
                            line: methodPath.node.loc?.start.line,
                            parameters: methodPath.node.params.map(param => ({
                                name: param.name,
                                type: param.typeAnnotation?.typeAnnotation?.type
                            }))
                        });
                    }
                });

                structure.classes.push({
                    name: path.node.id?.name,
                    superClass: path.node.superClass?.name,
                    line: path.node.loc?.start.line,
                    methods: methods
                });
            },

            FunctionDeclaration(path) {
                structure.functions.push({
                    name: path.node.id?.name,
                    async: path.node.async,
                    generator: path.node.generator,
                    line: path.node.loc?.start.line,
                    parameters: path.node.params.map(param => ({
                        name: param.name,
                        type: param.typeAnnotation?.typeAnnotation?.type
                    }))
                });
            },

            CallExpression(path) {
                let callee = '';
                if (path.node.callee.type === 'Identifier') {
                    callee = path.node.callee.name;
                } else if (path.node.callee.type === 'MemberExpression') {
                    callee = `${path.node.callee.object.name}.${path.node.callee.property.name}`;
                }

                structure.calls.push({
                    function: callee,
                    line: path.node.loc?.start.line,
                    arguments: path.node.arguments.length
                });
            },

            TSInterfaceDeclaration(path) {
                structure.interfaces.push({
                    name: path.node.id.name,
                    line: path.node.loc?.start.line,
                    extends: path.node.extends?.map(ext => ext.expression?.name)
                });
            },

            TSTypeAliasDeclaration(path) {
                structure.types.push({
                    name: path.node.id.name,
                    line: path.node.loc?.start.line
                });
            }
        });

        return structure;
    } catch (error) {
        throw new Error(`TypeScript parsing failed: ${error.message}`);
    }
}

// Simple Python structure extraction (basic patterns)
async function extractPythonStructure(filePath, content) {
    // For Python, we'll use regex patterns since we don't have a full Python AST parser
    // This is a simplified version - in production, you'd use a proper Python AST parser

    const structure = {
        language: 'python',
        file: filePath,
        imports: [],
        classes: [],
        functions: [],
        calls: []
    };

    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNumber = i + 1;

        // Import statements
        const importMatch = line.match(/^(import|from)\s+([^\s]+)/);
        if (importMatch) {
            structure.imports.push({
                type: importMatch[1],
                module: importMatch[2],
                line: lineNumber
            });
        }

        // Class definitions
        const classMatch = line.match(/^class\s+(\w+)(\([^)]*\))?:/);
        if (classMatch) {
            structure.classes.push({
                name: classMatch[1],
                superClass: classMatch[2]?.replace(/[()]/g, '').trim() || null,
                line: lineNumber,
                methods: []
            });
        }

        // Function definitions
        const funcMatch = line.match(/^(async\s+)?def\s+(\w+)\s*\(/);
        if (funcMatch) {
            structure.functions.push({
                name: funcMatch[2],
                async: !!funcMatch[1],
                line: lineNumber
            });
        }

        // Method definitions (indented functions)
        const methodMatch = line.match(/^\s+(async\s+)?def\s+(\w+)\s*\(/);
        if (methodMatch && structure.classes.length > 0) {
            const currentClass = structure.classes[structure.classes.length - 1];
            currentClass.methods.push({
                name: methodMatch[2],
                async: !!methodMatch[1],
                line: lineNumber
            });
        }

        // Function calls (basic pattern)
        const callMatch = line.match(/(\w+)\s*\(/);
        if (callMatch && !line.includes('def ') && !line.includes('class ')) {
            structure.calls.push({
                function: callMatch[1],
                line: lineNumber
            });
        }
    }

    return structure;
}

// Walk AST for JavaScript (Acorn)
function walkAST(node, structure) {
    if (!node || typeof node !== 'object') return;

    switch (node.type) {
        case 'ImportDeclaration':
            structure.imports.push({
                source: node.source.value,
                specifiers: node.specifiers.map(spec => ({
                    type: spec.type,
                    local: spec.local?.name,
                    imported: spec.imported?.name || spec.local?.name
                })),
                line: node.loc?.start.line
            });
            break;

        case 'ExportDefaultDeclaration':
        case 'ExportNamedDeclaration':
            structure.exports.push({
                type: node.type,
                declaration: node.declaration?.type,
                line: node.loc?.start.line
            });
            break;

        case 'ClassDeclaration':
            const methods = [];
            if (node.body && node.body.body) {
                node.body.body.forEach(method => {
                    if (method.type === 'MethodDefinition') {
                        methods.push({
                            name: method.key.name,
                            kind: method.kind,
                            static: method.static,
                            line: method.loc?.start.line
                        });
                    }
                });
            }

            structure.classes.push({
                name: node.id?.name,
                superClass: node.superClass?.name,
                line: node.loc?.start.line,
                methods: methods
            });
            break;

        case 'FunctionDeclaration':
            structure.functions.push({
                name: node.id?.name,
                async: node.async,
                generator: node.generator,
                line: node.loc?.start.line,
                parameters: node.params.map(param => ({name: param.name}))
            });
            break;

        case 'CallExpression':
            let callee = '';
            if (node.callee.type === 'Identifier') {
                callee = node.callee.name;
            } else if (node.callee.type === 'MemberExpression') {
                callee = `${node.callee.object.name}.${node.callee.property.name}`;
            }

            structure.calls.push({
                function: callee,
                line: node.loc?.start.line,
                arguments: node.arguments.length
            });
            break;
    }

    // Recursively walk child nodes
    for (const key in node) {
        if (key !== 'parent' && key !== 'loc' && key !== 'range') {
            const child = node[key];
            if (Array.isArray(child)) {
                child.forEach(item => walkAST(item, structure));
            } else if (child && typeof child === 'object') {
                walkAST(child, structure);
            }
        }
    }
}

// ===== CORRECTED POSTGRESQL FUNCTIONS =====

async function createPostgreSQLRecords(sessionId, filePath, contentLength, vectorData, documentId, projectId) {
    try {
        const relativePath = path.relative(PROJECT_ROOT, filePath);
        const fileName = path.basename(filePath);
        const fileExt = path.extname(filePath);
        const stats = fs.statSync(filePath);

        console.log(chalk.gray(`  Creating PostgreSQL metadata records...`));

        const insertQuery = `
            INSERT INTO indexed_files (session_id, file_name, file_path, file_extension,
                                       content_length, size_bytes, last_modified, indexed_at,
                                       neo4j_document_id, neo4j_project_id, qdrant_collection,
                                       chunk_count, vector_count, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id;
        `;

        const fileResult = await mcpManager.callTool('postgres', 'query', {
            sql: insertQuery,
            params: [
                sessionId, fileName, relativePath, fileExt,
                contentLength, stats.size, stats.mtime.toISOString(),
                new Date().toISOString(), documentId, projectId,
                COLLECTION_NAME, vectorData.chunks, vectorData.vectors_stored, 'indexed'
            ]
        });

        if (fileResult?.content?.[0]) {
            const result = JSON.parse(fileResult.content[0].text);
            // Handle different possible response formats from @henkey/postgres-mcp-server
            if (result.rows?.length > 0) {
                console.log(chalk.gray(`  ✓ PostgreSQL file record created: ${result.rows[0].id}`));
                return result.rows[0].id;
            } else if (Array.isArray(result) && result.length > 0) {
                console.log(chalk.gray(`  ✓ PostgreSQL file record created: ${result[0].id}`));
                return result[0].id;
            }
        }

        logWarning('PostgreSQL integration failed - continuing without metadata');
        return null;

    } catch (error) {
        logWarning(`PostgreSQL metadata error: ${error.message}`);
        return null;
    }
}

async function createIndexingSession() {
    try {
        console.log(chalk.gray(`Creating indexing session metadata...`));

        const sessionQuery = `
            INSERT INTO indexing_sessions (project_name, collection_name, started_at, status, location)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `;

        const sessionResult = await mcpManager.callTool('postgres', 'query', {
            sql: sessionQuery,
            params: [
                PROJECT_NAME,
                COLLECTION_NAME,
                new Date().toISOString(),
                'running',
                PROJECT_ROOT
            ]
        });

        if (sessionResult?.content?.[0]) {
            const result = JSON.parse(sessionResult.content[0].text);
            if (result.rows?.length > 0) {
                const sessionId = result.rows[0].id;
                console.log(chalk.gray(`✓ Indexing session created: ${sessionId}`));
                return sessionId;
            } else if (Array.isArray(result) && result.length > 0) {
                const sessionId = result[0].id;
                console.log(chalk.gray(`✓ Indexing session created: ${sessionId}`));
                return sessionId;
            }
        }

        logWarning('Failed to create indexing session - continuing without PostgreSQL metadata');
        return null;

    } catch (error) {
        logWarning(`PostgreSQL session creation error: ${error.message}`);
        return null;
    }
}

async function updateIndexingSession(sessionId, indexed, failed) {
    if (!sessionId) return;

    try {
        const updateQuery = `
            UPDATE indexing_sessions
            SET completed_at  = $1,
                status        = $2,
                files_indexed = $3,
                files_failed  = $4
            WHERE id = $5;
        `;

        await mcpManager.callTool('postgres', 'query', {
            sql: updateQuery,
            params: [
                new Date().toISOString(),
                'completed',
                indexed,
                failed,
                sessionId
            ]
        });

        console.log(chalk.gray(`✓ Indexing session updated`));

    } catch (error) {
        logWarning(`PostgreSQL session update error: ${error.message}`);
    }
}

async function ensurePostgreSQLTables() {
    try {
        console.log(chalk.gray(`Ensuring PostgreSQL tables exist...`));

        // Create indexing_sessions table
        const sessionsTableQuery = `
            CREATE TABLE IF NOT EXISTS indexing_sessions
            (
                id              SERIAL PRIMARY KEY,
                project_name    VARCHAR(255) NOT NULL,
                collection_name VARCHAR(255) NOT NULL,
                started_at      TIMESTAMP    NOT NULL,
                completed_at    TIMESTAMP,
                status          VARCHAR(50)  NOT NULL DEFAULT 'running',
                location        TEXT,
                files_indexed   INTEGER               DEFAULT 0,
                files_failed    INTEGER               DEFAULT 0
            );
        `;

        // Create indexed_files table
        const filesTableQuery = `
            CREATE TABLE IF NOT EXISTS indexed_files
            (
                id                SERIAL PRIMARY KEY,
                session_id        INTEGER REFERENCES indexing_sessions (id),
                file_name         VARCHAR(255) NOT NULL,
                file_path         TEXT         NOT NULL,
                file_extension    VARCHAR(50),
                content_length    INTEGER,
                size_bytes        INTEGER,
                last_modified     TIMESTAMP,
                indexed_at        TIMESTAMP    NOT NULL,
                neo4j_document_id INTEGER,
                neo4j_project_id  INTEGER,
                qdrant_collection VARCHAR(255),
                chunk_count       INTEGER,
                vector_count      INTEGER,
                status            VARCHAR(50)  NOT NULL DEFAULT 'indexed'
            );
        `;

        await mcpManager.callTool('postgres', 'query', {
            sql: sessionsTableQuery
        });

        await mcpManager.callTool('postgres', 'query', {
            sql: filesTableQuery
        });

        console.log(chalk.gray(`✓ PostgreSQL tables ready`));
        return true;

    } catch (error) {
        logWarning(`PostgreSQL table setup error: ${error.message} - continuing without metadata`);
        return false;
    }
}

// ===== RICH CODE STRUCTURE ENTITY CREATION =====

async function createCodeStructureEntities(documentId, codeStructure, mcpManager) {
    try {
        console.log(chalk.gray(`    🗂️ Creating code structure entities for ${codeStructure.language}...`));

        let totalEntitiesCreated = 0;
        let entitiesFailed = 0;

        // Create entities for imports
        for (const importInfo of codeStructure.imports) {
            try {
                const importId = await createImportEntity(documentId, importInfo, codeStructure, mcpManager);
                if (importId) {
                    totalEntitiesCreated++;
                } else {
                    entitiesFailed++;
                }
            } catch (error) {
                logError(`Import entity failed for ${importInfo.source}`, error);
                entitiesFailed++;
            }
        }

        // Create entities for classes and their methods
        for (const classInfo of codeStructure.classes) {
            try {
                const classId = await createClassEntity(documentId, classInfo, codeStructure, mcpManager);
                if (classId) {
                    totalEntitiesCreated++;

                    // Create method entities for this class
                    for (const method of classInfo.methods) {
                        try {
                            const methodId = await createMethodEntity(classId, method, codeStructure, mcpManager);
                            if (methodId) {
                                totalEntitiesCreated++;
                            } else {
                                entitiesFailed++;
                            }
                        } catch (error) {
                            logError(`Method entity failed for ${method.name}`, error);
                            entitiesFailed++;
                        }
                    }
                } else {
                    entitiesFailed++;
                }
            } catch (error) {
                logError(`Class entity failed for ${classInfo.name}`, error);
                entitiesFailed++;
            }
        }

        // Create entities for standalone functions
        for (const funcInfo of codeStructure.functions) {
            try {
                const functionId = await createFunctionEntity(documentId, funcInfo, codeStructure, mcpManager);
                if (functionId) {
                    totalEntitiesCreated++;
                } else {
                    entitiesFailed++;
                }
            } catch (error) {
                logError(`Function entity failed for ${funcInfo.name}`, error);
                entitiesFailed++;
            }
        }

        // Create entities for function calls (for dependency analysis)
        const callCounts = {};
        for (const call of codeStructure.calls) {
            callCounts[call.function] = (callCounts[call.function] || 0) + 1;
        }

        for (const [functionName, count] of Object.entries(callCounts)) {
            try {
                const callId = await createFunctionCallEntity(documentId, functionName, count, codeStructure, mcpManager);
                if (callId) {
                    totalEntitiesCreated++;
                } else {
                    entitiesFailed++;
                }
            } catch (error) {
                logError(`Function call entity failed for ${functionName}`, error);
                entitiesFailed++;
            }
        }

        if (entitiesFailed > 0) {
            logWarning(`Code structure: ${totalEntitiesCreated} entities created, ${entitiesFailed} failed`);
        } else {
            console.log(chalk.gray(`    ✅ Created code structure: ${codeStructure.classes.length} classes, ${codeStructure.functions.length} functions, ${Object.keys(callCounts).length} call patterns`));
            console.log(chalk.gray(`    📊 Total Neo4j entities created: ${totalEntitiesCreated}`));

            // Verify entities were actually created in Neo4j
            await verifyCodeStructureEntities(documentId, totalEntitiesCreated, mcpManager);
        }

    } catch (error) {
        logError('Code structure creation failed', error);
        throw error; // Re-throw to ensure the indexing process knows it failed
    }
}

async function createImportEntity(documentId, importInfo, codeStructure, mcpManager) {
    try {
        const importData = {
            name: `import-${importInfo.source}`,
            source_module: importInfo.source,
            import_type: importInfo.type || 'unknown',
            line_number: importInfo.line,
            specifiers: JSON.stringify(importInfo.specifiers),
            language: codeStructure.language
        };

        const result = await mcpManager.callTool('neo4j-agent-memory', 'create_memory', {
            label: 'import',
            properties: importData
        });

        if (result.content && result.content[0]?.text) {
            const response = JSON.parse(result.content[0].text);
            const importId = response.id;

            // Create relationship from document to import
            await mcpManager.callTool('neo4j-agent-memory', 'create_connection', {
                fromMemoryId: documentId,
                toMemoryId: importId,
                type: 'IMPORTS',
                properties: {
                    line: importInfo.line,
                    import_type: importInfo.type
                }
            });

            return importId;
        }

        throw new Error('No valid response from Neo4j MCP server for import entity');

    } catch (error) {
        logError('Import entity creation failed', error);
        throw error;
    }
}

async function createClassEntity(documentId, classInfo, codeStructure, mcpManager) {
    try {
        const classData = {
            name: classInfo.name,
            line_number: classInfo.line,
            super_class: classInfo.superClass,
            method_count: classInfo.methods ? classInfo.methods.length : 0,
            language: codeStructure.language,
            file_path: codeStructure.file
        };

        const result = await mcpManager.callTool('neo4j-agent-memory', 'create_memory', {
            label: 'class',
            properties: classData
        });

        if (result.content && result.content[0]?.text) {
            const response = JSON.parse(result.content[0].text);
            const classId = response.id;

            // Create relationship from document to class
            await mcpManager.callTool('neo4j-agent-memory', 'create_connection', {
                fromMemoryId: documentId,
                toMemoryId: classId,
                type: 'DEFINES',
                properties: {
                    line: classInfo.line,
                    entity_type: 'class'
                }
            });

            // Create inheritance relationship if applicable
            if (classInfo.superClass) {
                const inheritanceData = {
                    child_class: classInfo.name,
                    parent_class: classInfo.superClass,
                    language: codeStructure.language
                };

                const inheritResult = await mcpManager.callTool('neo4j-agent-memory', 'create_memory', {
                    label: 'inheritance',
                    properties: inheritanceData
                });

                if (inheritResult.content && inheritResult.content[0]?.text) {
                    const inheritResponse = JSON.parse(inheritResult.content[0].text);
                    await mcpManager.callTool('neo4j-agent-memory', 'create_connection', {
                        fromMemoryId: classId,
                        toMemoryId: inheritResponse.id,
                        type: 'EXTENDS',
                        properties: {}
                    });
                }
            }

            return classId;
        }

        throw new Error('No valid response from Neo4j MCP server for class entity');

    } catch (error) {
        logError('Class entity creation failed', error);
        throw error;
    }
}

async function createMethodEntity(classId, methodInfo, codeStructure, mcpManager) {
    try {
        const methodData = {
            name: methodInfo.name,
            line_number: methodInfo.line,
            kind: methodInfo.kind || 'method',
            is_static: methodInfo.static || false,
            is_async: methodInfo.async || false,
            parameter_count: methodInfo.parameters ? methodInfo.parameters.length : 0,
            parameters: JSON.stringify(methodInfo.parameters || []),
            language: codeStructure.language
        };

        const result = await mcpManager.callTool('neo4j-agent-memory', 'create_memory', {
            label: 'method',
            properties: methodData
        });

        if (result.content && result.content[0]?.text) {
            const response = JSON.parse(result.content[0].text);
            const methodId = response.id;

            // Create relationship from class to method
            await mcpManager.callTool('neo4j-agent-memory', 'create_connection', {
                fromMemoryId: classId,
                toMemoryId: methodId,
                type: 'HAS_METHOD',
                properties: {
                    line: methodInfo.line,
                    kind: methodInfo.kind
                }
            });

            return methodId;
        }

        throw new Error('No valid response from Neo4j MCP server for method entity');

    } catch (error) {
        logError('Method entity creation failed', error);
        throw error;
    }
}

async function createFunctionEntity(documentId, funcInfo, codeStructure, mcpManager) {
    try {
        const functionData = {
            name: funcInfo.name,
            line_number: funcInfo.line,
            is_async: funcInfo.async || false,
            is_generator: funcInfo.generator || false,
            parameter_count: funcInfo.parameters ? funcInfo.parameters.length : 0,
            parameters: JSON.stringify(funcInfo.parameters || []),
            language: codeStructure.language,
            file_path: codeStructure.file
        };

        const result = await mcpManager.callTool('neo4j-agent-memory', 'create_memory', {
            label: 'function',
            properties: functionData
        });

        if (result.content && result.content[0]?.text) {
            const response = JSON.parse(result.content[0].text);
            const functionId = response.id;

            // Create relationship from document to function
            await mcpManager.callTool('neo4j-agent-memory', 'create_connection', {
                fromMemoryId: documentId,
                toMemoryId: functionId,
                type: 'DEFINES',
                properties: {
                    line: funcInfo.line,
                    entity_type: 'function'
                }
            });

            return functionId;
        }

        throw new Error('No valid response from Neo4j MCP server for function entity');

    } catch (error) {
        logError('Function entity creation failed', error);
        throw error;
    }
}

async function createFunctionCallEntity(documentId, functionName, callCount, codeStructure, mcpManager) {
    try {
        const callData = {
            name: `call-${functionName}`,
            function_name: functionName,
            call_count: callCount,
            language: codeStructure.language,
            file_path: codeStructure.file
        };

        const result = await mcpManager.callTool('neo4j-agent-memory', 'create_memory', {
            label: 'function_call',
            properties: callData
        });

        if (result.content && result.content[0]?.text) {
            const response = JSON.parse(result.content[0].text);
            const callId = response.id;

            // Create relationship from document to function call
            await mcpManager.callTool('neo4j-agent-memory', 'create_connection', {
                fromMemoryId: documentId,
                toMemoryId: callId,
                type: 'CALLS',
                properties: {
                    call_count: callCount
                }
            });

            return callId;
        }

        throw new Error('No valid response from Neo4j MCP server for function call entity');

    } catch (error) {
        logError('Function call entity creation failed', error);
        throw error;
    }
}

// Verify that code structure entities were actually created in Neo4j
async function verifyCodeStructureEntities(documentId, expectedCount, mcpManager) {
    try {
        // Search for entities connected to this document
        const searchResult = await mcpManager.callTool('neo4j-agent-memory', 'search_memories', {
            query: `document_id_${documentId}`,
            limit: 50,
            depth: 2
        });

        if (searchResult && searchResult.content && searchResult.content[0]) {
            const searchData = JSON.parse(searchResult.content[0].text);
            const connectedEntities = searchData.filter(item =>
                item.memory._labels.some(label =>
                    ['class', 'function', 'method', 'import', 'function_call'].includes(label)
                )
            );

            if (connectedEntities.length > 0) {
                console.log(chalk.green(`    ✅ Verified: ${connectedEntities.length} code structure entities found in Neo4j`));

                // Log entity breakdown
                const entityBreakdown = {};
                connectedEntities.forEach(entity => {
                    entity.memory._labels.forEach(label => {
                        if (['class', 'function', 'method', 'import', 'function_call'].includes(label)) {
                            entityBreakdown[label] = (entityBreakdown[label] || 0) + 1;
                        }
                    });
                });

                console.log(chalk.gray(`    📋 Entity breakdown: ${Object.entries(entityBreakdown).map(([type, count]) => `${count} ${type}s`).join(', ')}`));
            } else {
                logWarning(`No code structure entities found in Neo4j for document ${documentId}`);
            }
        } else {
            logWarning('Could not verify entities - Neo4j search failed');
        }

    } catch (error) {
        logWarning(`Entity verification failed: ${error.message}`);
    }
}

async function checkIfFileIndexed(filePath) {
    try {
        const relativePath = path.relative(PROJECT_ROOT, filePath);

        // Search for vectors with this file path
        const response = await axios.post(`http://localhost:6333/collections/${COLLECTION_NAME}/points/search`, {
            vector: Array(CONFIG.EMBEDDING_DIMENSIONS).fill(0), // Dummy vector for search
            limit: 1,
            filter: {
                must: [
                    {
                        key: "file_path",
                        match: {value: relativePath}
                    }
                ]
            }
        }, {
            headers: {'Content-Type': 'application/json'}
        });

        return response.data && response.data.result && response.data.result.length > 0;
    } catch (error) {
        // If collection doesn't exist or search fails, assume not indexed
        return false;
    }
}

async function storeInQdrantBatched(points) {
    try {
        // Store in batches to avoid overwhelming Qdrant
        for (let i = 0; i < points.length; i += CONFIG.BATCH_SIZE) {
            const batch = points.slice(i, i + CONFIG.BATCH_SIZE);

            const response = await axios.put(`http://localhost:6333/collections/${COLLECTION_NAME}/points`, {
                points: batch
            }, {
                headers: {'Content-Type': 'application/json'}
            });

            if (!response.data || response.data.status !== 'ok') {
                throw new Error(`Batch ${Math.floor(i / CONFIG.BATCH_SIZE)} failed`);
            }
        }

        return {status: 'ok', batches: Math.ceil(points.length / CONFIG.BATCH_SIZE)};
    } catch (error) {
        if (error.response && error.response.data) {
            logError('Qdrant API error', new Error(JSON.stringify(error.response.data, null, 2)));
        } else {
            logError('Qdrant storage error', error);
        }
        throw error;
    }
}

async function createProjectEntity(projectName, mcpManager) {
    try {
        console.log(chalk.gray(`  Creating/finding project entity: ${projectName}...`));

        // First search for existing project entity
        const searchResult = await mcpManager.callTool('neo4j-agent-memory', 'search_memories', {
            query: projectName,
            label: 'project',
            limit: 1,
            depth: 1
        });

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

        const createResult = await mcpManager.callTool('neo4j-agent-memory', 'create_memory', {
            label: 'project',
            properties: projectData
        });

        if (createResult && createResult.content && createResult.content[0]) {
            const memory = JSON.parse(createResult.content[0].text);
            const projectId = memory.memory._id;

            console.log(chalk.gray(`  ✓ Created project entity: ${projectId}`));

            // Link CLI tool to this project with INDEXES relationship
            await mcpManager.callTool('neo4j-agent-memory', 'create_connection', {
                fromMemoryId: 10, // llm-cli application entity
                toMemoryId: projectId,
                type: 'INDEXES',
                properties: {
                    indexed_at: new Date().toISOString(),
                    tool_version: '2.0.0-local'
                }
            });

            console.log(chalk.gray(`  ✓ Project linked to CLI with INDEXES relationship`));

            return projectId;
        }

        throw new Error('Failed to create project entity');

    } catch (error) {
        logError('Failed to create project entity', error);
        return null;
    }
}

async function createDocumentEntity(filePath, contentLength, vectorData, mcpManager) {
    try {
        const relativePath = path.relative(PROJECT_ROOT, filePath);
        const fileName = path.basename(filePath);
        const fileExt = path.extname(filePath);
        const stats = fs.statSync(filePath);

        // Get or create project entity first
        const projectId = await createProjectEntity(PROJECT_NAME, mcpManager);
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
            // Call MCP Neo4j agent memory to create document
            const createResult = await mcpManager.callTool('neo4j-agent-memory', 'create_memory', {
                label: 'document',
                properties: documentData
            });

            if (createResult && createResult.content && createResult.content[0]) {
                const memory = JSON.parse(createResult.content[0].text);
                const documentId = memory.memory._id;

                console.log(chalk.gray(`  ✓ Neo4j entity created: ${documentId}`));

                // Link document to PROJECT (not main CLI tool)
                await mcpManager.callTool('neo4j-agent-memory', 'create_connection', {
                    fromMemoryId: projectId, // Link to project entity instead of main CLI
                    toMemoryId: documentId,
                    type: 'CONTAINS',
                    properties: {
                        indexed_at: new Date().toISOString(),
                        vector_count: vectorData.vectors_stored,
                        chunk_count: vectorData.chunks
                    }
                });

                console.log(chalk.gray(`  ✓ Document linked to project in Neo4j`));
                return {
                    success: true,
                    documentId: documentId,
                    projectId: projectId,
                    vectorCount: vectorData.vectors_stored,
                    chunkCount: vectorData.chunks
                };
            } else {
                throw new Error('Invalid response from Neo4j MCP server');
            }

        } catch (error) {
            logWarning(`Neo4j MCP integration failed: ${error.message}`);
            console.log(chalk.gray(`  ✓ Document metadata prepared (Neo4j integration failed)`));
            return {
                status: 'indexed',
                entity_created: false,
                metadata: documentData,
                error: error.message
            };
        }

    } catch (error) {
        logError(`Neo4j error for ${filePath}`, error);
        // Don't throw - indexing can continue even if Neo4j fails
        return {status: 'indexed', entity_created: false, error: error.message};
    }
}

function showProjectInfo() {
    console.log(chalk.green.bold(`🚀 Claude Local Infrastructure`));
    console.log(chalk.cyan(`Project: ${PROJECT_NAME}`));
    console.log(chalk.cyan(`Root: ${PROJECT_ROOT}`));
    console.log(chalk.cyan(`Claude Dir: ${CLAUDE_DIR}`));
    console.log(chalk.cyan(`Ollama Host: ${OLLAMA_CONFIG.ollama.host}`));
    console.log('');
    console.log(chalk.yellow('Database Services:'));
    console.log('  • PostgreSQL: localhost:5432');
    console.log('  • Neo4j: localhost:7474 (Web) / localhost:7687 (Bolt)');
    console.log('  • Redis: localhost:6379');
    console.log('  • Qdrant: localhost:6333');
    console.log('');
    console.log(chalk.yellow('LLM Services:'));
    console.log(`  • Ollama: ${OLLAMA_CONFIG.ollama.host}`);
    console.log(`  • Default Model: ${OLLAMA_CONFIG.ollama.defaultModel}`);
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
        const response = await axios.get(`${OLLAMA_CONFIG.ollama.host}/api/tags`);

        if (response.data && response.data.models && response.data.models.length > 0) {
            console.log(chalk.green.bold('Available Ollama Models:'));
            response.data.models.forEach(model => {
                const isDefault = model.name === OLLAMA_CONFIG.ollama.defaultModel;
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
        logError('Error connecting to Ollama server', error);
        console.log(chalk.gray(`Trying to connect to: ${OLLAMA_CONFIG.ollama.host}`));
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
        logError('Error processing prompt', error);
    }
}

async function processOllamaPrompt(prompt, options) {
    const model = options.model || OLLAMA_CONFIG.ollama.defaultModel;
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
            const response = await axios.post(`${OLLAMA_CONFIG.ollama.host}/api/generate`, requestData, {
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
            const response = await axios.post(`${OLLAMA_CONFIG.ollama.host}/api/generate`, requestData);

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
            console.log(chalk.gray(`Trying to connect to: ${OLLAMA_CONFIG.ollama.host}`));
            console.log(chalk.gray('Make sure Ollama is running with: ollama serve'));
        } else if (error.response && error.response.status === 404) {
            console.error(chalk.red(`Model '${model}' not found on Ollama server.`));
            console.log(chalk.gray('Use --list-ollama-models to see available models'));
            console.log(chalk.gray(`Or install the model with: ollama pull ${model}`));
        } else {
            logError('Ollama API error', error);
        }
    }
}

// Handle uncaught errors
process.on('uncaughtException', async (error) => {
    logError('Uncaught Exception', error);
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

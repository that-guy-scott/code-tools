import path from 'path';
import {fileURLToPath} from 'url';

// Project context constants from main CLI
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const TOOL_ROOT = path.dirname(__dirname);
export const PROJECT_NAME = process.env.CLAUDE_PROJECT_NAME || path.basename(process.cwd());
export const PROJECT_ROOT = process.env.CLAUDE_PROJECT_ROOT || process.cwd();
export const CLAUDE_DIR = path.join(PROJECT_ROOT, '.claude');

// Configuration constants
export const CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    CHUNK_SIZE: 2000,
    CHUNK_OVERLAP: 200,
    MAX_CHUNK_SIZE: 4000,
    MIN_CHUNK_SIZE: 100,
    BATCH_SIZE: 100,
    EMBEDDING_DIMENSIONS: 768
};

// Configuration with sane defaults (no .env required)
export const DEFAULT_CONFIG = {
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

// Generate project-specific collection name (from main CLI)
export function getCollectionName() {
    // Sanitize project name for Qdrant collection naming
    const sanitized = PROJECT_NAME
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    return `${sanitized}-docs`;
}

export const COLLECTION_NAME = getCollectionName();
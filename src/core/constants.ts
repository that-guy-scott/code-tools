/**
 * Application-wide constants
 * Centralized location for all configuration values
 */

export const CONFIG_DEFAULTS = {
  // File processing limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  CHUNK_SIZE: 2000,
  CHUNK_OVERLAP: 200,
  MAX_CHUNK_SIZE: 4000,
  MIN_CHUNK_SIZE: 100,
  BATCH_SIZE: 100,
  
  // Vector embeddings
  EMBEDDING_DIMENSIONS: 768,
  
  // Database ports
  NEO4J_PORT: 7687,
  QDRANT_PORT: 6333,
  REDIS_PORT: 6379,
  POSTGRES_PORT: 5432,
} as const;

export const NETWORK_DEFAULTS = {
  // Service hosts
  OLLAMA_HOST: 'http://localhost:11434',
  NEO4J_HOST: 'bolt://localhost',
  QDRANT_HOST: 'http://localhost',
  REDIS_HOST: 'redis://localhost',
  POSTGRES_HOST: 'localhost',
} as const;

export const DEFAULT_MODELS = {
  OLLAMA: 'gpt-oss:latest',
  GEMINI: 'gemini-2.0-flash',
  OPENAI: 'gpt-4o',
  ANTHROPIC: 'claude-3-7-sonnet-20250219',
} as const;

export const DATABASE_DEFAULTS = {
  POSTGRES_USER: 'dev_user',
  POSTGRES_DATABASE: 'code_tools_dev',
  NEO4J_USER: 'neo4j',
} as const;

/**
 * Build connection strings from components
 */
export const CONNECTION_BUILDERS = {
  neo4j: (): string => 
    `${NETWORK_DEFAULTS.NEO4J_HOST}:${CONFIG_DEFAULTS.NEO4J_PORT}`,
    
  qdrant: (): string => 
    `${NETWORK_DEFAULTS.QDRANT_HOST}:${CONFIG_DEFAULTS.QDRANT_PORT}`,
    
  redis: (): string => 
    `${NETWORK_DEFAULTS.REDIS_HOST}:${CONFIG_DEFAULTS.REDIS_PORT}`,
    
  postgres: (): string => 
    `postgresql://${DATABASE_DEFAULTS.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD || 'dev_password_123'}@${NETWORK_DEFAULTS.POSTGRES_HOST}:${CONFIG_DEFAULTS.POSTGRES_PORT}/${DATABASE_DEFAULTS.POSTGRES_DATABASE}`,
} as const;
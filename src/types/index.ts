// Core configuration types
export interface ProjectConfig {
  name: string;
  root: string;
  claudeDir: string;
  toolRoot: string;
}

export interface DatabaseConfig {
  postgres: {
    connectionString: string;
  };
  neo4j: {
    uri: string;
    username: string;
    password: string;
  };
  qdrant: {
    url: string;
  };
  redis: {
    url: string;
  };
}

export interface LLMConfig {
  ollama: {
    host: string;
    defaultModel: string;
  };
  gemini: {
    apiKey: string;
    defaultModel: string;
  };
  openai: {
    apiKey: string;
    defaultModel: string;
  };
  anthropic: {
    apiKey: string;
    defaultModel: string;
  };
}

export interface AppConfig extends DatabaseConfig, LLMConfig {
  project: ProjectConfig;
  maxFileSize: number;
  chunkSize: number;
  chunkOverlap: number;
  maxChunkSize: number;
  minChunkSize: number;
  batchSize: number;
  embeddingDimensions: number;
}

// MCP types
export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolResult {
  content?: Array<{ text?: string; [key: string]: unknown }>;
  isError?: boolean;
  [key: string]: unknown;
}

// Knowledge system types
export interface EmbeddingVector {
  embedding: number[];
  metadata: Record<string, unknown>;
}

export interface SearchResult {
  content: string;
  file_path: string;
  score: number;
  metadata: Record<string, unknown>;
  chunk_index: number;
  chunk_type: string;
}

export interface SearchOptions {
  limit?: number;
  collection?: string;
  searchAll?: boolean;
  threshold?: number;
  includeMetadata?: boolean;
}

export interface CollectionInfo {
  name: string;
  points_count: number;
}

export interface FileChunk {
  content: string;
  file_path: string;
  chunk_index: number;
  chunk_type: string;
  metadata: Record<string, unknown>;
}

export interface IndexingResult {
  totalFiles: number;
  indexedFiles: number;
  failedFiles: number;
  errors: Error[];
  chunks: ChunkData[];
  vectorCount: number;
  success: boolean;
}

// Code analysis types
export interface CodeStructure {
  language: string;
  file: string;
  classes: ClassInfo[];
  functions: FunctionInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  variables: VariableInfo[];
  calls: CallInfo[];
}

export interface ClassInfo {
  name: string;
  line: number;
  superClass?: string;
  endLine?: number;
  methods?: MethodInfo[];
  properties?: PropertyInfo[];
  extends?: string;
  implements?: string[];
}

export interface MethodInfo {
  name: string;
  line: number;
  isStatic: boolean;
  isPrivate: boolean;
  isAsync: boolean;
  parameters: string[];
}

export interface PropertyInfo {
  name: string;
  line: number;
  isStatic: boolean;
  isPrivate: boolean;
  type?: string;
}

export interface FunctionInfo {
  name: string;
  line: number;
  async: boolean;
  generator?: boolean;
  endLine?: number;
  parameters?: string[];
  isExported?: boolean;
}

export interface ImportInfo {
  source: string;
  line: number;
  specifiers: ImportSpecifier[];
}

export interface ImportSpecifier {
  name: string;
  type: 'default' | 'namespace' | 'named';
  imported?: string;
}

export interface CallInfo {
  name: string;
  line: number;
  type: 'function' | 'method';
}

export interface ExportInfo {
  type: 'default' | 'named';
  name?: string;
  specifiers?: Array<{ name: string; local: string }>;
}

export interface VariableInfo {
  name: string;
  line: number;
  type: 'var' | 'let' | 'const';
  isExported: boolean;
}

// File processing types
export interface FileInfo {
  path: string;
  type: 'javascript' | 'typescript' | 'json' | 'markdown' | 'text';
  size: number;
  lastModified: Date;
}

export interface ProcessedFile {
  filePath: string;
  fileType: string;
  content: string;
  codeStructure?: CodeStructure;
  documentId?: number;
  projectId?: number;
}

export interface ChunkData {
  text: string;
  index: number;
  totalChunks: number;
  embedding?: number[];
}


// LLM Provider types
export interface LLMProviderOptions {
  host?: string;
  defaultModel?: string;
  apiKey?: string;
  timeout?: number;
  [key: string]: any;
}

export interface LLMModel {
  name: string;
  displayName?: string;
  description?: string;
  size?: number;
  isDefault?: boolean;
  metadata?: Record<string, any>;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, any>;
}

export interface StreamingCallback {
  (chunk: string, done: boolean, metadata?: any): void;
}

// CLI types
export interface CLIOptions {
  provider: string;
  model?: string;
  temperature: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  output: 'text' | 'json';
  stream: boolean;
  listProviders: boolean;
  listModels: boolean;
  listOllamaModels: boolean;
  listTools: boolean;
  projectInfo: boolean;
  semanticSearch?: string;
  searchAll: boolean;
  listCollections: boolean;
  knowledgeSearch?: string;
  index?: string;
}

export interface PromptContext {
  prompt: string;
  stdinData?: string;
  options: CLIOptions;
}

// LLM Provider types
export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMProvider {
  name: string;
  listModels(): Promise<string[]>;
  generateResponse(messages: LLMMessage[], options: GenerationOptions): Promise<LLMResponse>;
  generateEmbedding?(text: string): Promise<number[]>;
}

export interface GenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

// Database types
export interface Neo4jEntity {
  id: number;
  label: string;
  properties: Record<string, unknown>;
}

export interface Neo4jRelationship {
  fromMemoryId: number;
  toMemoryId: number;
  type: string;
  properties?: Record<string, unknown>;
}

export interface PostgreSQLSession {
  id: string;
  projectName: string;
  startTime: Date;
  endTime?: Date;
  filesIndexed: number;
  filesFailed: number;
}


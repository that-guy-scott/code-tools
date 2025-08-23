#!/usr/bin/env node

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
  score: number;
  payload: {
    file_name: string;
    file_path: string;
    chunk_index: number;
    chunk_text: string;
    [key: string]: unknown;
  };
  project?: string;
  collection?: string;
}

export interface CollectionInfo {
  name: string;
  points_count: number;
}

// Code analysis types
export interface CodeStructure {
  classes: ClassInfo[];
  functions: FunctionInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  variables: VariableInfo[];
  dependencies: string[];
}

export interface ClassInfo {
  name: string;
  line: number;
  endLine?: number;
  methods: MethodInfo[];
  properties: PropertyInfo[];
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
  endLine?: number;
  async: boolean;
  parameters: string[];
  isExported: boolean;
}

export interface ImportInfo {
  source: string;
  line: number;
  specifiers: ImportSpecifier[];
}

export interface ImportSpecifier {
  type: 'ImportDefaultSpecifier' | 'ImportNamespaceSpecifier' | 'ImportSpecifier';
  local: string;
  imported?: string;
}

export interface ExportInfo {
  type: 'ExportDefaultDeclaration' | 'ExportNamedDeclaration';
  declaration?: string;
  line: number;
  specifiers?: string[];
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

export interface IndexingResult {
  chunks: ChunkData[];
  codeStructure?: CodeStructure;
  vectorCount: number;
  success: boolean;
}

// CLI types
export interface CLIOptions {
  provider: string;
  model?: string;
  temperature: number;
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

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
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

// Error types
export class CLIError extends Error {
  constructor(
    message: string,
    public readonly context: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

export class MCPError extends Error {
  constructor(
    message: string,
    public readonly serverName: string,
    public readonly toolName?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

export class KnowledgeError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly filePath?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'KnowledgeError';
  }
}
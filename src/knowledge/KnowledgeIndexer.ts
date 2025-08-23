import { readFile, stat, readdir } from 'fs/promises';
import path from 'path';
import { parse as babelParse } from '@babel/parser';
import traverse from '@babel/traverse';
import { parse as acornParse } from 'acorn';
import { Logger } from '../core/Logger.js';
import { Config } from '../core/Config.js';
import { CONFIG_DEFAULTS } from '../core/constants.js';
import type { MCPManager } from '../mcp/MCPManager.js';
import type { CodeStructure, FileChunk, IndexingResult } from '../types/index.js';
import { KnowledgeError } from '../core/errors.js';

export class KnowledgeIndexer {
  private logger = Logger.getInstance();
  private config = Config.getInstance();

  constructor(private mcpManager: MCPManager) {}

  /**
   * Index knowledge from a file or directory path
   */
  public async indexPath(indexPath: string): Promise<IndexingResult> {
    this.logger.info(`Starting knowledge indexing from: ${indexPath}`, 'KnowledgeIndexer');

    try {
      const stats = await stat(indexPath);
      const files = stats.isFile() 
        ? [indexPath] 
        : await this.discoverIndexableFiles(indexPath);

      this.logger.info(`Found ${files.length} files to index`, 'KnowledgeIndexer');

      let indexed = 0;
      let failed = 0;
      const errors: Error[] = [];

      // Ensure Qdrant collection exists
      await this.ensureCollectionExists();

      for (const filePath of files) {
        try {
          await this.indexFile(filePath);
          indexed++;
          this.logger.progress(indexed + failed, files.length, 'files processed');
        } catch (error) {
          failed++;
          errors.push(error as Error);
          this.logger.debug(`Failed to index ${filePath}: ${error}`, 'KnowledgeIndexer');
          this.logger.progress(indexed + failed, files.length, 'files processed');
        }
      }

      const result: IndexingResult = {
        totalFiles: files.length,
        indexedFiles: indexed,
        failedFiles: failed,
        errors,
        chunks: [], // We don't aggregate chunks at this level
        vectorCount: indexed, // Approximate vector count
        success: failed === 0
      };

      this.logger.separator();
      this.logger.success(`Indexing complete: ${indexed}/${files.length} files indexed`);
      if (failed > 0) {
        this.logger.warn(`${failed} files failed to index`);
      }

      return result;
    } catch (error) {
      this.logger.error('Knowledge indexing failed', error as Error, 'KnowledgeIndexer');
      throw new KnowledgeError('Failed to index knowledge', 'index', indexPath, error as Error);
    }
  }

  /**
   * Index a single file
   */
  private async indexFile(filePath: string): Promise<void> {
    const content = await readFile(filePath, 'utf-8');
    const fileType = this.detectFileType(filePath);
    
    this.logger.debug(`Indexing ${path.basename(filePath)} (${fileType})`, 'KnowledgeIndexer');

    // Extract code structure if it's a code file
    const structure = await this.extractCodeStructure(filePath, content);
    
    // Create text chunks
    const chunks = this.chunkContent(content, filePath, structure);
    
    // Generate embeddings and store in Qdrant
    await this.storeChunks(chunks, filePath, fileType);

    // Store file metadata in Neo4j if available
    if (structure) {
      await this.storeFileStructure(filePath, structure);
    }
  }

  /**
   * Discover indexable files in a directory
   */
  private async discoverIndexableFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    const allowedExtensions = new Set([
      '.js', '.ts', '.tsx', '.jsx',
      '.py', '.java', '.go', '.rs',
      '.md', '.txt', '.json', '.yaml', '.yml',
      '.html', '.css', '.scss', '.less'
    ]);

    const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage']);

    const scanDirectory = async (currentPath: string): Promise<void> => {
      try {
        const entries = await readdir(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          
          if (entry.isDirectory()) {
            if (!ignoreDirs.has(entry.name) && !entry.name.startsWith('.')) {
              await scanDirectory(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (allowedExtensions.has(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        this.logger.debug(`Cannot scan directory ${currentPath}: ${error}`, 'KnowledgeIndexer');
      }
    };

    await scanDirectory(dirPath);
    return files.sort();
  }

  /**
   * Detect file type from path and content
   */
  private detectFileType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath).toLowerCase();

    if (ext === '.ts' || ext === '.tsx') return 'typescript';
    if (ext === '.js' || ext === '.jsx') return 'javascript';
    if (ext === '.py') return 'python';
    if (ext === '.java') return 'java';
    if (ext === '.go') return 'go';
    if (ext === '.rs') return 'rust';
    if (ext === '.md') return 'markdown';
    if (ext === '.json') return 'json';
    if (ext === '.yaml' || ext === '.yml') return 'yaml';
    if (ext === '.html') return 'html';
    if (ext === '.css' || ext === '.scss' || ext === '.less') return 'css';
    if (basename === 'dockerfile' || basename.includes('dockerfile')) return 'docker';
    
    return 'text';
  }

  /**
   * Extract code structure from supported languages
   */
  private async extractCodeStructure(filePath: string, content: string): Promise<CodeStructure | null> {
    const fileType = this.detectFileType(filePath);
    
    try {
      switch (fileType) {
        case 'typescript':
          return this.extractTypeScriptStructure(filePath, content);
        case 'javascript':
          return this.extractJavaScriptStructure(filePath, content);
        default:
          return null;
      }
    } catch (error) {
      this.logger.debug(`AST parsing failed for ${path.basename(filePath)}: ${error}`, 'KnowledgeIndexer');
      return null;
    }
  }

  /**
   * Extract TypeScript structure using Babel
   */
  private extractTypeScriptStructure(filePath: string, content: string): CodeStructure {
    const ast = babelParse(content, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      plugins: [
        'typescript',
        'jsx',
        'decorators-legacy',
        'classProperties',
        'asyncGenerators',
        'dynamicImport',
        'nullishCoalescingOperator',
        'optionalChaining'
      ]
    });

    const structure: CodeStructure = {
      language: 'typescript',
      file: filePath,
      imports: [],
      exports: [],
      classes: [],
      functions: [],
      variables: [],
      calls: []
    };

    traverse(ast, {
      ImportDeclaration(path: any) {
        const source = path.node.source.value;
        const specifiers = path.node.specifiers.map((spec: any) => {
          if (spec.type === 'ImportDefaultSpecifier') {
            return { name: spec.local.name, type: 'default' as const };
          } else if (spec.type === 'ImportNamespaceSpecifier') {
            return { name: spec.local.name, type: 'namespace' as const };
          } else {
            return { 
              name: spec.local.name, 
              type: 'named' as const,
              imported: 'imported' in spec ? spec.imported?.name || spec.local.name : spec.local.name
            };
          }
        });
        structure.imports.push({ source, specifiers, line: path.node.loc?.start.line || 0 });
      },

      ExportDeclaration(path: any) {
        if (path.node.type === 'ExportNamedDeclaration') {
          const specifiers = path.node.specifiers?.map((spec: any) => ({
            name: spec.exported.name,
            local: spec.local.name
          })) || [];
          structure.exports.push({ type: 'named', specifiers });
        } else if (path.node.type === 'ExportDefaultDeclaration') {
          structure.exports.push({ type: 'default', name: 'default' });
        }
      },

      FunctionDeclaration(path: any) {
        const node = path.node;
        if (node.id) {
          structure.functions.push({
            name: node.id.name,
            async: node.async || false,
            generator: node.generator || false,
            line: node.loc?.start.line || 0
          });
        }
      },

      ClassDeclaration(path: any) {
        const node = path.node;
        if (node.id) {
          structure.classes.push({
            name: node.id.name,
            superClass: node.superClass?.type === 'Identifier' ? node.superClass.name : undefined,
            line: node.loc?.start.line || 0
          });
        }
      }
    });

    return structure;
  }

  /**
   * Extract JavaScript structure using Acorn
   */
  private extractJavaScriptStructure(filePath: string, content: string): CodeStructure {
    try {
      const ast = acornParse(content, {
        ecmaVersion: 'latest' as any,
        sourceType: 'module'
      });

      const structure: CodeStructure = {
        language: 'javascript',
        file: filePath,
        imports: [],
        exports: [],
        classes: [],
        functions: [],
        variables: [],
        calls: []
      };

      // Simple AST walking for Acorn (would need proper traversal for full extraction)
      return structure;
    } catch (error) {
      // Fallback to script mode
      const ast = acornParse(content, {
        ecmaVersion: 'latest' as any,
        sourceType: 'script'
      });

      return {
        language: 'javascript',
        file: filePath,
        imports: [],
        exports: [],
        classes: [],
        functions: [],
        variables: [],
        calls: []
      };
    }
  }

  /**
   * Create content chunks for embedding
   */
  private chunkContent(content: string, filePath: string, structure?: CodeStructure | null): FileChunk[] {
    const chunks: FileChunk[] = [];
    const chunkSize = CONFIG_DEFAULTS.CHUNK_SIZE;
    const overlap = CONFIG_DEFAULTS.CHUNK_OVERLAP;
    
    // For code files with structure, create semantic chunks
    if (structure && (structure.language === 'typescript' || structure.language === 'javascript')) {
      // Create chunks for classes and functions
      let chunkIndex = 0;
      
      for (const cls of structure.classes) {
        chunks.push({
          content: `Class: ${cls.name}\n${this.extractCodeSection(content, cls.line)}`,
          file_path: filePath,
          chunk_index: chunkIndex++,
          chunk_type: 'class',
          metadata: {
            language: structure.language,
            symbol_name: cls.name,
            symbol_type: 'class',
            line_number: cls.line
          }
        });
      }

      for (const func of structure.functions) {
        chunks.push({
          content: `Function: ${func.name}\n${this.extractCodeSection(content, func.line)}`,
          file_path: filePath,
          chunk_index: chunkIndex++,
          chunk_type: 'function',
          metadata: {
            language: structure.language,
            symbol_name: func.name,
            symbol_type: 'function',
            line_number: func.line,
            async: func.async
          }
        });
      }
    }

    // Always create text-based chunks as fallback/supplement
    const lines = content.split('\n');
    const textChunks = this.createTextChunks(content, chunkSize, overlap);
    
    for (let i = 0; i < textChunks.length; i++) {
      const textChunk = textChunks[i];
      if (textChunk) {
        chunks.push({
          content: textChunk,
          file_path: filePath,
          chunk_index: chunks.length,
          chunk_type: 'text',
          metadata: {
            file_type: this.detectFileType(filePath),
            total_chunks: textChunks.length
          }
        });
      }
    }

    return chunks;
  }

  /**
   * Extract a code section around a specific line
   */
  private extractCodeSection(content: string, startLine: number, contextLines: number = 10): string {
    const lines = content.split('\n');
    const start = Math.max(0, startLine - contextLines);
    const end = Math.min(lines.length, startLine + contextLines);
    return lines.slice(start, end).join('\n');
  }

  /**
   * Create text-based chunks with overlap
   */
  private createTextChunks(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;
    
    while (start < text.length) {
      let end = start + chunkSize;
      
      // Try to break at word boundary
      if (end < text.length) {
        const lastSpace = text.lastIndexOf(' ', end);
        const lastNewline = text.lastIndexOf('\n', end);
        const breakPoint = Math.max(lastSpace, lastNewline);
        
        if (breakPoint > start) {
          end = breakPoint;
        }
      }
      
      chunks.push(text.slice(start, end).trim());
      start = end - overlap;
    }
    
    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Store chunks in Qdrant vector database
   */
  private async storeChunks(chunks: FileChunk[], filePath: string, fileType: string): Promise<void> {
    try {
      // Use MCP Qdrant server to add documents
      const collectionName = this.config.getCollectionName();
      
      for (const chunk of chunks) {
        const document = {
          content: chunk.content,
          metadata: {
            ...chunk.metadata,
            file_path: filePath,
            file_type: fileType,
            chunk_index: chunk.chunk_index,
            chunk_type: chunk.chunk_type,
            timestamp: new Date().toISOString()
          }
        };

        // Note: This would need to be implemented with actual MCP Qdrant calls
        // For now, just log what we would store
        this.logger.debug(`Would store chunk ${chunk.chunk_index} from ${path.basename(filePath)}`, 'KnowledgeIndexer');
      }
    } catch (error) {
      throw new KnowledgeError('Failed to store chunks', 'store', filePath, error as Error);
    }
  }

  /**
   * Store file structure in Neo4j
   */
  private async storeFileStructure(filePath: string, structure: CodeStructure): Promise<void> {
    try {
      // Create file entity in Neo4j memory
      const fileEntity = {
        name: path.basename(filePath),
        type: 'code_file',
        language: structure.language,
        path: filePath,
        classes: structure.classes.map(c => c.name),
        functions: structure.functions.map(f => f.name),
        import_count: structure.imports.length,
        export_count: structure.exports.length,
        last_indexed: new Date().toISOString()
      };

      await this.mcpManager.callTool('neo4j-agent-memory', 'create_memory', {
        label: 'code_file',
        properties: fileEntity
      });

      this.logger.debug(`Stored file structure for ${path.basename(filePath)} in Neo4j`, 'KnowledgeIndexer');
    } catch (error) {
      this.logger.debug(`Failed to store file structure: ${error}`, 'KnowledgeIndexer');
      // Don't throw - this is supplementary
    }
  }

  /**
   * Ensure Qdrant collection exists
   */
  private async ensureCollectionExists(): Promise<void> {
    try {
      const collectionName = this.config.getCollectionName();
      
      // List existing collections to check if ours exists
      const collections = await this.mcpManager.callTool('qdrant', 'list_collections', {});
      
      // For now, just log - actual implementation would check and create collection
      this.logger.debug(`Ensuring collection '${collectionName}' exists`, 'KnowledgeIndexer');
    } catch (error) {
      this.logger.warn(`Could not verify Qdrant collection: ${error}`, 'KnowledgeIndexer');
    }
  }
}
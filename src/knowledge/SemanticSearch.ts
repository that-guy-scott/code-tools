import { Logger } from '../core/Logger.js';
import { Config } from '../core/Config.js';
import type { MCPManager } from '../mcp/MCPManager.js';
import type { SearchResult, SearchOptions } from '../types/index.js';
import { KnowledgeError } from '../core/errors.js';

export class SemanticSearch {
  private logger = Logger.getInstance();
  private config = Config.getInstance();

  constructor(private mcpManager: MCPManager) {}

  /**
   * Perform semantic search across project knowledge
   */
  public async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    this.logger.info(`Performing semantic search: "${query}"`, 'SemanticSearch');
    
    try {
      const {
        limit = 10,
        collection,
        searchAll = false,
        threshold = 0.7,
        includeMetadata = true
      } = options;

      const collectionName = collection || this.config.getCollectionName();
      
      // Use MCP Qdrant server for similarity search
      const searchResults = await this.mcpManager.callTool('qdrant', 'search', {
        query,
        collection: collectionName,
        embeddingService: 'ollama', // Use Ollama for embeddings
        limit
      });

      this.logger.debug(`Found ${Array.isArray(searchResults?.results) ? searchResults.results.length : 0} semantic matches`, 'SemanticSearch');

      // Transform results to our format
      const results: SearchResult[] = this.transformQdrantResults(searchResults, query, includeMetadata);
      
      // Filter by threshold if specified
      const filteredResults = results.filter(result => result.score >= threshold);
      
      this.logger.success(`Semantic search completed: ${filteredResults.length} results above threshold ${threshold}`);
      
      return filteredResults;
    } catch (error) {
      this.logger.error('Semantic search failed', error as Error, 'SemanticSearch');
      throw new KnowledgeError('Failed to perform semantic search', 'search', query, error as Error);
    }
  }

  /**
   * Search with hybrid approach combining Neo4j graph and semantic similarity
   */
  public async hybridSearch(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    this.logger.info(`Performing hybrid search: "${query}"`, 'SemanticSearch');
    
    try {
      // Step 1: Get semantic matches
      const semanticResults = await this.search(query, { ...options, limit: 20 });
      
      // Step 2: Query Neo4j for related entities
      const graphResults = await this.searchGraphKnowledge(query);
      
      // Step 3: Combine and rank results
      const hybridResults = this.combineResults(semanticResults, graphResults, query);
      
      const limit = options.limit || 10;
      const finalResults = hybridResults.slice(0, limit);
      
      this.logger.success(`Hybrid search completed: ${finalResults.length} combined results`);
      
      return finalResults;
    } catch (error) {
      this.logger.error('Hybrid search failed', error as Error, 'SemanticSearch');
      throw new KnowledgeError('Failed to perform hybrid search', 'hybrid_search', query, error as Error);
    }
  }

  /**
   * Search Neo4j graph knowledge for related entities
   */
  private async searchGraphKnowledge(query: string): Promise<SearchResult[]> {
    try {
      // Search Neo4j memories for related content
      const memories = await this.mcpManager.callTool('neo4j-agent-memory', 'search_memories', {
        query,
        limit: 5,
        depth: 1
      });

      if (!memories || !Array.isArray(memories)) {
        return [];
      }

      // Transform memory results to SearchResult format
      return memories.map((memory: any, index: number) => {
        const content = this.extractMemoryContent(memory);
        return {
          content,
          file_path: memory.memory?.properties?.path || 'neo4j://memory',
          score: 0.8 - (index * 0.1), // Decreasing relevance score
          metadata: {
            source: 'neo4j',
            memory_id: memory.memory?._id,
            labels: memory.memory?._labels,
            ...memory.memory?.properties
          },
          chunk_index: 0,
          chunk_type: 'graph_entity'
        };
      });
    } catch (error) {
      this.logger.debug(`Graph search failed: ${error}`, 'SemanticSearch');
      return [];
    }
  }

  /**
   * Extract readable content from Neo4j memory object
   */
  private extractMemoryContent(memory: any): string {
    const props = memory.memory?.properties || {};
    const name = props.name || 'Unknown';
    const type = memory.memory?._labels?.[0] || 'entity';
    
    let content = `${type}: ${name}`;
    
    // Add relevant properties
    if (props.description) content += `\nDescription: ${props.description}`;
    if (props.observations) content += `\nObservations: ${props.observations}`;
    if (props.functionality) content += `\nFunctionality: ${props.functionality}`;
    if (props.language) content += `\nLanguage: ${props.language}`;
    if (props.classes) content += `\nClasses: ${props.classes.join(', ')}`;
    if (props.functions) content += `\nFunctions: ${props.functions.join(', ')}`;
    
    return content;
  }

  /**
   * Combine semantic and graph search results with fusion scoring
   */
  private combineResults(semanticResults: SearchResult[], graphResults: SearchResult[], query: string): SearchResult[] {
    const combined = new Map<string, SearchResult>();
    
    // Add semantic results with boosted scores
    for (const result of semanticResults) {
      const key = `${result.file_path}:${result.chunk_index}`;
      result.score *= 1.2; // Boost semantic matches
      combined.set(key, result);
    }
    
    // Add graph results or boost if already present
    for (const result of graphResults) {
      const key = `${result.file_path}:${result.chunk_index}`;
      const existing = combined.get(key);
      
      if (existing) {
        // Boost score for items found in both searches
        existing.score = Math.min(1.0, existing.score + (result.score * 0.3));
        existing.metadata = { ...existing.metadata, ...result.metadata, hybrid_match: true };
      } else {
        combined.set(key, result);
      }
    }
    
    // Sort by score descending
    return Array.from(combined.values()).sort((a, b) => b.score - a.score);
  }

  /**
   * Transform Qdrant search results to our SearchResult format
   */
  private transformQdrantResults(qdrantResults: any, query: string, includeMetadata: boolean): SearchResult[] {
    if (!qdrantResults?.results || !Array.isArray(qdrantResults.results)) {
      return [];
    }

    return qdrantResults.results.map((result: any) => ({
      content: result.content || result.payload?.content || '',
      file_path: result.payload?.file_path || result.metadata?.file_path || 'unknown',
      score: result.score || 0,
      metadata: includeMetadata ? (result.payload || result.metadata || {}) : {},
      chunk_index: result.payload?.chunk_index || result.metadata?.chunk_index || 0,
      chunk_type: result.payload?.chunk_type || result.metadata?.chunk_type || 'text'
    }));
  }

  /**
   * Get available collections for search
   */
  public async listCollections(): Promise<string[]> {
    try {
      const result = await this.mcpManager.callTool('qdrant', 'list_collections', {});
      
      if (result?.collections && Array.isArray(result.collections)) {
        return result.collections.map((col: any) => col.name || col);
      }
      
      return [this.config.getCollectionName()];
    } catch (error) {
      this.logger.debug(`Failed to list collections: ${error}`, 'SemanticSearch');
      return [this.config.getCollectionName()];
    }
  }

  /**
   * Get collection statistics
   */
  public async getCollectionStats(collectionName?: string): Promise<any> {
    try {
      const collection = collectionName || this.config.getCollectionName();
      
      // This would need to be implemented based on Qdrant MCP server capabilities
      this.logger.debug(`Getting stats for collection: ${collection}`, 'SemanticSearch');
      
      return {
        collection: collection,
        status: 'available',
        // Additional stats would come from actual Qdrant query
      };
    } catch (error) {
      this.logger.debug(`Failed to get collection stats: ${error}`, 'SemanticSearch');
      return { collection: collectionName, status: 'unknown' };
    }
  }

  /**
   * Search for similar code snippets based on functionality
   */
  public async searchSimilarCode(codeSnippet: string, language?: string, limit: number = 5): Promise<SearchResult[]> {
    const enhancedQuery = language 
      ? `${language} code: ${codeSnippet}` 
      : `code snippet: ${codeSnippet}`;

    const options: SearchOptions = {
      limit,
      threshold: 0.6, // Lower threshold for code similarity
      includeMetadata: true
    };

    try {
      const results = await this.search(enhancedQuery, options);
      
      // Filter for code chunks if possible
      const codeResults = results.filter(result => 
        result.chunk_type === 'function' || 
        result.chunk_type === 'class' ||
        result.metadata?.language === language ||
        (typeof result.metadata?.file_type === 'string' && result.metadata.file_type.includes('script'))
      );

      return codeResults.length > 0 ? codeResults : results;
    } catch (error) {
      this.logger.error('Code similarity search failed', error as Error, 'SemanticSearch');
      throw new KnowledgeError('Failed to search for similar code', 'code_search', codeSnippet, error as Error);
    }
  }
}
import { Logger } from '../core/Logger.js';
import { Config } from '../core/Config.js';
import { SemanticSearch } from '../knowledge/SemanticSearch.js';
import type { MCPManager } from '../mcp/MCPManager.js';

export class SearchCommand {
  private logger = Logger.getInstance();
  private config = Config.getInstance();
  private mcpManager: MCPManager;
  private semanticSearch: SemanticSearch;

  constructor(mcpManager: MCPManager) {
    this.mcpManager = mcpManager;
    this.semanticSearch = new SemanticSearch(this.mcpManager);
  }

  public async performSemanticSearch(query: string, searchAll: boolean = false): Promise<void> {
    const searchScope = searchAll ? 'all projects' : `project: ${this.config.app.project.name}`;
    this.logger.info(`Semantic search: "${query}" (${searchScope})`, 'Search');
    
    try {
      const results = await this.semanticSearch.search(query, {
        searchAll,
        limit: 10,
        includeMetadata: true,
        threshold: 0.6
      });

      if (results.length === 0) {
        this.logger.warn('No results found matching your query');
        return;
      }

      this.logger.separator();
      this.logger.success(`Found ${results.length} results:`);
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (!result) continue;
        
        const score = (result.score * 100).toFixed(1);
        const fileName = result.file_path?.split('/').pop() || result.file_path || 'unknown';
        
        this.logger.item(`${i + 1}. [${score}%] ${fileName} (${result.chunk_type || 'unknown'})`, 'primary');
        
        // Show a preview of the content
        const content = result.content || '';
        const preview = content.substring(0, 150);
        const truncated = content.length > 150 ? '...' : '';
        this.logger.item(`    ${preview}${truncated}`, 'secondary');
        
        if (result.metadata?.language) {
          this.logger.item(`    Language: ${result.metadata.language}`, 'secondary');
        }
        this.logger.separator();
      }
    } catch (error) {
      this.logger.error('Semantic search failed', error as Error, 'Search');
    }
  }

  public async performKnowledgeSearch(query: string): Promise<void> {
    this.logger.info(`Hybrid knowledge search: "${query}"`, 'Search');
    
    try {
      const results = await this.semanticSearch.hybridSearch(query, {
        limit: 10,
        includeMetadata: true,
        threshold: 0.5
      });

      if (results.length === 0) {
        this.logger.warn('No results found matching your query');
        return;
      }

      this.logger.separator();
      this.logger.success(`Found ${results.length} hybrid results:`);
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (!result) continue;
        
        const score = (result.score * 100).toFixed(1);
        const fileName = result.file_path?.split('/').pop() || result.file_path || 'unknown';
        const source = result.metadata?.source || 'semantic';
        const isHybrid = result.metadata?.hybrid_match ? ' [HYBRID]' : '';
        
        this.logger.item(`${i + 1}. [${score}%] ${fileName} (${source}${isHybrid})`, 'primary');
        
        const content = result.content || '';
        const preview = content.substring(0, 150);
        const truncated = content.length > 150 ? '...' : '';
        this.logger.item(`    ${preview}${truncated}`, 'secondary');
        this.logger.separator();
      }
    } catch (error) {
      this.logger.error('Knowledge search failed', error as Error, 'Search');
    }
  }

  public async listProjectCollections(): Promise<void> {
    this.logger.info('Available project collections:', 'Search');
    
    try {
      const collections = await this.semanticSearch.listCollections();
      
      if (collections.length === 0) {
        this.logger.warn('No collections found');
        return;
      }

      this.logger.separator();
      for (const collection of collections) {
        this.logger.item(`  • ${collection}`, 'primary');
      }
      
      this.logger.separator();
      this.logger.info(`Current project collection: ${this.config.getCollectionName()}`, 'Search');
    } catch (error) {
      this.logger.error('Failed to list collections', error as Error, 'Search');
    }
  }
}
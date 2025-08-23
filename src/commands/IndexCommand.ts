import { Logger } from '../core/Logger.js';
import { Config } from '../core/Config.js';
import { KnowledgeIndexer } from '../knowledge/KnowledgeIndexer.js';
import type { MCPManager } from '../mcp/MCPManager.js';

export class IndexCommand {
  private logger = Logger.getInstance();
  private config = Config.getInstance();
  private mcpManager: MCPManager;
  private knowledgeIndexer: KnowledgeIndexer;

  constructor(mcpManager: MCPManager) {
    this.mcpManager = mcpManager;
    this.knowledgeIndexer = new KnowledgeIndexer(this.mcpManager);
  }

  public async indexProjectKnowledge(indexPath: string): Promise<void> {
    this.logger.info(`Indexing project knowledge from: ${indexPath}`, 'Index');
    this.logger.info(`Project: ${this.config.app.project.name}`, 'Index');
    this.logger.info(`Collection: ${this.config.getCollectionName()}`, 'Index');
    
    try {
      const result = await this.knowledgeIndexer.indexPath(indexPath);
      
      if (result.errors.length > 0) {
        this.logger.separator();
        this.logger.warn('Indexing completed with some errors:');
        for (const error of result.errors.slice(0, 5)) {  // Show first 5 errors
          this.logger.item(`  • ${error.message}`, 'secondary');
        }
        if (result.errors.length > 5) {
          this.logger.item(`  • ... and ${result.errors.length - 5} more errors`, 'secondary');
        }
      }

      this.logger.separator();
      this.logger.success('Knowledge indexing completed successfully!');
      this.logger.item(`Total files processed: ${result.totalFiles}`, 'primary');
      this.logger.item(`Successfully indexed: ${result.indexedFiles}`, 'primary');
      if (result.failedFiles > 0) {
        this.logger.item(`Failed to index: ${result.failedFiles}`, 'secondary');
      }
    } catch (error) {
      this.logger.error('Knowledge indexing failed', error as Error, 'Index');
      throw error;
    }
  }
}
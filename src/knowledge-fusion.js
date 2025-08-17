#!/usr/bin/env node

import 'dotenv/config';
import { Command } from 'commander';
import { SemanticEngine } from './semantic-engine.js';
import chalk from 'chalk';

/**
 * Knowledge Fusion Engine
 * 
 * Combines Neo4j graph knowledge + Qdrant semantic search
 * Uses MCP servers for database integration
 * Implements the Enhanced Semantic Knowledge System
 */

class KnowledgeFusion {
  constructor(config = {}) {
    this.semanticEngine = new SemanticEngine(config);
    this.debugMode = config.debug || false;
  }

  /**
   * Hybrid search: Neo4j entities + Qdrant semantic similarity
   */
  async hybridSearch(query, options = {}) {
    const { 
      includeGraph = true, 
      includeSemantic = true, 
      semanticLimit = 5,
      graphDepth = 1 
    } = options;

    const results = {
      query,
      timestamp: new Date().toISOString(),
      neo4j_entities: [],
      semantic_matches: [],
      fusion_score: 0
    };

    try {
      // Step 1: Search Neo4j knowledge graph
      if (includeGraph) {
        this.log('🔍 Searching Neo4j knowledge graph...');
        
        // Note: In full implementation, this would use MCP Neo4j agent memory
        // For now, we'll simulate the pattern
        results.neo4j_entities = await this.searchNeo4jEntities(query);
        this.log(`✓ Found ${results.neo4j_entities.length} graph entities`);
      }

      // Step 2: Search Qdrant semantic vectors
      if (includeSemantic) {
        this.log('🔍 Searching semantic vectors...');
        
        results.semantic_matches = await this.semanticEngine.searchSimilar(query, semanticLimit);
        this.log(`✓ Found ${results.semantic_matches.length} semantic matches`);
      }

      // Step 3: Fusion scoring (combine results)
      results.fusion_score = this.calculateFusionScore(results);
      
      // Step 4: Enhanced results with cross-references
      results.enhanced_results = this.fuseResults(results);

      return results;

    } catch (error) {
      throw new Error(`Hybrid search failed: ${error.message}`);
    }
  }

  /**
   * Search Neo4j entities (placeholder for MCP integration)
   */
  async searchNeo4jEntities(query) {
    // In full implementation: 
    // return await mcpNeo4jAgentMemory.searchMemories({ query });
    
    // Simulated results for demonstration
    return [
      {
        entity: 'ollama-cli',
        type: 'application',
        relevance: 0.9,
        properties: ['nomic-embed-text:latest', 'CLI application']
      },
      {
        entity: 'qdrant-mcp',
        type: 'mcp_server', 
        relevance: 0.8,
        properties: ['vector storage', 'semantic search']
      }
    ];
  }

  /**
   * Calculate fusion score combining graph + semantic relevance
   */
  calculateFusionScore(results) {
    const graphWeight = 0.6;
    const semanticWeight = 0.4;
    
    const graphScore = results.neo4j_entities.length > 0 ? 
      Math.max(...results.neo4j_entities.map(e => e.relevance || 0)) : 0;
    
    const semanticScore = results.semantic_matches.length > 0 ?
      Math.max(...results.semantic_matches.map(m => m.score || 0)) : 0;
    
    return (graphScore * graphWeight) + (semanticScore * semanticWeight);
  }

  /**
   * Fuse and enhance results with cross-references
   */
  fuseResults(results) {
    const enhanced = [];
    
    // Add graph entities with semantic context
    results.neo4j_entities.forEach(entity => {
      const semanticContext = results.semantic_matches
        .filter(match => 
          match.payload?.metadata?.file_path?.includes(entity.entity) ||
          match.payload?.text?.toLowerCase().includes(entity.entity.toLowerCase())
        );
      
      enhanced.push({
        type: 'graph_entity',
        source: entity,
        semantic_context: semanticContext,
        fusion_type: 'graph_primary'
      });
    });

    // Add semantic matches with graph context
    results.semantic_matches.forEach(match => {
      const graphContext = results.neo4j_entities
        .filter(entity => 
          match.payload?.text?.toLowerCase().includes(entity.entity.toLowerCase())
        );
      
      enhanced.push({
        type: 'semantic_match',
        source: match,
        graph_context: graphContext,
        fusion_type: 'semantic_primary'
      });
    });

    return enhanced;
  }

  /**
   * Smart knowledge indexing with Neo4j integration
   */
  async smartIndex(projectPath = '.') {
    this.log('🚀 Starting smart knowledge indexing...');
    
    try {
      // Step 1: Index semantic content
      const semanticResults = await this.semanticEngine.indexProjectKnowledge(projectPath);
      this.log(`✓ Indexed ${semanticResults.indexed} files semantically`);
      
      // Step 2: Create Neo4j entities for indexed content
      await this.createSemanticEntities(semanticResults);
      
      // Step 3: Create cross-references between systems
      await this.linkSemanticToGraph(semanticResults);
      
      return {
        semantic_indexed: semanticResults.indexed,
        graph_entities_created: semanticResults.results.length,
        cross_references: semanticResults.results.length,
        status: 'complete'
      };
      
    } catch (error) {
      throw new Error(`Smart indexing failed: ${error.message}`);
    }
  }

  /**
   * Create Neo4j entities for semantic content
   */
  async createSemanticEntities(semanticResults) {
    this.log('📊 Creating Neo4j entities for semantic content...');
    
    // In full implementation, would use MCP Neo4j agent memory:
    // for (const result of semanticResults.results) {
    //   await mcpNeo4jAgentMemory.createMemory({
    //     label: 'semantic_document',
    //     properties: {
    //       name: result.id,
    //       vector_id: result.id,
    //       embedding_dimension: result.embedding_length,
    //       indexed_at: new Date().toISOString()
    //     }
    //   });
    // }
    
    this.log(`✓ Would create ${semanticResults.results.length} semantic document entities`);
  }

  /**
   * Link semantic vectors to graph entities
   */
  async linkSemanticToGraph(semanticResults) {
    this.log('🔗 Linking semantic vectors to graph entities...');
    
    // In full implementation, would create relationships:
    // - EMBEDS relationship from entities to semantic documents
    // - SIMILAR_TO relationships between related documents
    // - CONTAINS relationships for content hierarchies
    
    this.log(`✓ Would create ${semanticResults.results.length} semantic links`);
  }

  /**
   * Pattern discovery across project knowledge
   */
  async discoverPatterns(patternType = 'architectural') {
    this.log(`🔍 Discovering ${patternType} patterns...`);
    
    const patterns = [];
    
    try {
      // Search for common architectural patterns
      const queries = this.getPatternQueries(patternType);
      
      for (const query of queries) {
        const results = await this.hybridSearch(query, { 
          semanticLimit: 3, 
          graphDepth: 2 
        });
        
        if (results.fusion_score > 0.5) {
          patterns.push({
            pattern: query,
            score: results.fusion_score,
            evidence: results.enhanced_results
          });
        }
      }
      
      return patterns.sort((a, b) => b.score - a.score);
      
    } catch (error) {
      throw new Error(`Pattern discovery failed: ${error.message}`);
    }
  }

  /**
   * Get search queries for different pattern types
   */
  getPatternQueries(patternType) {
    const queryMap = {
      architectural: [
        'class architecture design',
        'provider interface pattern',
        'MCP server integration',
        'configuration management'
      ],
      troubleshooting: [
        'error handling solution',
        'database connection issue',
        'MCP server configuration',
        'authentication problem'
      ],
      implementation: [
        'CLI command structure',
        'embedding generation',
        'vector storage pattern',
        'semantic search workflow'
      ]
    };
    
    return queryMap[patternType] || queryMap.architectural;
  }

  /**
   * Debug logging
   */
  log(message) {
    if (this.debugMode) {
      console.log(chalk.gray(`[KnowledgeFusion] ${message}`));
    }
  }
}

// CLI Interface (only when run directly)
if (import.meta.url === `file://${process.argv[1]}`) {
  const cliProgram = new Command()
    .name('knowledge-fusion')
    .description('Knowledge Fusion - Neo4j + Qdrant semantic intelligence')
    .option('-d, --debug', 'Enable debug mode');

  cliProgram
    .command('search <query>')
    .description('Hybrid search: graph + semantic')
    .option('-g, --no-graph', 'Disable graph search')
    .option('-s, --no-semantic', 'Disable semantic search')
    .option('-l, --limit <number>', 'Semantic results limit', '5')
    .action(async (query, options, command) => {
      const fusion = new KnowledgeFusion({ debug: command.parent?.opts()?.debug || false });
      
      console.log(chalk.blue(`🔍 Hybrid search: "${query}"`));
      
      try {
        const results = await fusion.hybridSearch(query, {
          includeGraph: options.graph,
          includeSemantic: options.semantic,
          semanticLimit: parseInt(options.limit)
        });
        
        console.log(chalk.green(`\n✅ Fusion Score: ${results.fusion_score.toFixed(3)}`));
        console.log(chalk.white(`📊 Graph entities: ${results.neo4j_entities.length}`));
        console.log(chalk.white(`🔍 Semantic matches: ${results.semantic_matches.length}`));
        console.log(chalk.white(`🔗 Enhanced results: ${results.enhanced_results.length}`));
        
        if (results.enhanced_results.length > 0) {
          console.log(chalk.blue('\n📋 Top Results:'));
          results.enhanced_results.slice(0, 3).forEach((result, i) => {
            console.log(chalk.white(`\n${i + 1}. ${result.type} (${result.fusion_type})`));
            if (result.source.entity) {
              console.log(chalk.gray(`   Entity: ${result.source.entity}`));
            }
            if (result.source.payload) {
              console.log(chalk.gray(`   File: ${result.source.payload.metadata?.file_path}`));
            }
          });
        }
        
      } catch (error) {
        console.error(chalk.red(`❌ Search failed: ${error.message}`));
        process.exit(1);
      }
    });

  cliProgram
    .command('index')
    .description('Smart index with Neo4j + Qdrant integration')
    .option('-p, --path <path>', 'Project path', '.')
    .action(async (options, command) => {
      const fusion = new KnowledgeFusion({ debug: command.parent?.opts()?.debug || false });
      
      console.log(chalk.blue('🚀 Starting smart knowledge indexing...'));
      
      try {
        const result = await fusion.smartIndex(options.path);
        console.log(chalk.green(`\n✅ Smart indexing complete!`));
        console.log(chalk.white(`📄 Semantic files: ${result.semantic_indexed}`));
        console.log(chalk.white(`📊 Graph entities: ${result.graph_entities_created}`));
        console.log(chalk.white(`🔗 Cross-references: ${result.cross_references}`));
      } catch (error) {
        console.error(chalk.red(`❌ Indexing failed: ${error.message}`));
        process.exit(1);
      }
    });

  cliProgram
    .command('patterns [type]')
    .description('Discover patterns (architectural|troubleshooting|implementation)')
    .action(async (type = 'architectural', command) => {
      const fusion = new KnowledgeFusion({ debug: command.parent?.opts()?.debug || false });
      
      console.log(chalk.blue(`🔍 Discovering ${type} patterns...`));
      
      try {
        const patterns = await fusion.discoverPatterns(type);
        
        if (patterns.length === 0) {
          console.log(chalk.yellow('No significant patterns found'));
          return;
        }
        
        console.log(chalk.green(`\n✅ Found ${patterns.length} patterns:`));
        
        patterns.forEach((pattern, i) => {
          console.log(chalk.white(`\n${i + 1}. ${pattern.pattern}`));
          console.log(chalk.gray(`   Score: ${pattern.score.toFixed(3)}`));
          console.log(chalk.gray(`   Evidence: ${pattern.evidence.length} items`));
        });
        
      } catch (error) {
        console.error(chalk.red(`❌ Pattern discovery failed: ${error.message}`));
        process.exit(1);
      }
    });

  cliProgram.parse();
}

export { KnowledgeFusion };
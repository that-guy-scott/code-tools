#!/usr/bin/env node

/**
 * Migration Script: JSON Memory → Neo4j
 * 
 * Migrates existing memory.json knowledge graph to Neo4j database
 * Preserves all entities, relationships, and observations
 */

const fs = require('fs');
const path = require('path');
const neo4j = require('neo4j-driver');

// Configuration
const config = {
  neo4jUri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4jUser: process.env.NEO4J_USER || 'neo4j',
  neo4jPassword: process.env.NEO4J_PASSWORD || 'dev_password_123',
  memoryJsonPath: process.env.MEMORY_JSON_PATH || './memory.json',
  batchSize: 100
};

class MemoryMigrator {
  constructor() {
    this.driver = neo4j.driver(
      config.neo4jUri,
      neo4j.auth.basic(config.neo4jUser, config.neo4jPassword)
    );
    this.session = null;
    this.stats = {
      entitiesCreated: 0,
      relationshipsCreated: 0,
      errors: 0
    };
  }

  async connect() {
    try {
      this.session = this.driver.session();
      await this.session.run('RETURN 1'); // Test connection
      console.log('✅ Connected to Neo4j');
    } catch (error) {
      console.error('❌ Failed to connect to Neo4j:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.session) {
      await this.session.close();
    }
    await this.driver.close();
    console.log('📕 Disconnected from Neo4j');
  }

  async clearDatabase() {
    console.log('🧹 Clearing existing data...');
    try {
      await this.session.run('MATCH (n) DETACH DELETE n');
      console.log('✅ Database cleared');
    } catch (error) {
      console.error('❌ Failed to clear database:', error.message);
      throw error;
    }
  }

  async createIndexes() {
    console.log('📊 Creating indexes...');
    try {
      const indexes = [
        'CREATE INDEX entity_name_idx IF NOT EXISTS FOR (e:Entity) ON (e.name)',
        'CREATE INDEX entity_type_idx IF NOT EXISTS FOR (e:Entity) ON (e.entityType)',
        'CREATE CONSTRAINT entity_name_unique IF NOT EXISTS FOR (e:Entity) REQUIRE e.name IS UNIQUE'
      ];

      for (const indexQuery of indexes) {
        await this.session.run(indexQuery);
      }
      console.log('✅ Indexes created');
    } catch (error) {
      console.error('❌ Failed to create indexes:', error.message);
      throw error;
    }
  }

  loadMemoryData() {
    console.log(`📖 Loading memory data from ${config.memoryJsonPath}...`);
    
    if (!fs.existsSync(config.memoryJsonPath)) {
      throw new Error(`Memory file not found: ${config.memoryJsonPath}`);
    }

    const fileContent = fs.readFileSync(config.memoryJsonPath, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    const entities = [];
    const relations = [];

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.type === 'entity') {
          entities.push(data);
        } else if (data.type === 'relation') {
          relations.push(data);
        }
      } catch (error) {
        console.warn(`⚠️  Skipping invalid JSON line: ${line.substring(0, 50)}...`);
      }
    }

    console.log(`✅ Loaded ${entities.length} entities and ${relations.length} relationships`);
    return { entities, relations };
  }

  async migrateEntities(entities) {
    console.log('🔄 Migrating entities...');
    
    for (let i = 0; i < entities.length; i += config.batchSize) {
      const batch = entities.slice(i, i + config.batchSize);
      
      try {
        const query = `
          UNWIND $entities AS entity
          CREATE (e:Entity {
            name: entity.name,
            entityType: entity.entityType,
            observations: entity.observations,
            created_at: datetime(),
            migrated_from: 'json_memory'
          })
          RETURN count(e) as created
        `;
        
        const result = await this.session.run(query, { entities: batch });
        const created = result.records[0].get('created').toNumber();
        this.stats.entitiesCreated += created;
        
        console.log(`✅ Created ${created} entities (${this.stats.entitiesCreated}/${entities.length})`);
      } catch (error) {
        console.error(`❌ Error creating entity batch:`, error.message);
        this.stats.errors++;
      }
    }
  }

  async migrateRelationships(relations) {
    console.log('🔗 Migrating relationships...');
    
    for (let i = 0; i < relations.length; i += config.batchSize) {
      const batch = relations.slice(i, i + config.batchSize);
      
      try {
        const query = `
          UNWIND $relations AS rel
          MATCH (from:Entity {name: rel.from})
          MATCH (to:Entity {name: rel.to})
          CREATE (from)-[r:RELATES {
            type: rel.relationType,
            created_at: datetime(),
            migrated_from: 'json_memory'
          }]->(to)
          RETURN count(r) as created
        `;
        
        const result = await this.session.run(query, { relations: batch });
        const created = result.records[0].get('created').toNumber();
        this.stats.relationshipsCreated += created;
        
        console.log(`✅ Created ${created} relationships (${this.stats.relationshipsCreated}/${relations.length})`);
      } catch (error) {
        console.error(`❌ Error creating relationship batch:`, error.message);
        this.stats.errors++;
        
        // Log problematic relationships for debugging
        for (const rel of batch) {
          try {
            await this.session.run(
              'MATCH (from:Entity {name: $from}) MATCH (to:Entity {name: $to}) RETURN from, to',
              { from: rel.from, to: rel.to }
            );
          } catch (e) {
            console.warn(`⚠️  Missing entity for relationship: ${rel.from} -> ${rel.to}`);
          }
        }
      }
    }
  }

  async addMetadata() {
    console.log('📝 Adding migration metadata...');
    
    try {
      const query = `
        CREATE (m:Migration {
          type: 'json_to_neo4j',
          timestamp: datetime(),
          entities_migrated: $entitiesCreated,
          relationships_migrated: $relationshipsCreated,
          errors: $errors,
          source_file: $sourceFile
        })
        RETURN m
      `;
      
      await this.session.run(query, {
        entitiesCreated: this.stats.entitiesCreated,
        relationshipsCreated: this.stats.relationshipsCreated,
        errors: this.stats.errors,
        sourceFile: config.memoryJsonPath
      });
      
      console.log('✅ Migration metadata added');
    } catch (error) {
      console.error('❌ Failed to add metadata:', error.message);
    }
  }

  async validateMigration() {
    console.log('🔍 Validating migration...');
    
    try {
      const entityCountResult = await this.session.run('MATCH (e:Entity) RETURN count(e) as count');
      const relationshipCountResult = await this.session.run('MATCH ()-[r:RELATES]->() RETURN count(r) as count');
      
      const entityCount = entityCountResult.records[0].get('count').toNumber();
      const relationshipCount = relationshipCountResult.records[0].get('count').toNumber();
      
      console.log(`📊 Validation Results:`);
      console.log(`   Entities in Neo4j: ${entityCount}`);
      console.log(`   Relationships in Neo4j: ${relationshipCount}`);
      console.log(`   Expected entities: ${this.stats.entitiesCreated}`);
      console.log(`   Expected relationships: ${this.stats.relationshipsCreated}`);
      
      if (entityCount === this.stats.entitiesCreated && relationshipCount === this.stats.relationshipsCreated) {
        console.log('✅ Migration validation successful!');
      } else {
        console.warn('⚠️  Migration validation found discrepancies');
      }
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
    }
  }

  async printSampleQueries() {
    console.log('\n🚀 Sample Neo4j Queries:');
    console.log('\n// Find all entity types');
    console.log('MATCH (e:Entity) RETURN DISTINCT e.entityType, count(e) as count ORDER BY count DESC');
    
    console.log('\n// Find most connected entities');
    console.log('MATCH (e:Entity)-[r:RELATES]-() RETURN e.name, e.entityType, count(r) as connections ORDER BY connections DESC LIMIT 10');
    
    console.log('\n// Find shortest path between entities');
    console.log('MATCH path = shortestPath((a:Entity {name: "code-tools"})-[*]-(b:Entity {name: "PostgreSQL-service"})) RETURN path');
    
    console.log('\n// Find all MCP servers and their dependencies');
    console.log('MATCH (mcp:Entity {entityType: "mcp_server"})-[r:RELATES]->(dep) RETURN mcp.name, r.type, dep.name');
    
    console.log('\nNeo4j Browser: http://localhost:7474');
    console.log('Username: neo4j');
    console.log('Password: dev_password_123\n');
  }

  async migrate() {
    try {
      console.log('🚀 Starting JSON Memory → Neo4j Migration\n');
      
      await this.connect();
      await this.clearDatabase();
      await this.createIndexes();
      
      const { entities, relations } = this.loadMemoryData();
      
      await this.migrateEntities(entities);
      await this.migrateRelationships(relations);
      await this.addMetadata();
      await this.validateMigration();
      
      console.log('\n📊 Migration Summary:');
      console.log(`   ✅ Entities created: ${this.stats.entitiesCreated}`);
      console.log(`   ✅ Relationships created: ${this.stats.relationshipsCreated}`);
      console.log(`   ❌ Errors: ${this.stats.errors}`);
      
      await this.printSampleQueries();
      
      console.log('🎉 Migration completed successfully!');
      
    } catch (error) {
      console.error('💥 Migration failed:', error.message);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migrator = new MemoryMigrator();
  migrator.migrate().catch(console.error);
}

module.exports = MemoryMigrator;
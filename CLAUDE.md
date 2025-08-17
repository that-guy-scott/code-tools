# CLAUDE.md

## Core Rules

1. **Always utilize the JetBrains Marketplace Code Protocol (MCP)** whenever possible.
2. **Limit all new code contributions and code updates** to a maximum of 200 lines per change. This helps maintain code quality, reviewability, and project manageability.
3. **ALWAYS use and update the Neo4j Knowledge Graph** for persistent project knowledge.
4. **ALWAYS follow Strategic Git Workflow practices** for maintainable project history.

## Strategic Git Workflow

### Before Starting Work:
- Always check `git status` and `git log --oneline -5` to understand current state
- Create feature branches for non-trivial changes: `git checkout -b feature/description`
- Search Neo4j memory for related work to avoid conflicts

### During Development:
- Stage changes incrementally: `git add -p` for selective staging
- Make atomic commits - one logical change per commit
- Keep commits under 200 lines per rule #2 (supports reviewability)
- Use present tense commit messages: "Add feature" not "Added feature"

### Commit Message Standards:
- Format: `[Type] Brief description (max 50 chars)`
- Types: feat, fix, docs, refactor, test, chore, cleanup
- Always include Claude Code attribution footer
- Reference issue/task numbers when applicable

### Before Pushing:
- Review changes: `git diff --cached` before committing
- Check for sensitive data: never commit credentials, keys, or large files
- Validate .gitignore effectiveness: `git status` should show clean working tree
- Update Neo4j memory with significant changes before pushing

### Recovery and Safety:
- Document complex git operations in Neo4j for future reference
- Use `git reflog` for recovery - never panic with destructive resets
- Create backup branches before risky operations: `git branch backup-$(date +%Y%m%d)`
- Prefer `git revert` over `git reset` for shared history

### Example Workflow:
```bash
# Good workflow pattern
git status && git log --oneline -3
git add src/new-feature.js
git commit -m "feat: Add user authentication validation

- Implement password strength checking
- Add email format validation  
- Include error message localization

🤖 Generated with [Claude Code](https://claude.ai/code)
Co-Authored-By: Claude <noreply@anthropic.com>"

# Update Neo4j memory before pushing
# Then push with verification
git push origin feature/user-auth
```

## Project Structure

The repository follows a clean, organized structure:

```
code-tools/
├── CLAUDE.md                   # Claude Code configuration (must be in root)
├── package.json                # Node.js dependencies
├── bin/                        # Executable scripts and utilities
├── src/                        # Source code (ollama-cli.js, gemini-cli.js)
├── config/                     # All configuration files organized by service
│   ├── nginx/                  # Nginx proxy configurations
│   ├── postgres/               # PostgreSQL configuration files
│   ├── qdrant/                 # Qdrant vector database config
│   └── redis/                  # Redis cache configuration
├── docker/                     # Docker and orchestration files
│   ├── compose/                # Docker Compose files
│   ├── configs/                # Docker service configurations
│   └── scripts/                # Docker management scripts
├── mcp/                        # MCP server configurations and tools
│   ├── setup/                  # MCP setup automation scripts
│   ├── tools/                  # MCP utility and testing tools
│   └── configs/                # MCP server configurations
├── scripts/                    # Project automation and utility scripts
├── docs/                       # Project documentation (README, plans, guides)
├── backups/                    # Database backup storage
├── data/                       # Runtime data (excluded from git)
└── temp/                       # Temporary files and testing
```

**Key Organizational Principles:**
- **Clean root directory**: Only essential files (CLAUDE.md, package.json)
- **Service-specific configs**: All configurations organized by service type
- **Functional grouping**: Scripts, docs, and MCP tools in dedicated directories
- **Docker organization**: All containerization files under docker/
- **No duplicates**: Each file has a single, logical location

## Neo4j Knowledge Graph System - CRITICAL USAGE INSTRUCTIONS

### Rule: ALWAYS Use Neo4j Knowledge Graph for Project Context

**BEFORE starting any task:**
1. **Search existing knowledge** with Neo4j MCP to understand current project state
2. **Query related entities** to understand dependencies and relationships  
3. **Leverage past knowledge** instead of rediscovering information

**AFTER completing any task:**
1. **Document new knowledge** in Neo4j with appropriate entity types
2. **Update existing entities** with new observations when relevant
3. **Create relationships** between new and existing entities
4. **Store troubleshooting solutions** for future reference

**Available Neo4j MCP Servers:**
- `neo4j-agent-memory` - AI agent memory with semantic relationships (@knowall-ai/mcp-neo4j-agent-memory)
- `neo4j-server` - General Neo4j operations and queries (@alanse/mcp-neo4j-server)

### Memory Entity Types to Use

- **`project`** - Main project information (e.g., "code-tools")
- **`application`** - CLI applications and executables (e.g., "ollama-cli", "gemini-cli")
- **`mcp_server`** - MCP server configurations (e.g., "jetbrains-mcp", "neo4j-agent-memory")
- **`database_service`** - Running database instances (e.g., "postgresql-service", "neo4j-service")
- **`config_file`** - Configuration files and settings (e.g., ".mcp.json", "docker-compose.yml")
- **`operational_workflow`** - Step-by-step procedures (e.g., "complete-mcp-setup", "neo4j-backup")
- **`development_workflow`** - Development patterns and practices (e.g., "mcp-integration-pattern")
- **`technology_stack`** - Runtime environments and platforms (e.g., "nodejs-runtime", "docker-platform")
- **`directory`** - Folder structures and purposes
- **`script`** - Automation and utility scripts
- **`docker_file`** - Container and orchestration files
- **`database_file`** - Database schemas and configurations
- **`cache_service`** - Cache and session storage
- **`vector_database`** - Vector search services
- **`diagnostic_procedure`** - Troubleshooting steps
- **`setup_procedure`** - Installation and configuration steps
- **`network_configuration`** - Port mappings and network settings
- **`configuration_reference`** - Environment variables and settings
- **`dependency_map`** - Critical dependencies
- **`troubleshooting_knowledge`** - Common problems and solutions
- **`optimization_knowledge`** - Performance considerations
- **`security_knowledge`** - Security patterns and requirements

### Memory Relationship Types to Use

- **`CONTAINS`** - Containment (project contains applications, components)
- **`DEPENDS_ON`** - Dependencies (MCP server depends on database service)
- **`CONFIGURES`** - Configuration relationships (config file configures service)
- **`INTEGRATES_WITH`** - Integration relationships (project integrates with IDE)
- **`LEVERAGES`** - Utilization relationships (CLI leverages vector database)
- **`ENABLES`** - Enablement relationships (project enables automation workflow)
- **`BUILT_ON`** - Foundation relationships (project built on Node.js runtime)
- **`IMPLEMENTED_BY`** - Implementation relationships (pattern implemented by project)
- **`ORCHESTRATES`** - Orchestration relationships (compose file orchestrates services)
- **`MANAGES`** - Management relationships (backup workflow manages database)
- **`EXECUTES`** - Execution relationships (setup script executes configuration)
- **`validates`** - Validation relationships
- **`initializes`** - Setup relationships
- **`backs_up`** - Backup relationships
- **`requires`** - Requirement relationships
- **`uses`** - Usage relationships
- **`follows`** - Workflow relationships
- **`hardens`** - Security relationships
- **`authenticates`** - Authentication relationships

### Neo4j Knowledge Graph Usage Patterns

**When working on files:**
```javascript
// 1. Search for related entities using Neo4j agent memory
// Use natural language with the agent-memory MCP server
"Search for entities related to filename or component type"

// 2. After changes, store new knowledge in Neo4j
// Use neo4j-agent-memory for intelligent entity creation
"Create entity for new-component of type service with observations: functionality added, configuration updated"

// 3. Create relationships using graph concepts
"Connect new-component to existing-component with relationship depends_on"
```

**When troubleshooting:**
```javascript
// 1. Search Neo4j for known issues with graph context
"Search for entities related to error message or symptom"
"Find troubleshooting knowledge for similar issues"

// 2. Document solutions in Neo4j knowledge graph
"Create troubleshooting entity for issue-description with observations: problem, root cause, solution steps, prevention"

// 3. Link to related components for future reference
"Connect this issue to the affected components and services"
```

**When adding new features:**
```javascript
// 1. Use Neo4j to find related patterns
"Search for similar features or components in the knowledge graph"
"Show me entities connected to the area I'm working on"

// 2. Document new feature with graph relationships
"Create development workflow entity for new-feature with purpose, implementation, dependencies"

// 3. Use graph algorithms to understand impact
"Show me the shortest path between new-feature and existing systems"
"Find all components that might be affected by this change"
```

### Neo4j Knowledge Graph Maintenance

**Daily/Regular:**
- Use Neo4j Browser or MCP servers to review overall project state
- Search Neo4j knowledge graph before starting any development work
- Document all solutions and discoveries in the graph
- Update entity observations when configurations change

**Weekly/Major Updates:**
- Review and clean up outdated information using Cypher queries
- Use graph algorithms to identify consolidation opportunities
- Update relationship mappings for new dependencies
- Document architectural decisions with proper graph relationships

**Critical: Neo4j as Single Source of Truth**
- Neo4j graph database contains the **definitive project knowledge**
- **Always query Neo4j first** before making assumptions about project state
- **Always update Neo4j** with new discoveries and changes
- Use Neo4j graph relationships to **maintain consistency** across development sessions
- Leverage graph algorithms for **impact analysis** and **dependency mapping**

## Knowledge Graph Maintenance Workflows - MANDATORY PROCEDURES

### Rule: ALWAYS Verify and Update Knowledge Graph

**BEFORE starting ANY development task:**
1. **Query current project state**: `"Search for entities related to [component/feature I'm working on]"`
2. **Check dependencies**: `"Show me all components connected to [my target area]"`
3. **Review recent changes**: `"Find recent entities or relationships modified in the last week"`
4. **Validate assumptions**: Use graph queries to confirm current architecture understanding

**DURING development work:**
1. **Track new entities needed**: Document new components, configs, or workflows as you discover them
2. **Note relationship changes**: Identify when dependencies or integrations are modified
3. **Capture troubleshooting knowledge**: Record solutions and root causes as they're discovered
4. **Update observations**: Add new functionality or behavior changes to existing entities

**AFTER completing ANY task:**
1. **Document all changes**: Create/update entities for new components, configurations, or workflows
2. **Establish relationships**: Connect new entities to existing ones with appropriate relationship types
3. **Update existing entities**: Add observations about modified functionality or configuration
4. **Verify consistency**: Run validation queries to ensure graph integrity
5. **Impact assessment**: Query the graph to understand what else might be affected by changes

### Systematic Verification Procedures

**Daily Health Checks (5 minutes):**
```cypher
// 1. Verify core entities exist and are connected
MATCH (project:Entity {name: "code-tools"})
MATCH (project)-[r:CONTAINS]->(apps)
RETURN project.name, count(r) as connected_apps

// 2. Check for orphaned entities (potential data quality issues)
MATCH (e:Entity)
WHERE NOT (e)-[:RELATES]-() AND e.name <> "code-tools"
RETURN e.name as orphaned_entities

// 3. Validate MCP server dependencies
MATCH (mcp:Entity {entityType: "mcp_server"})-[r:DEPENDS_ON]->(service)
RETURN mcp.name, service.name, r.critical as is_critical

// 4. Check recent additions (entities created in last 24 hours)
MATCH (e:Entity)
WHERE e.created_at >= datetime() - duration('P1D')
RETURN e.name, e.entityType, e.created_at
ORDER BY e.created_at DESC
```

**Weekly Maintenance (15 minutes):**
```cypher
// 1. Entity type distribution analysis
MATCH (e:Entity)
RETURN e.entityType, count(e) as count
ORDER BY count DESC

// 2. Relationship type analysis
MATCH ()-[r:RELATES]->()
RETURN r.type, count(r) as count
ORDER BY count DESC

// 3. Find most connected components (architecture analysis)
MATCH (e:Entity)-[r:RELATES]-()
RETURN e.name, e.entityType, count(r) as connections
ORDER BY connections DESC LIMIT 10

// 4. Identify potential consolidation opportunities
MATCH (e:Entity)
WHERE e.entityType IN ["config_file", "operational_workflow"]
AND size(e.observations) = 0
RETURN e.name as needs_documentation

// 5. Check for inconsistent naming (quality assurance)
MATCH (e:Entity)
WHERE e.name =~ ".*[A-Z].*" OR e.name =~ ".*\\s.*"
RETURN e.name as non_kebab_case_names
```

**Monthly Comprehensive Audit (30 minutes):**
```cypher
// 1. Full dependency chain analysis
MATCH path = (start:Entity)-[:RELATES*1..5]->(end:Entity)
WHERE start.entityType = "application" AND end.entityType = "database_service"
RETURN start.name, end.name, length(path) as dependency_depth
ORDER BY dependency_depth DESC

// 2. Critical component identification
MATCH (e:Entity)-[r:RELATES {critical: true}]-()
RETURN e.name, e.entityType, count(r) as critical_dependencies
ORDER BY critical_dependencies DESC

// 3. Architecture evolution tracking
MATCH (e:Entity)
WHERE exists(e.migrated_from)
RETURN e.entityType, count(e) as migrated_count

// 4. Backup verification
MATCH (backup:Entity {entityType: "operational_workflow"})
WHERE backup.name CONTAINS "backup"
RETURN backup.name, backup.script_path, backup.features
```

### Change Management Workflows

**When Adding New Components:**
1. **Pre-Change Analysis**:
   ```
   "Search for similar components of type [component-type]"
   "Show me entities that might integrate with [new-component]"
   "Find the dependency pattern for [similar-existing-component]"
   ```

2. **Component Creation**:
   ```
   "Create entity for [component-name] of type [entity-type] with observations: [purpose, features, configuration]"
   ```

3. **Relationship Establishment**:
   ```
   "Connect [new-component] to [parent-project] with relationship CONTAINS"
   "Connect [new-component] to [dependency] with relationship DEPENDS_ON"
   "Connect [config-file] to [new-component] with relationship CONFIGURES"
   ```

**When Modifying Existing Systems:**
1. **Impact Assessment**:
   ```
   "Find all components connected to [target-component] within 2 hops"
   "Show me what depends on [target-component]"
   "Search for troubleshooting knowledge related to [target-component]"
   ```

2. **Change Documentation**:
   ```
   "Update entity observations for [target-component] with new functionality: [changes made]"
   "Create troubleshooting entity for [issue-resolved] with solution: [resolution steps]"
   ```

3. **Validation**:
   ```
   "Verify all dependencies of [target-component] are still valid"
   "Check if any MCP servers depend on [modified-component]"
   ```

**When Removing Components:**
1. **Dependency Check**:
   ```cypher
   MATCH (target:Entity {name: "[component-to-remove]"})<-[r:RELATES]-(dependent)
   RETURN dependent.name, r.type as relationship_type
   ```

2. **Safe Removal Process**:
   - Update dependent entities to remove references
   - Document removal reason in project entity observations
   - Archive relationships rather than deleting (for audit trail)

### Code-Tools Specific Guidelines

**Mandatory Entity Updates for Common Changes:**

**Adding new MCP server:**
1. Create `mcp_server` entity with package, capabilities, purpose
2. Connect to project with `INTEGRATES_WITH` relationship
3. Connect to database service (if applicable) with `DEPENDS_ON` relationship
4. Update `.mcp.json` config entity observations

**Modifying Docker services:**
1. Update `database_service` entity observations with changes
2. Update `docker-compose-databases` entity with new configuration
3. Check all `mcp_server` entities that depend on modified service
4. Update backup/restore workflow entities if data handling changes

**Adding new CLI features:**
1. Update application entity (ollama-cli or gemini-cli) observations
2. Document new dependencies or integrations
3. Create troubleshooting entities for new failure modes
4. Update setup workflow entities if installation changes

**Configuration changes:**
1. Update relevant `config_file` entity observations
2. Check all entities that are configured by the changed file
3. Update setup/deployment workflow entities
4. Validate MCP server configurations are still accurate

### Quality Assurance Checkpoints

**Before committing any changes:**
```cypher
// Ensure no orphaned entities were created
MATCH (e:Entity)
WHERE NOT (e)-[:RELATES]-() AND e.name <> "code-tools"
RETURN count(e) as orphaned_count

// Verify critical dependencies are maintained
MATCH (mcp:Entity {entityType: "mcp_server"})-[r:RELATES {critical: true}]->(service)
RETURN count(r) as critical_dependencies

// Check entity naming consistency
MATCH (e:Entity)
WHERE e.created_at >= datetime() - duration('P1D')
AND (e.name =~ ".*[A-Z].*" OR e.name =~ ".*\\s.*")
RETURN e.name as naming_issues
```

**Monthly Knowledge Graph Health Report:**
Run comprehensive audit queries and document:
- Total entities and relationships
- Most connected components
- Orphaned or underdocumented entities  
- Relationship type distribution
- Recent growth patterns
- Backup status and integrity

### Emergency Recovery Procedures

**If knowledge graph becomes inconsistent:**
1. **Immediate assessment**: Run health check queries to identify scope
2. **Backup verification**: Check latest backup integrity with `./scripts/neo4j-restore.sh --list`
3. **Partial restoration**: Use Cypher-only restore for schema issues
4. **Full restoration**: Use complete backup for data corruption
5. **Re-validation**: Run all verification queries after restoration
6. **Root cause analysis**: Document issue in troubleshooting entity

**If MCP servers lose connection to Neo4j:**
1. **Service verification**: Check Neo4j container health
2. **Configuration validation**: Verify `.mcp.json` settings
3. **Network connectivity**: Test bolt://localhost:7687 connection
4. **Credential verification**: Confirm username/password variables
5. **Server restart**: Restart MCP servers if configuration correct
6. **Knowledge update**: Document resolution in troubleshooting entity

## Neo4j MCP System - ENHANCED GRAPH CAPABILITIES

### Neo4j MCP Servers Available

**1. `neo4j-agent-memory`** - AI Agent Memory (@knowall-ai/mcp-neo4j-agent-memory)
- **Purpose**: Graph-based memory system for AI agents with semantic relationships
- **Functions**: Store people, places, organizations as nodes with semantic relationships
- **Features**: Word-tokenized search, date filtering, relationship traversal
- **Usage**: Primary AI agent memory and semantic knowledge storage

**2. `neo4j-server`** - General Neo4j Operations (@alanse/mcp-neo4j-server)  
- **Purpose**: Direct Neo4j database operations and Cypher query execution
- **Functions**: Execute Cypher queries, manage nodes and relationships
- **Features**: Full Neo4j database access with natural language interface
- **Usage**: Complex graph analysis, direct database operations, advanced queries

### Neo4j Usage Patterns

**When working with knowledge:**
```javascript
// 1. Search for related entities (enhanced with graph traversal)
// Use neo4j-agent-memory for semantic search
"Search for entities related to filename or component type"

// 2. Add new entities with semantic relationships  
// Use neo4j-agent-memory for intelligent entity creation
"Store new component information: name=new-service, type=microservice, purpose=handles authentication"
"Create relationship: new-service DEPENDS_ON postgres-database"

// 3. Complex graph analysis using neo4j-server
"Execute Cypher: MATCH path = shortestPath((a:Entity {name: 'docker-compose'})-[*]-(b:Entity {name: 'PostgreSQL'})) RETURN path"
"Find all MCP servers and their dependencies with graph traversal"
"Analyze system architecture: which components are most critical?"
```

**When analyzing architecture:**
```javascript
// Use neo4j-server for advanced graph algorithms
"Execute centrality analysis to find most important components"
"Find potential single points of failure using graph algorithms"
"Show dependency graph for startup workflow with path analysis"
"Use PageRank algorithm to identify critical system components"
```

**When troubleshooting:**
```javascript
// 1. Search for known issues with semantic context
// Use neo4j-agent-memory for intelligent search
"Search for troubleshooting knowledge related to error message"
"Find similar issues that occurred before with this component"

// 2. Analyze failure patterns with graph queries
// Use neo4j-server for complex analysis
"Find all components connected to the failing service within 2 hops"
"Show impact analysis: what could be affected by this failure"
"Execute graph query to find all services that depend on the failing component"
```

### Neo4j Database Access

**Direct Access:**
- **Neo4j Browser**: http://localhost:7474
- **Username**: neo4j
- **Password**: dev_password_123
- **Bolt Protocol**: bolt://localhost:7687

**Sample Cypher Queries:**
```cypher
// Find all entity types
MATCH (e:Entity) RETURN DISTINCT e.entityType, count(e) as count ORDER BY count DESC

// Find most connected entities  
MATCH (e:Entity)-[r:RELATES]-() RETURN e.name, e.entityType, count(r) as connections ORDER BY connections DESC LIMIT 10

// Find shortest path between entities
MATCH path = shortestPath((a:Entity {name: "code-tools"})-[*]-(b:Entity {name: "PostgreSQL-service"})) RETURN path

// Find all MCP servers and dependencies
MATCH (mcp:Entity {entityType: "mcp_server"})-[r:RELATES]->(dep) RETURN mcp.name, r.type, dep.name
```

### Migration from JSON Memory

**Migration Process:**
1. **Backup existing memory**: `./scripts/migrate-memory-to-neo4j.js` automatically backs up
2. **Run migration**: `./scripts/migrate-memory-to-neo4j.js` 
3. **Verify data**: Check Neo4j Browser for successful import
4. **Update workflows**: Start using neo4j-memory instead of old memory MCP

**Migration Features:**
- ✅ Preserves all entities and relationships
- ✅ Maintains observation data
- ✅ Adds migration metadata
- ✅ Creates database indexes for performance
- ✅ Validates successful transfer

### Neo4j Advantages Over JSON

**Enhanced Capabilities:**
- **Graph Algorithms**: Shortest path, centrality analysis, community detection
- **Complex Queries**: Multi-hop relationships, pattern matching
- **Performance**: Optimized graph traversal and indexing
- **ACID Transactions**: Data integrity guarantees
- **Visualization**: Built-in graph visualization tools
- **Scalability**: Handles millions of nodes and relationships

**Development Benefits:**
- **Dependency Analysis**: Find critical paths and bottlenecks
- **Impact Analysis**: Understand changes across the system
- **Architecture Insights**: Discover patterns and anti-patterns
- **Knowledge Discovery**: Uncover hidden relationships

### Neo4j Backup & Restore System

**Comprehensive Backup Strategy:**
```bash
# Create multi-format backup
./scripts/neo4j-backup.sh

# Creates:
# - Cypher dump (.cypher) - for schema recreation
# - JSON export (.json) - for compatibility
# - Database files (.tar.gz) - for complete restore
# - Metadata (.txt) - for verification
```

**Restore Options:**
```bash
# List available backups
./scripts/neo4j-restore.sh --list

# Full restore (database files + cypher)
./scripts/neo4j-restore.sh backup_name

# Cypher-only restore (faster, schema recreation)
./scripts/neo4j-restore.sh backup_name --cypher-only

# Database files only (complete binary restore)
./scripts/neo4j-restore.sh backup_name --database-only
```

**Backup Features:**
- ✅ **Automatic cleanup**: Keeps 10 most recent backups
- ✅ **Verification**: Validates entity/relationship counts
- ✅ **Multi-format**: Cypher, JSON, and binary formats
- ✅ **Metadata tracking**: Stores backup statistics and timestamps
- ✅ **Error handling**: Graceful fallbacks if APOC export fails

### Neo4j Performance Optimization

**Query Performance:**
- **Use indexes**: Entities have indexes on `name` and `entityType`
- **Limit result sets**: Use `LIMIT` for large graph traversals
- **Profile queries**: Use `PROFILE` in Neo4j Browser to optimize
- **Batch operations**: Process large datasets in batches of 100-1000

**Memory Management:**
- **Heap size**: 2GB max configured (`NEO4J_dbms_memory_heap_max__size: 2G`)
- **Page cache**: 512MB configured (`NEO4J_dbms_memory_pagecache_size: 512m`)
- **Monitor usage**: Check memory in Neo4j Browser → Database Information

**Efficient Query Patterns:**
```cypher
// ✅ Good: Use specific labels and indexed properties
MATCH (e:Entity {name: "specific-name"}) RETURN e

// ✅ Good: Limit traversal depth
MATCH (e:Entity)-[r:RELATES*1..3]->(connected) RETURN e, connected LIMIT 100

// ❌ Avoid: Unbounded traversals without limits
MATCH (e:Entity)-[r:RELATES*]->(connected) RETURN e, connected
```

### Neo4j Troubleshooting Guide

**Common Issues & Solutions:**

**1. Neo4j MCP Servers Fail to Connect**
```bash
# Check Neo4j container status
docker ps | grep neo4j

# Verify Neo4j is responding
curl http://localhost:7474

# Check Neo4j logs for errors
docker logs code-tools-neo4j

# Restart Neo4j if needed
docker-compose -f docker/compose/docker-compose.databases.yml restart neo4j
```

**2. Environment Variable Mismatch**
- `neo4j-server` expects `NEO4J_USER`
- `neo4j-agent-memory` expects `NEO4J_USERNAME`
- Verify `.mcp.json` has correct variable names

**3. Plugin Installation Issues**
```bash
# Check for correct plugin names in docker-compose.yml
# ✅ Correct: "graph-data-science"
# ❌ Wrong: "gds"

# Verify plugins loaded successfully
docker exec code-tools-neo4j cypher-shell -u neo4j -p dev_password_123 "CALL apoc.help('apoc')"
```

**4. Performance Issues**
```bash
# Check memory usage in Neo4j Browser
# Navigate to Database Information → Memory

# Profile slow queries
PROFILE MATCH (e:Entity) RETURN count(e)

# Check for missing indexes
SHOW INDEXES
```

### Practical Neo4j Workflows

**Daily Development Workflow:**
1. **Start session**: Query project status and recent changes
   ```
   "Show me recent entities added to the project"
   "What components were modified in the last week?"
   ```

2. **Before coding**: Check dependencies and related components
   ```
   "Find all components connected to the file I'm working on"
   "Show me the dependency graph for this service"
   ```

3. **During development**: Document decisions and discoveries
   ```
   "Create entity for bug-fix-auth-issue with observations: root cause was token expiry, solution was refresh logic"
   "Connect this fix to the authentication service and user management"
   ```

4. **After coding**: Update relationships and impact analysis
   ```
   "Update entity observations for component-name with new functionality"
   "Show impact analysis: what depends on the changes I made?"
   ```

**Weekly Architecture Review:**
```cypher
// Find most critical components (high connectivity)
MATCH (e:Entity)-[r:RELATES]-()
RETURN e.name, e.entityType, count(r) as connections
ORDER BY connections DESC LIMIT 10

// Identify potential bottlenecks
MATCH (e:Entity)
WHERE size((e)-[:RELATES]->()) > 5
RETURN e.name as potential_bottleneck, size((e)-[:RELATES]->()) as outgoing_deps

// Find orphaned components
MATCH (e:Entity)
WHERE NOT (e)-[:RELATES]-()
RETURN e.name as orphaned_component
```

**Problem Investigation Workflow:**
1. **Search for known issues**:
   ```
   "Search for troubleshooting knowledge related to database connection errors"
   ```

2. **Analyze component relationships**:
   ```
   "Show me all services connected to the postgres database"
   "Find the shortest path between the failing component and its dependencies"
   ```

3. **Document resolution**:
   ```
   "Create troubleshooting entity for postgres-connection-timeout with observations: caused by connection pool exhaustion, fixed by increasing pool size to 20"
   ```

### Neo4j Data Model & Schema

**Core Node Structure:**
```cypher
// All entities follow this pattern
(:Entity {
  name: "unique-identifier",           // Primary key, indexed
  entityType: "project|service|config", // Category, indexed  
  observations: ["fact1", "fact2"],    // Array of atomic facts
  created_at: datetime(),              // Timestamp
  migrated_from: "json_memory"         // Migration metadata
})
```

**Relationship Structure:**
```cypher
// All relationships follow this pattern
(:Entity)-[:RELATES {
  type: "depends_on|configures|uses",  // Relationship semantic type
  created_at: datetime(),              // Timestamp
  migrated_from: "json_memory"         // Migration metadata
}]->(:Entity)
```

**Schema Indexes (Auto-created):**
```cypher
// Performance indexes
CREATE INDEX entity_name_idx FOR (e:Entity) ON (e.name)
CREATE INDEX entity_type_idx FOR (e:Entity) ON (e.entityType)
CREATE CONSTRAINT entity_name_unique FOR (e:Entity) REQUIRE e.name IS UNIQUE
```

**Entity Types in Use:**
- `project` - Main project information (e.g., "code-tools")
- `application` - CLI applications (e.g., "ollama-cli", "gemini-cli")
- `mcp_server` - MCP server configurations (e.g., "jetbrains-mcp", "neo4j-agent-memory", "qdrant-mcp")
- `database_service` - Running services (e.g., "postgresql-service", "neo4j-service", "qdrant-service", "redis-service")
- `config_file` - Configuration files (e.g., "mcp-config", "docker-compose-databases")
- `operational_workflow` - Automation procedures (e.g., "complete-mcp-setup", "neo4j-backup", "json-to-neo4j-migration")
- `development_workflow` - Development patterns (e.g., "mcp-integration-pattern")
- `technology_stack` - Runtime environments (e.g., "nodejs-runtime")
- `troubleshooting_knowledge` - Problem solutions and fixes
- `directory` - Folder structures ("scripts", "data")
- `script` - Automation scripts ("neo4j-backup.sh")

**Relationship Types in Use:**
- `DEPENDS_ON` - Dependency relationships (MCP server → database service)
- `CONTAINS` - Containment (project → applications)
- `INTEGRATES_WITH` - Integration relationships (project → IDE MCP server)
- `LEVERAGES` - Utilization relationships (CLI → vector database)
- `ENABLES` - Enablement relationships (project → automation workflow)
- `BUILT_ON` - Foundation relationships (project → Node.js runtime)
- `IMPLEMENTED_BY` - Implementation relationships (pattern → project)
- `ORCHESTRATES` - Orchestration relationships (compose file → database services)
- `MANAGES` - Management relationships (backup workflow → database)
- `EXECUTES` - Execution relationships (setup workflow → configuration)
- `CONFIGURES` - Configuration relationships (config file → MCP server)
- `validates` - Validation relationships (script → configuration)

**Query Patterns for Schema Exploration:**
```cypher
// View current schema
CALL db.schema.visualization()

// Count entities by type
MATCH (e:Entity) 
RETURN e.entityType, count(e) as count 
ORDER BY count DESC

// Count relationships by type
MATCH ()-[r:RELATES]->() 
RETURN r.type, count(r) as count 
ORDER BY count DESC

// Find schema patterns
MATCH (a:Entity)-[r:RELATES]->(b:Entity)
RETURN a.entityType + " --[" + r.type + "]--> " + b.entityType as pattern, count(*) as frequency
ORDER BY frequency DESC
```

## Qdrant MCP Communication Notes

### Working Functions
- `mcp__qdrant__qdrant-store` - Successfully stores text documents in the vector database
- `mcp__qdrant__qdrant-find` - Successfully performs semantic search and retrieval

### Parameter Requirements
- **qdrant-store**: 
  - `information` (required): String text to store
  - `metadata` (optional): Had validation errors with JSON format - use without metadata for now
- **qdrant-find**:
  - `query` (required): Search query string

### Known Issues
- Metadata parameter validation fails with JSON object format
- Error: "Input validation error: '{"key": "value"}' is not valid under any of the given schemas"
- **Workaround**: Use `qdrant-store` without metadata parameter until schema is fixed

### Successful Usage Pattern
```
mcp__qdrant__qdrant-store:
  information: "Your text content here"
  # metadata: omit this parameter due to validation errors

mcp__qdrant__qdrant-find:
  query: "search terms"
```

### Collection Details
- Default collection name: `mcp-memory`
- Vector database stores documents with semantic embeddings
- Search returns ranked results by relevance

## MCP Server Communication Guide

### Available MCP Servers
Based on our setup, we have these MCP servers configured:

1. **jetbrains** - IntelliJ IDEA integration (WSL2)
2. **github** - GitHub repository management
3. **puppeteer** - Browser automation and web interaction
4. **docker-mcp** - Docker container management
5. **postgres** - PostgreSQL database operations
6. **redis** - Redis key-value store operations
7. **qdrant** - Vector database for semantic search
8. **neo4j-agent-memory** - AI agent memory with semantic relationships (Neo4j)
9. **neo4j-server** - Direct Neo4j operations and Cypher queries

### JetBrains MCP Server (`mcp__jetbrains__*`)

**Key Functions:**
- `get_open_in_editor_file_text` - Get current file content
- `get_open_in_editor_file_path` - Get current file path
- `get_selected_in_editor_text` - Get selected text
- `replace_selected_text` - Replace selected text
- `list_files_in_folder` - Browse project structure
- `get_file_text_by_path` - Read any project file
- `replace_file_text_by_path` - Modify any project file
- `search_in_files_content` - Search across project files
- `get_run_configurations` - List available run configs
- `run_configuration` - Execute run configurations
- `execute_terminal_command` - Run terminal commands in IDE

**Usage Tips:**
- Always use project-relative paths (e.g., "src/main.js" not absolute paths)
- Prefer `list_files_in_folder` and `get_file_text_by_path` for exploration
- Use `search_in_files_content` for finding code patterns

### GitHub MCP Server (`mcp__github__*`)

**Key Functions:**
- `get_file_contents` - Read files from repositories
- `create_or_update_file` - Modify repository files
- `create_pull_request` - Create PRs
- `list_issues` - Browse repository issues
- `search_repositories` - Find GitHub repositories
- `search_code` - Search code across GitHub

**Usage Requirements:**
- Requires `GITHUB_PERSONAL_ACCESS_TOKEN` environment variable
- Use owner/repo format for repository identification

### Docker MCP Server (`mcp__docker-mcp__*`)

**Key Functions:**
- `list_containers` - Show all containers
- `run_container` - Create and start containers
- `stop_container` - Stop running containers
- `fetch_container_logs` - Get container logs
- `list_images` - Show available images
- `build_image` - Build from Dockerfile

**Resources Available:**
- Container logs: `docker://containers/{id}/logs`
- Container stats: `docker://containers/{id}/stats`

### PostgreSQL MCP Server (`mcp__postgres__*`)

**Key Functions:**
- `query` - Execute read-only SQL queries

**Connection Details:**
- Database: `postgresql://codetools:dev_password_123@localhost:5432/codetools_dev`
- Only read operations supported for security

### Redis MCP Server (`mcp__redis__*`)

**Key Functions:**
- `set` - Store key-value pairs
- `get` - Retrieve values by key
- `delete` - Remove keys
- `list` - List keys matching pattern

**Connection:**
- Host: `localhost:6379`
- No authentication required

### Puppeteer MCP Server (`mcp__puppeteer__*`)

**Key Functions:**
- `puppeteer_navigate` - Navigate to URLs
- `puppeteer_screenshot` - Take page screenshots
- `puppeteer_click` - Click elements
- `puppeteer_fill` - Fill form inputs
- `puppeteer_evaluate` - Execute JavaScript in browser

**Resources:**
- Console logs: `console://logs`

### Neo4j MCP Servers (`neo4j-*`)

**neo4j-agent-memory (@knowall-ai/mcp-neo4j-agent-memory):**
- AI agent memory with semantic relationships
- Word-tokenized search for partial matches
- Date filtering and temporal context
- Relationship traversal (KNOWS, WORKS_AT, CREATED)
- Optimized for people, places, organizations

**neo4j-server (@alanse/mcp-neo4j-server):**
- Direct Neo4j database operations
- Natural language to Cypher query conversion
- Full graph database access
- Advanced graph algorithms and analysis
- Complex relationship queries

**Configuration:**
- Neo4j Database: `bolt://localhost:7687`
- Web Interface: `http://localhost:7474`
- Username: `neo4j`, Password: `dev_password_123`
- Persistent enterprise-grade graph storage
- APOC and Graph Data Science plugins enabled

**Important Environment Variables:**
- `neo4j-server` uses `NEO4J_USER` for username
- `neo4j-agent-memory` uses `NEO4J_USERNAME` for username
- Both use `NEO4J_URI` and `NEO4J_PASSWORD`
- Ensure correct variable names in `.mcp.json` configuration

## MCP Best Practices

### General Guidelines
1. **Always check server status** before using MCP functions
2. **Use project-relative paths** for JetBrains MCP operations
3. **Batch operations** when possible to reduce overhead
4. **Handle errors gracefully** - MCP servers can be unreliable

### Neo4j-Specific Best Practices

**Knowledge Graph Hygiene:**
- **Always search before creating** - avoid duplicate entities
- **Use consistent naming** - follow kebab-case for entity names
- **Atomic observations** - store single facts, not complex statements
- **Meaningful relationships** - use semantic relationship types
- **Regular cleanup** - remove outdated or invalid information

**Performance Guidelines:**
- **Limit graph traversals** - use specific depth limits (1-3 hops)
- **Batch operations** - process multiple entities/relationships together
- **Use indexes** - leverage name and entityType indexes for queries
- **Profile queries** - use PROFILE to optimize complex operations

**Data Quality:**
- **Validate entity names** - ensure uniqueness and consistency
- **Update observations** - keep entity information current
- **Document relationships** - explain why entities are connected
- **Version control** - use backup system for important changes

### Error Handling
- **Connection errors**: Server may be down or misconfigured
- **Permission errors**: Check environment variables and credentials
- **Validation errors**: Verify parameter formats (especially JSON)
- **Neo4j connectivity**: Check container status and port accessibility

### Performance Tips
- **JetBrains**: Use `search_in_files_content` instead of reading multiple files
- **Docker**: Use `list_containers` to get IDs before other operations
- **Database**: Keep queries simple and read-only for postgres
- **Neo4j**: Use specific labels and indexed properties for fast lookups

### Security Considerations
- **Never expose credentials** in code or logs
- **Use read-only operations** when possible
- **Validate inputs** before passing to MCP servers
- **Monitor resource usage** through Docker stats
- **Backup regularly** - protect knowledge graph data with automated backups

### Neo4j Monitoring & Maintenance

**Daily Checks:**
```bash
# Verify Neo4j health
curl http://localhost:7474
docker logs --tail 10 code-tools-neo4j

# Check MCP server connectivity
claude mcp list | grep neo4j
```

**Weekly Maintenance:**
```cypher
// Check database statistics
MATCH (e:Entity) RETURN count(e) as total_entities
MATCH ()-[r:RELATES]->() RETURN count(r) as total_relationships

// Find potential data quality issues
MATCH (e:Entity) WHERE size(e.observations) = 0 RETURN e.name as empty_observations
MATCH (e:Entity) WHERE NOT (e)-[:RELATES]-() RETURN e.name as orphaned_entities
```

**Monthly Backups:**
```bash
# Create comprehensive backup
./scripts/neo4j-backup.sh

# Verify backup integrity
./scripts/neo4j-restore.sh --list
```

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
- Always exclude Claude Code attribution footer
- Reference issue/task numbers when applicable

### Before Pushing:
- Review changes: `git diff --cached` before committing
- Check for sensitive data: never commit credentials, keys, or large files
- Validate .gitignore effectiveness: `git status` should show clean working tree
- Update Neo4j memory with significant changes before pushing

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

### Memory Entity Types to Use

- **`project`** - Main project information (e.g., "code-tools")
- **`application`** - CLI applications and executables (e.g., "ollama-cli", "gemini-cli")
- **`mcp_server`** - MCP server configurations (e.g., "jetbrains-mcp", "neo4j-agent-memory")
- **`database_service`** - Running database instances (e.g., "postgresql-service", "neo4j-service")
- **`config_file`** - Configuration files and settings (e.g., ".mcp.json", "docker-compose.yml")
- **`operational_workflow`** - Step-by-step procedures (e.g., "complete-mcp-setup", "neo4j-backup")
- **`development_workflow`** - Development patterns and practices (e.g., "mcp-integration-pattern")
- **`technology_stack`** - Runtime environments and platforms (e.g., "nodejs-runtime", "docker-platform")
- **`troubleshooting_knowledge`** - Common problems and solutions
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

### Neo4j Knowledge Graph Usage Patterns

**When working on files:**
```javascript
// 1. Search for related entities using Neo4j agent memory
"Search for entities related to filename or component type"

// 2. After changes, store new knowledge in Neo4j
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

### Knowledge Graph Maintenance Workflows - MANDATORY PROCEDURES

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

## Enhanced Semantic Knowledge System - POWERFUL WORKFLOWS

### Hybrid Intelligence: Neo4j + Nomic Embeddings + Qdrant

**BEFORE starting any development task:**
1. **Hybrid search** for related work: `knowledge-fusion search "your task description"`
2. **Pattern discovery** for similar implementations: `knowledge-fusion patterns architectural`
3. **Cross-reference** findings with Neo4j entities for complete context

**DURING development work:**
1. **Index new knowledge** semantically: `semantic-engine index`
2. **Search similar patterns** to avoid reinventing solutions
3. **Document semantic relationships** between components

**AFTER completing any task:**
1. **Update semantic index** with new content and patterns
2. **Create fusion links** between Neo4j entities and semantic vectors
3. **Validate cross-references** between graph and semantic knowledge

### Semantic Knowledge Workflows

**Architectural Pattern Discovery:**
```bash
# Find similar design patterns across all project knowledge
knowledge-fusion patterns architectural

# Search for specific implementation patterns
knowledge-fusion search "provider interface pattern"
knowledge-fusion search "MCP server integration"
```

**Troubleshooting with Semantic Context:**
```bash
# Find related troubleshooting solutions
knowledge-fusion patterns troubleshooting

# Search for similar error patterns
knowledge-fusion search "database connection error"
knowledge-fusion search "MCP configuration issue"
```

**Cross-Project Learning:**
```bash
# Discover implementation patterns
knowledge-fusion patterns implementation

# Find reusable code patterns
semantic-engine search "CLI command structure"
semantic-engine search "configuration management"
```

### Smart Knowledge Indexing

**Initial Setup:**
```bash
# Index all project knowledge semantically
semantic-engine index

# Create smart cross-references
knowledge-fusion index
```

**Ongoing Maintenance:**
```bash
# Re-index after significant changes
semantic-engine index --path .

# Discover new patterns
knowledge-fusion patterns
```

### Nomic Embeddings Integration

**Available Tools:**
- **semantic-engine.js** - Core embedding generation and Qdrant storage
- **knowledge-fusion.js** - Hybrid Neo4j + semantic search
- **nomic-embed-text:latest** - Local embedding model via Ollama

**Key Capabilities:**
- **Local embeddings** - No external API calls, privacy-preserving
- **High-quality vectors** - Semantic similarity detection
- **Cross-system linking** - Graph entities ↔ semantic vectors
- **Pattern recognition** - Discover similar implementations across projects

### Semantic Search Best Practices

**Effective Query Patterns:**
- Use descriptive phrases: "authentication error handling" vs "auth error"
- Include context: "React component state management" vs "state"
- Combine technical + functional terms: "PostgreSQL connection pooling"

**Result Interpretation:**
- **Fusion Score > 0.7** - High confidence, strong pattern match
- **Graph + Semantic** - Most comprehensive, cross-validated results
- **Multiple evidence sources** - Higher reliability than single matches

**Performance Guidelines:**
- **Semantic search limit** - Use 3-5 results for focused discovery
- **Graph depth limit** - 1-2 hops for performance
- **Index frequency** - After major changes or weekly maintenance

## MCP Server Communication Guide

### Available MCP Servers

| Server | Purpose | Package | Key Functions |
|--------|---------|---------|---------------|
| **jetbrains** | IntelliJ IDEA integration | `@jetbrains/mcp-proxy` | File operations, terminal commands |
| **github** | Repository management | `@modelcontextprotocol/server-github` | File contents, PRs, issues |
| **puppeteer** | Browser automation | `@modelcontextprotocol/server-puppeteer` | Navigation, screenshots, form filling |
| **docker-mcp** | Container management | `mcp-server-docker` | Container lifecycle, logs, images |
| **postgres** | Database operations | `@modelcontextprotocol/server-postgres` | Read-only SQL queries |
| **redis** | Key-value operations | `@modelcontextprotocol/server-redis` | Get, set, delete, list operations |
| **qdrant** | Vector database | `mcp-server-qdrant` | Semantic search, document storage |
| **neo4j-agent-memory** | AI agent memory | `@knowall-ai/mcp-neo4j-agent-memory` | Graph-based semantic relationships |
| **neo4j-server** | Neo4j operations | `@alanse/mcp-neo4j-server` | Cypher queries, graph analysis |

### MCP Usage Patterns

**JetBrains MCP Server (`mcp__jetbrains__*`):**
- Always use project-relative paths (e.g., "src/main.js" not absolute paths)
- Prefer `list_files_in_folder` and `get_file_text_by_path` for exploration
- Use `search_in_files_content` for finding code patterns

**Neo4j MCP Servers:**
- Use `neo4j-agent-memory` for intelligent entity creation and semantic search
- Use `neo4j-server` for complex graph analysis and Cypher queries
- Always search before creating to avoid duplicate entities
- Use consistent naming (kebab-case for entity names)
- Store atomic observations, not complex statements

**Database MCP Servers:**
- PostgreSQL: Read-only operations for security
- Redis: Simple key-value operations for caching
- Qdrant: Semantic search and document embeddings

### MCP Best Practices

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

**Error Handling:**
- **Connection errors**: Server may be down or misconfigured
- **Permission errors**: Check environment variables and credentials
- **Validation errors**: Verify parameter formats (especially JSON)
- **Neo4j connectivity**: Check container status and port accessibility

## Neo4j Data Model & Schema

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

### Daily Development Workflow with Neo4j

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

## Project-Specific Guidelines

### Code Contribution Limits
- Maximum 200 lines per commit
- Use `git add -p` for selective staging
- Break large changes into logical commits
- Each commit should be reviewable and testable

### Entity Naming Conventions
- Use kebab-case: "new-service" not "newService" or "new_service"
- Be descriptive: "auth-token-validator" not "validator"
- Avoid acronyms unless widely understood
- Use consistent prefixes for related entities

### Development Workflow Integration
- Query Neo4j before starting any task
- Document all solutions and discoveries
- Update entity observations when configurations change
- Create relationships between new and existing entities
- Use graph algorithms for impact analysis

### Security Considerations
- Never expose credentials in code or logs
- Use read-only operations when possible
- Validate inputs before passing to MCP servers
- Monitor resource usage through Docker stats
- Backup regularly - protect knowledge graph data

## Quick Reference

### Common Commands
```bash
# Neo4j operations
"Search for entities related to [topic]"
"Create entity for [name] of type [type] with observations: [facts]"
"Connect [entity1] to [entity2] with relationship [type]"

# JetBrains operations
mcp__jetbrains__get_file_text_by_path: "src/filename.js"
mcp__jetbrains__search_in_files_content: "function searchTerm"

# Git workflow
git status && git log --oneline -3
git add -p
git commit -m "feat: Brief description"
```

### Troubleshooting Shortcuts
```bash
# Check MCP server status
claude mcp list

# Neo4j health check
curl http://localhost:7474

# Container status
docker ps | grep code-tools
```

### Key Configuration Paths
- `.mcp.json` - MCP server configuration
- `docker/compose/docker-compose.databases.yml` - Database services
- `config/` - Service-specific configurations
- `scripts/` - Automation and backup scripts

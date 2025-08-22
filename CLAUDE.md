# CLAUDE.md

## Core Rules

1. **Always utilize the JetBrains Marketplace Code Protocol (MCP)** whenever possible.
2. **Limit all new code contributions and code updates** to a maximum of 200 lines per change. This helps maintain code quality, reviewability, and project manageability.
3. **ALWAYS use and update the Neo4j Knowledge Graph** for persistent project knowledge.
4. **ALWAYS follow Strategic Git Workflow practices** for maintainable project history.
5. **NEVER Create placeholder or Fake code** you must write all methods/functions/classes to completion.

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

### Neo4j Query Optimization - MANDATORY LIMITS

**CRITICAL: All Neo4j searches MUST use these parameters to prevent token overflow:**

**Default Query Parameters (ALWAYS USE):**
- `limit: 5` - Maximum entities per query (prevents large responses)
- `depth: 1` - Single hop relationships only (reduces complexity)
- Use specific queries over broad searches

**Query Strategy Hierarchy:**
1. **Start specific**: Search for exact entity names first
2. **Use filters**: Add `label` or `since_date` to narrow results  
3. **Paginate large sets**: Use multiple small queries vs. one large query
4. **Check token usage**: If response > 10K tokens, reduce limit further

**Required Parameter Combinations:**
```javascript
// ALWAYS use these patterns
"Search for entities related to [specific-term]" + limit: 3 + depth: 1

// For broader searches, add filters
"Search for entities related to [broad-term]" + limit: 5 + label: "project" + depth: 1

// For recent changes only
"Search for entities related to [term]" + limit: 5 + since_date: "2024-08-01" + depth: 1
```

**Token-Safe Query Examples:**
- ✅ `search_memories(query: "authentication", limit: 3, depth: 1)`
- ✅ `search_memories(query: "MCP server", limit: 5, label: "mcp_server", depth: 1)`
- ❌ `search_memories(query: "Claude Code", limit: 10, depth: 2)` - Too broad!

**When You Hit Token Limits:**
1. Reduce `limit` to 3 or fewer
2. Add `label` filter to narrow scope
3. Use `since_date` for recent items only
4. Break into multiple specific queries
5. Use Neo4j Cypher queries for complex analysis instead

## Enhanced Semantic Knowledge System - STREAMLINED WORKFLOWS

### Hybrid Intelligence: Neo4j + Nomic Embeddings + Qdrant

**BEFORE starting any development task:**
1. **Hybrid search** for related work: `llm --knowledge-search "your task description"`
2. **Graph context** from Neo4j memories: Search related entities (limit: 3, depth: 1)
3. **Cross-reference** findings between graph knowledge and semantic matches

**DURING development work:**
1. **Search similar patterns** to avoid reinventing solutions: `llm --semantic-search "pattern description"`
2. **Document new entities** in Neo4j as you discover components
3. **Note semantic relationships** between similar content

**AFTER completing any task:**
1. **Index new knowledge**: `llm --index-knowledge` to update semantic vectors
2. **Update Neo4j entities** with new observations and relationships
3. **Validate cross-references** between graph and semantic knowledge

### Streamlined Semantic Commands

**Knowledge Indexing:**
```bash
# Index project files for semantic search
llm --index-knowledge

# Uses: Ollama nomic-embed-text + MCP Qdrant storage + Neo4j linking
```

**Semantic Search:**
```bash
# Search project knowledge semantically
llm --semantic-search "authentication patterns"
llm --semantic-search "MCP server configuration"

# Uses: MCP Qdrant server for vector similarity search
```

**Hybrid Knowledge Search:**
```bash
# Combine Neo4j graph + semantic search
llm --knowledge-search "database connection issues"
llm --knowledge-search "CLI command structure"

# Uses: Neo4j agent memory + Qdrant semantic + fusion scoring
```

### Integration with Three-Database Architecture

**Database Coordination:**
- **Neo4j** - Entity relationships and project context (via MCP agent memory)
- **Qdrant** - Semantic vectors and content similarity (via MCP Qdrant server) 
- **PostgreSQL** - Structured metadata and cross-system references (via MCP postgres)

**Workflow Integration:**
- Neo4j searches use mandatory limits (limit: 3-5, depth: 1) to prevent token overflow
- Semantic indexing creates corresponding Neo4j entities for cross-system linking
- Hybrid search combines graph traversal with vector similarity for comprehensive results

### Knowledge Graph Maintenance Workflows - MANDATORY PROCEDURES

**BEFORE starting ANY development task:**
1. **Query current project state**: `"Search for entities related to [component/feature I'm working on]"` (limit: 3, depth: 1)
2. **Check dependencies**: `"Show me all components connected to [my target area]"` (limit: 5, depth: 1)
3. **Review recent changes**: `"Find recent entities or relationships modified in the last week"` (limit: 5, since_date: recent)
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


## Essential MCP Servers

**Core Servers:**
- **neo4j-agent-memory** - AI agent memory and knowledge graph ⚠️ **REQUIRES ENV VARS**
- **jetbrains** - IntelliJ IDEA integration and file operations
- **postgres** - Database operations with transaction support  
- **docker-mcp** - Container management
- **github** - Repository management

**Usage Guidelines:**
- **Neo4j**: Always search before creating entities, use kebab-case naming
- **JetBrains**: Use project-relative paths, prefer `get_file_text_by_path`
- **PostgreSQL**: Use transactions for write operations
- **Query Limits**: Always use limit: 3-5, depth: 1 to prevent token overflow

**CRITICAL: Neo4j Agent Memory Configuration**
```json
"neo4j-agent-memory": {
  "command": "npx",
  "args": ["@knowall-ai/mcp-neo4j-agent-memory"],
  "env": {
    "NEO4J_URI": "bolt://localhost:7687",
    "NEO4J_USERNAME": "neo4j",
    "NEO4J_PASSWORD": "dev_password_123"
  }
}
```
**⚠️ MUST restart Claude Code after any `.mcp.json` changes!**

## Project Guidelines

### Code Limits
- Maximum 200 lines per commit
- Use `git add -p` for selective staging
- Each commit should be reviewable and testable

### Entity Naming
- Use kebab-case: "new-service" not "newService"
- Be descriptive: "auth-token-validator" not "validator"
- Use consistent prefixes for related entities

### Security
- Never expose credentials in code or logs
- Use transaction-safe operations for database changes
- Backup regularly - protect knowledge graph data

## Quick Reference

### Essential Commands
```bash
# Neo4j operations (with mandatory limits)
"Search for entities related to [topic]" (limit: 3, depth: 1)
"Create entity for [name] of type [type] with observations: [facts]"

# Git workflow
git status && git log --oneline -3
git add -p
git commit -m "feat: Brief description"

# Container status
docker ps | grep code-tools
```

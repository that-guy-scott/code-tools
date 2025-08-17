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
{PROJECT_NAME}/
├── CLAUDE.md                   # Claude Code configuration (must be in root)
├── README.md                   # Project documentation
├── package.json                # Dependencies (Node.js projects)
├── bin/                        # Executable scripts and utilities
├── src/                        # Source code files
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
- **Clean root directory**: Only essential files (CLAUDE.md, README.md, package.json)
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

- **`project`** - Main project information (e.g., "{PROJECT_NAME}")
- **`application`** - CLI applications and executables
- **`mcp_server`** - MCP server configurations
- **`database_service`** - Running database instances
- **`config_file`** - Configuration files and settings
- **`operational_workflow`** - Step-by-step procedures
- **`development_workflow`** - Development patterns and practices
- **`technology_stack`** - Runtime environments and platforms
- **`directory`** - Folder structures and purposes
- **`script`** - Automation and utility scripts
- **`troubleshooting_knowledge`** - Common problems and solutions

### Memory Relationship Types to Use

- **`CONTAINS`** - Containment (project contains applications, components)
- **`DEPENDS_ON`** - Dependencies (MCP server depends on database service)
- **`CONFIGURES`** - Configuration relationships
- **`INTEGRATES_WITH`** - Integration relationships
- **`LEVERAGES`** - Utilization relationships
- **`ENABLES`** - Enablement relationships
- **`BUILT_ON`** - Foundation relationships
- **`IMPLEMENTED_BY`** - Implementation relationships

### Neo4j Database Access

**Direct Access:**
- **Neo4j Browser**: http://localhost:7474
- **Username**: neo4j
- **Password**: {NEO4J_PASSWORD}
- **Bolt Protocol**: bolt://localhost:7687

## MCP Server Communication Guide

### Available MCP Servers
Based on the setup, these MCP servers are configured:

1. **jetbrains** - IntelliJ IDEA integration
2. **github** - GitHub repository management
3. **puppeteer** - Browser automation and web interaction
4. **docker-mcp** - Docker container management
5. **postgres** - PostgreSQL database operations
6. **redis** - Redis key-value store operations
7. **qdrant** - Vector database for semantic search
8. **neo4j-agent-memory** - AI agent memory with semantic relationships
9. **neo4j-server** - Direct Neo4j operations and Cypher queries

### Connection Details
- **Database Stack**: PostgreSQL, Redis, Qdrant, Neo4j
- **Database Network**: {PROJECT_NAME}-databases
- **Default Passwords**: {DATABASE_PASSWORD}
- **GitHub Token**: Environment variable `GITHUB_PERSONAL_ACCESS_TOKEN`

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

### Security Considerations
- **Never expose credentials** in code or logs
- **Use read-only operations** when possible
- **Validate inputs** before passing to MCP servers
- **Monitor resource usage** through Docker stats
- **Backup regularly** - protect knowledge graph data with automated backups
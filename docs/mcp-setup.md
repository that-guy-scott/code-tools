# MCP Server Setup Guide

## Overview

This guide covers proper configuration of MCP (Model Context Protocol) servers for Claude Code, with emphasis on package-specific requirements and common troubleshooting.

## Configuration Patterns

### Environment Variables vs Command Line Arguments

Different MCP packages handle configuration differently:

**✅ Environment Variables (Preferred)**
```json
{
  "command": "npx",
  "args": ["package-name"],
  "env": {
    "VAR_NAME": "value"
  }
}
```

**⚠️ Command Line Arguments (Package Dependent)**
```json
{
  "command": "npx", 
  "args": ["package-name", "arg1", "arg2"]
}
```

## Package-Specific Requirements

### Neo4j Agent Memory Server
**Package:** `@knowall-ai/mcp-neo4j-agent-memory`
**Requirement:** Environment variables only

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

### Neo4j Basic Server
**Package:** `@alanse/mcp-neo4j-server`
**Requirement:** Environment variables

```json
"neo4j-server": {
  "command": "npx",
  "args": ["@alanse/mcp-neo4j-server"],
  "env": {
    "NEO4J_URI": "bolt://localhost:7687",
    "NEO4J_USERNAME": "neo4j",
    "NEO4J_PASSWORD": "dev_password_123"
  }
}
```

### PostgreSQL Server
**Package:** `@modelcontextprotocol/server-postgres`
**Requirement:** Command line arguments

```json
"postgres": {
  "command": "npx",
  "args": [
    "@modelcontextprotocol/server-postgres",
    "postgresql://user:password@localhost:5432/database"
  ]
}
```

### JetBrains Server
**Package:** `@jetbrains/mcp-proxy`
**Requirement:** Command line arguments

```json
"jetbrains": {
  "command": "npx",
  "args": [
    "@jetbrains/mcp-proxy",
    "--port",
    "63341"
  ]
}
```

## Setup Process

### 1. Install MCP Packages
```bash
# Run the setup script
./mcp/setup-mcp.sh

# Or install manually
npm install -g @knowall-ai/mcp-neo4j-agent-memory
npm install -g @alanse/mcp-neo4j-server
npm install -g @modelcontextprotocol/server-postgres
npm install -g @jetbrains/mcp-proxy
```

### 2. Configure `.mcp.json`
Copy the template configuration:
```bash
cp mcp/servers.json ~/.mcp.json
# or copy to your Claude Code settings directory
```

### 3. Start Database Services
```bash
docker-compose up -d
```

### 4. Verify Configuration
Test each MCP server connection:
```bash
# Check if servers are responding
claude-code --list-tools | grep mcp__
```

## Configuration Validation

### Pre-flight Checklist
- [ ] All MCP packages installed globally
- [ ] Database services running (check with `docker ps`)
- [ ] `.mcp.json` uses correct configuration pattern for each package
- [ ] Environment variables set correctly
- [ ] No trailing commas in JSON configuration

### Common Configuration Errors

**❌ Wrong: CLI args for env-var package**
```json
"neo4j-agent-memory": {
  "command": "npx",
  "args": [
    "@knowall-ai/mcp-neo4j-agent-memory",
    "bolt://localhost:7687",
    "neo4j", 
    "password"
  ]
}
```

**✅ Correct: Environment variables**
```json
"neo4j-agent-memory": {
  "command": "npx",
  "args": ["@knowall-ai/mcp-neo4j-agent-memory"],
  "env": {
    "NEO4J_URI": "bolt://localhost:7687",
    "NEO4J_USERNAME": "neo4j",
    "NEO4J_PASSWORD": "password"
  }
}
```

## Restart Requirements

### ⚠️ CRITICAL: Claude Code Restart Required
**ALL `.mcp.json` configuration changes require Claude Code restart to take effect.**

### When Restart IS ALWAYS Required
- Environment variable changes in `.mcp.json`
- Adding new MCP servers to configuration  
- Changing MCP server command or args
- Any modification to MCP server configuration

### When Restart is NOT Required
- Database service restarts (Docker containers)
- Changes to database content
- Code file modifications

## Testing MCP Server Connectivity

### Neo4j Agent Memory
```javascript
// Test basic connectivity
mcp__neo4j-agent-memory__list_memory_labels()

// Test memory operations
mcp__neo4j-agent-memory__search_memories({
  query: "test",
  limit: 3,
  depth: 1
})
```

### PostgreSQL
```javascript
// Test database connection
mcp__postgres__query("SELECT version()")
```

### JetBrains
```javascript
// Test IDE integration
mcp__jetbrains__list_files_in_folder("/")
```

## Troubleshooting

### "Connection not configured" Errors
1. Verify database services are running: `docker ps`
2. Check environment variables in `.mcp.json`
3. Confirm package uses env vars vs CLI args
4. Test database connectivity independently

### "Package not found" Errors
1. Reinstall MCP packages: `./mcp/setup-mcp.sh`
2. Verify global npm installation: `npm list -g`
3. Check package names in configuration

### Performance Issues
1. Limit query results (use `limit: 3-5` for Neo4j)
2. Use specific queries over broad searches
3. Monitor token usage in responses

## Best Practices

### Configuration Management
- Use environment variables for sensitive data
- Keep database credentials in `.env` files
- Version control MCP configuration templates
- Document package-specific requirements

### Security
- Never commit credentials to version control
- Use development passwords for local setups
- Rotate passwords regularly
- Limit database access to necessary services

### Performance
- Set query limits for large datasets
- Use connection pooling where available
- Monitor MCP server resource usage
- Optimize database queries

## Next Steps

After successful MCP setup:
1. Configure project-specific databases
2. Set up GitHub tokens for repository integration
3. Configure JetBrains IDE integration
4. Test all MCP server functions
5. Review and update CLAUDE.md project instructions
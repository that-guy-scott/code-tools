# MCP Quick Reference

## 🚨 Critical Rules

1. **RESTART Claude Code** after ANY `.mcp.json` changes
2. **Use environment variables** for `@knowall-ai/mcp-neo4j-agent-memory`
3. **Check database services** are running before testing MCP servers

## ⚡ Quick Setup

```bash
# 1. Install MCP servers
./mcp/setup-mcp.sh

# 2. Start databases  
docker-compose up -d

# 3. Copy MCP configuration
cp mcp/servers.json ~/.mcp.json

# 4. ⚠️ RESTART Claude Code

# 5. Test connectivity
claude-code --list-tools | grep mcp__
```

## 📋 Configuration Checklists

### ✅ Neo4j Agent Memory Server
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

**Checklist:**
- [ ] Uses `env` block (not CLI args)
- [ ] Neo4j container running on port 7687
- [ ] Credentials match Docker Compose
- [ ] Claude Code restarted after config change

### ✅ PostgreSQL Server
```json
"postgres": {
  "command": "npx",
  "args": [
    "@modelcontextprotocol/server-postgres",
    "postgresql://dev_user:dev_password_123@localhost:5432/code_tools_dev"
  ]
}
```

**Checklist:**
- [ ] Uses command line args (not env block)
- [ ] PostgreSQL container running on port 5432
- [ ] Database name matches your project
- [ ] Connection string format correct

### ✅ JetBrains Integration
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

**Checklist:**
- [ ] IntelliJ IDEA running
- [ ] Port 63341 accessible
- [ ] MCP proxy installed globally

## 🔧 Troubleshooting Commands

### Check Database Services
```bash
# All services status
docker ps

# Specific service logs
docker-compose logs neo4j
docker-compose logs postgres
```

### Test MCP Connectivity
```javascript
// Neo4j Agent Memory
mcp__neo4j-agent-memory__list_memory_labels()

// PostgreSQL
mcp__postgres__query("SELECT version()")

// JetBrains
mcp__jetbrains__list_files_in_folder("/")
```

### Common Error Solutions

| Error | Solution |
|-------|----------|
| `Neo4j connection not configured` | Use env vars in `.mcp.json`, restart Claude Code |
| `Package not found` | Run `./mcp/setup-mcp.sh` |
| `Connection refused` | Check `docker-compose up -d` |
| `Port already in use` | Stop conflicting services |

## 🎯 Best Practices

### Query Limits (Neo4j)
```javascript
// ✅ Good - Limited results
mcp__neo4j-agent-memory__search_memories({
  query: "search-term",
  limit: 3,
  depth: 1
})

// ❌ Bad - No limits (token overflow)
mcp__neo4j-agent-memory__search_memories({
  query: "broad-search"
})
```

### Environment Variables
```bash
# Development credentials
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=dev_password_123

# PostgreSQL
POSTGRES_URL=postgresql://dev_user:dev_password_123@localhost:5432/code_tools_dev
```

### Security
- ✅ Use development passwords for local setup
- ✅ Keep credentials in `.env` files (not committed)
- ❌ Never commit real passwords to git
- ❌ Don't expose database ports in production

## 📖 Documentation Links

- **[MCP Setup Guide](mcp-setup.md)** - Comprehensive setup instructions
- **[Neo4j Troubleshooting](neo4j-troubleshooting.md)** - Specific Neo4j issues
- **[CLAUDE.md](../CLAUDE.md)** - Project development guidelines

## 🚀 Testing Workflow

1. **Start Services**
   ```bash
   docker-compose up -d
   ```

2. **Verify Database Connectivity**
   ```bash
   # Neo4j web interface
   curl http://localhost:7474
   
   # PostgreSQL connection
   psql postgresql://dev_user:dev_password_123@localhost:5432/code_tools_dev -c "SELECT version();"
   ```

3. **Test MCP Servers**
   ```javascript
   mcp__neo4j-agent-memory__list_memory_labels()
   mcp__postgres__query("SELECT current_database()")
   ```

4. **Create Test Data**
   ```javascript
   // Neo4j memory
   mcp__neo4j-agent-memory__create_memory({
     label: "test",
     properties: {name: "test-entity", created: "2025-08-18"}
   })
   
   // PostgreSQL query
   mcp__postgres__query("SELECT NOW()")
   ```

## ⚡ Quick Fixes

### Neo4j Agent Memory Not Working
```bash
# 1. Check configuration
grep -A 5 '"neo4j-agent-memory"' .mcp.json

# 2. Verify env vars (should see "env" block)
# 3. Restart Claude Code
# 4. Test connection
```

### Package Not Found
```bash
# Reinstall all MCP servers
./mcp/setup-mcp.sh

# Check global packages
npm list -g | grep mcp
```

### Database Connection Issues
```bash
# Check running containers
docker ps | grep -E "(neo4j|postgres)"

# Restart database stack
docker-compose down && docker-compose up -d

# Check logs
docker-compose logs --tail=50 neo4j
```
# Neo4j MCP Troubleshooting Guide

## Test Results Summary

**Date:** 2025-08-18  
**Status:** Partial Success - Basic Neo4j working, Agent Memory server issues

## Working Components

### ✅ Neo4j Database Connection
- **Container Status:** Running on ports 7474 (HTTP) and 7687 (Bolt)
- **Connection String:** `bolt://localhost:7687`
- **Credentials:** `neo4j/dev_password_123`
- **Test Query:** `MATCH (n) RETURN count(n)` - Returns 0 (empty database)

### ✅ Basic Neo4j MCP Server (`mcp__neo4j-server`)
**Configuration:**
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

**Available Functions:**
- `mcp__neo4j-server__execute_query` - Execute Cypher queries
- `mcp__neo4j-server__create_node` - Create nodes with labels and properties
- `mcp__neo4j-server__create_relationship` - Create relationships between nodes

**Test Results:**
```cypher
// Successfully created test nodes
CREATE (test:test_memory {name: "neo4j-mcp-test", type: "test", created_at: "2025-08-18"})
CREATE (project:project {name: "code-tools", type: "development-project", status: "active"})

// Successfully created relationship
CREATE (test)-[r:TESTS {purpose: "validating MCP functionality", test_date: "2025-08-18"}]->(project)

// Verification query returned expected results
MATCH (a)-[r]->(b) RETURN a.name, type(r), b.name, r.purpose
```

## Issues Found

### ❌ Neo4j Agent Memory Server (`mcp__neo4j-agent-memory`)
**Configuration:**
```json
"neo4j-agent-memory": {
  "command": "npx",
  "args": [
    "@knowall-ai/mcp-neo4j-agent-memory",
    "bolt://localhost:7687",
    "neo4j",
    "dev_password_123"
  ]
}
```

**Error Message:**
```
Neo4j connection not configured. Please set NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD environment variables.
```

**Failed Functions:**
- `mcp__neo4j-agent-memory__list_memory_labels`
- `mcp__neo4j-agent-memory__search_memories`
- `mcp__neo4j-agent-memory__create_memory`
- `mcp__neo4j-agent-memory__create_connection`
- All other agent memory functions

## Root Cause Analysis

### Agent Memory Server Configuration Issue
1. **Environment Variable Problem:** The `@knowall-ai/mcp-neo4j-agent-memory` package expects environment variables but receives arguments
2. **Configuration Mismatch:** The package may not be reading the command-line arguments correctly
3. **Package Version Issue:** Potential incompatibility with current MCP protocol version

### Possible Solutions

#### Solution 1: Environment Variable Configuration
Update `.mcp.json` to use environment variables instead of arguments:
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

#### Solution 2: Manual Environment Setup
Export environment variables before starting Claude Code:
```bash
export NEO4J_URI=bolt://localhost:7687
export NEO4J_USERNAME=neo4j
export NEO4J_PASSWORD=dev_password_123
```

#### Solution 3: Alternative Package
Consider using a different Neo4j agent memory package or implementing custom memory functions using the working `mcp__neo4j-server` tools.

## Workaround Strategy

### Use Basic Neo4j Server for Memory Operations
Since the basic Neo4j server is working, implement memory functions manually:

```cypher
-- Create memory entities
CREATE (memory:memory {
  name: "entity-name",
  label: "entity-type",
  properties: {...},
  created_at: datetime()
})

-- Create connections
MATCH (a:memory {name: "entity1"}), (b:memory {name: "entity2"})
CREATE (a)-[r:RELATIONSHIP_TYPE {properties: {...}}]->(b)

-- Search memories
MATCH (m:memory)
WHERE m.name CONTAINS "search-term"
RETURN m
LIMIT 5
```

## Environment Configuration

### Required Environment Variables
```bash
# Neo4j Connection
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=dev_password_123

# MCP Server Specific
MCP_NEO4J_URL=bolt://localhost:7687
MCP_NEO4J_USER=neo4j
MCP_NEO4J_PASSWORD=dev_password_123
```

### Docker Service Status
```bash
# Check Neo4j container
docker ps | grep neo4j
# Expected: code-tools-neo4j running on ports 7474:7474, 7687:7687

# Verify Neo4j web interface
curl http://localhost:7474
# Should return Neo4j browser page
```

## Next Steps

1. **Immediate:** Use `mcp__neo4j-server` tools for graph operations
2. **Short-term:** Try environment variable configuration for agent memory server
3. **Long-term:** Consider implementing custom memory functions or finding alternative packages

## Test Commands

### Verify Neo4j Connection
```javascript
// Test basic connection
mcp__neo4j-server__execute_query("MATCH (n) RETURN count(n) as total")

// Create test node
mcp__neo4j-server__create_node("test", {name: "test", created: "2025-08-18"})

// Test relationship
mcp__neo4j-server__create_relationship(nodeId1, nodeId2, "CONNECTS", {})
```

### Debug Agent Memory
```javascript
// These should work once configuration is fixed
mcp__neo4j-agent-memory__list_memory_labels()
mcp__neo4j-agent-memory__search_memories({limit: 3, depth: 1})
```

## Configuration Files Status

- ✅ `.env` - Contains correct Neo4j credentials
- ✅ `docker-compose.yml` - Neo4j service running correctly
- ⚠️ `.mcp.json` - Agent memory server config needs adjustment
- ✅ Database containers - All services running properly
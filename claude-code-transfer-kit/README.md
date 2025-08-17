# Claude Code Transfer Kit

🚀 **Portable Claude Code Setup for Any Project**

Transform any project into a Claude Code-enabled development environment with comprehensive MCP integration, database stack, and AI-powered workflows in just one command.

## 📋 Overview

The Claude Code Transfer Kit provides a complete, portable setup that reproduces our sophisticated MCP ecosystem across any codebase. Get instant access to:

- **9 Configured MCP Servers** - IDE integration, GitHub, databases, AI memory
- **Production Database Stack** - PostgreSQL, Redis, Qdrant, Neo4j with Docker
- **Neo4j Knowledge Graph** - Persistent AI memory and project context
- **Strategic Git Workflows** - Best practices for maintainable development
- **Automated Setup** - One-command installation and configuration

## 🎯 Quick Start

### Prerequisites
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Python** 3.8+ ([Download](https://python.org/))
- **Docker** (optional, for database stack) ([Download](https://docker.com/))
- **Git** ([Download](https://git-scm.com/))

### Installation

1. **Download the Transfer Kit**:
   ```bash
   git clone <repository-url>
   cd claude-code-transfer-kit
   ```

2. **Run Setup**:
   ```bash
   ./scripts/setup-mcp-ecosystem.sh
   ```

3. **Follow Interactive Prompts**:
   - Project name (kebab-case)
   - Project description
   - Database passwords
   - Port configurations
   - GitHub token (optional)

4. **Start Development**:
   ```bash
   # Start database stack (if using Docker)
   docker-compose -f docker-compose.databases.yml up -d
   
   # Open in your IDE with Claude Code extension
   # Begin AI-assisted development!
   ```

## 📁 What Gets Created

```
your-project/
├── CLAUDE.md                   # Claude Code configuration
├── README.md                   # Project documentation  
├── .mcp.json                   # MCP server configuration
├── .env                        # Environment variables
├── .gitignore                  # Git ignore rules
├── docker-compose.databases.yml # Database stack
├── config/                     # Database configurations
├── mcp/                        # MCP tools and environments
├── scripts/                    # Automation scripts
├── docs/                       # Documentation
├── data/                       # Runtime data (git-ignored)
└── backups/                    # Database backups
```

## 🔧 MCP Servers Configured

| Server | Purpose | Package |
|--------|---------|---------|
| **jetbrains** | IDE Integration | `@jetbrains/mcp-proxy` |
| **github** | Repository Management | `@modelcontextprotocol/server-github` |
| **puppeteer** | Browser Automation | `@modelcontextprotocol/server-puppeteer` |
| **docker-mcp** | Container Management | `mcp-server-docker` |
| **postgres** | Database Operations | `@modelcontextprotocol/server-postgres` |
| **redis** | Cache Management | `@modelcontextprotocol/server-redis` |
| **qdrant** | Vector Search | `mcp-server-qdrant` |
| **neo4j-agent-memory** | AI Memory System | `@knowall-ai/mcp-neo4j-agent-memory` |
| **neo4j-server** | Graph Operations | `@alanse/mcp-neo4j-server` |

## 🗄️ Database Stack

### Services Included
- **PostgreSQL 16** - Primary database with project-specific schema
- **Redis 7** - Caching and session storage  
- **Qdrant** - Vector database for embeddings and semantic search
- **Neo4j 5.15** - Knowledge graph with APOC and GDS plugins

### Default Ports
- PostgreSQL: `5432`
- Redis: `6379` 
- Qdrant: `6333` (HTTP), `6334` (gRPC)
- Neo4j: `7474` (HTTP), `7687` (Bolt)

### Access Credentials
All credentials are configured during setup and stored in `.env`:
- Database password: Auto-generated or user-specified
- Neo4j: `neo4j` / `<database_password>`
- PostgreSQL: `<project_name>` / `<database_password>`

## 📖 Usage Examples

### Basic Setup
```bash
# For a new web application
./setup-mcp-ecosystem.sh
# Project name: my-web-app
# Description: Modern web application with AI assistance
```

### Existing Project Integration
```bash
# Copy transfer kit to existing project
cp -r claude-code-transfer-kit/* /path/to/existing/project/
cd /path/to/existing/project
./scripts/setup-mcp-ecosystem.sh
```

### Custom Configuration
```bash
# Skip database setup for minimal installation
SKIP_DATABASES=true ./scripts/setup-mcp-ecosystem.sh

# Use custom ports to avoid conflicts
POSTGRES_PORT=5433 REDIS_PORT=6380 ./scripts/setup-mcp-ecosystem.sh
```

## 🧪 Testing & Validation

### Validate Setup
```bash
# Test all MCP connections and configurations
./scripts/test-mcp-connections.sh
```

### Manual Testing
```bash
# Test database connections
psql "postgresql://user:pass@localhost:5432/db_dev"
redis-cli -p 6379 ping
curl http://localhost:6333/health
curl http://localhost:7474

# Test MCP servers (in IDE with Claude Code)
# Ask Claude: "Can you list all available MCP servers?"
```

## 🎛️ Customization

### Adding MCP Servers
Edit `.mcp.json` to add new servers:
```json
{
  "mcpServers": {
    "new-server": {
      "command": "npx",
      "args": ["-y", "@scope/mcp-server-package"],
      "env": {
        "CONFIG_VAR": "${ENVIRONMENT_VARIABLE}"
      }
    }
  }
}
```

### Modifying Database Stack
Edit `docker-compose.databases.yml` to:
- Add new database services
- Change resource limits
- Configure additional volumes
- Modify network settings

### Project-Specific CLAUDE.md
Customize `CLAUDE.md` for your domain:
- Add project-specific entity types
- Define custom relationship patterns  
- Include domain knowledge sections
- Add project workflow guidelines

## 🚨 Troubleshooting

### Common Issues

**MCP Servers Not Connecting**
```bash
# Check Claude Code extension is installed
# Verify .mcp.json syntax
node -e "JSON.parse(require('fs').readFileSync('.mcp.json', 'utf8'))"

# Test environment variables
source .env && echo $DATABASE_PASSWORD
```

**Database Connection Failures**
```bash
# Check Docker is running
docker ps

# Verify database containers are healthy
docker-compose -f docker-compose.databases.yml ps

# Check port conflicts
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
```

**Neo4j Knowledge Graph Issues**
```bash
# Access Neo4j browser
open http://localhost:7474

# Check Neo4j logs
docker logs <project-name>-neo4j

# Test Cypher connectivity
echo "MATCH (n) RETURN count(n)" | cypher-shell -u neo4j -p <password>
```

### Getting Help

1. **Run diagnostics**: `./scripts/test-mcp-connections.sh`
2. **Check logs**: `docker-compose -f docker-compose.databases.yml logs`
3. **Validate config**: Review `.env` and `.mcp.json` files
4. **Test individually**: Test each MCP server separately

## 🔒 Security Notes

- **Environment Variables**: Never commit `.env` to version control
- **Database Passwords**: Use strong, unique passwords for each project
- **GitHub Tokens**: Use minimal required permissions
- **Network Access**: Database ports are exposed only on localhost by default

## 📋 Advanced Features

### Environment-Specific Configs
```bash
# Development environment
cp .env .env.development

# Production environment (different ports/passwords)
cp .env .env.production
```

### Backup & Migration
```bash
# Backup entire setup
tar -czf claude-code-backup.tar.gz CLAUDE.md .mcp.json .env config/ mcp/

# Migrate to new machine
tar -xzf claude-code-backup.tar.gz
docker-compose -f docker-compose.databases.yml up -d
```

### Team Standardization
```bash
# Create team template
git clone <your-claude-code-template>
cd new-project
./scripts/setup-mcp-ecosystem.sh

# Share common configurations
git add CLAUDE.md .mcp.json.template
git commit -m "feat: Add Claude Code team template"
```

## 🤝 Contributing

To improve the transfer kit:

1. **Test** on different environments (macOS, Linux, WSL2)
2. **Add** new MCP server templates
3. **Enhance** automation scripts
4. **Document** new use cases
5. **Submit** pull requests with improvements

## 📄 License

This transfer kit inherits the license of the parent project.

---

**🎉 Happy Coding with Claude!**

Transform your development workflow with AI-powered assistance, persistent memory, and comprehensive tooling in minutes, not hours.
# Code Tools

<div align="center">
  <img src="img/project-logo.png" alt="Code Tools" width="400"/>
</div>

<div align="center">

![Claude Code](https://img.shields.io/badge/Claude_Code-Ready-4A90E2?style=for-the-badge)
![MCP](https://img.shields.io/badge/MCP-Enabled-6B73FF?style=for-the-badge)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)

</div>

**Claude Code development environment with MCP servers and database stack.**

## 🚀 Quick Start

```bash
# Start database services
docker-compose up -d

# Set up MCP servers (one-time)
./mcp/setup-mcp.sh

# Test LLM CLI
./bin/llm-cli.js --project-info
```

## 🔧 What's Included

- **Database Stack** - PostgreSQL, Neo4j, Redis, Qdrant via Docker
- **MCP Servers** - 8 pre-configured Claude Code MCP servers
- **LLM CLI** - Universal CLI for multiple LLM providers
- **Project Instructions** - Complete CLAUDE.md with development guidelines

## 🗄️ Database Services

| Service | Port | Purpose | Credentials |
|---------|------|---------|-------------|
| **PostgreSQL** | 5432 | Structured data | `dev_user`/`dev_password_123` |
| **Neo4j** | 7474/7687 | Knowledge graph | `neo4j`/`dev_password_123` |
| **Redis** | 6379 | Caching & sessions | (no auth) |
| **Qdrant** | 6333 | Vector embeddings | (no auth) |

## 🔌 MCP Servers

- **neo4j-agent-memory** - AI agent memory and knowledge graph ⚠️ *Requires env vars*
- **postgres** - PostgreSQL database operations  
- **qdrant** - Vector search and embeddings
- **github** - Repository management
- **puppeteer** - Browser automation
- **docker-mcp** - Container management
- **jetbrains** - IntelliJ IDEA integration

> ⚠️ **Important:** The Neo4j agent memory server requires environment variables in `.mcp.json`, not CLI arguments. See [troubleshooting guide](docs/neo4j-troubleshooting.md) if experiencing connection issues.

## 📋 Requirements

- **Docker & Docker Compose** - For database stack
- **Node.js** - For MCP servers and CLI tool
- **Python 3** - For Qdrant MCP server
- **Claude Code** - AI coding assistant

## 🔧 Setup for New Projects

```bash
# Copy this environment to your project
./setup.sh /path/to/your/project
```

## 📄 License

MIT License
# Claude Local Infrastructure

This directory contains everything needed for Claude Code integration in this specific project.

## 🚀 Quick Start

```bash
# Start local Claude infrastructure
cd .claude && docker-compose up -d

# Use local Claude CLI
./.claude/bin/llm "Hello from this project!"

# Check MCP status
claude mcp list
```

## 📁 Directory Structure

```
.claude/
├── README-CLAUDE.md              # This file
├── .mcp.json                     # Project-specific MCP configuration
├── docker-compose.yml            # Local database stack
├── settings.json                 # Claude settings for this project
├── infrastructure/
│   ├── bin/
│   │   ├── llm                   # Local CLI launcher
│   │   └── llm-cli.js            # Universal LLM CLI v2
│   ├── scripts/
│   │   ├── start-databases.sh    # Database management
│   │   ├── stop-databases.sh     # Stop all services
│   │   ├── backup-project.sh     # Backup project memories
│   │   └── restore-project.sh    # Restore project memories
│   ├── configs/                  # Database configurations
│   └── docs/                     # Project-specific documentation
└── data/                         # Local database data (gitignored)
```

## 🐳 Database Services

Your project has its own isolated database stack:

- **PostgreSQL**: `localhost:5432` - Project-specific database
- **Neo4j**: `localhost:7474` (Web) / `localhost:7687` (Bolt) - Project memory graph
- **Redis**: `localhost:6379` - Project caching
- **Qdrant**: `localhost:6333` - Project vector database

## 🛠️ Management Commands

```bash
# Database management
./.claude/infrastructure/scripts/start-databases.sh
./.claude/infrastructure/scripts/stop-databases.sh

# Project CLI
./.claude/bin/llm --version
./.claude/bin/llm --list-providers
./.claude/bin/llm "Your prompt here"

# Memory management
./.claude/infrastructure/scripts/backup-project.sh
./.claude/infrastructure/scripts/restore-project.sh
```

## 🔧 Customization

Edit these files to customize for your project:
- `.claude/.mcp.json` - MCP server configuration
- `.claude/docker-compose.yml` - Database service configuration  
- `.claude/settings.json` - Claude-specific settings

## 🧠 Project Memory

This project has its own Neo4j knowledge graph at `http://localhost:7474`:
- **Username**: `neo4j`
- **Password**: `dev_password_123`
- **Database**: `neo4j`

All memories and knowledge are isolated to this project only.

## 🚨 Important Notes

- Each project has completely isolated data - no cross-project sharing
- Database ports are project-specific to avoid conflicts
- All data is stored in `.claude/data/` (should be gitignored)
- Team members get identical setups when they run the setup script
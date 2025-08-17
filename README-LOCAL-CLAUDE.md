# Claude Local Infrastructure Guide

Transform any project into a complete Claude Code development environment with isolated databases, MCP servers, and AI capabilities.

## 🎯 Overview

The **local Claude infrastructure** approach gives each project its own complete Claude Code setup:
- ✅ **Complete Isolation** - No cross-project memory sharing or conflicts
- ✅ **Team Collaboration** - Identical setup for all team members
- ✅ **Portable** - Everything needed is in the project directory
- ✅ **Zero Conflicts** - Multiple projects can run simultaneously
- ✅ **Full Features** - All Claude Code capabilities (MCP, databases, AI)

## 🚀 Quick Setup

### For New Projects
```bash
# 1. Clone or create your project
git clone https://github.com/user/my-project
cd my-project

# 2. Copy the Claude template (from code-tools project)
cp -r /path/to/code-tools/.claude-template ./.claude

# 3. Run one-command setup
./setup-claude-local.sh

# 4. Start using Claude!
./.claude/bin/llm "Hello from this project!"
```

### For Existing Projects
```bash
# 1. Copy setup script and template to your project
cp /path/to/code-tools/setup-claude-local.sh .
cp -r /path/to/code-tools/.claude-template .

# 2. Run setup
./setup-claude-local.sh

# 3. You're ready!
./.claude/bin/llm --project-info
```

## 📁 What Gets Created

```
your-project/
├── .claude/                          # 🆕 Complete Claude infrastructure
│   ├── README-CLAUDE.md              # Local setup guide
│   ├── .mcp.json                     # Project MCP configuration
│   ├── docker-compose.yml            # Isolated database stack
│   ├── settings.json                 # Project settings
│   ├── infrastructure/
│   │   ├── bin/
│   │   │   ├── llm                   # 🌟 Local CLI
│   │   │   └── llm-cli.js            # Universal LLM CLI v2
│   │   ├── scripts/
│   │   │   ├── start-databases.sh    # Service management
│   │   │   ├── stop-databases.sh     # Stop services
│   │   │   └── setup-python-mcp.sh   # Python MCP setup
│   │   └── venv-mcp/                 # Python MCP environment
│   └── data/                         # 🔒 Local database data (gitignored)
│       ├── postgres/
│       ├── neo4j/
│       ├── redis/
│       └── qdrant/
├── src/                              # Your actual project code
├── package.json
└── README.md
```

## 🐳 Isolated Database Stack

Each project gets its own complete database stack with zero conflicts:

| Service | Port | Purpose | Access |
|---------|------|---------|--------|
| **PostgreSQL** | 5432 | Project database | `localhost:5432` |
| **Neo4j** | 7474/7687 | Knowledge graph | `http://localhost:7474` |
| **Redis** | 6379 | Caching | `localhost:6379` |
| **Qdrant** | 6333 | Vector database | `http://localhost:6333` |

**Container Naming:** All containers are prefixed with your project name to avoid conflicts:
- `myproject-claude-postgres`
- `myproject-claude-neo4j`
- `myproject-claude-redis`
- `myproject-claude-qdrant`

## 🛠️ Local CLI Usage

Your project gets its own `llm` command with full MCP integration:

```bash
# Project information
./.claude/bin/llm --project-info      # Show local setup info
./.claude/bin/llm --list-providers    # Available providers
./.claude/bin/llm --list-models       # Available models
./.claude/bin/llm --list-tools        # MCP tools for this project

# AI interactions
./.claude/bin/llm "Explain this codebase"
./.claude/bin/llm --provider ollama "Write a function"
./.claude/bin/llm --provider gemini "Analyze requirements"

# Streaming and advanced options
./.claude/bin/llm --stream "Tell me a story"
./.claude/bin/llm --output json "Return data structure" | jq
```

## 🧠 Project-Isolated Memory

Each project has its own knowledge graph and memory:
- **Neo4j Database**: `http://localhost:7474` (neo4j/dev_password_123)
- **Project Memories**: Stored only in this project's graph
- **Zero Cross-Talk**: No access to other projects' knowledge
- **Team Sync**: Shared knowledge when team members work on same project

## 🔧 Management Commands

```bash
# Database lifecycle
./.claude/infrastructure/scripts/start-databases.sh   # Start all services
./.claude/infrastructure/scripts/stop-databases.sh    # Stop all services

# Service monitoring
docker ps | grep $(basename $(pwd))                   # Show project containers
docker-compose -f .claude/docker-compose.yml logs -f  # View service logs

# Python MCP setup (if needed)
./.claude/infrastructure/scripts/setup-python-mcp.sh  # Setup Qdrant MCP
```

## 👥 Team Collaboration

**Perfect Team Setup:**
1. **Repository Owner**: Sets up Claude infrastructure
2. **Team Members**: Clone and run setup script
3. **Identical Environment**: Everyone gets the same setup
4. **Shared Knowledge**: Project memories sync through git (if desired)

**Onboarding New Team Member:**
```bash
git clone https://github.com/team/project
cd project
./setup-claude-local.sh
# Done! Full Claude environment ready
```

## 🎯 Multiple Projects

Run multiple projects simultaneously without conflicts:

```bash
# Terminal 1: E-commerce Project
cd ~/projects/ecommerce-site
./.claude/bin/llm "Analyze payment processing"

# Terminal 2: Machine Learning Project  
cd ~/projects/ml-classifier
./.claude/bin/llm "Optimize model performance"

# Terminal 3: Client Website
cd ~/projects/client-website
./.claude/bin/llm "Review accessibility"
```

Each project maintains completely separate:
- Databases and data
- Memory and knowledge graphs
- MCP configurations
- AI interaction history

## 🔒 Security & Privacy

**Complete Isolation:**
- ✅ Client A's code never visible to Client B
- ✅ Proprietary algorithms stay project-specific
- ✅ Database credentials isolated per project
- ✅ No accidental cross-project information leaks

**Local Development:**
- ✅ All data stays on your machine
- ✅ No cloud dependencies for core functionality
- ✅ Offline-capable (except for external APIs)
- ✅ Full control over sensitive data

## ⚡ Performance Benefits

**Optimized for Project Context:**
- Smaller, focused knowledge graphs (faster queries)
- Project-relevant memory only (better suggestions)
- No irrelevant cross-project noise
- Faster startup (less data to load)

**Resource Efficiency:**
- Start only what you need
- Stop projects when not working on them
- Independent scaling per project
- Clean resource cleanup

## 🚨 Important Notes

**Git Integration:**
- Add `.claude/data/` to `.gitignore` (automatically done)
- The setup script handles this for you
- Database data stays local, infrastructure is versioned

**System Requirements:**
- Docker and Docker Compose
- Node.js (for CLI functionality)
- Python 3.8+ (for Python MCP servers)
- 4GB+ RAM recommended for full stack

**Port Conflicts:**
- Each project uses standard ports (5432, 7474, etc.)
- Run one project at a time, or customize ports
- Container naming prevents Docker conflicts

## 🎉 Benefits Summary

| Aspect | Local Approach | Global Approach |
|--------|----------------|-----------------|
| **Privacy** | 🟢 Perfect isolation | 🔴 Cross-project sharing |
| **Team Setup** | 🟢 One-command setup | 🟡 Complex configuration |
| **Conflicts** | 🟢 Zero conflicts | 🔴 Port/data conflicts |
| **Portability** | 🟢 Everything included | 🔴 Global dependencies |
| **Context** | 🟢 Project-focused | 🟡 Mixed context |
| **Performance** | 🟢 Optimized | 🟡 Slower with scale |

## 🎯 Next Steps

1. **Try it out**: Run `./setup-claude-local.sh` in any project
2. **Customize**: Modify `.claude/.mcp.json` for your needs
3. **Share**: Commit the setup to your project repository
4. **Collaborate**: Team members get identical environments

This approach transforms every project into a complete AI development environment while maintaining perfect isolation and team collaboration capabilities.
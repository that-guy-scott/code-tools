<div align="center">
  <img src="img/project-logo.png" alt="LLM CLI Tools" width="600"/>
</div>

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Ollama](https://img.shields.io/badge/Ollama-000000?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDNi40NzcgMiAyIDYuNDc3IDIgMTJTNi40NzcgMjIgMTIgMjJTMjIgMTcuNTIzIDIyIDEyUzE3LjUyMyAyIDEyIDJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K&logoColor=white)
![CLI](https://img.shields.io/badge/CLI-4D4D4D?style=for-the-badge&logo=gnubash&logoColor=white)

</div>

# Code Tools

A collection of command-line interfaces for interacting with different LLMs (Large Language Models) with comprehensive MCP (Model Context Protocol) integration for enhanced AI development assistance.

## 🚀 Quick Start

**New to this project?** Get the complete MCP ecosystem running in one command:

```bash
# Clone and setup everything
git clone <repository-url>
cd code-tools
./setup-all-mcp.sh

# Verify everything works
./verify-mcp-setup.sh
```

This sets up 8+ MCP servers providing IDE integration, database connectivity, file operations, memory persistence, and development tools.

## 📁 Project Structure

The codebase has been organized for better maintainability and clear separation of concerns:

```
code-tools/
├── src/                          # Core CLI applications
│   ├── ollama-cli.js            # Ollama LLM interface
│   └── gemini-cli.js            # Google Gemini interface
├── bin/                          # Main executable scripts
│   ├── setup-all-mcp.sh         # Complete MCP setup
│   ├── verify-mcp-setup.sh      # Test MCP functionality
│   └── migrate-to-neo4j.sh      # Neo4j migration
├── docker/                       # Docker environment
│   ├── compose/                 # Docker Compose files
│   ├── configs/                 # Docker service configs
│   └── scripts/                 # Docker management scripts
├── mcp/                          # MCP ecosystem
│   ├── setup/                   # MCP setup scripts
│   ├── configs/                 # MCP configurations
│   ├── tools/                   # MCP testing & troubleshooting
│   └── venv-mcp/               # Python MCP environment
├── config/                       # Service configurations
│   ├── postgres/                # PostgreSQL configs
│   ├── redis/                   # Redis configs
│   ├── qdrant/                  # Qdrant configs
│   └── nginx/                   # Nginx configs
├── docs/                         # Documentation
│   ├── README.md                # This file
│   ├── CLAUDE.md                # Claude usage instructions
│   └── img/                     # Project images
├── scripts/                      # Utility scripts
├── data/                         # Data directories
├── backups/                      # Backup directories
├── temp/                         # Legacy/temporary files
└── package.json                  # Node.js project config
```

### Quick Commands
```bash
# Setup and verification
npm run setup                    # ./bin/setup-all-mcp.sh
npm run verify                   # ./bin/verify-mcp-setup.sh

# Docker management
npm run docker:up               # Start services
npm run docker:down             # Stop services
npm run docker:logs             # View logs
npm run docker:status           # Check status

# CLI tools
npm start "prompt"              # Ollama CLI
npm run gemini "prompt"         # Gemini CLI
```

## Available Tools

### Ollama CLI (`ollama-cli.js`)
Command-line interface for interacting with locally hosted Ollama models.

**Supported Models:**
- `gpt-oss:latest` (default)
- `qwen3:30b`
- `qwen3-coder:latest`
- `gemma3:27b`
- `qwen2.5-coder:32b`
- `nomic-embed-text:latest`

**Usage:**
```bash
# New organized structure
npm start "Your prompt here"           # Uses src/ollama-cli.js
npm run gemini "Your prompt here"      # Uses src/gemini-cli.js

# Or directly:
node src/ollama-cli.js "Your prompt here"
node ollama-cli.js --model qwen3-coder:latest "Write a function"
node ollama-cli.js --stream "Tell me a story"
echo "Hello" | node ollama-cli.js --stdin
```

### Gemini CLI (`gemini-cli.js`)
Command-line interface for Google's Gemini models.

**Supported Models:**
- `gemini-2.0-flash` (default)
- `gemini-2.5-flash`
- `gemini-2.5-pro`

**Usage:**
```bash
node gemini-cli.js "Your prompt here"
node gemini-cli.js --model gemini-2.5-pro "Complex reasoning task"
node gemini-cli.js --stream "Write a story"
echo "Hello" | node gemini-cli.js --stdin
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **For Ollama CLI:**
   - Ensure Ollama is running locally
   - Default host: `http://172.31.240.1:11434`

3. **For Gemini CLI:**
   - Create a `.env` file with your Google AI API key:
     ```
     GOOGLE_AI_API_KEY=your_api_key_here
     ```
   - Get your API key from: https://aistudio.google.com/app/apikey

## Options

Both CLIs support similar options:

- `-m, --model <model>` - Select model to use
- `-s, --stream` - Enable streaming output
- `-t, --temperature <temp>` - Set temperature (0.0-1.0)
- `-p, --prompt <text>` - Prompt text (alternative to positional argument)
- `--stdin` - Read prompt from stdin
- `--max-tokens <num>` - Maximum tokens to generate
- `--top-p <num>` - Top-p sampling parameter
- `--top-k <num>` - Top-k sampling parameter

## Examples

```bash
# Compare responses from different models
node ollama-cli.js --model qwen3-coder:latest "Write a sorting algorithm"
node gemini-cli.js --model gemini-2.5-pro "Write a sorting algorithm"

# Use streaming for long responses
node ollama-cli.js --stream "Explain quantum computing in detail"

# Pipe content
cat document.txt | node gemini-cli.js --stdin "Summarize this"

# Use npm scripts
npm run gemini "What is the meaning of life?"
npm start "Hello from Ollama"
```

## MCP Integration Setup (WSL2 + IntelliJ)

This project supports Model Context Protocol (MCP) integration for enhanced AI development assistance through Claude Code.

### Prerequisites

- **Windows with IntelliJ IDEA** (host system)
- **WSL2 with Ubuntu** (development environment)
- **Node.js 18+** (required for MCP proxy)
- **Claude Code** installed in WSL2

### Step 1: Install IntelliJ MCP Server Plugin

1. Open IntelliJ IDEA on Windows
2. Go to `Settings → Plugins`
3. Search for "MCP Server"
4. Install the plugin: https://plugins.jetbrains.com/plugin/26071-mcp-server
5. Restart IntelliJ IDEA

### Step 2: Configure IntelliJ for External Connections

1. In IntelliJ, go to `Settings → Build, Execution, Deployment → Debugger`
2. ✅ **Check "Can accept external connections"**
3. **Note the port number** (usually 63341 or 63342)
4. Apply and restart IntelliJ

### Step 3: Configure Windows Firewall (if needed)

Run as Administrator in Windows Command Prompt:
```cmd
netsh advfirewall firewall add rule name="IntelliJ MCP" dir=in action=allow protocol=TCP localport=63341
```

### Step 4: Find Windows Host IP from WSL2

In WSL2 terminal:
```bash
# Get Windows host IP address
ip route show | grep default
# Look for the IP after "via" (e.g., 172.31.240.1)
```

### Step 5: Run Automated Setup (Recommended)

**Quick Setup:**
```bash
# Run the automated setup script
./setup-mcp.sh
```

**Manual Setup:**
If you prefer manual configuration:
```bash
# Add JetBrains MCP server with correct host and port
claude mcp add jetbrains --env HOST=172.31.240.1 --env IDE_PORT=63341 --env LOG_ENABLED=true -- npx -y @jetbrains/mcp-proxy
```

**Important**: Use `npx` directly, NOT `cmd /c npx` for WSL2 compatibility.

### Step 6: Verify Connection

```bash
# Check MCP server status
claude mcp list

# Should show:
# jetbrains: npx -y @jetbrains/mcp-proxy - ✓ Connected
```

### Step 7: Test Integration

```bash
# Test basic connectivity
curl -v --connect-timeout 5 http://172.31.240.1:63341

# Should connect successfully (404 response is normal)
```

### Troubleshooting

#### Connection Refused
- ✅ Verify IntelliJ is running and project is open
- ✅ Check "Can accept external connections" is enabled
- ✅ Confirm firewall allows port 63341
- ✅ Use correct Windows host IP address

#### MCP Server Failed
- ✅ Ensure Node.js 18+ is installed in WSL2
- ✅ Use `npx` directly, not `cmd /c npx`
- ✅ Check IntelliJ MCP Server plugin is enabled
- ✅ Restart IntelliJ after plugin installation

#### Wrong IP Address
```bash
# Find correct Windows host IP:
cat /etc/resolv.conf  # Check nameserver
ip route show | grep default  # Check gateway
```

### Project Configuration

The `.mcp.json` file contains project-specific MCP settings:
```json
{
  "mcpServers": {
    "jetbrains": {
      "command": "npx",
      "args": ["-y", "@jetbrains/mcp-proxy"],
      "env": {
        "HOST": "172.31.240.1",
        "IDE_PORT": "63341", 
        "LOG_ENABLED": "true"
      }
    }
  }
}
```

**Note**: The `HOST` IP address is automatically detected during setup. If you need to change it:
1. Run `ip route show | grep default` to find your Windows host IP
2. Update the `HOST` value in `.mcp.json`
3. Restart Claude Code or run `./setup-mcp.sh` again

### MCP Capabilities

Once connected, Claude Code gains transformative AI development assistance:

#### **🔍 Real-time Error Detection**
- **Instant syntax validation** with precise line/column numbers
- **Runtime error prediction** (ReferenceError, TypeError, SyntaxError)
- **Code quality analysis** (ESLint-style warnings, best practices)
- **Multi-file project validation** (imports, dependencies, configs)

#### **🧠 Deep Code Understanding**
- **Complete project architecture** awareness (CLI patterns, shared utilities)
- **Dependency relationship mapping** (how files interact and depend on each other)
- **Pattern recognition** across the entire codebase
- **Git history and change impact** analysis

#### **⚡ Development Workflow Integration**
- **File operations** (read, edit, create with intelligent suggestions)
- **Advanced search** (regex, patterns, cross-file relationships)
- **Command execution** (npm, git, build tools, testing)
- **Environment management** (configs, variables, dependencies)

#### **🚀 Proactive Development Partnership**
- **Architecture guidance** (suggest improvements, detect anti-patterns)
- **Performance optimization** (identify bottlenecks, suggest fixes)
- **Security analysis** (vulnerability detection, best practices)
- **Documentation automation** (generate docs, update examples)

### Verification Commands

```bash
# Test error detection
echo 'const broken = "unclosed string' > test.js
node -c test.js  # Shows syntax error immediately

# Test project analysis
claude /tools  # Lists all available capabilities

# Test MCP connection
claude mcp list  # Verify ✓ Connected status
```

#### **🎯 What This Means for Development**

**Before MCP**: Basic AI code assistance with limited context
**After MCP**: Intelligent development partner with complete project understanding

The integration transforms development from reactive assistance to proactive collaboration:
- **Instant feedback** as you code (syntax, logic, patterns)
- **Contextual suggestions** based on your entire project
- **Automated quality checks** (style, security, performance)
- **Intelligent refactoring** with full dependency awareness

#### **🚀 Real Examples of Enhanced Capabilities**

```bash
# Instant project-wide analysis
"Analyze the error handling patterns across both CLI tools"
"Find all async functions and check for proper error handling"  
"Identify code duplication between ollama-cli.js and gemini-cli.js"

# Intelligent code improvements
"Add input validation to all CLI options"
"Optimize the streaming functionality for better performance"
"Add comprehensive JSDoc comments to all functions"

# Architecture and design guidance  
"Suggest a plugin architecture for adding new LLM providers"
"Recommend patterns for better configuration management"
"Design a testing strategy for the CLI tools"
```

### MCP Management Scripts

- **`./setup-mcp.sh`** - Automated MCP setup with guided configuration
- **`./test-mcp.sh`** - Comprehensive testing of MCP functionality  
- **`./troubleshoot-mcp.sh`** - Diagnostic tool for fixing common issues
- **`./remove-mcp.sh`** - Clean removal of MCP integration

## 🧠 Neo4j Knowledge Graph Integration

This project now includes enterprise-grade knowledge graph capabilities using Neo4j for persistent AI memory and complex relationship mapping.

### Features

- **🔗 Graph-based Memory**: Stores entities and relationships in Neo4j graph database
- **🚀 Enterprise Scale**: APOC and Graph Data Science plugins enabled
- **📊 Advanced Analytics**: Graph algorithms, centrality analysis, community detection
- **🔄 Migration Tools**: Seamless migration from JSON memory to Neo4j
- **💾 Backup/Restore**: Comprehensive backup system with multiple formats
- **🌐 Web Interface**: Neo4j Browser for visual graph exploration

### Quick Setup

```bash
# Start Neo4j container
docker-compose -f docker-compose.databases.yml up -d neo4j

# Access Neo4j Browser
open http://localhost:7474
# Login: neo4j / dev_password_123
```

### Available Neo4j MCP Servers

| Server | Package | Purpose | Status |
|--------|---------|---------|--------|
| **neo4j-server** | `@alanse/mcp-neo4j-server` | General Neo4j operations | ✅ Connected |
| **neo4j-agent-memory** | `@knowall-ai/mcp-neo4j-agent-memory` | AI agent memory with semantic relationships | ✅ Connected |

### Migration from JSON Memory

If you have existing memory data, migrate to Neo4j:

```bash
# Run complete migration with backup
./migrate-to-neo4j.sh

# The script will:
# 1. Backup existing memory.json
# 2. Start Neo4j if needed  
# 3. Install migration dependencies
# 4. Transfer all entities and relationships
# 5. Verify data integrity
```

### Backup and Restore

```bash
# Create comprehensive backup
./scripts/neo4j-backup.sh

# List available backups
./scripts/neo4j-restore.sh --list

# Restore specific backup
./scripts/neo4j-restore.sh neo4j_backup_20240117_143022

# Quick Cypher-only restore
./scripts/neo4j-restore.sh backup_name --cypher-only
```

### Configuration

The Neo4j MCP servers are configured in `.mcp.json`:

```json
{
  "mcpServers": {
    "neo4j-server": {
      "command": "npx",
      "args": ["-y", "@alanse/mcp-neo4j-server"],
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USER": "neo4j", 
        "NEO4J_PASSWORD": "dev_password_123"
      }
    },
    "neo4j-agent-memory": {
      "command": "npx",
      "args": ["-y", "@knowall-ai/mcp-neo4j-agent-memory"],
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USERNAME": "neo4j",
        "NEO4J_PASSWORD": "dev_password_123"
      }
    }
  }
}
```

**Important Note**: Different Neo4j MCP packages use different environment variable names:
- `@alanse/mcp-neo4j-server` uses `NEO4J_USER`
- `@knowall-ai/mcp-neo4j-agent-memory` uses `NEO4J_USERNAME`

### Troubleshooting Neo4j MCP Servers

#### Problem: MCP servers fail to connect

**Root Cause**: Neo4j container not running or wrong package names.

**Solution Steps**:
1. **Verify Neo4j is running**:
   ```bash
   docker ps | grep neo4j
   curl http://localhost:7474  # Should return JSON
   ```

2. **Check for correct package names**:
   ```bash
   # Search for available Neo4j MCP packages
   npm search neo4j mcp
   ```

3. **Fix common configuration issues**:
   - Plugin names: Use `"graph-data-science"` not `"gds"`
   - Remove deprecated settings like `NEO4J_dbms_shell_enabled`
   - Use correct environment variables (`NEO4J_USERNAME` vs `NEO4J_USER`)

4. **Restart with correct configuration**:
   ```bash
   # Fix docker-compose.databases.yml and restart
   docker-compose -f docker-compose.databases.yml stop neo4j
   docker-compose -f docker-compose.databases.yml up -d neo4j
   ```

#### Problem: Neo4j container fails to start

**Common Issues and Fixes**:

1. **Wrong plugin names in docker-compose.yml**:
   ```yaml
   # ❌ Wrong
   NEO4J_PLUGINS: '["apoc","gds"]'
   
   # ✅ Correct  
   NEO4J_PLUGINS: '["apoc","graph-data-science"]'
   ```

2. **Deprecated configuration settings**:
   ```yaml
   # ❌ Remove this (deprecated in Neo4j 5.x)
   NEO4J_dbms_shell_enabled: true
   ```

3. **Check Neo4j logs for specific errors**:
   ```bash
   docker logs code-tools-neo4j
   ```

#### Problem: Environment variable mismatch

Different Neo4j MCP packages expect different variable names:

```json
{
  "neo4j-server": {
    "env": {
      "NEO4J_USER": "neo4j"  // Uses NEO4J_USER
    }
  },
  "neo4j-agent-memory": {
    "env": {
      "NEO4J_USERNAME": "neo4j"  // Uses NEO4J_USERNAME
    }
  }
}
```

**Verification**: Test packages individually:
```bash
# Test server package
NEO4J_URI=bolt://localhost:7687 NEO4J_USER=neo4j NEO4J_PASSWORD=dev_password_123 \
  npx -y @alanse/mcp-neo4j-server

# Test agent-memory package  
NEO4J_URI=bolt://localhost:7687 NEO4J_USERNAME=neo4j NEO4J_PASSWORD=dev_password_123 \
  npx -y @knowall-ai/mcp-neo4j-agent-memory
```

### Neo4j Web Interface

Access the Neo4j Browser at **http://localhost:7474**:
- **URL**: `http://localhost:7474`
- **Username**: `neo4j`
- **Password**: `dev_password_123`
- **Database**: `neo4j` (default database)

**Connection Details:**
- **Bolt URI**: `bolt://localhost:7687`
- **HTTP Port**: `7474` (web interface)
- **Bolt Port**: `7687` (direct connection)

Sample queries to explore your knowledge graph:
```cypher
// View all entity types and counts
MATCH (e:Entity) 
RETURN e.entityType, count(e) as count 
ORDER BY count DESC

// Find most connected entities
MATCH (e:Entity)-[r:RELATES]-() 
RETURN e.name, e.entityType, count(r) as connections 
ORDER BY connections DESC LIMIT 10

// Find shortest path between entities
MATCH path = shortestPath((a:Entity {name: "code-tools"})-[*]-(b:Entity {name: "PostgreSQL-service"})) 
RETURN path
```

## 🔄 Complete Reproduction Guide

This project is designed for **complete reproducibility**. Anyone can clone and get the full MCP ecosystem running:

### Prerequisites

- **Node.js 18+** (for MCP proxy servers)
- **Python 3.8+** (for Python MCP servers)
- **Claude Code** installed ([get it here](https://claude.ai/code))
- **Docker** (optional, for database stack)
- **WSL2 + IntelliJ** (optional, for IDE integration)

### One-Command Setup

```bash
./setup-all-mcp.sh
```

This script automatically:
- ✅ Detects your environment (WSL2, Linux, macOS)
- ✅ Installs all MCP servers with correct dependencies
- ✅ Sets up Python virtual environment for specialized servers
- ✅ Configures database stack (PostgreSQL, Redis, Qdrant)
- ✅ Tests all connections and reports status
- ✅ Creates project-specific configuration files

### Manual Setup (Alternative)

If you prefer step-by-step setup:

```bash
# Core development servers
./setup-mcp.sh                    # IntelliJ integration (WSL2)
./setup-qdrant-mcp.sh             # Vector database
./docker-db-start.sh              # Database stack

# Verify everything works
./verify-mcp-setup.sh
```

### What Gets Installed

| Category | Server | Purpose |
|----------|---------|----------|
| **Core** | filesystem | Secure file operations |
| **Core** | memory | Persistent project context |
| **Core** | sequential-thinking | Advanced reasoning |
| **Development** | github | Repository management |
| **Development** | puppeteer | Web automation |
| **Database** | qdrant | Vector embeddings & semantic search |
| **Database** | memory | Knowledge graph memory storage |
| **Infrastructure** | docker-mcp | Container management |
| **IDE** | jetbrains | IntelliJ IDEA integration (WSL2) |

### Environment Configuration

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Add your API keys (optional):**
   ```bash
   # For GitHub integration
   GITHUB_PERSONAL_ACCESS_TOKEN=your_token_here
   
   # For Google Gemini CLI
   GOOGLE_AI_API_KEY=your_api_key_here
   ```

3. **Start database services:**
   ```bash
   ./docker-db-start.sh
   ```

### Verification & Testing

```bash
# Comprehensive testing
./verify-mcp-setup.sh -v

# Quick status check
claude mcp list

# Test database connectivity
curl http://localhost:6333/collections

# View available capabilities
claude /tools
```

### Troubleshooting

If something doesn't work:

```bash
# Detailed diagnostics
./troubleshoot-mcp.sh

# Check Docker services
./docker-db-status.sh

# View service logs
./docker-logs.sh

# Reset everything
./setup-all-mcp.sh --quick
```

## 🛠️ Complete MCP Setup Guide

This guide covers how to set up all 7 MCP servers for full AI development assistance with Claude Code.

### 📋 Overview of MCP Servers

Your complete setup includes:

| Server | Purpose | Package | Status |
|--------|---------|---------|--------|
| **jetbrains** | IDE integration | `@jetbrains/mcp-proxy` | ✅ Connected |
| **github** | Repository operations | `@modelcontextprotocol/server-github` | ✅ Connected |
| **puppeteer** | Browser automation | `@modelcontextprotocol/server-puppeteer` | ✅ Connected |
| **docker-mcp** | Container management | `mcp-server-docker` (uvx) | ✅ Connected |
| **postgres** | Database queries | `@modelcontextprotocol/server-postgres` | ✅ Connected |
| **redis** | Key-value operations | `@modelcontextprotocol/server-redis` | ✅ Connected |
| **qdrant** | Vector database | `mcp-server-qdrant` (Python) | ✅ Connected |
| **memory** | Knowledge graph memory | `@modelcontextprotocol/server-memory` | ✅ Connected |

### 🚀 Quick Setup (Automated)

**For new installations:**
```bash
# Clone and setup everything
git clone <repository-url>
cd code-tools
./setup-all-mcp.sh

# Verify all servers are connected
claude mcp list
```

### 🔧 Manual Setup (Step-by-Step)

If you need to recreate this setup manually:

#### Step 1: Prerequisites
```bash
# Install required tools
sudo apt update
sudo apt install docker.io docker-compose python3 python3-pip nodejs npm

# Install uv (Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc

# Install Claude Code
# Follow: https://docs.anthropic.com/en/docs/claude-code
```

#### Step 2: Start Database Services
```bash
# Start PostgreSQL, Redis, and Qdrant
docker-compose up -d

# Verify services are running
docker ps
```

#### Step 3: Create MCP Configuration

Create `.mcp.json` in your project root:
```json
{
  "mcpServers": {
    "jetbrains": {
      "command": "npx",
      "args": ["-y", "@jetbrains/mcp-proxy"],
      "env": {
        "HOST": "172.31.240.1",
        "IDE_PORT": "63341",
        "LOG_ENABLED": "true"
      }
    },
    "github": {
      "command": "npx", 
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    },
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    },
    "docker-mcp": {
      "command": "/home/owner/.local/bin/uvx",
      "args": ["mcp-server-docker"]
    },
    "qdrant": {
      "command": "./venv-mcp/bin/mcp-server-qdrant",
      "env": {
        "QDRANT_URL": "http://localhost:6333",
        "COLLECTION_NAME": "mcp-memory"
      }
    },
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://codetools:dev_password_123@localhost:5432/codetools_dev"
      ]
    },
    "redis": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-redis",
        "redis://localhost:6379"
      ]
    },
    "memory": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-memory"
      ],
      "env": {
        "MEMORY_FILE_PATH": "./data/memory.json"
      }
    }
  }
}
```

#### Step 4: Enable MCP Servers in Claude Code

Create `.claude/settings.local.json`:
```json
{
  "permissions": {
    "allow": [
      "mcp__jetbrains__list_files_in_folder",
      "mcp__jetbrains__get_file_text_by_path"
    ],
    "deny": [],
    "ask": []
  },
  "enableAllProjectMcpServers": true
}
```

#### Step 5: Setup Python Environment for Qdrant
```bash
# Create Python virtual environment
python3 -m venv venv-mcp
source venv-mcp/bin/activate

# Install Qdrant MCP server
pip install mcp-server-qdrant
```

#### Step 6: Configure Environment Variables (Optional)

For GitHub integration, create a personal access token:
```bash
# 1. Go to https://github.com/settings/tokens
# 2. Create a new token with repo permissions
# 3. Set the environment variable:
export GITHUB_PERSONAL_ACCESS_TOKEN="your_token_here"

# Add to ~/.bashrc for persistence:
echo 'export GITHUB_PERSONAL_ACCESS_TOKEN="your_token_here"' >> ~/.bashrc
```

### 🧪 Testing Your Setup

```bash
# Check all MCP servers are connected
claude mcp list

# Test specific capabilities
claude /tools

# Verify database connections
docker ps  # Should show postgres, redis, qdrant containers

# Test PostgreSQL
npx @modelcontextprotocol/server-postgres postgresql://codetools:dev_password_123@localhost:5432/codetools_dev

# Test Redis
redis-cli ping  # Should return PONG

# Test Qdrant
curl http://localhost:6333/collections
```

### 🔍 Troubleshooting

#### MCP Servers Not Loading
```bash
# Check configuration file syntax
cat .mcp.json | python3 -m json.tool

# View MCP diagnostics
claude mcp list

# Check server logs
ls /home/owner/.cache/claude-cli-nodejs/-home-owner-repo-code-tools/
```

#### Database Connection Issues
```bash
# Check Docker services
docker ps

# Restart database stack
docker-compose down && docker-compose up -d

# Test connections individually
docker exec -it code-tools-postgres psql -U codetools -d codetools_dev
docker exec -it code-tools-redis redis-cli ping
```

#### Qdrant MCP Connection Issues

**Problem**: "Failed to reconnect to qdrant" error in Claude Code

**Root Causes & Solutions**:

1. **Docker Health Check Failure (most common)**
   ```bash
   # Check container health
   docker ps --format "table {{.Names}}\t{{.Status}}" | grep qdrant
   
   # If showing "unhealthy", check health check logs
   docker inspect code-tools-qdrant | jq '.[0].State.Health.Log'
   ```

   **Fix**: Update health check in `docker-compose.databases.yml`:
   ```yaml
   # ❌ Broken health check (wget not available in Qdrant container)
   healthcheck:
     test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:6333/collections"]
   
   # ✅ Fixed health check (using shell TCP test)
   healthcheck:
     test: ["CMD-SHELL", "timeout 5 sh -c 'cat < /dev/null > /dev/tcp/localhost/6333' || exit 1"]
     interval: 30s
     timeout: 10s
     retries: 5
     start_period: 40s
   ```

2. **Incorrect MCP Server Shebang Paths**
   ```bash
   # Check if MCP server can execute
   ./mcp/venv-mcp/bin/mcp-server-qdrant --help
   
   # If "cannot execute: required file not found", fix shebang
   head -1 ./mcp/venv-mcp/bin/mcp-server-qdrant
   ```

   **Fix**: Update Python path in MCP executables:
   ```bash
   # Fix mcp-server-qdrant shebang
   sed -i '1s|#!/home/owner/repo/code-tools/venv-mcp/bin/python3|#!/home/owner/repo/code-tools/mcp/venv-mcp/bin/python3|' ./mcp/venv-mcp/bin/mcp-server-qdrant
   
   # Fix main mcp binary shebang  
   sed -i '1s|#!/home/owner/repo/code-tools/venv-mcp/bin/python3|#!/home/owner/repo/code-tools/mcp/venv-mcp/bin/python3|' ./mcp/venv-mcp/bin/mcp
   ```

3. **Wrong Docker Project Namespace**
   ```bash
   # Check if Qdrant is in wrong project (should be "code-tools", not "compose")
   docker ps --format "table {{.Names}}\t{{.Image}}" | grep qdrant
   ```

   **Fix**: Ensure docker-compose runs from correct directory:
   ```bash
   # Remove incorrectly created container
   docker stop code-tools-qdrant && docker rm code-tools-qdrant
   
   # Run from root directory with correct paths
   docker-compose -f docker-compose.databases.yml up -d qdrant
   
   # Verify correct project namespace
   docker ps | grep code-tools-qdrant  # Should exist under code-tools project
   ```

4. **Volume Mount Path Issues**
   ```bash
   # Check for mount errors in container logs
   docker logs code-tools-qdrant
   ```

   **Fix**: Update volume paths in docker-compose.databases.yml:
   ```yaml
   # ❌ Wrong paths when running from subdirectory
   - ../../config/qdrant/production.yaml:/qdrant/config/production.yaml
   
   # ✅ Correct paths when running from root directory  
   - ./config/qdrant/production.yaml:/qdrant/config/production.yaml
   ```

**Verification Steps**:
```bash
# 1. Verify Qdrant container is healthy
docker ps --filter name=code-tools-qdrant --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"

# 2. Test Qdrant API directly
curl -s http://localhost:6333/collections

# 3. Test MCP server executable
QDRANT_URL=http://localhost:6333 COLLECTION_NAME=mcp-memory timeout 5 ./mcp/venv-mcp/bin/mcp-server-qdrant --help

# 4. Restart Claude Code MCP connection
# Run: /mcp → Select "Reconnect" for Qdrant server
```

**Prevention**:
- Always run docker-compose from the project root directory
- Use health checks that don't depend on external tools (wget, curl)
- Verify MCP server executable paths after virtual environment changes
- Test MCP connections after Docker container recreations

#### Package Installation Issues
```bash
# Update uvx and retry
uv self update
uvx --reinstall mcp-server-docker

# For npm packages, clear cache
npm cache clean --force
```

### 🎯 What You Can Do Now

With all 8 MCP servers connected, Claude Code can:

- **🏗️ IDE Integration**: Read/write files, navigate projects, run configurations
- **📊 Database Operations**: Query PostgreSQL, manage Redis cache, vector search in Qdrant  
- **🧠 Knowledge Graph Memory**: Store and retrieve persistent information across sessions
- **🐳 Container Management**: Create, manage, and monitor Docker containers
- **🌐 Web Automation**: Control browsers, take screenshots, fill forms
- **🔗 GitHub Integration**: Manage repositories, create PRs, search code
- **🧠 Advanced Reasoning**: Use sequential thinking for complex problem solving

### Project Structure

```
code-tools/
├── setup-all-mcp.sh          # 🚀 Master setup script
├── verify-mcp-setup.sh       # ✅ Comprehensive testing
├── mcp-servers.json          # 📋 Complete server inventory
├── docker-compose.databases.yml  # 🐳 Database stack
├── venv-mcp/                  # 🐍 Python MCP environment
├── .mcp.json                  # ⚙️  Project MCP config
├── .claude/settings.local.json # 🔐 Claude Code permissions
└── README.md                  # 📖 This file
```

## Dependencies

### Node.js Packages
- `commander` - Command-line argument parsing
- `chalk` - Terminal styling
- `ollama` - Ollama client library
- `@google/generative-ai` - Google Gemini client library
- `dotenv` - Environment variable loading

### MCP Servers (Auto-installed)
- `@modelcontextprotocol/server-*` - Core MCP functionality
- `@jetbrains/mcp-proxy` - IntelliJ integration
- `mcp-server-qdrant` - Vector database (Python)

### Infrastructure (Optional)
- **Docker** - For database containers
- **PostgreSQL** - Relational database
- **Redis** - Caching layer  
- **Qdrant** - Vector database for AI/ML

## Docker Database Connection Information

### PostgreSQL
- **Host**: `localhost` (or `code-tools-postgres` within Docker network)
- **Port**: `5432`
- **Database**: `codetools_dev`
- **Username**: `codetools`
- **Password**: `dev_password_123`

### Redis
- **Host**: `localhost` (or `code-tools-redis` within Docker network)
- **Port**: `6379`
- **No authentication configured**

### Qdrant
- **Host**: `localhost` (or `code-tools-qdrant` within Docker network)
- **HTTP API Port**: `6333`
- **gRPC Port**: `6334`
- **Web UI**: Available at `http://localhost:6333/dashboard`

## Knowledge Graph Memory Server

The Memory MCP server provides persistent memory using a local knowledge graph, allowing Claude to remember information about users and projects across chat sessions.

### Core Concepts

#### Entities
- **Name**: Unique identifier (e.g., "John_Smith")
- **Type**: Classification (e.g., "person", "organization", "event")
- **Observations**: List of facts about the entity

#### Relations
- **Directed connections** between entities
- **Active voice format** (e.g., "John_Smith works_at Anthropic")
- **Relationship types** define the connection nature

#### Observations
- **Atomic facts** stored as strings
- **Entity-specific** information
- **Independently manageable** (add/remove)

### Available Tools

| Tool | Purpose | Input |
|------|---------|-------|
| `create_entities` | Add new entities | Array of entity objects |
| `create_relations` | Connect entities | Array of relation objects |
| `add_observations` | Add facts to entities | Entity name + observations |
| `delete_entities` | Remove entities | Array of entity names |
| `delete_observations` | Remove specific facts | Entity + observation pairs |
| `delete_relations` | Remove connections | Relation specifications |
| `read_graph` | Get complete graph | No input |
| `search_nodes` | Find entities by query | Search string |
| `open_nodes` | Get specific entities | Array of entity names |

### Configuration

The memory server stores data in `./data/memory.json` as configured in `.mcp.json`:

```json
{
  "memory": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-memory"],
    "env": {
      "MEMORY_FILE_PATH": "./data/memory.json"
    }
  }
}
```

### Usage Examples

**Creating Entities:**
```json
{
  "name": "project_alpha",
  "entityType": "project",
  "observations": ["Uses Node.js", "Has Docker setup", "Deployed on AWS"]
}
```

**Creating Relations:**
```json
{
  "from": "John_Smith",
  "to": "project_alpha",
  "relationType": "maintains"
}
```

**Adding Observations:**
```json
{
  "entityName": "project_alpha",
  "contents": ["Added Redis integration", "Updated documentation"]
}
```

### Benefits

- **Cross-session persistence**: Information survives chat restarts
- **Relationship mapping**: Understand connections between people, projects, and concepts
- **Context accumulation**: Build deeper understanding over time
- **Structured memory**: Organized knowledge graph vs. simple text storage

## License

MIT
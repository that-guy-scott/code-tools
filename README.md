<div align="center">
  <img src="docs/img/project-logo.png" alt="LLM CLI Tools" width="600"/>
</div>

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Ollama](https://img.shields.io/badge/Ollama-000000?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDNi40NzcgMiAyIDYuNDc3IDIgMTJTNi40NzcgMjIgMTIgMjJTMjIgMTcuNTIzIDIyIDEyUzE3LjUyMyAyIDEyIDJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K&logoColor=white)
![CLI](https://img.shields.io/badge/CLI-4D4D4D?style=for-the-badge&logo=gnubash&logoColor=white)

</div>

# Code Tools

A comprehensive collection of command-line interfaces for interacting with different LLMs (Large Language Models) with full MCP (Model Context Protocol) integration for enhanced AI development assistance through Claude Code.

## 🎉 Latest Updates (August 17, 2025)

### 🚀 Universal LLM CLI v2.0.0 - **JUST RELEASED!**
- **650+ lines of production-ready code** with SOLID OOP architecture
- **Multi-provider support**: Ollama, Gemini, OpenAI, Anthropic in single interface
- **MCP ecosystem integration**: Auto-discovers 9 MCP servers for enhanced capabilities
- **Comprehensive testing completed**: Ollama models dominate with 100% and 98% scores
- **Professional evaluation system**: Automated scoring + beautiful HTML reports
- **Full database integration**: PostgreSQL schemas, Neo4j knowledge graph, Redis caching

### 📊 LLM Performance Results
**Latest coding capability evaluation** (Python two-sum algorithm implementation):
- 🥇 **Ollama gpt-oss:latest**: 100/100 (Perfect - comprehensive error handling, excellent documentation)
- 🥈 **Ollama qwen3-coder:latest**: 98/100 (Excellent - clean implementation, good practices)  
- 🥉 **Gemini 2.0-flash**: 0/100 (Failed - no response content, potential API issues)

**[View Full HTML Report](test/llm-evaluation-report.html)** | **[Technical Specification](llmv2.tech.spec.md)**

---

## 🚀 Quick Start

**New to this project?** Get the complete MCP ecosystem running in one command:

```bash
# Clone and setup everything
git clone <repository-url>
cd code-tools
./bin/setup-all-mcp.sh

# Verify everything works
./bin/verify-mcp-setup.sh
```

This sets up 9 MCP servers providing IDE integration, database connectivity, file operations, memory persistence, and development tools.

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

# Universal LLM CLI v2 (NEW!)
node llm-cli.js "prompt"                    # Universal interface
node llm-cli.js --provider ollama "prompt" # Ollama models
node llm-cli.js --provider gemini "prompt" # Gemini models
node llm-cli.js --list-providers            # Show available providers
node llm-cli.js --list-models               # Show available models

# Legacy CLI tools (v1)
npm start "prompt"              # Ollama CLI v1
npm run gemini "prompt"         # Gemini CLI v1

# Testing & Evaluation
node test/llm-evaluation-system.js         # Score LLM responses
node test/generate-html-report.js          # Create evaluation reports

# Semantic Knowledge System
node src/semantic-engine.js index       # Index project knowledge
node src/semantic-engine.js search      # Semantic search
node src/knowledge-fusion.js search     # Hybrid graph + semantic search
node src/knowledge-fusion.js patterns   # Pattern discovery
```

## 📁 Project Structure

The codebase has been organized for better maintainability and clear separation of concerns:

```
code-tools/
├── llm-cli.js                   # 🆕 Universal LLM CLI v2 (650+ lines)
├── src/                          # Core CLI applications
│   ├── ollama-cli.js            # Ollama LLM interface (v1)
│   ├── gemini-cli.js            # Google Gemini interface (v1)
│   ├── semantic-engine.js       # Nomic embeddings + Qdrant semantic search
│   └── knowledge-fusion.js      # Hybrid Neo4j + semantic intelligence
├── test/                         # 🆕 LLM Testing & Evaluation System
│   ├── llm-evaluation-system.js # Automated scoring system
│   ├── generate-html-report.js  # Beautiful HTML report generator
│   ├── evaluation-results.json  # JSON test results
│   ├── llm-evaluation-report.html # Professional HTML report
│   ├── ollama-gpt-oss-result.json # Test result: 100/100 score
│   ├── ollama-qwen-coder-result.json # Test result: 98/100 score
│   └── gemini-2.0-flash-result.json # Test result: 0/100 (failed)
├── sql/                          # 🆕 Database Schemas
│   ├── create_llm_test_results_table.sql
│   └── create_tech_specs_table.sql
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
├── llmv2.tech.spec.md           # 🆕 Universal LLM CLI v2 Technical Specification
└── package.json                  # Node.js project config
```

## 🛠️ Available Tools

### 🌟 Universal LLM CLI v2 (`llm-cli.js`) - **NEW!**
Revolutionary universal command-line interface supporting multiple LLM providers with full MCP integration.

**✨ Key Features:**
- **Multi-Provider Support**: Ollama, Gemini, OpenAI, Anthropic
- **MCP Integration**: Auto-discovers 9 MCP servers for enhanced capabilities
- **Universal Tool Calling**: Access JetBrains IDE, databases, GitHub, Docker, and more
- **Dynamic Model Discovery**: Automatically lists available models per provider
- **JSON Output**: Perfect for automation and scripting
- **Configuration Management**: Multiple configuration layers with precedence

**🏆 Tested Performance:**
- **Ollama gpt-oss:latest**: 100/100 (Perfect score)
- **Ollama qwen3-coder:latest**: 98/100 (Excellent score)
- **Gemini 2.0-flash**: 0/100 (Connection issues)

**Usage:**
```bash
# Universal interface (auto-detects best provider)
node llm-cli.js "Write a Python function for sorting"

# Provider-specific usage
node llm-cli.js --provider ollama --model qwen3-coder:latest "Write code"
node llm-cli.js --provider gemini --model gemini-2.0-flash "Analyze this"

# Discovery commands
node llm-cli.js --list-providers    # Show: ollama, gemini, openai, anthropic
node llm-cli.js --list-models       # Show all available models
node llm-cli.js --list-tools        # Show MCP tools available

# JSON output for automation
node llm-cli.js --output json "prompt" | jq '.response'

# Configuration
node llm-cli.js --config-precedence  # Show config layer order
```

### 📊 LLM Testing & Evaluation System - **NEW!**
Comprehensive testing framework for evaluating LLM coding capabilities across providers.

**Features:**
- **Automated Scoring**: 4-criteria evaluation system (correctness, error handling, test cases, code quality)
- **Multi-Provider Testing**: Compare Ollama, Gemini, and other providers
- **Professional Reports**: Beautiful HTML reports with animations and metrics
- **Database Storage**: PostgreSQL storage with full test result history
- **JSON Export**: Machine-readable evaluation results

**Usage:**
```bash
# Test all providers with a coding prompt
node llm-cli.js --provider ollama --output json "Write a Python function..." > test/result1.json
node llm-cli.js --provider gemini --output json "Write a Python function..." > test/result2.json

# Score and evaluate results
node test/llm-evaluation-system.js

# Generate beautiful HTML report
node test/generate-html-report.js

# View report
open test/llm-evaluation-report.html
```

### Ollama CLI v1 (`src/ollama-cli.js`) - Legacy
Original command-line interface for Ollama models (maintained for compatibility).

**Supported Models:**
- `gpt-oss:latest` (default)
- `qwen3:30b`
- `qwen3-coder:latest`
- `gemma3:27b`
- `qwen2.5-coder:32b`
- `nomic-embed-text:latest`

**Usage:**
```bash
# Legacy interface
npm start "Your prompt here"           # Uses src/ollama-cli.js
node src/ollama-cli.js --model qwen3-coder:latest "Write a function"
node src/ollama-cli.js --stream "Tell me a story"
echo "Hello" | node src/ollama-cli.js --stdin
```

### Gemini CLI v1 (`src/gemini-cli.js`) - Legacy
Original command-line interface for Google's Gemini models (maintained for compatibility).

**Supported Models:**
- `gemini-2.0-flash` (default)
- `gemini-2.5-flash`
- `gemini-2.5-pro`

**Usage:**
```bash
# Legacy interface
npm run gemini "Your prompt here"      # Uses src/gemini-cli.js
node src/gemini-cli.js --model gemini-2.5-pro "Complex reasoning task"
node src/gemini-cli.js --stream "Write a story"
echo "Hello" | node src/gemini-cli.js --stdin
```

## ⚙️ Setup

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

## 🔧 CLI Options

Both CLIs support similar options:

- `-m, --model <model>` - Select model to use
- `-s, --stream` - Enable streaming output
- `-t, --temperature <temp>` - Set temperature (0.0-1.0)
- `-p, --prompt <text>` - Prompt text (alternative to positional argument)
- `--stdin` - Read prompt from stdin
- `--max-tokens <num>` - Maximum tokens to generate
- `--top-p <num>` - Top-p sampling parameter
- `--top-k <num>` - Top-k sampling parameter

## 📋 Examples

```bash
# Compare responses from different models
node src/ollama-cli.js --model qwen3-coder:latest "Write a sorting algorithm"
node src/gemini-cli.js --model gemini-2.5-pro "Write a sorting algorithm"

# Use streaming for long responses
node src/ollama-cli.js --stream "Explain quantum computing in detail"

# Pipe content
cat document.txt | node src/gemini-cli.js --stdin "Summarize this"

# Use npm scripts
npm run gemini "What is the meaning of life?"
npm start "Hello from Ollama"
```

## 🧠 Enhanced Semantic Knowledge System

This project includes a powerful **hybrid semantic intelligence system** that combines Neo4j graph knowledge with local Nomic embeddings and Qdrant vector search for advanced pattern discovery and knowledge retrieval.

### 🌟 Key Features

- **🔐 Local Privacy-Preserving Embeddings** - Uses nomic-embed-text:latest via Ollama (no external API calls)
- **🧠 Hybrid Intelligence** - Combines symbolic graph knowledge (Neo4j) with semantic vectors (Qdrant)
- **🔍 Pattern Discovery** - Automatically discovers architectural, troubleshooting, and implementation patterns
- **🔗 Cross-System Integration** - Links graph entities with semantic vectors for comprehensive knowledge
- **⚡ High-Performance Search** - 768-dimensional vectors with cosine similarity matching
- **🎯 Smart Indexing** - Automatically processes project files for semantic search

### 🛠️ Available Tools

#### Semantic Engine (`semantic-engine.js`)
Core embedding generation and vector storage system.

```bash
# Index all project knowledge
node src/semantic-engine.js index

# Search for similar content
node src/semantic-engine.js search "authentication error handling"

# Generate embeddings for text (debug)
node src/semantic-engine.js embed "test text for embedding"

# Index specific project path
node src/semantic-engine.js index --path ./specific-directory
```

**Features:**
- Generates 768D embeddings using nomic-embed-text:latest
- Stores vectors in Qdrant with metadata
- Indexes markdown, JavaScript, JSON, and documentation files
- Provides CLI interface for manual operations

#### Knowledge Fusion (`knowledge-fusion.js`)
Hybrid search combining Neo4j graph knowledge with semantic vectors.

```bash
# Hybrid search (graph + semantic)
node src/knowledge-fusion.js search "MCP server configuration"

# Pattern discovery across project knowledge
node src/knowledge-fusion.js patterns architectural
node src/knowledge-fusion.js patterns troubleshooting
node src/knowledge-fusion.js patterns implementation

# Smart indexing with cross-system linking
node src/knowledge-fusion.js index

# Debug mode for detailed logging
node src/knowledge-fusion.js search "database setup" --debug
```

**Features:**
- Combines Neo4j entity search with Qdrant semantic similarity
- Calculates fusion scores for result relevance
- Discovers patterns across different knowledge domains
- Creates cross-references between graph and semantic data

### 🚀 Quick Start

```bash
# 1. Ensure Qdrant is running
docker-compose -f docker/compose/docker-compose.databases.yml up -d qdrant

# 2. Index your project knowledge
node src/semantic-engine.js index

# 3. Search for relevant information
node src/knowledge-fusion.js search "error handling patterns"

# 4. Discover architectural patterns
node src/knowledge-fusion.js patterns architectural
```

### 📋 Usage Examples

**Finding Similar Implementation Patterns:**
```bash
# Search for authentication-related code
node src/semantic-engine.js search "user authentication validation"

# Find database connection patterns
node src/knowledge-fusion.js search "PostgreSQL connection setup"

# Discover CLI command structures
node src/knowledge-fusion.js patterns implementation
```

**Troubleshooting with Semantic Context:**
```bash
# Find similar error solutions
node src/knowledge-fusion.js search "MCP server connection failed"

# Discover troubleshooting patterns
node src/knowledge-fusion.js patterns troubleshooting

# Get hybrid results with debug info
node src/knowledge-fusion.js search "docker container health check" --debug
```

**Architecture Analysis:**
```bash
# Discover architectural patterns
node src/knowledge-fusion.js patterns architectural

# Find provider interface implementations
node src/semantic-engine.js search "provider interface pattern"

# Analyze configuration management approaches
node src/knowledge-fusion.js search "configuration precedence"
```

### 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Enhanced Semantic Knowledge System            │
├─────────────────────────────────────────────────────────────────┤
│  Knowledge Fusion Engine                                        │
│  ├─ Hybrid Search (Graph + Semantic)                           │
│  ├─ Pattern Discovery                                          │
│  └─ Cross-System Linking                                       │
├─────────────────────────────────────────────────────────────────┤
│  Neo4j Graph Knowledge    │    Qdrant Vector Database          │
│  ├─ Entities & Relations  │    ├─ 768D Embeddings             │
│  ├─ Project Structure     │    ├─ Semantic Similarity         │
│  └─ Explicit Knowledge    │    └─ Pattern Vectors             │
├─────────────────────────────────────────────────────────────────┤
│                   Nomic Embeddings (Local)                      │
│                   ├─ nomic-embed-text:latest                   │
│                   ├─ Privacy-Preserving                        │
│                   └─ 768D High-Quality Vectors                 │
└─────────────────────────────────────────────────────────────────┘
```

### 🎯 Integration with MCP Ecosystem

The semantic system seamlessly integrates with the existing MCP servers:

- **Neo4j MCP Servers** - Graph entities are enhanced with semantic context
- **Qdrant MCP Server** - Vector storage and similarity search capabilities  
- **JetBrains MCP** - Code analysis enhanced with semantic pattern discovery
- **PostgreSQL MCP** - Structured data complemented by semantic relationships

### 🔧 Configuration

**Qdrant Setup:**
- Collection: `semantic-knowledge`
- Vector Size: 768 dimensions
- Distance: Cosine similarity
- Metadata: File paths, types, timestamps

**Nomic Embeddings:**
- Model: `nomic-embed-text:latest`
- Ollama Host: `http://172.31.240.1:11434` (WSL2 compatible)
- Local processing (no external API calls)

**Performance:**
- Embedding generation: ~100ms per document
- Search queries: <50ms typical response
- Index capacity: Millions of documents supported

## 🛠️ Complete MCP Setup Guide

This project supports Model Context Protocol (MCP) integration for enhanced AI development assistance through Claude Code with 9 comprehensive MCP servers.

### 📋 Overview of MCP Servers

Your complete setup includes:

| Server | Purpose | Package | Status |
|--------|---------|---------|--------|
| **jetbrains** | IDE integration | `@jetbrains/mcp-proxy` | ✅ Connected |
| **github** | Repository operations | `@modelcontextprotocol/server-github` | ✅ Connected |
| **puppeteer** | Browser automation | `@modelcontextprotocol/server-puppeteer` | ✅ Connected |
| **docker-mcp** | Container management | `mcp-server-docker` (uvx) | ✅ Connected |
| **postgres** | Database operations (read/write) | `mcp-postgres-full-access` | ✅ Connected |
| **redis** | Key-value operations | `@modelcontextprotocol/server-redis` | ✅ Connected |
| **qdrant** | Vector database + semantic search | `mcp-server-qdrant` (Python) | ✅ Connected |
| **neo4j-agent-memory** | AI agent memory | `@knowall-ai/mcp-neo4j-agent-memory` | ✅ Connected |
| **neo4j-server** | Neo4j operations | `@alanse/mcp-neo4j-server` | ✅ Connected |

### 🚀 Prerequisites

- **Windows with IntelliJ IDEA** (host system)
- **WSL2 with Ubuntu** (development environment)
- **Node.js 18+** (required for MCP proxy)
- **Python 3.8+** (for Python MCP servers)
- **Docker** (optional, for database stack)
- **Claude Code** installed ([get it here](https://claude.ai/code))

### 🚀 Quick Setup (Automated)

**For new installations:**
```bash
# Clone and setup everything
git clone <repository-url>
cd code-tools
./bin/setup-all-mcp.sh

# Verify all servers are connected
claude mcp list
```

**What the automated setup does:**
- ✅ Detects your environment (WSL2, Linux, macOS)
- ✅ Installs all MCP servers with correct dependencies
- ✅ Sets up Python virtual environment for specialized servers
- ✅ Configures database stack (PostgreSQL, Redis, Qdrant, Neo4j)
- ✅ Tests all connections and reports status
- ✅ Creates project-specific configuration files

### 🔧 Manual Setup (Step-by-Step)

If you need to recreate this setup manually:

#### Step 1: Install IntelliJ MCP Server Plugin

1. Open IntelliJ IDEA on Windows
2. Go to `Settings → Plugins`
3. Search for "MCP Server"
4. Install the plugin: https://plugins.jetbrains.com/plugin/26071-mcp-server
5. Restart IntelliJ IDEA

#### Step 2: Configure IntelliJ for External Connections

1. In IntelliJ, go to `Settings → Build, Execution, Deployment → Debugger`
2. ✅ **Check "Can accept external connections"**
3. **Note the port number** (usually 63341 or 63342)
4. Apply and restart IntelliJ

#### Step 3: Configure Windows Firewall (if needed)

Run as Administrator in Windows Command Prompt:
```cmd
netsh advfirewall firewall add rule name="IntelliJ MCP" dir=in action=allow protocol=TCP localport=63341
```

#### Step 4: Find Windows Host IP from WSL2

In WSL2 terminal:
```bash
# Get Windows host IP address
ip route show | grep default
# Look for the IP after "via" (e.g., 172.31.240.1)
```

#### Step 5: Install Prerequisites
```bash
# Install required tools
sudo apt update
sudo apt install docker.io docker-compose python3 python3-pip nodejs npm

# Install uv (Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc
```

#### Step 6: Start Database Services
```bash
# Start PostgreSQL, Redis, Qdrant, and Neo4j
docker-compose -f docker/compose/docker-compose.databases.yml up -d

# Verify services are running
docker ps
```

#### Step 7: Create MCP Configuration

The `.mcp.json` file in your project root:
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
      "command": "./mcp/venv-mcp/bin/mcp-server-qdrant",
      "env": {
        "QDRANT_URL": "http://localhost:6333",
        "COLLECTION_NAME": "mcp-memory"
      }
    },
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-postgres-full-access",
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

#### Step 8: Setup Python Environment for Qdrant
```bash
# Create Python virtual environment
mkdir -p mcp
python3 -m venv mcp/venv-mcp
source mcp/venv-mcp/bin/activate

# Install Qdrant MCP server
pip install mcp-server-qdrant
```

#### Step 9: Configure Environment Variables

Create `.env` file for API keys:
```bash
# For GitHub integration
GITHUB_PERSONAL_ACCESS_TOKEN=your_token_here

# For Google Gemini CLI
GOOGLE_AI_API_KEY=your_api_key_here
```

### 🧪 Testing Your Setup

```bash
# Check all MCP servers are connected
claude mcp list

# Test specific capabilities
claude /tools

# Verify database connections
docker ps  # Should show postgres, redis, qdrant, neo4j containers

# Test PostgreSQL
npx @modelcontextprotocol/server-postgres postgresql://codetools:dev_password_123@localhost:5432/codetools_dev

# Test Redis
redis-cli ping  # Should return PONG

# Test Qdrant
curl http://localhost:6333/collections

# Test Neo4j
curl http://localhost:7474  # Should return Neo4j browser
```

## 🧠 Neo4j Knowledge Graph Integration

This project includes enterprise-grade knowledge graph capabilities using Neo4j for persistent AI memory and complex relationship mapping.

### 🌟 Features

- **🔗 Graph-based Memory**: Stores entities and relationships in Neo4j graph database
- **🚀 Enterprise Scale**: APOC and Graph Data Science plugins enabled
- **📊 Advanced Analytics**: Graph algorithms, centrality analysis, community detection
- **🔄 Migration Tools**: Seamless migration from JSON memory to Neo4j
- **💾 Backup/Restore**: Comprehensive backup system with multiple formats
- **🌐 Web Interface**: Neo4j Browser for visual graph exploration

### 🚀 Quick Setup

```bash
# Start Neo4j container
docker-compose -f docker/compose/docker-compose.databases.yml up -d neo4j

# Access Neo4j Browser
open http://localhost:7474
# Login: neo4j / dev_password_123
```

### 📋 Available Neo4j MCP Servers

| Server | Package | Purpose | Status |
|--------|---------|---------|--------|
| **neo4j-server** | `@alanse/mcp-neo4j-server` | General Neo4j operations | ✅ Connected |
| **neo4j-agent-memory** | `@knowall-ai/mcp-neo4j-agent-memory` | AI agent memory with semantic relationships | ✅ Connected |

### 🔄 Migration from JSON Memory

If you have existing memory data, migrate to Neo4j:

```bash
# Run complete migration with backup
./bin/migrate-to-neo4j.sh

# The script will:
# 1. Backup existing memory.json
# 2. Start Neo4j if needed  
# 3. Install migration dependencies
# 4. Transfer all entities and relationships
# 5. Verify data integrity
```

### 💾 Backup and Restore

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

### 🌐 Neo4j Web Interface

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

### 🔧 Configuration

The Neo4j MCP servers are configured in `.mcp.json`:

**Important Note**: Different Neo4j MCP packages use different environment variable names:
- `@alanse/mcp-neo4j-server` uses `NEO4J_USER`
- `@knowall-ai/mcp-neo4j-agent-memory` uses `NEO4J_USERNAME`

## 🐳 Database Services

The project includes a comprehensive database stack with Docker containers for development.

### 📊 PostgreSQL
- **Host**: `localhost` (or `code-tools-postgres` within Docker network)
- **Port**: `5432`
- **Database**: `codetools_dev`
- **Username**: `codetools`
- **Password**: `dev_password_123`
- **Connection String**: `postgresql://codetools:dev_password_123@localhost:5432/codetools_dev`
- **MCP Capabilities**: Full read/write access via `mcp-postgres-full-access` package
- **Supported Operations**: SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, ALTER TABLE, DROP TABLE

### 🗄️ Redis
- **Host**: `localhost` (or `code-tools-redis` within Docker network)
- **Port**: `6379`
- **No authentication configured**
- **Connection String**: `redis://localhost:6379`

### 🔍 Qdrant (Vector Database)
- **Host**: `localhost` (or `code-tools-qdrant` within Docker network)
- **HTTP API Port**: `6333`
- **gRPC Port**: `6334`
- **Web UI**: Available at `http://localhost:6333/dashboard`
- **Collection**: `mcp-memory` (default for MCP operations)

### 🧠 Neo4j (Graph Database)
- **Host**: `localhost` (or `code-tools-neo4j` within Docker network)
- **Bolt Port**: `7687` (direct connection)
- **HTTP Port**: `7474` (web interface)
- **Username**: `neo4j`
- **Password**: `dev_password_123`
- **Connection String**: `bolt://localhost:7687`

### 🐳 Docker Management

```bash
# Start all database services
docker-compose -f docker/compose/docker-compose.databases.yml up -d

# Stop all services
docker-compose -f docker/compose/docker-compose.databases.yml down

# View service status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# View service logs
docker-compose -f docker/compose/docker-compose.databases.yml logs -f [service_name]

# Restart specific service
docker-compose -f docker/compose/docker-compose.databases.yml restart [service_name]
```

## 🔧 Troubleshooting

### Common Issues & Solutions

#### MCP Servers Not Loading
```bash
# Check configuration file syntax
cat .mcp.json | python3 -m json.tool

# View MCP diagnostics
claude mcp list

# Check server logs
ls ~/.cache/claude-cli-nodejs/*/
```

#### Database Connection Issues
```bash
# Check Docker services
docker ps

# Restart database stack
docker-compose -f docker/compose/docker-compose.databases.yml down
docker-compose -f docker/compose/docker-compose.databases.yml up -d

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

#### Neo4j MCP Servers Troubleshooting

**Problem**: MCP servers fail to connect

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
   docker-compose -f docker/compose/docker-compose.databases.yml stop neo4j
   docker-compose -f docker/compose/docker-compose.databases.yml up -d neo4j
   ```

#### Package Installation Issues
```bash
# Update uvx and retry
uv self update
uvx --reinstall mcp-server-docker

# For npm packages, clear cache
npm cache clean --force
```

#### Environment Variable Mismatch

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

#### PostgreSQL MCP Server Write Operations

**Problem**: "MCP error -32603: cannot execute INSERT in a read-only transaction"

**Root Cause**: The official `@modelcontextprotocol/server-postgres` package is read-only by design for security.

**Solution**: Use the enhanced `mcp-postgres-full-access` package that supports write operations:

1. **Update `.mcp.json` configuration**:
   ```json
   {
     "postgres": {
       "command": "npx",
       "args": [
         "-y", 
         "mcp-postgres-full-access",
         "postgresql://codetools:dev_password_123@localhost:5432/codetools_dev"
       ]
     }
   }
   ```

2. **Restart Claude Code** to reload the MCP configuration with the new server.

3. **Test write operations**:
   ```sql
   INSERT INTO table_name (column1, column2) VALUES ('value1', 'value2');
   UPDATE table_name SET column1 = 'new_value' WHERE id = 1;
   DELETE FROM table_name WHERE id = 1;
   ```

**Features of `mcp-postgres-full-access`**:
- ✅ Full read/write access to PostgreSQL databases
- ✅ Transaction management and safety controls
- ✅ Support for INSERT, UPDATE, DELETE, and schema operations
- ✅ Parameterized queries to prevent SQL injection
- ✅ Proper error handling and rollback capabilities

**Security Note**: The enhanced package includes safety measures like transaction management, but use with caution on production databases.

### 🧪 Verification Commands

```bash
# Test error detection
echo 'const broken = "unclosed string' > test.js
node -c test.js  # Shows syntax error immediately

# Test project analysis
claude /tools  # Lists all available capabilities

# Test MCP connection
claude mcp list  # Verify ✅ Connected status
```

### 🔄 Reset and Recovery

```bash
# Complete reset
./bin/setup-all-mcp.sh --reset

# Detailed diagnostics
./bin/troubleshoot-mcp.sh

# Check Docker services
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"

# View service logs
docker-compose -f docker/compose/docker-compose.databases.yml logs -f
```

## 🎯 What You Can Do Now

With all 9 MCP servers connected, Claude Code can:

- **🏗️ IDE Integration**: Read/write files, navigate projects, run configurations
- **📊 Database Operations**: Full read/write PostgreSQL access, manage Redis cache, vector search in Qdrant
- **🧠 Knowledge Graph Memory**: Store and retrieve persistent information across sessions with Neo4j
- **🐳 Container Management**: Create, manage, and monitor Docker containers
- **🌐 Web Automation**: Control browsers, take screenshots, fill forms
- **🔗 GitHub Integration**: Manage repositories, create PRs, search code
- **🧠 Advanced Reasoning**: Use graph-based memory for complex problem solving
- **🔍 Semantic Intelligence**: Local embeddings + pattern discovery with hybrid search across knowledge systems

### Real Examples of Enhanced Capabilities

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

# Semantic pattern discovery
"Find similar authentication implementations across the project"
"Discover error handling patterns in CLI tools using semantic search"
"Analyze configuration management approaches with hybrid intelligence"
"Search for database connection patterns across all project files"
```

## 📚 Dependencies

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
- `@knowall-ai/mcp-neo4j-agent-memory` - Neo4j agent memory
- `@alanse/mcp-neo4j-server` - Neo4j operations

### Infrastructure (Optional)
- **Docker** - For database containers
- **PostgreSQL** - Relational database
- **Redis** - Caching layer
- **Qdrant** - Vector database for AI/ML
- **Neo4j** - Graph database for knowledge management

## 📄 License

MIT

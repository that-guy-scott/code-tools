# Code Tools 🦀

<div align="center">
  <img src="img/project-logo.png" alt="Code Tools" width="400"/>
</div>

<div align="center">

![Rust](https://img.shields.io/badge/Rust-High_Performance-DE3F24?style=for-the-badge&logo=rust&logoColor=white)
![Claude Code](https://img.shields.io/badge/Claude_Code-Ready-4A90E2?style=for-the-badge)
![MCP](https://img.shields.io/badge/MCP-Enabled-6B73FF?style=for-the-badge)
![Production](https://img.shields.io/badge/Production-Ready-00D084?style=for-the-badge)

</div>

**Production-ready Rust CLI toolkit for Claude Code development with integrated database stack and MCP servers.**

## 🚀 Quick Start

```bash
# Build high-performance Rust tools
cd tools && ./build.sh

# Start database services
docker-compose up -d

# Test the blazing-fast CLI tools
./bin/fs-fast scan --depth 3 --sizes
./bin/llm "Hello from Rust CLI!"
cat README.md | llm --timeout 300 --model=llama3.1:8b "You are an expert document analyst. Your task is to analyze the following text and insert the delimiter '<CHUNK_END>' wherever a new, distinct section or topic begins. Do not remove any of the original text. The delimiter should only be placed at the end of a complete thought, paragraph, or section."
```

## ⚡ Rust Architecture

**8 Production-Ready Tools** - All optimized with LTO, strip, and panic=abort:

| Tool | Purpose | Key Features |
|------|---------|--------------|
| **fs-fast** | File system operations | JSON output, parallel processing, rich analysis |
| **llm** | Multi-provider LLM client | Ollama, OpenAI, Claude, Gemini support |
| **neo4j** | Knowledge graph operations | neo4rs v0.7, serde integration, async queries |
| **postgres** | SQL database operations | tokio-postgres, connection pooling, deadpool |
| **qdrant** | Vector database client | qdrant-client v1.7, high-throughput vectors |
| **redis** | Redis cache operations | redis v0.25, connection pooling, async |
| **http** | HTTP client operations | reqwest, authentication, batch processing |
| **crypto** | Cryptographic operations | JWT, hashing, encryption, secure random |

## 🔧 Rust Workspace Structure

```
./                              # Project root
├── bin/                       # 🔗 User-facing symlinks (clean API)
│   ├── fs-fast -> ../tools/target/release/fs-fast
│   ├── llm -> ../tools/target/release/llm  
│   ├── neo4j -> ../tools/target/release/neo4j
│   ├── postgres -> ../tools/target/release/postgres
│   ├── qdrant -> ../tools/target/release/qdrant
│   ├── redis -> ../tools/target/release/redis
│   ├── http -> ../tools/target/release/http
│   └── crypto -> ../tools/target/release/crypto
└── tools/                     # 🦀 High-performance Rust workspace
    ├── bin/                   # 📝 Rust source files (development)
    │   ├── fs-fast.rs        # ⚡ File operations source
    │   ├── llm.rs            # ⚡ LLM client source
    │   ├── neo4j.rs          # 🔗 Knowledge graph source
    │   ├── postgres.rs       # 🗄️ SQL database source
    │   ├── qdrant.rs         # 🧠 Vector database source
    │   ├── redis.rs          # 🔄 Cache operations source
    │   ├── http.rs           # 🌐 HTTP client source
    │   └── crypto.rs         # 🔐 Cryptographic operations source
    ├── src/                   # 📚 Shared library code
    │   ├── lib.rs            # Main library entry point
    │   └── shared/           # Common utilities (CLI, error handling, output)
    └── target/release/        # 🏗️ Compiled optimized binaries
```

### Directory Purpose Separation

**Clean 3-Layer Architecture:**
- **`./bin/*`** → User interface (symlinks for easy access)
- **`tools/bin/*.rs`** → Development source files (Rust binary entry points)  
- **`tools/src/`** → Shared library code (utilities, error handling, output formatting)
- **`tools/target/release/`** → Compiled binaries (build artifacts)


## 🗄️ Database Services

| Service | Port | Purpose | Credentials |
|---------|------|---------|-------------|
| **PostgreSQL** | 5432 | Structured data | `dev_user`/`dev_password_123` |
| **Neo4j** | 7474/7687 | Knowledge graph | `neo4j`/`dev_password_123` |
| **Redis** | 6379 | Caching & sessions | (no auth) |
| **Qdrant** | 6333 | Vector embeddings | (no auth) |

## 🔌 MCP Servers

Pre-configured Claude Code MCP servers:

- **neo4j-agent-memory** - AI agent memory and knowledge graph ⚠️ *Requires env vars*
- **postgres** - PostgreSQL database operations  
- **qdrant** - Vector search and embeddings
- **jetbrains** - IntelliJ IDEA integration
- **puppeteer** - Browser automation
- **github** - Repository management

> ⚠️ **Important:** The Neo4j agent memory server requires environment variables in `.mcp.json`, not CLI arguments.

## 📋 Requirements

**Core Dependencies:**
- **Rust** - For building high-performance tools
- **Docker & Docker Compose** - For database stack
- **Claude Code** - AI coding assistant with MCP support

**Optional:**
- **Node.js** - For some MCP servers
- **Python 3** - For Qdrant MCP server

## 🛠️ Development Workflow

### Build Process
```bash
# Build optimized Rust tools (creates binaries in tools/target/release/)
cd tools && ./build.sh

# Symlinks in ./bin/ automatically point to new binaries
./bin/fs-fast --help  # Uses tools/target/release/fs-fast
```

### Tool Usage Examples
```bash
# File operations with rich JSON output
./bin/fs-fast scan --depth 3 --sizes
find . -name "*.rs" -type f                    # Fast for simple finds

# LLM operations (6x faster than Node.js)
./bin/llm "analyze this code" --verbose
./bin/llm --list-models

# HTTP client operations  
./bin/http get "https://api.github.com/users/octocat"
./bin/http post "https://httpbin.org/post" --data '{"test": "data"}'

# Database operations
./bin/neo4j search "component" --limit 3 --depth 1
./bin/postgres health
./bin/qdrant list
./bin/redis health

# Cryptographic operations
./bin/crypto hash "password" --algorithm sha256
./bin/crypto jwt sign --payload '{"user": "test"}' --secret "key"
```

## 🎯 Tool Selection Decision Tree

```
Need file operations?
├─ Speed critical + simple output → Native tools (find, ls, cat)
├─ Rich analysis + JSON output → ./bin/fs-fast
└─ Database operations → ./bin/{neo4j,postgres,qdrant}

Need LLM operations?
├─ Multi-provider support → ./bin/llm --list-models
└─ Direct LLM queries → ./bin/llm "your prompt"

Need HTTP/API operations?
└─ REST client → ./bin/http get/post/put/delete

Need cryptographic operations?
└─ Security tools → ./bin/crypto hash/encrypt/jwt
```

## 🔧 Setup for New Projects

```bash
# Copy this toolkit environment
./setup.sh /path/to/your/project

# Build Rust tools in new location
cd /path/to/your/project/tools && ./build.sh
```

## ✨ Features

**Current Status: 8/8 Tools Operational**
- ✅ **Clean Architecture**: Proper separation of user interface, source code, and build artifacts
- ✅ **8 Production-Ready Rust Tools**: All optimized with LTO, strip, and panic=abort
- ✅ **Modern Async Architecture**: tokio, reqwest, deadpool connection pooling
- ✅ **Symlinked Binaries**: `./bin/*` for easy access, auto-updates on rebuild
- ✅ **Comprehensive Database Stack**: Neo4j, PostgreSQL, Redis, Qdrant integration
- ✅ **HTTP Client**: Full REST support with authentication and batch processing  
- ✅ **Cryptographic Suite**: JWT, hashing, encryption, secure random generation
- ✅ **Consistent Workspace**: Follows Rust/Cargo conventions for multi-binary projects

## 📄 License

MIT License

---

## 🚀 MCP Server Setup (One-Time)

```bash
# Core MCP servers for Claude Code integration
npm install @knowall-ai/mcp-neo4j-agent-memory
npm install @modelcontextprotocol/server-puppeteer  
npm install better-qdrant-mcp-server

# Start database stack first
docker-compose up -d

# Restart Claude Code to load MCP configuration
```

**What Each Package Provides:**
- **Neo4j MCP** → Persistent project knowledge and relationships
- **Puppeteer MCP** → Browser automation, screenshots, web interaction  
- **Qdrant MCP** → Vector embeddings and semantic search

*Built with ❤️ and ⚡ Rust performance*
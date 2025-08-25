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
./bin/chunk file README.md --strategy heading-based --format text
```

## ⚡ Rust Architecture

**9 Production-Ready Tools** - All optimized with LTO, strip, and panic=abort:

| Tool | Purpose | Key Features |
|------|---------|--------------|
| **chunk** | Advanced text chunking | 13 strategies, token-aware, semantic boundaries |
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
│   ├── chunk -> ../tools/target/release/chunk
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
    │   ├── chunk.rs          # 📄 Text chunking source
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

## 📄 Advanced Text Chunking

The **chunk** tool provides 13 intelligent chunking strategies for various document types and use cases:

### **Phase 1: Document Structure Strategies**

```bash
# Heading-based chunking (split on H1, H2, H3 headers)
./bin/chunk file document.md --strategy heading-based --heading-levels "1,2,3"

# Token-aware chunking (stay under 512 tokens using word counting)
./bin/chunk file article.txt --strategy token-aware --token-limit 512 --tokenizer word

# Token-aware with GPT estimation (good for LLM contexts)
./bin/chunk file content.txt --strategy token-aware --token-limit 2048 --tokenizer gpt

# Recursive chunking (hierarchical splitting with size constraints)
./bin/chunk file large_doc.txt --strategy recursive --max-chunk-size 1000 --min-chunk-size 100
```

### **Phase 2: Content-Type Specific Strategies**

```bash
# Dialogue chunking (preserve speaker turns)
./bin/chunk file interview.txt --strategy dialogue --speaker-pattern "^([A-Z]+):\s*"

# List-aware chunking (keep bullet/numbered lists together)
./bin/chunk file tasks.md --strategy list-aware --size 500

# Table-aware chunking (preserve table structures)
./bin/chunk file data_report.md --strategy table-aware --size 800
```

### **AI-Powered Strategies (Require Ollama)**

```bash
# Semantic chunking (requires Ollama running)
./bin/chunk file document.txt --strategy semantic --model nomic-embed-text --threshold 0.8

# LLM-guided boundary detection
./bin/chunk file content.txt --strategy llm --llm-model gpt-oss:latest --chunk-prompt "Split into logical sections"

# Smart hybrid approach
./bin/chunk file article.txt --strategy smart --size 1000 --threshold 0.7
```

### **Traditional Strategies**

```bash
# Fixed-size chunking with overlap
./bin/chunk file doc.txt --strategy fixed --size 500 --overlap 50

# Sentence-aware chunking
./bin/chunk file article.txt --strategy sentence --size 800

# Paragraph-based chunking
./bin/chunk file essay.txt --strategy paragraph --size 1000

# Code-aware chunking (respects function boundaries)
./bin/chunk file source.rs --strategy code --size 800
```

### **Output Formats & Piped Input**

```bash
# JSON output (default, good for programmatic use)
./bin/chunk file doc.txt --strategy heading-based --format json

# Text output (human-readable)
./bin/chunk file doc.txt --strategy token-aware --format text

# CSV output (for spreadsheets)
./bin/chunk file doc.txt --strategy recursive --format csv

# Process text from stdin
cat meeting_notes.txt | ./bin/chunk text --strategy dialogue --format json

# Quick test with echo
echo "This is a test. Perfect for chunking." | ./bin/chunk text --strategy sentence
```

### **Batch Processing**

```bash
# Process all markdown files in a directory
./bin/chunk batch ./docs --pattern "*.md" --strategy heading-based --output-dir chunks

# Process all transcripts with dialogue chunking
./bin/chunk batch ./transcripts --pattern "*.txt" --strategy dialogue --output-dir processed
```

### **Practical Use Cases**

```bash
# For RAG systems - keep context under token limits
./bin/chunk file knowledge_base.txt --strategy token-aware --token-limit 1024 --tokenizer gpt --format json

# For documentation - preserve heading structure  
./bin/chunk file manual.md --strategy heading-based --heading-levels "1,2" --format json

# For meeting transcripts - group by speaker
./bin/chunk file meeting.txt --strategy dialogue --speaker-pattern "^(.*?):\s*" --format json

# For structured documents - preserve lists and tables
./bin/chunk file report.md --strategy table-aware --format json
```

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
# Advanced text chunking (13 strategies available)
./bin/chunk file document.txt --strategy token-aware --token-limit 1024 --format json
./bin/chunk file transcript.txt --strategy dialogue --format text
echo "Sample text for chunking" | ./bin/chunk text --strategy sentence

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
Need text processing?
├─ Document structure → ./bin/chunk --strategy {heading-based,token-aware,recursive}
├─ Content-specific → ./bin/chunk --strategy {dialogue,list-aware,table-aware}
└─ AI-powered chunking → ./bin/chunk --strategy {semantic,llm,smart}

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

**Current Status: 9/9 Tools Operational**
- ✅ **Clean Architecture**: Proper separation of user interface, source code, and build artifacts
- ✅ **9 Production-Ready Rust Tools**: All optimized with LTO, strip, and panic=abort
- ✅ **Advanced Text Processing**: 13 comprehensive chunking strategies for document analysis
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
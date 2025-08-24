# CLAUDE.md - Essential Guide

## Project Architecture 

**Code Tools CLI** - Pure Rust high-performance toolkit:
- `./bin/` - Symlinked binaries (no file extensions) for easy access
- `./tools/` - High-performance Rust workspace (source + built binaries)
- All tools: LLM client, database connectors, file operations, benchmarking

## Core Rules (Non-Negotiable)

1. **Performance-First Tool Selection** - Use benchmarked tool choice below
2. **Code Limits** - 300 lines max per change, 200 lines per commit  
3. **Complete Code Only** - Never create placeholders or fake implementations
4. **Knowledge Persistence** - Document significant discoveries in Neo4j for complex projects
5. **Git Atomicity** - One logical change per commit with present-tense messages

## Tool Selection Decision Tree

```
Need file operations?
├─ Speed critical + simple output → Native tools (find, ls, cat, du)
├─ Rich analysis + JSON output → ./bin/fs-fast
└─ Database operations → ./bin/{qdrant,neo4j,postgres}

Need project knowledge?
├─ Simple task → Skip knowledge graph  
├─ Complex/multi-component → Search Neo4j first: --limit 3 --depth 1
└─ New discoveries → Document in Neo4j after completion
```

## Performance Benchmarks

| Operation | Native Tools | fs-fast | Performance Difference |
|-----------|--------------|---------|----------------------|
| Find files | 35ms | 122ms | **3.5x faster** |
| List directory | 2ms | 3ms | **1.5x faster** |
| File reading | ~equal | ~equal | No significant difference |
| Rich analysis | N/A | 122ms | **Only option for JSON** |

## Essential Commands

### File Operations
```bash
# Speed-critical basic operations
find . -name "*.ts" -type f         # Fastest file search
ls -la src/                         # Fastest directory listing  
cat src/file.ts                     # Fast file reading

# Rich analysis when you need JSON
./bin/fs-fast scan --depth 3 --sizes
./bin/fs-fast stats --summary
```

### Database Tools (High-Performance Rust)
```bash
# Build Rust workspace (creates optimized binaries)
cd tools && ./build.sh

# Working tools (symlinked for easy access)
./bin/fs-fast scan --depth 3 --sizes           # File operations
./bin/fs-fast stats --summary                  # Project analysis
./bin/llm "hello world"                        # High-performance LLM CLI (6x faster)

# All database tools (fully working)
./bin/neo4j search "topic" --limit 3 --depth 1  # Neo4j graph DB
./bin/qdrant list                               # Qdrant vector DB
./bin/postgres health                           # PostgreSQL
./bin/benchmark all                             # Performance tests
```

### Git Workflow
```bash
git status && git log --oneline -3   # Check current state
git add -p                           # Selective staging
git commit -m "feat: Brief description"  # Present tense, <50 chars
```

## Streamlined Workflows

### For Simple Tasks
1. Use native tools for speed
2. Make atomic changes <200 lines
3. Commit with clear message

### For Complex Projects  
1. **Before**: Search existing knowledge: `./bin/neo4j search "component" --limit 3 --depth 1`
2. **During**: Document new entities as you discover them
3. **After**: Create relationships between new and existing components

### Token Management (Critical)
- Neo4j queries: ALWAYS use `--limit 3-5 --depth 1`
- Break large queries into multiple small ones
- Prefer specific searches over broad ones

## Quick Reference

```bash
# Most common operations
find . -name "*.ts" | head -10                              # Fast file search
./bin/fs-fast scan --depth 2 --sizes                # Rich file analysis
./bin/llm "analyze this code" --verbose              # LLM analysis (6x faster)
./bin/neo4j search "auth" --limit 3 --depth 1       # Knowledge search
git add -p && git commit -m "fix: Issue description"       # Atomic commit
```

## Rust Development

### Tool Structure
```
tools/                         # Rust workspace
├── src/lib.rs                # Library with shared utilities  
├── src/shared/               # Modular shared code
│   ├── output.rs            # Output formatting (JSON/CSV/text)
│   ├── error.rs             # Error handling
│   └── cli.rs               # CLI helpers
├── bin/                     # Binary entry points
│   ├── fs-fast.rs          # ✅ File operations (working)
│   ├── test-simple.rs      # ✅ Test utility (working)
│   ├── benchmark.rs        # ✅ Performance benchmarking (working)
│   ├── neo4j.rs            # ✅ Neo4j graph DB (neo4rs v0.7 compatible)
│   ├── postgres.rs         # ✅ PostgreSQL connector (working)
│   └── qdrant.rs           # ✅ Qdrant vector DB (qdrant-client v1.7 compatible)
└── tests/                   # Integration tests
```

### Development Commands
```bash
# Build all working binaries
cargo build --release --bin fs-fast --bin test-simple --bin benchmark --bin neo4j --bin postgres --bin qdrant

# Run library tests
cargo test --lib

# Add new tool
# 1. Create bin/new-tool.rs
# 2. Add [[bin]] entry to Cargo.toml  
# 3. Use: use code_tools_connectors::shared::{OutputFormat, format_output};
```

## Tool Status (All Working ✅)

### Current Status: 6/6 Tools Operational

| Tool | Status | API Version | Key Features |
|-----------|--------|-------------|--------------|
| **fs-fast** | ✅ Working | Native | Ultra-fast file operations, JSON output |
| **benchmark** | ✅ Working | Native | Performance testing, Rust vs Node.js comparison |
| **postgres** | ✅ Working | tokio-postgres 0.7 | Full SQL operations, connection pooling |
| **neo4j** | ✅ **FIXED** | neo4rs v0.7 | Graph operations, serde integration |
| **qdrant** | ✅ **FIXED** | qdrant-client v1.7 | Vector operations, health checks |
| **llm** | ✅ **NEW** | reqwest 0.11 + regex 1.10 | Multi-provider LLM client, 6x faster than Node.js |

## Security & Maintenance
- Never commit credentials, keys, or sensitive data
- Use `git add -p` for selective staging to avoid accidental commits
- Backup Neo4j knowledge graph regularly for complex projects
- Keep tool builds updated: `cd tools && ./build.sh`
- All 6 tools now compile and run successfully
- Neo4j: Updated for neo4rs v0.7 with serde integration
- Qdrant: Updated for qdrant-client v1.7 with builder patterns  
- LLM: New high-performance multi-provider client (Ollama, Gemini, OpenAI, Claude)

---
*This guide prioritizes actionable speed over comprehensive documentation. For edge cases, adapt these patterns to your specific context.*
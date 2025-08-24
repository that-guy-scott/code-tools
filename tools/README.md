# Code Tools Connectors

High-performance Rust connectors for database operations, file system access, and system integrations.

## Architecture

This is a Rust workspace containing:

- **`src/lib.rs`** - Main library with shared functionality
- **`src/shared/`** - Common utilities (output formatting, error handling, CLI helpers)
- **`src/connectors/`** - Connector implementations (future)
- **`bin/`** - Binary CLI applications
- **`tests/`** - Integration tests

## Binaries

- **`fs-fast`** - Ultra-fast file system operations
- **`neo4j`** - Neo4j graph database connector  
- **`postgres`** - PostgreSQL database connector
- **`qdrant`** - Qdrant vector database connector
- **`benchmark`** - Performance testing tool

## Building

```bash
# Build all binaries in release mode
./build.sh

# Or use cargo directly
cargo build --release
```

## Usage

```bash
# File system operations
./fs-fast scan --depth 3 --sizes
./fs-fast read README.md

# Database operations  
./neo4j health
./neo4j search "project entities" --limit 3

./postgres health  
./postgres schema tables

./qdrant health
./qdrant collection list

# Benchmarking
./benchmark all
./benchmark file-ops
```

## Development

This workspace follows Rust best practices:

- Shared code in `src/shared/` modules
- Binary entry points in `bin/`  
- Integration tests in `tests/`
- Proper error handling and CLI patterns
- Comprehensive documentation

## Performance

All connectors are optimized for speed with:

- Release builds with LTO
- Async/parallel operations where beneficial
- Memory-mapped file access
- Efficient serialization
- Minimal allocations
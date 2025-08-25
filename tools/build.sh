#!/bin/bash

# High-Performance Database Tools Build Script  
# Builds optimized Rust binaries for all database tools

set -e

echo "🚀 Building high-performance database tools..."

cd "$(dirname "$0")"

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust/Cargo not found. Install from https://rustup.rs/"
    exit 1
fi

# Build in release mode with maximum optimizations
echo "📦 Building optimized binaries..."
cargo build --release

# Copy binaries to tools directory and create bin symlinks
BINARIES=("chunk" "fs-fast" "llm" "neo4j" "postgres" "qdrant" "redis" "http" "crypto")
BUILT_COUNT=0

for binary in "${BINARIES[@]}"; do
    if [ -f "target/release/$binary" ]; then
        cp "target/release/$binary" "./$binary"
        chmod +x "./$binary"
        
        # Create symlink in bin directory (relative path)
        cd ..
        ln -sf "../tools/$binary" "bin/$binary"
        cd tools
        
        # Show binary size
        SIZE=$(ls -lh "./$binary" | awk '{print $5}')
        echo "✅ Binary created: ./tools/$binary ($SIZE) → bin/$binary"
        
        BUILT_COUNT=$((BUILT_COUNT + 1))
    else
        echo "⚠️  Binary not found: $binary"
    fi
done

if [ $BUILT_COUNT -eq 0 ]; then
    echo "❌ No binaries were built successfully"
    exit 1
fi

# Quick health tests
echo ""
echo "🧪 Testing tools..."

# Test a few key tools
if [ -f "./fs-fast" ]; then
    ./fs-fast --help > /dev/null && echo "  ✅ fs-fast OK" || echo "  ❌ fs-fast failed"
fi

if [ -f "./llm" ]; then
    ./llm --help > /dev/null && echo "  ✅ llm OK" || echo "  ❌ llm failed"
fi

if [ -f "./postgres" ]; then
    ./postgres --help > /dev/null && echo "  ✅ postgres OK" || echo "  ❌ postgres failed"
fi

if [ -f "./chunk" ]; then
    ./chunk --help > /dev/null && echo "  ✅ chunk OK" || echo "  ❌ chunk failed"
fi

echo ""
echo "🎉 Build complete! ($BUILT_COUNT/$((${#BINARIES[@]})) tools built)"
echo "📂 Binaries available in both ./tools/ and ./bin/ (symlinked)"
echo ""
echo "📋 Usage examples:"
echo "  # File operations"
echo "  ./bin/fs-fast scan --depth 3 --sizes"
echo "  ./bin/fs-fast stats --summary"
echo ""
echo "  # LLM operations"
echo "  ./bin/llm 'Analyze this code' --provider ollama"
echo ""
echo "  # Database operations"
echo "  ./bin/postgres health"
echo "  ./bin/neo4j search 'topic' --limit 3"
echo "  ./bin/qdrant list"
echo "  ./bin/redis health"
echo ""
echo "  # HTTP operations"
echo "  ./bin/http get 'https://api.github.com/users/octocat'"
echo ""
echo "  # Text chunking"
echo "  ./bin/chunk text 'Long document text...' --strategy semantic"
echo "  ./bin/chunk file document.md --strategy smart --size 1000"
echo ""
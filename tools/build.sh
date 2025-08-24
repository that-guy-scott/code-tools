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
BINARIES=("fs-fast" "qdrant" "neo4j" "postgres" "benchmark" "llm")
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

if [ -f "./fs-fast" ]; then
    echo "Testing fs-fast..."
    ./fs-fast --help > /dev/null && echo "  ✅ fs-fast OK" || echo "  ❌ fs-fast failed"
fi

if [ -f "./qdrant" ]; then
    echo "Testing qdrant..."
    ./qdrant --help > /dev/null && echo "  ✅ qdrant OK" || echo "  ❌ qdrant failed"
fi

if [ -f "./neo4j" ]; then
    echo "Testing neo4j..."  
    ./neo4j --help > /dev/null && echo "  ✅ neo4j OK" || echo "  ❌ neo4j failed"
fi

if [ -f "./postgres" ]; then
    echo "Testing postgres..."
    ./postgres --help > /dev/null && echo "  ✅ postgres OK" || echo "  ❌ postgres failed"
fi

if [ -f "./benchmark" ]; then
    echo "Testing benchmark..."
    ./benchmark --help > /dev/null && echo "  ✅ benchmark OK" || echo "  ❌ benchmark failed"
fi

if [ -f "./llm" ]; then
    echo "Testing llm..."
    ./llm --help > /dev/null && echo "  ✅ llm OK" || echo "  ❌ llm failed"
fi

echo ""
echo "🎉 Build complete! ($BUILT_COUNT/$((${#BINARIES[@]})) tools built)"
echo "📂 Binaries available in both ./tools/ and ./bin/ (symlinked)"
echo ""
echo "📋 Usage examples:"
echo "  # Ultra-fast file operations (use bin/ for convenience)"
echo "  ./bin/fs-fast scan --depth 3 --sizes"
echo "  ./bin/fs-fast read README.md"
echo ""
echo "  # High-performance LLM client (6x faster than Node.js)"
echo "  ./bin/llm 'Hello world'"
echo "  ./bin/llm --list-models"
echo "  ./bin/llm --model=gemini 'Explain AI'"
echo ""
echo "  # Database tools"
echo "  ./bin/qdrant health"
echo "  ./bin/neo4j search 'project entities'"
echo "  ./bin/postgres health"
echo "  ./bin/benchmark all"
echo ""
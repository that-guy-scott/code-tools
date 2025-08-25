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
BINARIES=("chunk")
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

if [ -f "./chunk" ]; then
    echo "Testing chunk..."
    ./chunk --help > /dev/null && echo "  ✅ chunk OK" || echo "  ❌ chunk failed"
fi

echo ""
echo "🎉 Build complete! ($BUILT_COUNT/$((${#BINARIES[@]})) tools built)"
echo "📂 Binaries available in both ./tools/ and ./bin/ (symlinked)"
echo ""
echo "📋 Usage examples:"
echo "  # Text chunking with semantic analysis"
echo "  ./bin/chunk text 'Long document text...' --strategy semantic"
echo "  ./bin/chunk file document.md --strategy smart --size 1000"
echo "  ./bin/chunk batch ./docs --pattern '*.md' --strategy paragraph"
echo ""
echo "  # Traditional chunking strategies"
echo "  ./bin/chunk file code.rs --strategy code --size 800"
echo "  ./bin/chunk text 'Sample text' --strategy sentence --format json"
echo "  ./bin/chunk file article.txt --strategy paragraph --output chunks.json"
echo ""
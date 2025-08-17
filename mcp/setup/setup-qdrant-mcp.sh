#!/bin/bash

# Qdrant MCP Server Setup Script
# Fixes the connection issue by using Python virtual environment

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🎯 Setting up Qdrant MCP Server Connection${NC}"

# Check if Qdrant is running
echo -e "${YELLOW}🔍 Checking Qdrant status...${NC}"
if curl -s http://localhost:6333/collections >/dev/null; then
    echo -e "${GREEN}✅ Qdrant is running and accessible${NC}"
else
    echo -e "${RED}❌ Qdrant is not running. Please start it first:${NC}"
    echo "   docker-compose -f docker-compose.databases.yml up -d qdrant"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv-mcp" ]; then
    echo -e "${YELLOW}📦 Creating Python virtual environment...${NC}"
    python3 -m venv venv-mcp
fi

# Check if Qdrant MCP server is installed
if [ ! -f "venv-mcp/bin/mcp-server-qdrant" ]; then
    echo -e "${YELLOW}📥 Installing Qdrant MCP server...${NC}"
    source venv-mcp/bin/activate
    pip install mcp-server-qdrant
fi

# Remove any existing Qdrant MCP server
echo -e "${YELLOW}🔄 Updating MCP server configuration...${NC}"
claude mcp remove qdrant 2>/dev/null || true

# Add the working Qdrant MCP server
claude mcp add qdrant \
    --env QDRANT_URL="http://localhost:6333" \
    --env COLLECTION_NAME="mcp-memory" \
    --env EMBEDDING_MODEL="sentence-transformers/all-MiniLM-L6-v2" \
    -- /home/owner/repo/code-tools/venv-mcp/bin/mcp-server-qdrant

echo -e "${YELLOW}⏳ Waiting for connection...${NC}"
sleep 5

# Test the connection
if claude mcp list | grep -q "qdrant.*✓ Connected"; then
    echo -e "${GREEN}✅ Qdrant MCP server connected successfully!${NC}"
    
    # Show final status
    echo -e "${BLUE}📊 MCP Server Status:${NC}"
    claude mcp list | grep -c "✓ Connected" | xargs echo "Connected servers:"
    
    echo -e "${GREEN}🎉 Qdrant vector database is now ready for AI operations!${NC}"
    echo ""
    echo -e "${BLUE}🚀 What you can now do:${NC}"
    echo "   • Store and retrieve vector embeddings"
    echo "   • Perform semantic similarity searches"
    echo "   • Build RAG (Retrieval-Augmented Generation) workflows"
    echo "   • Create knowledge graphs with vector search capabilities"
    
else
    echo -e "${RED}❌ Connection failed. Check the logs for details.${NC}"
    exit 1
fi
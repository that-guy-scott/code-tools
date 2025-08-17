#!/bin/bash
# Setup Python MCP servers for local Claude infrastructure
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRASTRUCTURE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${BLUE}🐍 Setting up Python MCP servers...${NC}"

# Create Python virtual environment
if [ ! -d "$INFRASTRUCTURE_DIR/venv-mcp" ]; then
    echo -e "${GREEN}Creating Python virtual environment...${NC}"
    python3 -m venv "$INFRASTRUCTURE_DIR/venv-mcp"
fi

# Activate and install packages
echo -e "${GREEN}Installing MCP servers...${NC}"
source "$INFRASTRUCTURE_DIR/venv-mcp/bin/activate"
pip install --upgrade pip
pip install mcp-server-qdrant

echo -e "${GREEN}✅ Python MCP servers setup complete!${NC}"
echo -e "${YELLOW}Qdrant MCP server available at: $INFRASTRUCTURE_DIR/venv-mcp/bin/mcp-server-qdrant${NC}"
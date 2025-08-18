#!/bin/bash
# Simple MCP Server Setup for Claude Code
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Setting up MCP servers for Claude Code...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Warning: Node.js not found. Please install Node.js first.${NC}"
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo -e "${YELLOW}Warning: Python not found. Some MCP servers require Python.${NC}"
fi

echo -e "${GREEN}Installing Node.js MCP servers...${NC}"

# Install core MCP servers
npm install -g @knowall-ai/mcp-neo4j-agent-memory
npm install -g @alanse/mcp-neo4j-server
npm install -g @modelcontextprotocol/server-postgres
npm install -g @modelcontextprotocol/server-github
npm install -g @modelcontextprotocol/server-puppeteer
npm install -g mcp-server-docker

echo -e "${GREEN}Installing Python MCP servers...${NC}"

# Create Python virtual environment for MCP
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install mcp-server-qdrant

echo -e "${GREEN}✅ MCP servers installed!${NC}"
echo ""
echo -e "${BLUE}📁 Configuration:${NC}"
echo -e "  • Copy ${YELLOW}mcp/servers.json${NC} to your Claude Code settings"
echo -e "  • Update PROJECT_NAME in the PostgreSQL connection string"
echo -e "  • Add your GitHub token to the GitHub server config"
echo ""
echo -e "${YELLOW}⚠️  Configuration Validation:${NC}"

# Check if .mcp.json exists and validate Neo4j config
if [ -f ".mcp.json" ]; then
    echo -e "  • Found .mcp.json configuration"
    
    # Check Neo4j agent memory configuration
    if grep -q '"neo4j-agent-memory"' .mcp.json; then
        if grep -A 10 '"neo4j-agent-memory"' .mcp.json | grep -q '"env"'; then
            echo -e "  • ${GREEN}✅ Neo4j agent memory: Environment variables configured${NC}"
        else
            echo -e "  • ${YELLOW}⚠️  Neo4j agent memory: Using CLI args (should use env vars)${NC}"
            echo -e "    ${YELLOW}Update to use environment variables for proper connection${NC}"
        fi
    fi
else
    echo -e "  • ${YELLOW}⚠️  .mcp.json not found - copy from mcp/servers.json${NC}"
fi

echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo -e "  1. Configure Claude Code to use these MCP servers"
echo -e "  2. Start your database stack: ${YELLOW}docker-compose up -d${NC}"
echo -e "  3. ${YELLOW}⚠️  RESTART Claude Code${NC} after any .mcp.json changes"
echo -e "  4. Test with: ${YELLOW}./bin/llm-cli.js --list-tools${NC}"
echo ""
echo -e "${YELLOW}📖 Documentation:${NC}"
echo -e "  • Setup guide: ${YELLOW}docs/mcp-setup.md${NC}"
echo -e "  • Troubleshooting: ${YELLOW}docs/neo4j-troubleshooting.md${NC}"
#!/bin/bash
# Claude Code MCP Ecosystem Setup
# Quick way to set up Claude Code infrastructure for any project
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${1:-$(pwd)}"

# Handle help request
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Claude Code MCP Ecosystem Setup"
    echo "Usage: $0 [target_directory]"
    echo ""
    echo "If no directory is provided, current directory will be used."
    echo "This will copy Claude Code infrastructure to the target project."
    exit 0
fi

PROJECT_NAME="$(basename "$TARGET_DIR")"

# Banner
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║            Claude Code MCP Ecosystem Setup                  ║"
echo "║              Quick Project Infrastructure                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}Target Directory: $TARGET_DIR${NC}"
echo -e "${YELLOW}Project Name: $PROJECT_NAME${NC}"
echo ""

# Validate target directory
if [ ! -d "$TARGET_DIR" ]; then
    echo -e "${RED}Error: Target directory '$TARGET_DIR' does not exist!${NC}"
    echo "Usage: $0 [target_directory]"
    echo "If no directory is provided, current directory will be used."
    exit 1
fi

cd "$TARGET_DIR"

# Check if files already exist
if [ -f "CLAUDE.md" ] || [ -f "docker-compose.yml" ] || [ -d "bin" ]; then
    echo -e "${YELLOW}⚠ Warning: Some Claude infrastructure files already exist!${NC}"
    read -p "Do you want to overwrite them? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

echo -e "${GREEN}📂 Setting up Claude Code infrastructure...${NC}"

# Copy CLAUDE.md
echo -e "${GREEN}📝 Copying CLAUDE.md...${NC}"
cp "$SCRIPT_DIR/CLAUDE.md" ./CLAUDE.md

# Copy LLM CLI tool
echo -e "${GREEN}🔧 Setting up LLM CLI tool...${NC}"
mkdir -p bin
cp "$SCRIPT_DIR/bin/llm-cli.js" ./bin/llm-cli.js
chmod +x ./bin/llm-cli.js

# Copy environment template
echo -e "${GREEN}⚙️ Creating environment configuration...${NC}"
if [ ! -f ".env" ]; then
    cp "$SCRIPT_DIR/.env.template" ./.env
    # Customize for this project
    sed -i "s/my-project/$PROJECT_NAME/g" ./.env
    sed -i "s|/path/to/your/project|$(pwd)|g" ./.env
    sed -i "s/my_project_dev/${PROJECT_NAME}_dev/g" ./.env
    echo -e "${GREEN}✅ Created .env file - customize as needed${NC}"
else
    echo -e "${YELLOW}⚠ .env file already exists - not overwriting${NC}"
fi

# Copy docker-compose.yml
echo -e "${GREEN}🐳 Setting up database stack...${NC}"
cp "$SCRIPT_DIR/docker-compose.yml" ./docker-compose.yml

# Copy simplified MCP configuration
echo -e "${GREEN}🔌 Setting up MCP servers...${NC}"
mkdir -p mcp
cp "$SCRIPT_DIR/mcp/servers.json" ./mcp/servers.json
cp "$SCRIPT_DIR/mcp/setup-mcp.sh" ./mcp/setup-mcp.sh
chmod +x ./mcp/setup-mcp.sh

# Update .gitignore
echo -e "${GREEN}📝 Updating .gitignore...${NC}"
if [ ! -f ".gitignore" ]; then
    touch .gitignore
fi

# Add Claude-specific ignores if not already present
if ! grep -q "# Claude Code MCP" .gitignore; then
    cat >> .gitignore << 'EOF'

# Claude Code MCP Ecosystem
.env
mcp/venv/
mcp/*.log
EOF
    echo -e "${GREEN}✅ Updated .gitignore${NC}"
fi

# Check prerequisites
echo -e "${GREEN}🔍 Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}⚠ Warning: Docker not found!${NC}"
    echo "Please install Docker to use the database stack."
    DOCKER_MISSING=true
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}⚠ Warning: Docker Compose not found!${NC}"
    echo "Please install Docker Compose to use the database stack."
    COMPOSE_MISSING=true
fi

if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠ Warning: Node.js not found.${NC}"
    echo "Install Node.js to use the LLM CLI tool."
fi

if [ "$DOCKER_MISSING" != "true" ] && [ "$COMPOSE_MISSING" != "true" ]; then
    echo -e "${GREEN}🚀 Starting database stack...${NC}"
    export PROJECT_NAME="$PROJECT_NAME"
    docker-compose up -d
    
    echo -e "${GREEN}⏳ Waiting for services to start...${NC}"
    sleep 10
    
    echo -e "${GREEN}📊 Database stack status:${NC}"
    docker-compose ps
fi

echo ""
echo -e "${GREEN}🎉 Claude Code infrastructure setup complete!${NC}"
echo ""
echo -e "${BLUE}📁 Files Created:${NC}"
echo -e "  ${YELLOW}CLAUDE.md${NC}              # Project instructions for Claude"
echo -e "  ${YELLOW}bin/llm-cli.js${NC}         # Universal LLM CLI tool"
echo -e "  ${YELLOW}docker-compose.yml${NC}     # Database stack"
echo -e "  ${YELLOW}.env${NC}                   # Environment configuration"
echo -e "  ${YELLOW}mcp/servers.json${NC}       # MCP server configuration"
echo -e "  ${YELLOW}mcp/setup-mcp.sh${NC}       # MCP setup script"
echo ""
echo -e "${BLUE}🚀 Quick Start:${NC}"
echo -e "  ${GREEN}./bin/llm-cli.js --project-info${NC}    # Show project info"
echo -e "  ${GREEN}./bin/llm-cli.js --list-tools${NC}      # List MCP tools"
echo -e "  ${GREEN}./mcp/setup-mcp.sh${NC}                 # Setup MCP servers"
echo ""
echo -e "${BLUE}🌐 Database Services:${NC}"
echo -e "  • PostgreSQL: ${YELLOW}localhost:5432${NC} (${PROJECT_NAME}_dev)"
echo -e "  • Neo4j Web:  ${YELLOW}http://localhost:7474${NC} (neo4j/dev_password_123)"
echo -e "  • Redis:      ${YELLOW}localhost:6379${NC}"
echo -e "  • Qdrant:     ${YELLOW}http://localhost:6333${NC}"
echo ""
echo -e "${GREEN}✨ Your project is ready for Claude Code!${NC}"
echo -e "${BLUE}💡 Next: Configure Claude Code to use this project's MCP servers${NC}"
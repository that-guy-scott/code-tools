#!/bin/bash
# Setup Claude local infrastructure for this project
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="$(basename "$SCRIPT_DIR")"
CLAUDE_TEMPLATE_DIR="$SCRIPT_DIR/.claude-template"
CLAUDE_DIR="$SCRIPT_DIR/.claude"

# Banner
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              Claude Local Infrastructure Setup               ║"
echo "║                    Project-Isolated Setup                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}Project: $PROJECT_NAME${NC}"
echo ""

# Check if .claude-template exists
if [ ! -d "$CLAUDE_TEMPLATE_DIR" ]; then
    echo -e "${RED}Error: .claude-template directory not found!${NC}"
    echo "This script should be run from the code-tools project directory."
    echo "The .claude-template directory should exist with the infrastructure template."
    exit 1
fi

# Check if .claude already exists
if [ -d "$CLAUDE_DIR" ]; then
    echo -e "${YELLOW}⚠ Warning: .claude directory already exists!${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
    echo -e "${YELLOW}Backing up existing .claude directory...${NC}"
    mv "$CLAUDE_DIR" "$CLAUDE_DIR.backup.$(date +%Y%m%d_%H%M%S)"
fi

echo -e "${GREEN}📂 Creating Claude infrastructure...${NC}"

# Copy template
cp -r "$CLAUDE_TEMPLATE_DIR" "$CLAUDE_DIR"

# Customize for this project
echo -e "${GREEN}🔧 Customizing for project: $PROJECT_NAME${NC}"

# Replace PROJECT_NAME in all files
find "$CLAUDE_DIR" -type f -name "*.json" -o -name "*.yml" -o -name "*.yaml" -o -name "*.md" | xargs sed -i "s/PROJECT_NAME/$PROJECT_NAME/g"

# Make scripts executable
chmod +x "$CLAUDE_DIR/infrastructure/bin/llm"
chmod +x "$CLAUDE_DIR/infrastructure/scripts/"*.sh

# Create data directories
mkdir -p "$CLAUDE_DIR/data"/{postgres,neo4j/{data,logs,import,plugins},redis,qdrant}

# Create .gitignore for data directory
cat > "$CLAUDE_DIR/data/.gitignore" << 'EOF'
# Ignore all database data but keep directory structure
*
!.gitignore
EOF

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠ Warning: Node.js not found. Install Node.js for CLI functionality.${NC}"
fi

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker not found!${NC}"
    echo "Please install Docker to use the database stack."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose not found!${NC}"
    echo "Please install Docker Compose to use the database stack."
    exit 1
fi

echo -e "${GREEN}🐳 Starting database stack...${NC}"
cd "$CLAUDE_DIR"
export PROJECT_NAME="$PROJECT_NAME"
docker-compose up -d

# Wait for services
echo -e "${GREEN}⏳ Waiting for services to start...${NC}"
sleep 15

# Check service status
echo -e "${GREEN}📊 Checking service health...${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}🎉 Claude local infrastructure setup complete!${NC}"
echo ""
echo -e "${BLUE}📁 Project Structure:${NC}"
echo -e "  ${YELLOW}.claude/${NC}                     # Claude infrastructure"
echo -e "  ${YELLOW}.claude/bin/llm${NC}             # Local CLI"
echo -e "  ${YELLOW}.claude/docker-compose.yml${NC}  # Database stack"
echo -e "  ${YELLOW}.claude/.mcp.json${NC}           # MCP configuration"
echo -e "  ${YELLOW}.claude/data/${NC}               # Database data (gitignored)"
echo ""
echo -e "${BLUE}🚀 Quick Start:${NC}"
echo -e "  ${GREEN}./.claude/bin/llm --project-info${NC}      # Show project info"
echo -e "  ${GREEN}./.claude/bin/llm --list-tools${NC}        # List MCP tools"
echo -e "  ${GREEN}./.claude/bin/llm \"Hello world\"${NC}       # Test prompt"
echo ""
echo -e "${BLUE}🛠 Management:${NC}"
echo -e "  ${GREEN}./.claude/infrastructure/scripts/start-databases.sh${NC}  # Start services"
echo -e "  ${GREEN}./.claude/infrastructure/scripts/stop-databases.sh${NC}   # Stop services"
echo ""
echo -e "${BLUE}🌐 Service URLs:${NC}"
echo -e "  • PostgreSQL: ${YELLOW}localhost:5432${NC} (DB: ${PROJECT_NAME}_claude_dev)"
echo -e "  • Neo4j Web:  ${YELLOW}http://localhost:7474${NC} (neo4j/dev_password_123)"
echo -e "  • Redis:      ${YELLOW}localhost:6379${NC}"
echo -e "  • Qdrant:     ${YELLOW}http://localhost:6333${NC}"
echo ""
echo -e "${GREEN}✨ Your project now has isolated Claude infrastructure!${NC}"

# Add to .gitignore if it exists
if [ -f "$SCRIPT_DIR/.gitignore" ]; then
    if ! grep -q "^\.claude/data/" "$SCRIPT_DIR/.gitignore"; then
        echo -e "${GREEN}📝 Adding .claude/data/ to .gitignore...${NC}"
        echo "" >> "$SCRIPT_DIR/.gitignore"
        echo "# Claude local infrastructure data" >> "$SCRIPT_DIR/.gitignore"
        echo ".claude/data/" >> "$SCRIPT_DIR/.gitignore"
    fi
fi
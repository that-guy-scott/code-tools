#!/bin/bash
# Stop local Claude database stack for this project
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get project information
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROJECT_ROOT="$(cd "$CLAUDE_DIR/.." && pwd)"
PROJECT_NAME="$(basename "$PROJECT_ROOT")"

echo -e "${BLUE}🛑 Stopping Claude Database Stack${NC}"
echo -e "${YELLOW}Project: $PROJECT_NAME${NC}"
echo ""

# Change to Claude directory
cd "$CLAUDE_DIR"

# Set project name for docker-compose
export PROJECT_NAME="$PROJECT_NAME"

# Stop services
echo -e "${GREEN}Stopping database services...${NC}"
docker-compose down

echo ""
echo -e "${GREEN}✅ Database stack stopped successfully!${NC}"
echo ""
echo -e "${BLUE}Data preserved in:${NC} ${YELLOW}./.claude/data/${NC}"
echo -e "${BLUE}To restart:${NC} ${YELLOW}./.claude/infrastructure/scripts/start-databases.sh${NC}"
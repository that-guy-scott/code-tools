#!/bin/bash
# Start local Claude database stack for this project
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

echo -e "${BLUE}🚀 Starting Claude Database Stack${NC}"
echo -e "${YELLOW}Project: $PROJECT_NAME${NC}"
echo ""

# Change to Claude directory
cd "$CLAUDE_DIR"

# Create data directories if they don't exist
mkdir -p data/{postgres,neo4j/{data,logs,import,plugins},redis,qdrant}

# Set project name for docker-compose
export PROJECT_NAME="$PROJECT_NAME"

# Start services
echo -e "${GREEN}Starting database services...${NC}"
docker-compose up -d

# Wait for services to be healthy
echo -e "${GREEN}Waiting for services to start...${NC}"
sleep 10

# Check service status
echo -e "${GREEN}Checking service health...${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}✅ Database stack started successfully!${NC}"
echo ""
echo -e "${BLUE}Service URLs:${NC}"
echo -e "  • PostgreSQL: ${YELLOW}localhost:5432${NC} (Database: ${PROJECT_NAME}_claude_dev)"
echo -e "  • Neo4j Web:  ${YELLOW}http://localhost:7474${NC} (neo4j/dev_password_123)"
echo -e "  • Redis:      ${YELLOW}localhost:6379${NC}"
echo -e "  • Qdrant:     ${YELLOW}http://localhost:6333${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  • Test CLI: ${YELLOW}./.claude/bin/llm --project-info${NC}"
echo -e "  • Check MCP: ${YELLOW}claude mcp list${NC}"
echo -e "  • Stop services: ${YELLOW}./.claude/infrastructure/scripts/stop-databases.sh${NC}"
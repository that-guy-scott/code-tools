#!/bin/bash

# Enhanced Database Stack Startup Script
# PostgreSQL + Redis + Qdrant with MCP Integration

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Enhanced Database Stack...${NC}"

# Start core database services
echo -e "${YELLOW}📊 Starting PostgreSQL, Redis, and Qdrant...${NC}"
docker-compose -f docker-compose.databases.yml up -d postgres redis qdrant

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to initialize...${NC}"
sleep 15

# Check PostgreSQL
echo -e "${YELLOW}🔍 Checking PostgreSQL...${NC}"
if docker-compose -f docker-compose.databases.yml exec -T postgres pg_isready -U codetools -d codetools_dev; then
    echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
else
    echo -e "${RED}❌ PostgreSQL failed to start${NC}"
    exit 1
fi

# Check Redis
echo -e "${YELLOW}🔍 Checking Redis...${NC}"
if docker-compose -f docker-compose.databases.yml exec -T redis redis-cli ping | grep -q PONG; then
    echo -e "${GREEN}✅ Redis is ready${NC}"
else
    echo -e "${RED}❌ Redis failed to start${NC}"
    exit 1
fi

# Check Qdrant
echo -e "${YELLOW}🔍 Checking Qdrant...${NC}"
if curl -s http://localhost:6333/health | grep -q "ok"; then
    echo -e "${GREEN}✅ Qdrant is ready${NC}"
else
    echo -e "${YELLOW}⏳ Qdrant still starting up...${NC}"
    sleep 10
    if curl -s http://localhost:6333/health | grep -q "ok"; then
        echo -e "${GREEN}✅ Qdrant is ready${NC}"
    else
        echo -e "${RED}❌ Qdrant failed to start${NC}"
    fi
fi

# Display service information
echo -e "${BLUE}📋 Database Services Status:${NC}"
docker-compose -f docker-compose.databases.yml ps

echo -e "${GREEN}✅ Enhanced Database Stack Ready!${NC}"
echo ""
echo -e "${BLUE}🌐 Access URLs:${NC}"
echo "   • PostgreSQL: localhost:5432 (user: codetools, db: codetools_dev)"
echo "   • Redis: localhost:6379"
echo "   • Qdrant HTTP API: http://localhost:6333"
echo "   • Qdrant gRPC API: localhost:6334"
echo "   • Qdrant Web UI: http://localhost:6333/dashboard"
echo ""
echo -e "${BLUE}🛠️  Management Commands:${NC}"
echo "   • docker-compose -f docker-compose.databases.yml ps"
echo "   • docker-compose -f docker-compose.databases.yml logs [service]"
echo "   • docker-compose -f docker-compose.databases.yml --profile admin up -d"
echo ""
echo -e "${YELLOW}🔧 MCP Integration:${NC}"
echo "   • Run: claude mcp list"
echo "   • Qdrant MCP server should connect automatically"
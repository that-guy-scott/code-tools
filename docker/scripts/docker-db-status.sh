#!/bin/bash

# Enhanced Database Stack Status Check

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}📊 Enhanced Database Stack Status${NC}"
echo "========================================"

# Container Status
echo -e "${YELLOW}🐳 Container Status:${NC}"
docker-compose -f docker-compose.databases.yml ps
echo ""

# Service Health Checks
echo -e "${YELLOW}🏥 Health Checks:${NC}"

# PostgreSQL
echo -n "PostgreSQL: "
if docker-compose -f docker-compose.databases.yml exec -T postgres pg_isready -U codetools -d codetools_dev &>/dev/null; then
    echo -e "${GREEN}✅ Healthy${NC}"
else
    echo -e "${RED}❌ Unhealthy${NC}"
fi

# Redis
echo -n "Redis: "
if docker-compose -f docker-compose.databases.yml exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
    echo -e "${GREEN}✅ Healthy${NC}"
else
    echo -e "${RED}❌ Unhealthy${NC}"
fi

# Qdrant
echo -n "Qdrant: "
if curl -s http://localhost:6333/collections 2>/dev/null | grep -q "ok"; then
    echo -e "${GREEN}✅ Healthy${NC}"
else
    echo -e "${RED}❌ Unhealthy${NC}"
fi

echo ""

# Connection Information
echo -e "${YELLOW}🌐 Connection Information:${NC}"
echo "PostgreSQL: localhost:5432"
echo "  Database: codetools_dev"
echo "  Username: codetools"
echo "  Password: dev_password_123"
echo ""
echo "Redis: localhost:6379"
echo ""
echo "Qdrant:"
echo "  HTTP API: http://localhost:6333"
echo "  gRPC API: localhost:6334"
echo "  Web UI: http://localhost:6333/dashboard"
echo ""

# MCP Status
echo -e "${YELLOW}🤖 MCP Server Status:${NC}"
claude mcp list 2>/dev/null | grep -E "(postgres|redis|qdrant|database)" || echo "No database MCP servers found"

echo ""

# Resource Usage
echo -e "${YELLOW}📈 Resource Usage:${NC}"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" $(docker-compose -f docker-compose.databases.yml ps -q) 2>/dev/null || echo "Unable to get resource stats"
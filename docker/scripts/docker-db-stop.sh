#!/bin/bash

# Enhanced Database Stack Stop Script

set -e

# Colors
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🛑 Stopping Enhanced Database Stack...${NC}"

# Stop all database services
echo -e "${YELLOW}📊 Stopping PostgreSQL, Redis, and Qdrant...${NC}"
docker-compose -f docker-compose.databases.yml down

echo -e "${RED}✅ Database stack stopped${NC}"
echo ""
echo -e "${BLUE}📋 Final Status:${NC}"
docker ps --filter "name=code-tools" --format "table {{.Names}}\t{{.Status}}"
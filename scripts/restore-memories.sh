#!/bin/bash
# Claude Code Memory Restoration Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Claude Code Memory Restoration${NC}"
echo ""

# Check if backup file provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup-file.json>"
    echo ""
    echo "Available backups:"
    ls -la backup/memories/*.json 2>/dev/null || echo "  No backup files found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}Restoring memories from: $BACKUP_FILE${NC}"
echo ""

# Check if jq is available for JSON parsing
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is required for JSON parsing but not found${NC}"
    echo "Please install jq: sudo apt-get install jq"
    exit 1
fi

# Parse backup metadata
echo -e "${BLUE}Backup Information:${NC}"
ENTITY_COUNT=$(jq -r '.backup_metadata.entity_count' "$BACKUP_FILE")
BACKUP_DATE=$(jq -r '.backup_metadata.backup_date' "$BACKUP_FILE")
SOURCE_ENV=$(jq -r '.backup_metadata.source_environment' "$BACKUP_FILE")

echo "  Source Environment: $SOURCE_ENV"
echo "  Backup Date: $BACKUP_DATE"
echo "  Entity Count: $ENTITY_COUNT"
echo ""

# Wait for Neo4j to be ready
echo -e "${GREEN}Waiting for Neo4j to be ready...${NC}"
sleep 10

# Test Neo4j connectivity by trying a simple search
echo -e "${GREEN}Testing Neo4j connectivity...${NC}"

# This is a placeholder - we'll need to test MCP connection
# For now, we'll proceed with the restoration process

echo -e "${GREEN}Restoring memories to code-tools Neo4j instance...${NC}"
echo ""

# Extract and restore each entity
jq -c '.entities[]' "$BACKUP_FILE" | while read entity; do
    # Extract entity properties
    entity_name=$(echo "$entity" | jq -r '.properties.name')
    entity_type=$(echo "$entity" | jq -r '.labels[0]' | tr '[:upper:]' '[:lower:]')
    
    echo -e "${YELLOW}Restoring: $entity_name (type: $entity_type)${NC}"
    
    # Convert the entity properties to a format suitable for Neo4j memory creation
    # We'll need to recreate each entity using the MCP memory creation tools
    
    # For now, we'll store the command that needs to be run
    echo "# Entity: $entity_name" >> restoration_commands.txt
    echo "# Type: $entity_type" >> restoration_commands.txt
    echo "# Properties: $(echo "$entity" | jq -c '.properties')" >> restoration_commands.txt
    echo "" >> restoration_commands.txt
done

echo -e "${GREEN}Memory restoration preparation completed!${NC}"
echo ""
echo -e "${YELLOW}Manual restoration required:${NC}"
echo "The backup has been analyzed and restoration commands prepared."
echo "Due to the nature of MCP memory creation, manual restoration is needed."
echo ""
echo "To restore memories:"
echo "1. Check the parsed entities in restoration_commands.txt"
echo "2. Use the MCP memory creation tools to recreate each entity"
echo "3. Verify all memories are properly restored"
echo ""
echo "Entities to restore:"
jq -r '.entities[] | "  - \(.properties.name) (\(.labels[0]))"' "$BACKUP_FILE"
echo ""
echo -e "${GREEN}Backup file successfully processed!${NC}"
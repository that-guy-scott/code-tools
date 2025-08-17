#!/bin/bash

# Neo4j Backup Script for Code-Tools Knowledge Graph
# Creates comprehensive backups of Neo4j database including data and metadata

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
NEO4J_CONTAINER="code-tools-neo4j"
NEO4J_USER="neo4j"
NEO4J_PASSWORD="dev_password_123"
BACKUP_DIR="./backups/neo4j"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="neo4j_backup_$TIMESTAMP"

print_header() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    Neo4j Backup Tool                        ║"
    echo "║               🗄️  Knowledge Graph Backup 🗄️                 ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check if Neo4j container is running
    if ! docker ps | grep -q "$NEO4J_CONTAINER"; then
        print_error "Neo4j container '$NEO4J_CONTAINER' is not running"
        print_warning "Start with: docker-compose -f docker-compose.databases.yml up -d neo4j"
        exit 1
    fi
    print_success "Neo4j container is running"
    
    # Check if cypher-shell is available in container
    if ! docker exec "$NEO4J_CONTAINER" which cypher-shell > /dev/null 2>&1; then
        print_error "cypher-shell not available in Neo4j container"
        exit 1
    fi
    print_success "cypher-shell available"
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    print_success "Backup directory ready: $BACKUP_DIR"
}

export_cypher_dump() {
    print_step "Creating Cypher dump..."
    
    local dump_file="$BACKUP_DIR/${BACKUP_NAME}.cypher"
    
    # Export all data as Cypher statements
    docker exec "$NEO4J_CONTAINER" cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" \
        "CALL apoc.export.cypher.all('$BACKUP_NAME.cypher', {format: 'cypher-shell', useOptimizations: {type: 'UNWIND_BATCH', unwindBatchSize: 20}})" \
        > /dev/null 2>&1 || {
        print_warning "APOC export failed, using manual export"
        export_manual_cypher "$dump_file"
        return
    }
    
    # Copy from container to host
    docker cp "$NEO4J_CONTAINER:/var/lib/neo4j/import/$BACKUP_NAME.cypher" "$dump_file"
    
    # Cleanup container file
    docker exec "$NEO4J_CONTAINER" rm -f "/var/lib/neo4j/import/$BACKUP_NAME.cypher"
    
    print_success "Cypher dump created: $dump_file"
}

export_manual_cypher() {
    local dump_file="$1"
    print_step "Creating manual Cypher export..."
    
    {
        echo "// Neo4j Knowledge Graph Backup - $TIMESTAMP"
        echo "// Created by code-tools backup system"
        echo ""
        echo "// Clear existing data"
        echo "MATCH (n) DETACH DELETE n;"
        echo ""
        echo "// Create entities"
        
        # Export entities
        docker exec "$NEO4J_CONTAINER" cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" \
            --format plain \
            "MATCH (e:Entity) RETURN 'CREATE (e:Entity {name: \"' + e.name + '\", entityType: \"' + e.entityType + '\", observations: ' + toString(e.observations) + ', created_at: datetime(), migrated_from: \"backup_restore\"});' as statement" \
            | tail -n +2
        
        echo ""
        echo "// Create relationships"
        
        # Export relationships
        docker exec "$NEO4J_CONTAINER" cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" \
            --format plain \
            "MATCH (a:Entity)-[r:RELATES]->(b:Entity) RETURN 'MATCH (a:Entity {name: \"' + a.name + '\"}) MATCH (b:Entity {name: \"' + b.name + '\"}) CREATE (a)-[r:RELATES {type: \"' + r.type + '\", created_at: datetime(), migrated_from: \"backup_restore\"}]->(b);' as statement" \
            | tail -n +2
        
    } > "$dump_file"
    
    print_success "Manual Cypher export created: $dump_file"
}

export_json_format() {
    print_step "Creating JSON export..."
    
    local json_file="$BACKUP_DIR/${BACKUP_NAME}.json"
    
    {
        echo "{"
        echo '  "metadata": {'
        echo "    \"backup_date\": \"$TIMESTAMP\","
        echo "    \"source\": \"neo4j_backup_script\","
        echo "    \"version\": \"1.0\""
        echo "  },"
        echo '  "entities": ['
        
        # Export entities as JSON
        docker exec "$NEO4J_CONTAINER" cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" \
            --format plain \
            "MATCH (e:Entity) RETURN '{\"name\": \"' + e.name + '\", \"entityType\": \"' + e.entityType + '\", \"observations\": ' + toString(e.observations) + '}' as json" \
            | tail -n +2 | sed 's/$/,/' | sed '$s/,$//'
        
        echo "  ],"
        echo '  "relationships": ['
        
        # Export relationships as JSON
        docker exec "$NEO4J_CONTAINER" cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" \
            --format plain \
            "MATCH (a:Entity)-[r:RELATES]->(b:Entity) RETURN '{\"from\": \"' + a.name + '\", \"to\": \"' + b.name + '\", \"type\": \"' + r.type + '\"}' as json" \
            | tail -n +2 | sed 's/$/,/' | sed '$s/,$//'
        
        echo "  ]"
        echo "}"
        
    } > "$json_file"
    
    print_success "JSON export created: $json_file"
}

create_database_dump() {
    print_step "Creating database file backup..."
    
    # Stop Neo4j container temporarily for consistent backup
    print_warning "Temporarily stopping Neo4j for file backup..."
    docker stop "$NEO4J_CONTAINER"
    
    # Create tar archive of data directory
    local tar_file="$BACKUP_DIR/${BACKUP_NAME}_database.tar.gz"
    docker run --rm \
        -v "$(pwd)/data/neo4j:/source:ro" \
        -v "$(pwd)/$BACKUP_DIR:/backup" \
        alpine:latest \
        tar -czf "/backup/$(basename "$tar_file")" -C /source .
    
    # Restart Neo4j container
    print_step "Restarting Neo4j..."
    docker start "$NEO4J_CONTAINER"
    
    # Wait for Neo4j to be ready
    print_step "Waiting for Neo4j to be ready..."
    local retries=30
    while [ $retries -gt 0 ]; do
        if docker exec "$NEO4J_CONTAINER" cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" "RETURN 1" > /dev/null 2>&1; then
            break
        fi
        sleep 2
        ((retries--))
    done
    
    if [ $retries -eq 0 ]; then
        print_error "Neo4j failed to restart properly"
        exit 1
    fi
    
    print_success "Database file backup created: $tar_file"
}

create_metadata() {
    print_step "Creating backup metadata..."
    
    local metadata_file="$BACKUP_DIR/${BACKUP_NAME}_metadata.txt"
    
    {
        echo "Neo4j Backup Metadata"
        echo "====================="
        echo "Backup Date: $TIMESTAMP"
        echo "Container: $NEO4J_CONTAINER"
        echo "Backup Directory: $BACKUP_DIR"
        echo "Backup Name: $BACKUP_NAME"
        echo ""
        echo "Database Statistics:"
        
        # Get database statistics
        docker exec "$NEO4J_CONTAINER" cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" \
            --format plain \
            "MATCH (e:Entity) RETURN 'Total Entities: ' + toString(count(e)) as stat" | tail -n 1
        
        docker exec "$NEO4J_CONTAINER" cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" \
            --format plain \
            "MATCH ()-[r:RELATES]->() RETURN 'Total Relationships: ' + toString(count(r)) as stat" | tail -n 1
        
        docker exec "$NEO4J_CONTAINER" cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" \
            --format plain \
            "MATCH (e:Entity) RETURN 'Entity Types: ' + toString(count(DISTINCT e.entityType)) as stat" | tail -n 1
        
        echo ""
        echo "Files Created:"
        echo "- ${BACKUP_NAME}.cypher (Cypher dump)"
        echo "- ${BACKUP_NAME}.json (JSON export)"
        echo "- ${BACKUP_NAME}_database.tar.gz (Database files)"
        echo "- ${BACKUP_NAME}_metadata.txt (This file)"
        
    } > "$metadata_file"
    
    print_success "Metadata created: $metadata_file"
}

cleanup_old_backups() {
    print_step "Cleaning up old backups..."
    
    # Keep only the 10 most recent backups
    local backup_count=$(ls -1 "$BACKUP_DIR"/neo4j_backup_*_metadata.txt 2>/dev/null | wc -l)
    
    if [ "$backup_count" -gt 10 ]; then
        local to_delete=$((backup_count - 10))
        print_warning "Found $backup_count backups, removing $to_delete oldest ones"
        
        ls -1t "$BACKUP_DIR"/neo4j_backup_*_metadata.txt | tail -n "$to_delete" | while read metadata_file; do
            local base_name=$(basename "$metadata_file" "_metadata.txt")
            rm -f "$BACKUP_DIR/$base_name"*
            print_success "Removed old backup: $base_name"
        done
    else
        print_success "No old backups to clean up ($backup_count/10)"
    fi
}

show_summary() {
    local backup_size=$(du -h "$BACKUP_DIR/${BACKUP_NAME}"* | awk '{total+=$1} END {print total "B"}' 2>/dev/null || echo "Unknown")
    
    echo
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    BACKUP COMPLETE! 🎉                      ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${BLUE}📊 Backup Summary:${NC}"
    echo "   Backup Name: $BACKUP_NAME"
    echo "   Location: $BACKUP_DIR"
    echo "   Size: $backup_size"
    echo "   Files Created:"
    echo "     - ${BACKUP_NAME}.cypher (Cypher dump)"
    echo "     - ${BACKUP_NAME}.json (JSON export)"  
    echo "     - ${BACKUP_NAME}_database.tar.gz (Database files)"
    echo "     - ${BACKUP_NAME}_metadata.txt (Metadata)"
    echo
    echo -e "${BLUE}🔧 Restore Commands:${NC}"
    echo "   Full restore: ./scripts/neo4j-restore.sh $BACKUP_NAME"
    echo "   Cypher restore: cypher-shell < $BACKUP_DIR/${BACKUP_NAME}.cypher"
    echo
}

main() {
    print_header
    
    check_prerequisites
    export_cypher_dump
    export_json_format
    create_database_dump
    create_metadata
    cleanup_old_backups
    show_summary
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --no-cleanup        Skip cleanup of old backups"
        echo "  --cypher-only       Create only Cypher dump"
        echo "  --json-only         Create only JSON export"
        exit 0
        ;;
    --no-cleanup)
        SKIP_CLEANUP=true
        ;;
    --cypher-only)
        CYPHER_ONLY=true
        ;;
    --json-only)
        JSON_ONLY=true
        ;;
esac

# Run main backup
main "$@"
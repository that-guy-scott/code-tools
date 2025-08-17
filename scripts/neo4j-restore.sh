#!/bin/bash

# Neo4j Restore Script for Code-Tools Knowledge Graph
# Restores Neo4j database from backups created by neo4j-backup.sh

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

print_header() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    Neo4j Restore Tool                       ║"
    echo "║               🔄  Knowledge Graph Restore 🔄                ║"
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

print_usage() {
    echo "Usage: $0 [backup_name] [options]"
    echo ""
    echo "Arguments:"
    echo "  backup_name         Name of backup to restore (without extension)"
    echo "                      Example: neo4j_backup_20240117_143022"
    echo ""
    echo "Options:"
    echo "  --help, -h          Show this help message"
    echo "  --list              List available backups"
    echo "  --cypher-only       Restore only from Cypher dump"
    echo "  --database-only     Restore only from database files"
    echo "  --force             Skip confirmation prompt"
    echo ""
    echo "Examples:"
    echo "  $0 --list"
    echo "  $0 neo4j_backup_20240117_143022"
    echo "  $0 neo4j_backup_20240117_143022 --cypher-only"
}

list_backups() {
    print_step "Available backups:"
    echo
    
    if [ ! -d "$BACKUP_DIR" ]; then
        print_warning "No backup directory found: $BACKUP_DIR"
        return
    fi
    
    local backup_count=0
    for metadata_file in "$BACKUP_DIR"/neo4j_backup_*_metadata.txt; do
        if [ -f "$metadata_file" ]; then
            local backup_name=$(basename "$metadata_file" "_metadata.txt")
            local backup_date=$(grep "Backup Date:" "$metadata_file" | cut -d' ' -f3-4)
            local entity_count=$(grep "Total Entities:" "$metadata_file" | cut -d' ' -f3)
            local relation_count=$(grep "Total Relationships:" "$metadata_file" | cut -d' ' -f3)
            
            echo -e "${BLUE}📦 $backup_name${NC}"
            echo "   Date: $backup_date"
            echo "   Entities: $entity_count, Relationships: $relation_count"
            echo
            ((backup_count++))
        fi
    done
    
    if [ $backup_count -eq 0 ]; then
        print_warning "No backups found in $BACKUP_DIR"
        echo "Create a backup first with: ./scripts/neo4j-backup.sh"
    else
        print_success "Found $backup_count backup(s)"
        echo "Use: $0 <backup_name> to restore"
    fi
}

check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check if backup name provided
    if [ -z "$BACKUP_NAME" ]; then
        print_error "No backup name specified"
        print_usage
        exit 1
    fi
    
    # Check if backup files exist
    if [ ! -f "$BACKUP_DIR/${BACKUP_NAME}_metadata.txt" ]; then
        print_error "Backup not found: $BACKUP_NAME"
        echo "Available backups:"
        list_backups
        exit 1
    fi
    print_success "Backup found: $BACKUP_NAME"
    
    # Check if Neo4j container exists
    if ! docker ps -a | grep -q "$NEO4J_CONTAINER"; then
        print_error "Neo4j container '$NEO4J_CONTAINER' not found"
        print_warning "Start with: docker-compose -f docker-compose.databases.yml up -d neo4j"
        exit 1
    fi
    print_success "Neo4j container found"
}

show_backup_info() {
    print_step "Backup Information:"
    echo
    cat "$BACKUP_DIR/${BACKUP_NAME}_metadata.txt"
    echo
}

confirm_restore() {
    if [ "$FORCE_RESTORE" = true ]; then
        return 0
    fi
    
    echo -e "${YELLOW}"
    echo "⚠️  WARNING: This will completely replace all data in Neo4j!"
    echo "             All existing entities and relationships will be lost."
    echo -e "${NC}"
    
    read -p "Are you sure you want to proceed? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_warning "Restore cancelled by user"
        exit 0
    fi
}

stop_neo4j() {
    print_step "Stopping Neo4j container..."
    
    if docker ps | grep -q "$NEO4J_CONTAINER"; then
        docker stop "$NEO4J_CONTAINER"
        print_success "Neo4j stopped"
    else
        print_success "Neo4j already stopped"
    fi
}

start_neo4j() {
    print_step "Starting Neo4j container..."
    
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
        print_error "Neo4j failed to start properly"
        exit 1
    fi
    
    print_success "Neo4j is ready"
}

restore_from_database_files() {
    print_step "Restoring from database files..."
    
    local tar_file="$BACKUP_DIR/${BACKUP_NAME}_database.tar.gz"
    
    if [ ! -f "$tar_file" ]; then
        print_error "Database backup file not found: $tar_file"
        return 1
    fi
    
    stop_neo4j
    
    # Remove existing data
    print_step "Removing existing Neo4j data..."
    rm -rf "./data/neo4j/*"
    
    # Extract backup
    print_step "Extracting database backup..."
    docker run --rm \
        -v "$(pwd)/$BACKUP_DIR:/backup:ro" \
        -v "$(pwd)/data/neo4j:/target" \
        alpine:latest \
        tar -xzf "/backup/$(basename "$tar_file")" -C /target
    
    start_neo4j
    print_success "Database files restored"
}

restore_from_cypher() {
    print_step "Restoring from Cypher dump..."
    
    local cypher_file="$BACKUP_DIR/${BACKUP_NAME}.cypher"
    
    if [ ! -f "$cypher_file" ]; then
        print_error "Cypher dump file not found: $cypher_file"
        return 1
    fi
    
    # Ensure Neo4j is running
    if ! docker ps | grep -q "$NEO4J_CONTAINER"; then
        start_neo4j
    fi
    
    # Clear existing data
    print_step "Clearing existing data..."
    docker exec "$NEO4J_CONTAINER" cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" \
        "MATCH (n) DETACH DELETE n" > /dev/null 2>&1
    
    # Copy cypher file to container
    docker cp "$cypher_file" "$NEO4J_CONTAINER:/var/lib/neo4j/import/"
    
    # Execute cypher file
    print_step "Executing Cypher restore..."
    docker exec "$NEO4J_CONTAINER" cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" \
        -f "/var/lib/neo4j/import/$(basename "$cypher_file")"
    
    # Cleanup
    docker exec "$NEO4J_CONTAINER" rm -f "/var/lib/neo4j/import/$(basename "$cypher_file")"
    
    print_success "Cypher restore completed"
}

verify_restore() {
    print_step "Verifying restore..."
    
    # Get current database statistics
    local entity_count=$(docker exec "$NEO4J_CONTAINER" cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" \
        --format plain "MATCH (e:Entity) RETURN count(e) as count" | tail -n 1)
    
    local relation_count=$(docker exec "$NEO4J_CONTAINER" cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" \
        --format plain "MATCH ()-[r:RELATES]->() RETURN count(r) as count" | tail -n 1)
    
    # Get expected counts from backup metadata
    local expected_entities=$(grep "Total Entities:" "$BACKUP_DIR/${BACKUP_NAME}_metadata.txt" | grep -o '[0-9]\+')
    local expected_relations=$(grep "Total Relationships:" "$BACKUP_DIR/${BACKUP_NAME}_metadata.txt" | grep -o '[0-9]\+')
    
    echo
    echo -e "${BLUE}📊 Verification Results:${NC}"
    echo "   Current Entities: $entity_count"
    echo "   Expected Entities: $expected_entities"
    echo "   Current Relationships: $relation_count"
    echo "   Expected Relationships: $expected_relations"
    
    if [ "$entity_count" = "$expected_entities" ] && [ "$relation_count" = "$expected_relations" ]; then
        print_success "Restore verification successful!"
    else
        print_warning "Restore verification found discrepancies"
        print_warning "This might be normal if backup was created with different data"
    fi
}

show_completion_summary() {
    echo
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    RESTORE COMPLETE! 🎉                     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${BLUE}🚀 Next Steps:${NC}"
    echo "1. Open Neo4j Browser: http://localhost:7474"
    echo "2. Login with: neo4j / dev_password_123"
    echo "3. Verify your data with sample queries"
    echo "4. Test MCP server connectivity"
    echo
    echo -e "${BLUE}📊 Sample Verification Queries:${NC}"
    echo "   MATCH (e:Entity) RETURN e.entityType, count(e) ORDER BY count(e) DESC"
    echo "   MATCH (e:Entity)-[r:RELATES]-() RETURN e.name, count(r) ORDER BY count(r) DESC LIMIT 10"
    echo
    echo -e "${BLUE}🔧 Troubleshooting:${NC}"
    echo "   - Check Neo4j logs: docker logs code-tools-neo4j"
    echo "   - Test MCP connectivity: use Claude to query knowledge graph"
    echo "   - Create new backup: ./scripts/neo4j-backup.sh"
    echo
}

main() {
    print_header
    
    case "$RESTORE_METHOD" in
        "cypher-only")
            check_prerequisites
            show_backup_info
            confirm_restore
            restore_from_cypher
            verify_restore
            ;;
        "database-only")
            check_prerequisites
            show_backup_info
            confirm_restore
            restore_from_database_files
            verify_restore
            ;;
        *)
            check_prerequisites
            show_backup_info
            confirm_restore
            
            # Try database files first (more complete), fallback to cypher
            if [ -f "$BACKUP_DIR/${BACKUP_NAME}_database.tar.gz" ]; then
                restore_from_database_files
            else
                print_warning "Database file backup not found, using Cypher dump"
                restore_from_cypher
            fi
            verify_restore
            ;;
    esac
    
    show_completion_summary
}

# Parse arguments
BACKUP_NAME=""
RESTORE_METHOD="full"
FORCE_RESTORE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            print_usage
            exit 0
            ;;
        --list)
            list_backups
            exit 0
            ;;
        --cypher-only)
            RESTORE_METHOD="cypher-only"
            shift
            ;;
        --database-only)
            RESTORE_METHOD="database-only"
            shift
            ;;
        --force)
            FORCE_RESTORE=true
            shift
            ;;
        -*)
            print_error "Unknown option: $1"
            print_usage
            exit 1
            ;;
        *)
            if [ -z "$BACKUP_NAME" ]; then
                BACKUP_NAME="$1"
            else
                print_error "Multiple backup names specified"
                print_usage
                exit 1
            fi
            shift
            ;;
    esac
done

# Run main restore process
main "$@"
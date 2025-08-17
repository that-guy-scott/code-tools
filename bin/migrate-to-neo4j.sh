#!/bin/bash

# Code-Tools: JSON Memory → Neo4j Migration Script
# Safely migrates existing memory.json data to Neo4j graph database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║            JSON Memory → Neo4j Migration Tool               ║"
    echo "║                 🔄 Knowledge Graph Transfer 🔄               ║"
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
    
    # Check if memory.json exists
    if [ ! -f "./memory.json" ]; then
        print_error "memory.json not found in current directory"
        print_warning "Please ensure memory.json exists before running migration"
        exit 1
    fi
    print_success "Found memory.json"
    
    # Check if Neo4j is running
    if ! curl -s http://localhost:7474 > /dev/null; then
        print_error "Neo4j is not running on localhost:7474"
        print_warning "Please start Neo4j with: docker-compose -f docker-compose.databases.yml up -d neo4j"
        exit 1
    fi
    print_success "Neo4j is running"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    print_success "Node.js found: $(node --version)"
}

install_dependencies() {
    print_step "Installing migration dependencies..."
    
    cd scripts
    if [ ! -f "node_modules/neo4j-driver/package.json" ]; then
        npm install
        print_success "Dependencies installed"
    else
        print_success "Dependencies already installed"
    fi
    cd ..
}

backup_existing_data() {
    print_step "Creating backup of existing memory.json..."
    
    BACKUP_DIR="./backups/memory-backups"
    mkdir -p "$BACKUP_DIR"
    
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="$BACKUP_DIR/memory_backup_$TIMESTAMP.json"
    
    cp ./memory.json "$BACKUP_FILE"
    print_success "Backup created: $BACKUP_FILE"
}

run_migration() {
    print_step "Running migration..."
    
    cd scripts
    
    # Set environment variables
    export NEO4J_URI="bolt://localhost:7687"
    export NEO4J_USER="neo4j"
    export NEO4J_PASSWORD="dev_password_123"
    export MEMORY_JSON_PATH="../memory.json"
    
    # Run migration
    node migrate-memory-to-neo4j.js
    
    cd ..
}

verify_migration() {
    print_step "Verifying migration..."
    
    # Simple verification using curl and cypher-shell if available
    if command -v cypher-shell &> /dev/null; then
        ENTITY_COUNT=$(echo "MATCH (e:Entity) RETURN count(e) as count" | cypher-shell -u neo4j -p dev_password_123 --format plain | tail -n 1)
        RELATION_COUNT=$(echo "MATCH ()-[r:RELATES]->() RETURN count(r) as count" | cypher-shell -u neo4j -p dev_password_123 --format plain | tail -n 1)
        
        print_success "Entities in Neo4j: $ENTITY_COUNT"
        print_success "Relationships in Neo4j: $RELATION_COUNT"
    else
        print_warning "cypher-shell not available, skipping verification"
    fi
}

show_next_steps() {
    echo
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    MIGRATION COMPLETE! 🎉                   ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${BLUE}🚀 Next Steps:${NC}"
    echo "1. Open Neo4j Browser: http://localhost:7474"
    echo "2. Login with: neo4j / dev_password_123"
    echo "3. Try sample queries:"
    echo "   MATCH (e:Entity) RETURN e.entityType, count(e) ORDER BY count(e) DESC"
    echo "4. Update Claude to use Neo4j MCP servers"
    echo "5. Test the new knowledge graph functionality"
    echo
    echo -e "${BLUE}📊 Neo4j Web Interface:${NC}"
    echo "   URL: http://localhost:7474"
    echo "   Username: neo4j"
    echo "   Password: dev_password_123"
    echo
    echo -e "${BLUE}🔧 Troubleshooting:${NC}"
    echo "   - If migration fails, check Neo4j logs: docker logs code-tools-neo4j"
    echo "   - Backup is available in: ./backups/memory-backups/"
    echo "   - Re-run migration: ./migrate-to-neo4j.sh"
}

main() {
    print_header
    
    check_prerequisites
    install_dependencies
    backup_existing_data
    run_migration
    verify_migration
    show_next_steps
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --no-backup    Skip backup creation"
        echo "  --force        Force migration even if Neo4j has data"
        exit 0
        ;;
    --no-backup)
        SKIP_BACKUP=true
        ;;
    --force)
        FORCE_MIGRATION=true
        ;;
esac

# Run main migration
main "$@"
#!/bin/bash

# MCP Phase 2 Setup Script
# Enhanced Development Workflow Integration

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    MCP Phase 2 Setup                        ║"
    echo "║              Enhanced Development Workflow                   ║"
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

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Start Docker services
start_docker_services() {
    print_step "Starting Docker services..."
    
    if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    # Start PostgreSQL and Redis
    docker-compose up -d postgres redis
    
    # Wait for services to be healthy
    print_info "Waiting for services to start..."
    sleep 10
    
    # Check PostgreSQL
    if docker-compose exec postgres pg_isready -U codetools -d codetools_dev; then
        print_success "PostgreSQL is ready"
    else
        print_warning "PostgreSQL may still be starting up"
    fi
    
    # Check Redis
    if docker-compose exec redis redis-cli ping | grep -q PONG; then
        print_success "Redis is ready"
    else
        print_warning "Redis may still be starting up"
    fi
}

# Create SQLite database
setup_sqlite() {
    print_step "Setting up SQLite database..."
    
    if ! command -v sqlite3 &> /dev/null; then
        print_warning "SQLite3 not found, installing..."
        sudo apt-get update && sudo apt-get install -y sqlite3
    fi
    
    # Create SQLite database with sample data
    sqlite3 dev.db << 'EOF'
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    language TEXT,
    framework TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mcp_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    response_time_ms INTEGER,
    success BOOLEAN,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO projects (name, description, language, framework) VALUES
    ('code-tools', 'CLI tools for LLM interaction', 'JavaScript', 'Node.js'),
    ('mcp-integration', 'Model Context Protocol integration', 'TypeScript', 'MCP'),
    ('ai-workflows', 'AI-assisted development workflows', 'JavaScript', 'Claude Code');

-- Verify data
SELECT 'SQLite setup complete - Projects:' as status;
SELECT COUNT(*) as project_count FROM projects;
EOF
    
    print_success "SQLite database created with sample data"
}

# Install MCP servers
install_mcp_servers() {
    print_step "Installing Phase 2 MCP servers..."
    
    # Enhanced development workflow servers
    print_info "Adding SQLite MCP server..."
    claude mcp add sqlite --env DB_PATH="/home/owner/repo/code-tools/dev.db" -- npx -y @modelcontextprotocol/server-sqlite
    
    print_info "Adding Puppeteer MCP server..."
    claude mcp add puppeteer -- npx -y @modelcontextprotocol/server-puppeteer
    
    print_info "Adding Everything MCP server..."
    claude mcp add everything -- npx -y @modelcontextprotocol/server-everything
    
    print_success "Phase 2 MCP servers installed"
}

# Test connections
test_connections() {
    print_step "Testing MCP server connections..."
    
    # Wait for servers to initialize
    sleep 5
    
    claude mcp list | while IFS= read -r line; do
        if [[ $line == *"✓ Connected"* ]]; then
            server_name=$(echo "$line" | cut -d: -f1)
            print_success "Server connected: $server_name"
        elif [[ $line == *"✗ Failed"* ]]; then
            server_name=$(echo "$line" | cut -d: -f1)
            print_warning "Server failed: $server_name"
        fi
    done
}

# Verify database connections
verify_databases() {
    print_step "Verifying database connections..."
    
    # Test PostgreSQL
    if docker-compose exec postgres psql -U codetools -d codetools_dev -c "SELECT 'PostgreSQL connection successful' as status;" &>/dev/null; then
        print_success "PostgreSQL connection verified"
    else
        print_warning "PostgreSQL connection failed"
    fi
    
    # Test SQLite
    if sqlite3 dev.db "SELECT 'SQLite connection successful' as status;" &>/dev/null; then
        print_success "SQLite connection verified"
    else
        print_warning "SQLite connection failed"
    fi
    
    # Test Redis
    if docker-compose exec redis redis-cli ping | grep -q PONG; then
        print_success "Redis connection verified"
    else
        print_warning "Redis connection failed"
    fi
}

# Create development environment file
create_env_file() {
    print_step "Creating development environment..."
    
    if [ ! -f ".env" ]; then
        cp .env.mcp .env
        print_success "Environment file created from template"
        print_info "Edit .env file to customize your settings"
    else
        print_info "Environment file already exists"
    fi
}

# Display setup summary
show_summary() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    PHASE 2 COMPLETE! 🎉                     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${GREEN}Phase 2 MCP Integration Complete!${NC}"
    echo
    echo "🗄️  Database Services Running:"
    echo "   • PostgreSQL: localhost:5432 (codetools_dev)"
    echo "   • Redis: localhost:6379"
    echo "   • SQLite: dev.db"
    echo
    echo "🔧 New MCP Capabilities:"
    echo "   • Database operations with SQLite"
    echo "   • Web automation with Puppeteer"
    echo "   • Full MCP protocol testing with Everything server"
    echo "   • Enhanced development workflow integration"
    echo
    echo "📊 Management Tools:"
    echo "   • Database: docker-compose exec postgres psql -U codetools -d codetools_dev"
    echo "   • Redis CLI: docker-compose exec redis redis-cli"
    echo "   • SQLite: sqlite3 dev.db"
    echo "   • Admin UI: docker-compose --profile admin up -d pgadmin"
    echo
    echo "🧪 Test Commands:"
    echo "   • claude mcp list                    # Check server status"
    echo "   • ./test-mcp.sh                     # Run comprehensive tests"
    echo "   • docker-compose ps                 # Check service status"
    echo
    echo "Ready for enhanced AI-assisted development! 🚀"
}

# Main execution
main() {
    print_header
    
    # Check prerequisites
    if ! command -v claude &> /dev/null; then
        print_error "Claude Code is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
        print_error "Docker is required for Phase 2"
        exit 1
    fi
    
    # Execute setup steps
    start_docker_services
    setup_sqlite
    create_env_file
    install_mcp_servers
    test_connections
    verify_databases
    
    echo
    show_summary
}

# Run main function
main "$@"
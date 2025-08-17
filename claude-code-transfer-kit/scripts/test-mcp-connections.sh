#!/bin/bash

# Claude Code Transfer Kit - MCP Connection Tester
# Tests all MCP server connections and validates setup

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
    echo "║              MCP Connection Validator                       ║"
    echo "║             🔍 Testing All Connections 🔍                   ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Test file existence
test_files() {
    print_test "Checking essential files..."
    
    local files=(".mcp.json" "CLAUDE.md" ".env" ".gitignore")
    local missing_files=()
    
    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            print_success "Found $file"
        else
            print_error "Missing $file"
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -eq 0 ]; then
        return 0
    else
        return 1
    fi
}

# Test directory structure
test_directories() {
    print_test "Checking directory structure..."
    
    local dirs=("config" "mcp" "scripts" "docs" "data" "backups")
    local missing_dirs=()
    
    for dir in "${dirs[@]}"; do
        if [ -d "$dir" ]; then
            print_success "Found directory $dir/"
        else
            print_error "Missing directory $dir/"
            missing_dirs+=("$dir")
        fi
    done
    
    if [ ${#missing_dirs[@]} -eq 0 ]; then
        return 0
    else
        return 1
    fi
}

# Test MCP configuration
test_mcp_config() {
    print_test "Validating MCP configuration..."
    
    if [ ! -f ".mcp.json" ]; then
        print_error "MCP configuration file not found"
        return 1
    fi
    
    # Check if JSON is valid
    if command -v node >/dev/null 2>&1; then
        if node -e "JSON.parse(require('fs').readFileSync('.mcp.json', 'utf8'))" 2>/dev/null; then
            print_success "MCP configuration is valid JSON"
        else
            print_error "MCP configuration contains invalid JSON"
            return 1
        fi
    else
        print_warning "Node.js not available to validate JSON syntax"
    fi
    
    # Check for required MCP servers
    local required_servers=("jetbrains" "github" "neo4j-agent-memory" "postgres")
    local missing_servers=()
    
    for server in "${required_servers[@]}"; do
        if grep -q "\"$server\"" .mcp.json; then
            print_success "MCP server '$server' configured"
        else
            print_error "MCP server '$server' not found in configuration"
            missing_servers+=("$server")
        fi
    done
    
    if [ ${#missing_servers[@]} -eq 0 ]; then
        return 0
    else
        return 1
    fi
}

# Test Python MCP environment
test_python_mcp() {
    print_test "Testing Python MCP environment..."
    
    if [ -f "mcp/venv-mcp/bin/activate" ]; then
        print_success "Python virtual environment found"
        
        # Test if we can activate and check packages
        if source mcp/venv-mcp/bin/activate 2>/dev/null; then
            if [ -f "mcp/venv-mcp/bin/mcp-server-qdrant" ]; then
                print_success "Qdrant MCP server installed"
            else
                print_warning "Qdrant MCP server not found"
            fi
            deactivate 2>/dev/null || true
        else
            print_warning "Cannot activate Python virtual environment"
        fi
    else
        print_error "Python virtual environment not found"
        return 1
    fi
}

# Test database connectivity
test_databases() {
    print_test "Testing database connectivity..."
    
    # Load environment variables
    if [ -f ".env" ]; then
        source .env
    fi
    
    # Test PostgreSQL
    if command -v psql >/dev/null 2>&1; then
        if psql "postgresql://${PROJECT_NAME:-testuser}:${DATABASE_PASSWORD:-testpass}@localhost:${POSTGRES_PORT:-5432}/${PROJECT_NAME:-testdb}_dev" -c "SELECT 1;" >/dev/null 2>&1; then
            print_success "PostgreSQL connection successful"
        else
            print_warning "PostgreSQL connection failed (database may not be running)"
        fi
    else
        print_warning "psql not available to test PostgreSQL connection"
    fi
    
    # Test Redis
    if command -v redis-cli >/dev/null 2>&1; then
        if redis-cli -p "${REDIS_PORT:-6379}" ping >/dev/null 2>&1; then
            print_success "Redis connection successful"
        else
            print_warning "Redis connection failed (database may not be running)"
        fi
    else
        print_warning "redis-cli not available to test Redis connection"
    fi
    
    # Test Qdrant
    if command -v curl >/dev/null 2>&1; then
        if curl -s "http://localhost:${QDRANT_PORT:-6333}/health" >/dev/null 2>&1; then
            print_success "Qdrant connection successful"
        else
            print_warning "Qdrant connection failed (database may not be running)"
        fi
    else
        print_warning "curl not available to test Qdrant connection"
    fi
    
    # Test Neo4j
    if command -v curl >/dev/null 2>&1; then
        if curl -s "http://localhost:${NEO4J_HTTP_PORT:-7474}" >/dev/null 2>&1; then
            print_success "Neo4j connection successful"
        else
            print_warning "Neo4j connection failed (database may not be running)"
        fi
    else
        print_warning "curl not available to test Neo4j connection"
    fi
}

# Test Docker setup
test_docker() {
    print_test "Testing Docker setup..."
    
    if command -v docker >/dev/null 2>&1; then
        if docker info >/dev/null 2>&1; then
            print_success "Docker is running"
            
            # Check for Docker Compose file
            if [ -f "docker-compose.databases.yml" ] || [ -f "docker-compose.yml" ]; then
                print_success "Docker Compose configuration found"
            else
                print_warning "Docker Compose configuration not found"
            fi
        else
            print_warning "Docker found but not running"
        fi
    else
        print_warning "Docker not found"
    fi
}

# Test environment variables
test_environment() {
    print_test "Testing environment configuration..."
    
    if [ -f ".env" ]; then
        source .env
        
        local required_vars=("PROJECT_NAME" "DATABASE_PASSWORD")
        local missing_vars=()
        
        for var in "${required_vars[@]}"; do
            if [ -n "${!var}" ]; then
                print_success "Environment variable $var is set"
            else
                print_error "Environment variable $var is not set"
                missing_vars+=("$var")
            fi
        done
        
        # Check optional but recommended variables
        if [ -n "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
            print_success "GitHub token configured"
        else
            print_warning "GitHub token not configured (optional)"
        fi
        
        if [ ${#missing_vars[@]} -eq 0 ]; then
            return 0
        else
            return 1
        fi
    else
        print_error "Environment file (.env) not found"
        return 1
    fi
}

# Generate test report
generate_report() {
    echo
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    Test Report Summary                      ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
    
    local total_tests=7
    local passed_tests=0
    
    # Run all tests and count passes
    test_files && ((passed_tests++)) || true
    test_directories && ((passed_tests++)) || true
    test_mcp_config && ((passed_tests++)) || true
    test_python_mcp && ((passed_tests++)) || true
    test_databases && ((passed_tests++)) || true
    test_docker && ((passed_tests++)) || true
    test_environment && ((passed_tests++)) || true
    
    echo
    echo -e "${BLUE}Results:${NC} $passed_tests/$total_tests tests passed"
    
    if [ $passed_tests -eq $total_tests ]; then
        echo -e "${GREEN}🎉 All tests passed! Your Claude Code setup is ready.${NC}"
        return 0
    elif [ $passed_tests -ge $((total_tests - 2)) ]; then
        echo -e "${YELLOW}⚠️  Most tests passed. Check warnings above.${NC}"
        return 0
    else
        echo -e "${RED}❌ Several tests failed. Please review the setup.${NC}"
        return 1
    fi
}

# Main execution
main() {
    print_header
    generate_report
}

# Run main function
main "$@"
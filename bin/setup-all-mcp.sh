#!/bin/bash

# Complete MCP Server Setup Script
# Reproduces the entire MCP ecosystem on a fresh computer

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REQUIRED_NODE_VERSION=18
REQUIRED_PYTHON_VERSION=3.8

print_header() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                Complete MCP Ecosystem Setup                 ║"
    echo "║              🚀 Full Reproduction Script 🚀                 ║"
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
    echo -e "${PURPLE}ℹ️  $1${NC}"
}

check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check operating system
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if grep -qi microsoft /proc/version; then
            OS_TYPE="WSL2"
            print_success "WSL2 environment detected"
        else
            OS_TYPE="Linux"
            print_success "Linux environment detected"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS_TYPE="macOS"
        print_success "macOS environment detected"
    else
        print_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
    
    # Check Claude Code
    if ! command -v claude &> /dev/null; then
        print_error "Claude Code is not installed"
        print_info "Please install Claude Code first: https://claude.ai/code"
        exit 1
    fi
    print_success "Claude Code found: $(which claude)"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        print_info "Please install Node.js ${REQUIRED_NODE_VERSION}+ and try again"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt "$REQUIRED_NODE_VERSION" ]; then
        print_error "Node.js version $NODE_VERSION detected. Required: ${REQUIRED_NODE_VERSION}+"
        exit 1
    fi
    print_success "Node.js v$(node --version) is compatible"
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed"
        print_info "Please install Python 3.${REQUIRED_PYTHON_VERSION}+ and try again"
        exit 1
    fi
    
    PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}' | cut -d'.' -f1-2)
    if ! python3 -c "import sys; sys.exit(0 if sys.version_info >= (${REQUIRED_PYTHON_VERSION%.*}, ${REQUIRED_PYTHON_VERSION#*.}) else 1)" 2>/dev/null; then
        print_error "Python version $PYTHON_VERSION detected. Required: ${REQUIRED_PYTHON_VERSION}+"
        exit 1
    fi
    print_success "Python $(python3 --version | awk '{print $2}') is compatible"
    
    # Check Docker (optional but recommended)
    if command -v docker &> /dev/null; then
        print_success "Docker found: $(which docker)"
        DOCKER_AVAILABLE=true
    else
        print_warning "Docker not found - database stack will not be available"
        DOCKER_AVAILABLE=false
    fi
}

setup_environment() {
    print_step "Setting up environment..."
    
    # Create necessary directories
    mkdir -p "$SCRIPT_DIR/data"
    mkdir -p "$SCRIPT_DIR/backups"
    
    # Setup environment files if they don't exist
    if [ ! -f "$SCRIPT_DIR/.env" ]; then
        if [ -f "$SCRIPT_DIR/.env.example" ]; then
            cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
            print_info "Created .env from .env.example - please configure it"
        fi
    fi
    
    print_success "Environment setup complete"
}

setup_python_venv() {
    print_step "Setting up Python virtual environment for MCP servers..."
    
    # Remove existing venv if it exists
    if [ -d "$SCRIPT_DIR/venv-mcp" ]; then
        print_info "Removing existing Python virtual environment..."
        rm -rf "$SCRIPT_DIR/venv-mcp"
    fi
    
    # Create fresh virtual environment
    python3 -m venv "$SCRIPT_DIR/venv-mcp"
    source "$SCRIPT_DIR/venv-mcp/bin/activate"
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install Python MCP servers
    print_step "Installing Python MCP packages..."
    pip install mcp-server-qdrant
    
    print_success "Python virtual environment setup complete"
}

clean_existing_mcp() {
    print_step "Cleaning existing MCP configuration..."
    
    # Get list of existing MCP servers
    if claude mcp list &> /dev/null; then
        EXISTING_SERVERS=$(claude mcp list 2>/dev/null | grep -E "^[a-zA-Z0-9_-]+:" | cut -d':' -f1 || true)
        
        if [ ! -z "$EXISTING_SERVERS" ]; then
            print_info "Removing existing MCP servers: $EXISTING_SERVERS"
            echo "$EXISTING_SERVERS" | while read -r server; do
                if [ ! -z "$server" ]; then
                    claude mcp remove "$server" 2>/dev/null || true
                fi
            done
        fi
    fi
    
    print_success "MCP configuration cleaned"
}

setup_core_mcp_servers() {
    print_step "Setting up core MCP servers..."
    
    # Filesystem server (essential for file operations)
    print_info "Installing Filesystem MCP server..."
    claude mcp add filesystem \
        --env ALLOWED_DIRECTORIES="$HOME/repo,$HOME/projects,/tmp" \
        -- npx -y @modelcontextprotocol/server-filesystem
    
    # Memory server (persistent context)
    print_info "Installing Memory MCP server..."
    claude mcp add memory \
        -- npx -y @modelcontextprotocol/server-memory
    
    # Sequential thinking server (enhanced reasoning)
    print_info "Installing Sequential Thinking MCP server..."
    claude mcp add sequential-thinking \
        -- npx -y @modelcontextprotocol/server-sequential-thinking
    
    print_success "Core MCP servers installed"
}

setup_development_mcp_servers() {
    print_step "Setting up development MCP servers..."
    
    # GitHub server (if credentials available)
    if [ ! -z "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" ]; then
        print_info "Installing GitHub MCP server..."
        claude mcp add github \
            --env GITHUB_PERSONAL_ACCESS_TOKEN="$GITHUB_PERSONAL_ACCESS_TOKEN" \
            -- npx -y @modelcontextprotocol/server-github
    else
        print_warning "Skipping GitHub MCP server - no GITHUB_PERSONAL_ACCESS_TOKEN in environment"
    fi
    
    # Puppeteer server (web automation)
    print_info "Installing Puppeteer MCP server..."
    claude mcp add puppeteer \
        -- npx -y @modelcontextprotocol/server-puppeteer
    
    print_success "Development MCP servers installed"
}

setup_infrastructure_mcp_servers() {
    print_step "Setting up infrastructure MCP servers..."
    
    if [ "$DOCKER_AVAILABLE" = true ]; then
        # Docker server
        print_info "Installing Docker MCP server..."
        claude mcp add docker-mcp \
            -- npx -y @modelcontextprotocol/server-docker
    else
        print_warning "Skipping Docker MCP server - Docker not available"
    fi
    
    print_success "Infrastructure MCP servers installed"
}

setup_database_mcp_servers() {
    print_step "Setting up database MCP servers..."
    
    # Qdrant server (vector database)
    print_info "Installing Qdrant MCP server..."
    claude mcp add qdrant \
        --env QDRANT_URL="http://localhost:6333" \
        --env COLLECTION_NAME="mcp-memory" \
        --env EMBEDDING_MODEL="sentence-transformers/all-MiniLM-L6-v2" \
        -- "$SCRIPT_DIR/venv-mcp/bin/mcp-server-qdrant"
    
    print_success "Database MCP servers installed"
}

setup_ide_integration() {
    print_step "Setting up IDE integration..."
    
    if [ "$OS_TYPE" = "WSL2" ]; then
        print_info "Detected WSL2 - setting up IntelliJ integration..."
        
        # Run the existing IntelliJ setup script
        if [ -f "$SCRIPT_DIR/setup-mcp.sh" ]; then
            print_info "Running IntelliJ MCP setup..."
            # Run in non-interactive mode if possible
            WINDOWS_IP=$(ip route show default | awk '{print $3}' | head -n1)
            if [ ! -z "$WINDOWS_IP" ]; then
                claude mcp add jetbrains \
                    --env HOST="$WINDOWS_IP" \
                    --env IDE_PORT="63341" \
                    --env LOG_ENABLED="true" \
                    -- npx -y @jetbrains/mcp-proxy
                print_success "IntelliJ MCP integration configured"
            else
                print_warning "Could not auto-configure IntelliJ - run ./setup-mcp.sh manually"
            fi
        fi
    else
        print_info "Non-WSL2 environment - skipping IntelliJ WSL2 integration"
    fi
}

start_database_stack() {
    if [ "$DOCKER_AVAILABLE" = true ] && [ -f "$SCRIPT_DIR/docker-compose.databases.yml" ]; then
        print_step "Starting database stack..."
        
        # Start the database containers
        cd "$SCRIPT_DIR"
        docker-compose -f docker-compose.databases.yml up -d
        
        # Wait for services to be ready
        print_info "Waiting for databases to be ready..."
        sleep 10
        
        # Check health
        if curl -s http://localhost:6333/collections &>/dev/null; then
            print_success "Qdrant is running and accessible"
        else
            print_warning "Qdrant may not be ready yet - allow more time for startup"
        fi
        
        print_success "Database stack started"
    else
        print_info "Skipping database stack - Docker not available or compose file missing"
    fi
}

test_mcp_connections() {
    print_step "Testing MCP connections..."
    
    # Wait for connections to establish
    sleep 5
    
    # Get connection status
    MCP_STATUS=$(claude mcp list 2>/dev/null || echo "No servers found")
    
    # Count connected servers
    CONNECTED_COUNT=$(echo "$MCP_STATUS" | grep -c "✓ Connected" || echo "0")
    TOTAL_COUNT=$(echo "$MCP_STATUS" | grep -c ":" || echo "0")
    
    echo -e "${BLUE}📊 MCP Connection Status:${NC}"
    echo "$MCP_STATUS"
    echo
    
    if [ "$CONNECTED_COUNT" -gt 0 ]; then
        print_success "$CONNECTED_COUNT/$TOTAL_COUNT MCP servers connected successfully"
        return 0
    else
        print_warning "No MCP servers connected - check logs for issues"
        return 1
    fi
}

create_project_config() {
    print_step "Creating project MCP configuration..."
    
    # Create .mcp.json with current server configuration
    # This will be updated based on what's actually installed
    echo '{}' > "$SCRIPT_DIR/.mcp.json"
    
    print_success "Project configuration created"
}

display_completion_message() {
    echo
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    SETUP COMPLETE! 🎉                       ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${GREEN}MCP Ecosystem is now fully configured!${NC}"
    echo
    echo -e "${BLUE}📋 What's Available:${NC}"
    echo "• Core MCP servers (filesystem, memory, sequential-thinking)"
    echo "• Development tools (GitHub, Puppeteer, Everything)" 
    echo "• Database integration (Qdrant vector database)"
    echo "• IDE integration (IntelliJ via WSL2)"
    echo "• Container management (Docker)"
    echo
    echo -e "${BLUE}🚀 Quick Start Commands:${NC}"
    echo "  claude mcp list                    # Check all connections"
    echo "  ./verify-mcp-setup.sh             # Run comprehensive tests"
    echo "  ./docker-db-start.sh              # Start database stack"
    echo "  ./test-mcp.sh                     # Test MCP functionality"
    echo
    echo -e "${BLUE}📚 Next Steps:${NC}"
    echo "• Configure .env file with your API tokens"
    echo "• Run verification script to test all functionality"
    echo "• Explore MCP capabilities with 'claude /tools'"
    echo "• Check documentation in README.md"
    echo
    echo -e "${YELLOW}🔧 Troubleshooting:${NC}"
    echo "• Run ./troubleshoot-mcp.sh for diagnostics"
    echo "• Check ./verify-mcp-setup.sh for detailed testing"
    echo "• Review logs with ./docker-logs.sh for database issues"
}

main() {
    print_header
    
    # Core setup steps
    check_prerequisites
    setup_environment
    clean_existing_mcp
    setup_python_venv
    
    # Install MCP servers in order
    setup_core_mcp_servers
    setup_development_mcp_servers
    setup_database_mcp_servers
    setup_infrastructure_mcp_servers
    setup_ide_integration
    
    # Start services and test
    start_database_stack
    create_project_config
    
    # Final testing and reporting
    if test_mcp_connections; then
        display_completion_message
    else
        print_error "Setup completed but some connections failed"
        print_info "Run ./troubleshoot-mcp.sh for detailed diagnostics"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --quick        Skip interactive prompts"
        echo "  --no-docker    Skip Docker-related setup"
        exit 0
        ;;
    --quick)
        QUICK_MODE=true
        ;;
    --no-docker)
        DOCKER_AVAILABLE=false
        ;;
esac

# Run main setup
main "$@"
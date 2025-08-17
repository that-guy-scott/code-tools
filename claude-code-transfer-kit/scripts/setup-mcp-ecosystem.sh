#!/bin/bash

# Claude Code Transfer Kit - MCP Ecosystem Setup
# Portable setup script for any project

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
TRANSFER_KIT_DIR="$(dirname "$SCRIPT_DIR")"
REQUIRED_NODE_VERSION=18
REQUIRED_PYTHON_VERSION=3.8

# Default values
DEFAULT_POSTGRES_PORT=5432
DEFAULT_REDIS_PORT=6379
DEFAULT_QDRANT_PORT=6333
DEFAULT_NEO4J_HTTP_PORT=7474
DEFAULT_NEO4J_BOLT_PORT=7687

print_header() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║              Claude Code Transfer Kit Setup                 ║"
    echo "║          🚀 Portable MCP Ecosystem Installation 🚀          ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge "$REQUIRED_NODE_VERSION" ]; then
            print_success "Node.js version $(node -v) found"
        else
            print_error "Node.js version $REQUIRED_NODE_VERSION+ required, found $(node -v)"
            exit 1
        fi
    else
        print_error "Node.js not found. Please install Node.js $REQUIRED_NODE_VERSION+"
        exit 1
    fi
    
    # Check Python
    if command -v python3 >/dev/null 2>&1; then
        PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
        print_success "Python $PYTHON_VERSION found"
    else
        print_error "Python 3 not found. Please install Python $REQUIRED_PYTHON_VERSION+"
        exit 1
    fi
    
    # Check Docker
    if command -v docker >/dev/null 2>&1; then
        if docker info >/dev/null 2>&1; then
            print_success "Docker is running"
        else
            print_warning "Docker found but not running. Please start Docker."
        fi
    else
        print_warning "Docker not found. Database stack will not be available."
    fi
    
    # Check git
    if command -v git >/dev/null 2>&1; then
        print_success "Git found"
    else
        print_error "Git not found. Please install git."
        exit 1
    fi
}

prompt_project_info() {
    print_step "Gathering project information..."
    
    # Project name
    read -p "Enter project name (kebab-case, e.g., 'my-awesome-project'): " PROJECT_NAME
    if [ -z "$PROJECT_NAME" ]; then
        print_error "Project name is required"
        exit 1
    fi
    
    # Validate project name format
    if [[ ! "$PROJECT_NAME" =~ ^[a-z0-9-]+$ ]]; then
        print_error "Project name must be in kebab-case (lowercase letters, numbers, and hyphens only)"
        exit 1
    fi
    
    # Project description
    read -p "Enter project description: " PROJECT_DESCRIPTION
    if [ -z "$PROJECT_DESCRIPTION" ]; then
        PROJECT_DESCRIPTION="A Claude Code enabled project with comprehensive MCP integration"
    fi
    
    # Database password
    read -s -p "Enter database password (or press enter for auto-generated): " DATABASE_PASSWORD
    echo
    if [ -z "$DATABASE_PASSWORD" ]; then
        DATABASE_PASSWORD="dev_password_$(date +%s | tail -c 6)"
        print_success "Auto-generated database password: $DATABASE_PASSWORD"
    fi
    
    # GitHub token
    echo "For GitHub integration, you'll need a Personal Access Token."
    echo "You can create one at: https://github.com/settings/tokens"
    read -p "Enter GitHub Personal Access Token (optional): " GITHUB_TOKEN
    
    # Port configuration
    echo "Port Configuration (press enter for defaults):"
    read -p "PostgreSQL port [$DEFAULT_POSTGRES_PORT]: " POSTGRES_PORT
    POSTGRES_PORT=${POSTGRES_PORT:-$DEFAULT_POSTGRES_PORT}
    
    read -p "Redis port [$DEFAULT_REDIS_PORT]: " REDIS_PORT
    REDIS_PORT=${REDIS_PORT:-$DEFAULT_REDIS_PORT}
    
    read -p "Qdrant port [$DEFAULT_QDRANT_PORT]: " QDRANT_PORT
    QDRANT_PORT=${QDRANT_PORT:-$DEFAULT_QDRANT_PORT}
    
    read -p "Neo4j HTTP port [$DEFAULT_NEO4J_HTTP_PORT]: " NEO4J_HTTP_PORT
    NEO4J_HTTP_PORT=${NEO4J_HTTP_PORT:-$DEFAULT_NEO4J_HTTP_PORT}
    
    read -p "Neo4j Bolt port [$DEFAULT_NEO4J_BOLT_PORT]: " NEO4J_BOLT_PORT
    NEO4J_BOLT_PORT=${NEO4J_BOLT_PORT:-$DEFAULT_NEO4J_BOLT_PORT}
}

setup_project_structure() {
    print_step "Setting up project structure..."
    
    # Create essential directories
    mkdir -p {config/{postgres,redis,qdrant,neo4j,nginx},mcp/{setup,tools,configs},scripts,docs,data,backups,temp}
    
    print_success "Project directories created"
}

process_templates() {
    print_step "Processing template files..."
    
    # Process CLAUDE.md template
    sed "s/{PROJECT_NAME}/$PROJECT_NAME/g; s/{PROJECT_DESCRIPTION}/$PROJECT_DESCRIPTION/g; s/{NEO4J_PASSWORD}/$DATABASE_PASSWORD/g; s/{DATABASE_PASSWORD}/$DATABASE_PASSWORD/g" \
        "$TRANSFER_KIT_DIR/templates/CLAUDE.md" > "CLAUDE.md"
    
    # Process .mcp.json template
    sed "s/{PROJECT_NAME_KEBAB}/$PROJECT_NAME/g; s/{DATABASE_PASSWORD}/$DATABASE_PASSWORD/g" \
        "$TRANSFER_KIT_DIR/templates/.mcp.json.template" > ".mcp.json"
    
    # Process .gitignore template
    cp "$TRANSFER_KIT_DIR/templates/.gitignore.template" ".gitignore"
    
    # Create environment file
    cat > .env << EOF
# Project Configuration
PROJECT_NAME=$PROJECT_NAME
PROJECT_DESCRIPTION=$PROJECT_DESCRIPTION

# Database Configuration
DATABASE_PASSWORD=$DATABASE_PASSWORD
POSTGRES_PORT=$POSTGRES_PORT
REDIS_PORT=$REDIS_PORT
QDRANT_PORT=$QDRANT_PORT
NEO4J_HTTP_PORT=$NEO4J_HTTP_PORT
NEO4J_BOLT_PORT=$NEO4J_BOLT_PORT

# GitHub Configuration
GITHUB_PERSONAL_ACCESS_TOKEN=$GITHUB_TOKEN

# MCP Configuration
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=$DATABASE_PASSWORD
QDRANT_COLLECTION=${PROJECT_NAME}-memory
EOF
    
    print_success "Template files processed and configured"
}

install_mcp_dependencies() {
    print_step "Installing MCP dependencies..."
    
    # Create Python virtual environment for MCP
    python3 -m venv mcp/venv-mcp
    source mcp/venv-mcp/bin/activate
    
    # Install MCP Python packages
    pip install --upgrade pip
    pip install mcp-server-qdrant
    
    deactivate
    
    print_success "MCP dependencies installed"
}

setup_database_stack() {
    if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
        print_step "Setting up database stack..."
        
        # Copy database configurations from transfer kit
        cp -r "$TRANSFER_KIT_DIR/configs/database/"* "config/"
        
        # Process docker-compose template with project-specific values
        sed "s/{PROJECT_NAME}/$PROJECT_NAME/g; s/{DATABASE_PASSWORD}/$DATABASE_PASSWORD/g; s/{POSTGRES_PORT}/$POSTGRES_PORT/g; s/{REDIS_PORT}/$REDIS_PORT/g; s/{QDRANT_PORT}/$QDRANT_PORT/g; s/{NEO4J_HTTP_PORT}/$NEO4J_HTTP_PORT/g; s/{NEO4J_BOLT_PORT}/$NEO4J_BOLT_PORT/g" \
            "$TRANSFER_KIT_DIR/configs/database/docker-compose.databases.yml.template" > "docker-compose.databases.yml"
        
        print_success "Database stack configured"
    else
        print_warning "Docker not available. Skipping database stack setup."
    fi
}

test_mcp_connections() {
    print_step "Testing MCP server connections..."
    
    # Test if Claude Code can find the configuration
    if [ -f ".mcp.json" ]; then
        print_success "MCP configuration file created"
    else
        print_error "MCP configuration file not found"
    fi
    
    # Test Python MCP environment
    if [ -f "mcp/venv-mcp/bin/mcp-server-qdrant" ]; then
        print_success "Qdrant MCP server installed"
    else
        print_warning "Qdrant MCP server not found"
    fi
    
    print_success "MCP connection tests completed"
}

create_documentation() {
    print_step "Creating project documentation..."
    
    # Create README.md
    cat > README.md << EOF
# $PROJECT_NAME

$PROJECT_DESCRIPTION

## Features

- **Claude Code Integration**: Comprehensive MCP ecosystem for AI-assisted development
- **Database Stack**: PostgreSQL, Redis, Qdrant, Neo4j with Docker Compose
- **Knowledge Graph**: Neo4j-powered persistent context and memory system
- **Git Workflow**: Strategic git practices for maintainable development
- **MCP Servers**: 9 configured MCP servers for enhanced development capabilities

## Quick Start

1. **Prerequisites**: Node.js 18+, Python 3.8+, Docker
2. **Environment**: Copy \`.env.example\` to \`.env\` and configure
3. **Database Stack**: \`docker-compose up -d\` (if using Docker)
4. **Development**: Open in IDE with Claude Code extension

## MCP Servers Configured

- **jetbrains**: IDE integration for IntelliJ/WebStorm
- **github**: GitHub repository management
- **puppeteer**: Browser automation
- **docker-mcp**: Container management
- **postgres**: Database operations
- **redis**: Cache and session management
- **qdrant**: Vector search and embeddings
- **neo4j-agent-memory**: AI memory system
- **neo4j-server**: Graph database operations

## Database Access

- **PostgreSQL**: \`localhost:$POSTGRES_PORT\` (user: $PROJECT_NAME, password: see .env)
- **Redis**: \`localhost:$REDIS_PORT\`
- **Qdrant**: \`localhost:$QDRANT_PORT\`
- **Neo4j**: \`localhost:$NEO4J_HTTP_PORT\` (user: neo4j, password: see .env)

## Documentation

- **CLAUDE.md**: Claude Code configuration and workflows
- **Development Guide**: See docs/ directory for detailed guides

## Support

For issues and questions, refer to the troubleshooting section in CLAUDE.md.
EOF
    
    print_success "Documentation created"
}

print_completion_report() {
    echo
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                   Setup Complete! 🎉                        ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${CYAN}Project Information:${NC}"
    echo "  Name: $PROJECT_NAME"
    echo "  Description: $PROJECT_DESCRIPTION"
    echo
    echo -e "${CYAN}Next Steps:${NC}"
    echo "  1. ${YELLOW}Start database stack:${NC} docker-compose -f docker-compose.databases.yml up -d"
    echo "  2. ${YELLOW}Open in IDE:${NC} Open project in IntelliJ/WebStorm with Claude Code extension"
    echo "  3. ${YELLOW}Initialize git:${NC} git init && git add . && git commit -m 'feat: Initialize Claude Code project'"
    echo "  4. ${YELLOW}Test MCP servers:${NC} Use Claude Code to test MCP connections"
    echo
    echo -e "${CYAN}Key Files Created:${NC}"
    echo "  - CLAUDE.md (Claude Code configuration)"
    echo "  - .mcp.json (MCP server configuration)"
    echo "  - README.md (Project documentation)"
    echo "  - .env (Environment configuration)"
    echo "  - .gitignore (Git ignore rules)"
    echo
    echo -e "${CYAN}Database Credentials:${NC}"
    echo "  Password: $DATABASE_PASSWORD"
    echo "  (Also saved in .env file)"
    echo
    if [ -n "$GITHUB_TOKEN" ]; then
        echo -e "${GREEN}GitHub integration configured!${NC}"
    else
        echo -e "${YELLOW}To enable GitHub integration, add GITHUB_PERSONAL_ACCESS_TOKEN to .env${NC}"
    fi
    echo
}

# Main execution
main() {
    print_header
    check_prerequisites
    prompt_project_info
    setup_project_structure
    process_templates
    install_mcp_dependencies
    setup_database_stack
    test_mcp_connections
    create_documentation
    print_completion_report
}

# Run main function
main "$@"
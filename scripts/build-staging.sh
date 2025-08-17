#!/bin/bash
# Claude Code Global Infrastructure - Staging Environment Builder
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
STAGING_DIR="$HOME/.claude-dev"
PRODUCTION_DIR="$HOME/.claude"

# Banner
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              Claude Code Global Infrastructure               ║"
echo "║                 Staging Environment Builder                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --clean     Remove existing ~/.claude-dev and rebuild from scratch"
    echo "  --update    Update existing ~/.claude-dev with latest components"
    echo "  --dry-run   Show what would be built without making changes"
    echo "  --help      Show this help message"
    echo ""
    echo "This script builds a complete staging environment in ~/.claude-dev"
    echo "from the code-tools project and existing ~/.claude configuration."
    echo ""
    echo "Examples:"
    echo "  $0              # Build staging environment (preserve existing)"
    echo "  $0 --clean      # Clean rebuild of staging environment"
    echo "  $0 --update     # Update existing staging with latest components"
    echo "  $0 --dry-run    # Preview what would be built"
}

# Parse command line arguments
CLEAN_BUILD=false
UPDATE_MODE=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN_BUILD=true
            shift
            ;;
        --update)
            UPDATE_MODE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validation functions
check_prerequisites() {
    echo -e "${GREEN}Checking prerequisites...${NC}"
    
    # Check if we're in the code-tools project
    if [ ! -f "$PROJECT_DIR/llm-cli.js" ] || [ ! -f "$PROJECT_DIR/package.json" ]; then
        echo -e "${RED}Error: This script must be run from the code-tools project directory${NC}"
        echo "Expected files: llm-cli.js, package.json"
        echo "Current directory: $PROJECT_DIR"
        exit 1
    fi
    
    # Check Node.js availability
    if ! command -v node &> /dev/null; then
        echo -e "${YELLOW}Warning: Node.js not found. Global CLI functionality may not work.${NC}"
    fi
    
    # Check npm availability
    if ! command -v npm &> /dev/null; then
        echo -e "${YELLOW}Warning: npm not found. Dependency installation may fail.${NC}"
    fi
    
    echo -e "${GREEN}✓ Prerequisites checked${NC}"
    echo ""
}

# Backup existing staging
backup_existing_staging() {
    if [ -d "$STAGING_DIR" ]; then
        local timestamp=$(date +%Y%m%d_%H%M%S)
        local backup_dir="${STAGING_DIR}-backup-${timestamp}"
        
        echo -e "${GREEN}Backing up existing staging environment...${NC}"
        echo "Backup location: $backup_dir"
        
        if [ "$DRY_RUN" = true ]; then
            echo -e "${BLUE}[DRY RUN] Would backup $STAGING_DIR → $backup_dir${NC}"
        else
            cp -r "$STAGING_DIR" "$backup_dir"
            echo -e "${GREEN}✓ Backup created${NC}"
        fi
        echo ""
    fi
}

# Create base Claude environment
create_base_environment() {
    echo -e "${GREEN}Creating base Claude Code environment...${NC}"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${BLUE}[DRY RUN] Would create base environment in $STAGING_DIR${NC}"
        return 0
    fi
    
    # Create staging directory
    mkdir -p "$STAGING_DIR"
    
    # Copy essential Claude Code files if they exist
    if [ -d "$PRODUCTION_DIR" ]; then
        echo "Copying Claude Code configuration from production..."
        
        # Copy settings
        if [ -f "$PRODUCTION_DIR/settings.json" ]; then
            cp "$PRODUCTION_DIR/settings.json" "$STAGING_DIR/"
            echo -e "  ✓ settings.json"
        fi
        
        # Copy credentials (if exists)
        if [ -f "$PRODUCTION_DIR/.credentials.json" ]; then
            cp "$PRODUCTION_DIR/.credentials.json" "$STAGING_DIR/"
            echo -e "  ✓ .credentials.json"
        fi
        
        # Copy projects directory (if exists)
        if [ -d "$PRODUCTION_DIR/projects" ]; then
            cp -r "$PRODUCTION_DIR/projects" "$STAGING_DIR/"
            echo -e "  ✓ projects/"
        fi
        
        # Copy todos directory (if exists)
        if [ -d "$PRODUCTION_DIR/todos" ]; then
            cp -r "$PRODUCTION_DIR/todos" "$STAGING_DIR/"
            echo -e "  ✓ todos/"
        fi
        
        echo -e "${GREEN}✓ Base environment copied from production${NC}"
    else
        echo -e "${YELLOW}No production ~/.claude found, creating minimal environment${NC}"
        
        # Create minimal settings
        cat > "$STAGING_DIR/settings.json" << 'EOF'
{
  "version": "1.0.0",
  "created_by": "claude-staging-builder",
  "global_infrastructure": true
}
EOF
        echo -e "  ✓ Created minimal settings.json"
    fi
    
    echo ""
}

# Set up global infrastructure
setup_global_infrastructure() {
    echo -e "${GREEN}Setting up global infrastructure...${NC}"
    
    local infra_dir="$STAGING_DIR/global-infrastructure"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${BLUE}[DRY RUN] Would copy project files to $infra_dir${NC}"
        return 0
    fi
    
    # Create global infrastructure directory
    mkdir -p "$infra_dir"
    
    # Copy core project files
    echo "Copying project components..."
    
    # Copy main CLI files
    mkdir -p "$infra_dir/bin"
    cp "$PROJECT_DIR/llm-cli.js" "$infra_dir/bin/"
    echo -e "  ✓ llm-cli.js"
    
    # Create global launcher script
    cat > "$infra_dir/bin/llm" << 'EOF'
#!/bin/bash
# Global Universal LLM CLI v2 Launcher
CLAUDE_GLOBAL_DIR="$HOME/.claude/global-infrastructure"
LLM_CLI_PATH="$CLAUDE_GLOBAL_DIR/bin/llm-cli.js"

if [ ! -f "$LLM_CLI_PATH" ]; then
    # Try staging directory if production not found
    CLAUDE_GLOBAL_DIR="$HOME/.claude-dev/global-infrastructure"
    LLM_CLI_PATH="$CLAUDE_GLOBAL_DIR/bin/llm-cli.js"
fi

if [ ! -f "$LLM_CLI_PATH" ]; then
    echo "Error: Claude Code Global Infrastructure not found."
    echo "Please run the deployment script or check your installation."
    exit 1
fi

node "$LLM_CLI_PATH" "$@"
EOF
    chmod +x "$infra_dir/bin/llm"
    echo -e "  ✓ Global launcher script"
    
    # Copy package.json and install dependencies
    cp "$PROJECT_DIR/package.json" "$infra_dir/"
    echo -e "  ✓ package.json"
    
    # Copy documentation if it exists in the project
    if [ -d "$PROJECT_DIR/docs" ]; then
        cp -r "$PROJECT_DIR/docs" "$infra_dir/"
        echo -e "  ✓ Documentation"
    else
        mkdir -p "$infra_dir/docs"
    fi
    
    # Copy scripts directory
    if [ -d "$PROJECT_DIR/scripts" ]; then
        cp -r "$PROJECT_DIR/scripts" "$infra_dir/"
        # Make scripts executable
        chmod +x "$infra_dir/scripts"/*.sh 2>/dev/null || true
        echo -e "  ✓ Management scripts"
    else
        mkdir -p "$infra_dir/scripts"
    fi
    
    # Copy database configurations
    if [ -d "$PROJECT_DIR/docker" ]; then
        mkdir -p "$infra_dir/databases"
        cp -r "$PROJECT_DIR/docker" "$infra_dir/databases/"
        echo -e "  ✓ Database stack configuration"
    fi
    
    # Copy MCP configurations
    mkdir -p "$infra_dir/mcp"
    if [ -f "$PROJECT_DIR/.mcp.json" ]; then
        # Create global MCP configuration
        cp "$PROJECT_DIR/.mcp.json" "$infra_dir/mcp/global-mcp.json"
        echo -e "  ✓ MCP configuration"
    fi
    
    echo -e "${GREEN}✓ Global infrastructure components copied${NC}"
    echo ""
}

# Install dependencies
install_dependencies() {
    echo -e "${GREEN}Installing Node.js dependencies...${NC}"
    
    local infra_dir="$STAGING_DIR/global-infrastructure"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${BLUE}[DRY RUN] Would install npm dependencies in $infra_dir${NC}"
        return 0
    fi
    
    if command -v npm &> /dev/null; then
        cd "$infra_dir"
        npm install --production
        echo -e "${GREEN}✓ Dependencies installed${NC}"
        cd - > /dev/null
    else
        echo -e "${YELLOW}⚠ npm not found, skipping dependency installation${NC}"
    fi
    
    echo ""
}

# Configure MCP for staging
configure_mcp() {
    echo -e "${GREEN}Configuring MCP for staging environment...${NC}"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${BLUE}[DRY RUN] Would configure MCP for staging${NC}"
        return 0
    fi
    
    # Copy global MCP configuration to staging root
    if [ -f "$STAGING_DIR/global-infrastructure/mcp/global-mcp.json" ]; then
        cp "$STAGING_DIR/global-infrastructure/mcp/global-mcp.json" "$STAGING_DIR/.mcp.json"
        echo -e "  ✓ Global MCP configuration installed"
    else
        echo -e "  ${YELLOW}⚠ No MCP configuration found${NC}"
    fi
    
    echo ""
}

# Validate staging environment
validate_staging() {
    echo -e "${GREEN}Validating staging environment...${NC}"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${BLUE}[DRY RUN] Would validate staging environment${NC}"
        return 0
    fi
    
    local validation_passed=true
    
    # Check key files
    local key_files=(
        "global-infrastructure/bin/llm"
        "global-infrastructure/bin/llm-cli.js"
        "global-infrastructure/package.json"
    )
    
    for file in "${key_files[@]}"; do
        if [ -f "$STAGING_DIR/$file" ]; then
            echo -e "  ✓ $file"
        else
            echo -e "  ${RED}✗ $file (missing)${NC}"
            validation_passed=false
        fi
    done
    
    # Test CLI functionality
    if [ -f "$STAGING_DIR/global-infrastructure/bin/llm-cli.js" ]; then
        cd "$STAGING_DIR/global-infrastructure"
        if node bin/llm-cli.js --version >/dev/null 2>&1; then
            local version=$(node bin/llm-cli.js --version)
            echo -e "  ✓ CLI functional (version: $version)"
        else
            echo -e "  ${RED}✗ CLI test failed${NC}"
            validation_passed=false
        fi
        cd - > /dev/null
    fi
    
    if [ "$validation_passed" = true ]; then
        echo -e "${GREEN}✓ Staging environment validation passed${NC}"
    else
        echo -e "${RED}✗ Staging environment validation failed${NC}"
        return 1
    fi
    
    echo ""
}

# Show build summary
show_build_summary() {
    echo -e "${GREEN}🎉 Staging environment build completed!${NC}"
    echo ""
    echo -e "${BLUE}Staging Location:${NC} $STAGING_DIR"
    
    if command -v du &> /dev/null; then
        local size=$(du -sh "$STAGING_DIR" 2>/dev/null | cut -f1 || echo "unknown")
        echo -e "${BLUE}Size:${NC} $size"
    fi
    
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Validate staging: ~/.claude-dev/global-infrastructure/scripts/validate-staging.sh"
    echo "2. Test CLI: cd ~/.claude-dev/global-infrastructure && node bin/llm-cli.js --version"
    echo "3. Deploy when ready: ~/.claude-dev/global-infrastructure/scripts/deploy-to-production.sh"
    echo ""
    echo -e "${BLUE}Available in staging:${NC}"
    echo "  • Universal LLM CLI v2"
    echo "  • Global MCP server configuration"
    echo "  • Database management scripts"
    echo "  • Backup and deployment tools"
    echo "  • Complete documentation"
    echo ""
    echo -e "${GREEN}Your staging environment is ready for testing and deployment!${NC}"
}

# Main build process
build_staging_environment() {
    # Handle clean build
    if [ "$CLEAN_BUILD" = true ]; then
        echo -e "${YELLOW}Clean build requested: removing existing staging environment${NC}"
        if [ "$DRY_RUN" = true ]; then
            echo -e "${BLUE}[DRY RUN] Would remove $STAGING_DIR${NC}"
        else
            backup_existing_staging
            rm -rf "$STAGING_DIR"
        fi
        echo ""
    elif [ "$UPDATE_MODE" = true ]; then
        echo -e "${YELLOW}Update mode: preserving existing configuration${NC}"
        echo ""
    else
        backup_existing_staging
    fi
    
    # Build process
    create_base_environment
    setup_global_infrastructure
    install_dependencies
    configure_mcp
    
    # Validation
    if validate_staging; then
        show_build_summary
    else
        echo -e "${RED}Build completed with validation errors${NC}"
        echo "Please check the issues above and run the build again."
        exit 1
    fi
}

# Show build plan
show_build_plan() {
    echo -e "${BLUE}Build Plan:${NC}"
    echo ""
    echo "📁 Source:      $PROJECT_DIR"
    echo "📁 Destination: $STAGING_DIR"
    echo ""
    echo "🔄 Process:"
    if [ "$CLEAN_BUILD" = true ]; then
        echo "  1. Clean: Remove existing staging environment"
    elif [ "$UPDATE_MODE" = true ]; then
        echo "  1. Update: Preserve existing configuration"
    else
        echo "  1. Backup: Create backup of existing staging (if exists)"
    fi
    echo "  2. Base: Copy essential Claude Code configuration"
    echo "  3. Infrastructure: Copy global infrastructure components"
    echo "  4. Dependencies: Install Node.js packages"
    echo "  5. Configuration: Set up MCP servers and global config"
    echo "  6. Validation: Test staging environment functionality"
    echo ""
    
    # Show what exists
    if [ -d "$STAGING_DIR" ]; then
        echo "📊 Current staging:"
        if command -v du &> /dev/null; then
            local size=$(du -sh "$STAGING_DIR" 2>/dev/null | cut -f1 || echo "unknown")
            echo "  Size: $size"
        fi
        echo "  Status: Exists"
    else
        echo "📊 Current staging: Not found (will create)"
    fi
    echo ""
}

# Main execution
main() {
    # Check prerequisites
    check_prerequisites
    
    # Show build plan
    show_build_plan
    
    # Confirmation for destructive operations
    if [ "$DRY_RUN" = false ] && [ "$CLEAN_BUILD" = true ] && [ -d "$STAGING_DIR" ]; then
        echo -e "${YELLOW}Warning: Clean build will remove existing staging environment.${NC}"
        read -p "Continue? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Build cancelled."
            exit 0
        fi
        echo ""
    fi
    
    # Execute build
    if [ "$DRY_RUN" = true ]; then
        echo -e "${BLUE}DRY RUN COMPLETE${NC}"
        echo "Run without --dry-run to actually build the staging environment."
    else
        build_staging_environment
    fi
}

# Run main function
main "$@"
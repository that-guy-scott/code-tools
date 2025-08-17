#!/bin/bash

# MCP Removal Script
# Cleanly removes MCP integration and configuration

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
    echo "║                    MCP Integration Removal                  ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${BLUE}[REMOVE] $1${NC}"
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

# Remove MCP server configurations
remove_mcp_servers() {
    print_step "Removing MCP server configurations..."
    
    # Try to remove from all possible scopes
    if claude mcp list 2>/dev/null | grep -q "jetbrains"; then
        print_step "Found JetBrains MCP server, removing..."
        
        # Remove from local scope
        claude mcp remove jetbrains -s local 2>/dev/null && print_success "Removed from local config" || true
        
        # Remove from project scope  
        claude mcp remove jetbrains -s project 2>/dev/null && print_success "Removed from project config" || true
        
        # Remove without scope (fallback)
        claude mcp remove jetbrains 2>/dev/null && print_success "Removed MCP server" || true
        
    else
        print_warning "No JetBrains MCP server found"
    fi
    
    # Verify removal
    if claude mcp list 2>/dev/null | grep -q "jetbrains"; then
        print_error "MCP server still present after removal attempt"
        echo "Current MCP servers:"
        claude mcp list
    else
        print_success "All MCP server configurations removed"
    fi
}

# Remove project configuration files
remove_config_files() {
    print_step "Removing configuration files..."
    
    # Remove .mcp.json
    if [ -f ".mcp.json" ]; then
        rm -f ".mcp.json"
        print_success "Removed .mcp.json"
    else
        print_warning ".mcp.json not found"
    fi
    
    # Remove any test files that might have been left behind
    for test_file in "mcp-test-syntax.js" "diagnostic-test.js" "test-error-detection.js" "perf-test-"*.js; do
        if [ -f "$test_file" ]; then
            rm -f "$test_file"
            print_success "Removed test file: $test_file"
        fi
    done
}

# Clean npm cache (optional)
clean_npm_cache() {
    print_step "Cleaning npm cache..."
    
    if command -v npm &> /dev/null; then
        npm cache clean --force 2>/dev/null || true
        print_success "npm cache cleaned"
    else
        print_warning "npm not found, skipping cache clean"
    fi
}

# Verify removal
verify_removal() {
    print_step "Verifying complete removal..."
    
    # Check MCP servers
    if claude mcp list 2>/dev/null | grep -q "jetbrains"; then
        print_error "MCP server still configured"
        return 1
    else
        print_success "No MCP servers configured"
    fi
    
    # Check config files
    if [ -f ".mcp.json" ]; then
        print_error ".mcp.json still exists"
        return 1
    else
        print_success "No configuration files found"
    fi
    
    return 0
}

# Display manual cleanup instructions
show_manual_cleanup() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                   MANUAL CLEANUP (Optional)                 ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${YELLOW}Optional manual cleanup steps:${NC}"
    echo
    echo "1. IntelliJ IDEA:"
    echo "   • Uninstall MCP Server plugin (if not needed for other projects)"
    echo "   • Go to Settings → Plugins → MCP Server → Uninstall"
    echo
    echo "2. Windows Firewall:"
    echo "   • Remove firewall rule (if created)"
    echo "   • Run as Administrator in Command Prompt:"
    echo "   • netsh advfirewall firewall delete rule name=\"IntelliJ MCP\""
    echo
    echo "3. Node.js packages:"
    echo "   • The @jetbrains/mcp-proxy package is downloaded as needed"
    echo "   • No permanent installation to clean up"
    
    echo -e "${GREEN}Note: These steps only need to be done if you won't use MCP with other projects.${NC}"
}

# Main removal function
main() {
    print_header
    
    echo -e "${YELLOW}This will remove MCP integration from the current project.${NC}"
    echo "The following will be removed:"
    echo "• JetBrains MCP server configuration"
    echo "• Project .mcp.json file"
    echo "• Any test files created during setup"
    echo
    echo -e "${YELLOW}Continue with removal? (y/N)${NC}"
    read -p "> " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Removal cancelled."
        exit 0
    fi
    
    echo
    print_step "Starting MCP integration removal..."
    
    # Perform removal steps
    remove_mcp_servers
    remove_config_files
    clean_npm_cache
    
    echo
    if verify_removal; then
        echo -e "${GREEN}"
        echo "╔══════════════════════════════════════════════════════════════╗"
        echo "║                    REMOVAL COMPLETED ✅                     ║"
        echo "╚══════════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        
        echo -e "${GREEN}MCP integration has been completely removed from this project.${NC}"
        echo
        echo "To re-enable MCP integration in the future, run: ./setup-mcp.sh"
        
    else
        print_error "Removal incomplete - some components may still be present"
        print_step "You may need to manually remove remaining components"
    fi
    
    echo
    show_manual_cleanup
}

# Run removal
main "$@"
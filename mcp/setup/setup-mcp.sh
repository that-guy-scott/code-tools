#!/bin/bash

# MCP Integration Setup Script for WSL2 + IntelliJ IDEA
# Automates the setup of Model Context Protocol integration between Claude Code and IntelliJ

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
REQUIRED_NODE_VERSION=18
DEFAULT_INTELLIJ_PORT=63341
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Functions
print_header() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    MCP Integration Setup                     ║"
    echo "║              WSL2 + IntelliJ IDEA + Claude Code              ║"
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

# Check if running in WSL2
check_wsl2() {
    print_step "Checking WSL2 environment..."
    
    if ! grep -qi microsoft /proc/version; then
        print_error "This script must be run in WSL2 environment"
        exit 1
    fi
    
    print_success "WSL2 environment detected"
}

# Check Node.js version
check_nodejs() {
    print_step "Checking Node.js installation..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        print_info "Please install Node.js $REQUIRED_NODE_VERSION+ and try again"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt "$REQUIRED_NODE_VERSION" ]; then
        print_error "Node.js version $NODE_VERSION detected. Required: $REQUIRED_NODE_VERSION+"
        print_info "Please upgrade Node.js and try again"
        exit 1
    fi
    
    print_success "Node.js v$(node --version) is compatible"
}

# Check Claude Code installation
check_claude_code() {
    print_step "Checking Claude Code installation..."
    
    if ! command -v claude &> /dev/null; then
        print_error "Claude Code is not installed or not in PATH"
        print_info "Please install Claude Code and try again"
        exit 1
    fi
    
    print_success "Claude Code found: $(which claude)"
}

# Detect Windows host IP
detect_windows_ip() {
    print_step "Detecting Windows host IP address..."
    
    # Method 1: Default gateway
    WINDOWS_IP=$(ip route show default | awk '{print $3}' | head -n1)
    
    if [ -z "$WINDOWS_IP" ]; then
        # Method 2: Nameserver from resolv.conf
        WINDOWS_IP=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}' | head -n1)
    fi
    
    if [ -z "$WINDOWS_IP" ]; then
        print_error "Could not detect Windows host IP automatically"
        echo -e "${YELLOW}Please enter your Windows IP address manually:${NC}"
        read -p "Windows IP: " WINDOWS_IP
    fi
    
    print_success "Windows host IP: $WINDOWS_IP"
}

# Test connectivity to Windows
test_connectivity() {
    local port=${1:-$DEFAULT_INTELLIJ_PORT}
    print_step "Testing connectivity to Windows host..."
    
    # Test basic connectivity
    if ! ping -c 1 -W 2 "$WINDOWS_IP" &> /dev/null; then
        print_warning "Cannot ping Windows host at $WINDOWS_IP"
        print_info "This may be normal due to firewall settings"
    else
        print_success "Windows host is reachable"
    fi
    
    # Test port connectivity
    print_step "Testing IntelliJ port connectivity..."
    if timeout 5 bash -c "</dev/tcp/$WINDOWS_IP/$port" 2>/dev/null; then
        print_success "IntelliJ port $port is accessible"
        return 0
    else
        print_warning "Cannot connect to IntelliJ port $port"
        return 1
    fi
}

# Get IntelliJ port from user
get_intellij_port() {
    print_step "Configuring IntelliJ port..."
    
    echo -e "${YELLOW}What port is your IntelliJ IDEA using?${NC}"
    echo "Check: Settings → Build, Execution, Deployment → Debugger"
    echo "Common ports: 63341, 63342"
    read -p "Enter port number [$DEFAULT_INTELLIJ_PORT]: " INTELLIJ_PORT
    
    INTELLIJ_PORT=${INTELLIJ_PORT:-$DEFAULT_INTELLIJ_PORT}
    
    print_info "Using IntelliJ port: $INTELLIJ_PORT"
}

# Remove existing MCP configuration
cleanup_existing_mcp() {
    print_step "Cleaning up existing MCP configuration..."
    
    # Remove existing jetbrains server if it exists
    if claude mcp list 2>/dev/null | grep -q "jetbrains:"; then
        print_info "Removing existing jetbrains MCP server..."
        
        # Try to remove from both local and project scopes
        claude mcp remove jetbrains -s local 2>/dev/null || true
        claude mcp remove jetbrains -s project 2>/dev/null || true
        claude mcp remove jetbrains 2>/dev/null || true
        
        print_success "Existing MCP configuration removed"
    fi
}

# Setup MCP server
setup_mcp_server() {
    print_step "Setting up JetBrains MCP server..."
    
    # Add MCP server with environment variables
    if claude mcp add jetbrains \
        --env HOST="$WINDOWS_IP" \
        --env IDE_PORT="$INTELLIJ_PORT" \
        --env LOG_ENABLED=true \
        -- npx -y @jetbrains/mcp-proxy; then
        
        print_success "MCP server configured successfully"
    else
        print_error "Failed to configure MCP server"
        exit 1
    fi
}

# Create project MCP configuration
create_project_config() {
    print_step "Creating project MCP configuration..."
    
    cat > "$SCRIPT_DIR/.mcp.json" << EOF
{
  "mcpServers": {
    "jetbrains": {
      "command": "npx",
      "args": ["-y", "@jetbrains/mcp-proxy"],
      "env": {
        "HOST": "$WINDOWS_IP",
        "IDE_PORT": "$INTELLIJ_PORT",
        "LOG_ENABLED": "true"
      }
    }
  }
}
EOF
    
    print_success "Project MCP configuration created: .mcp.json"
}

# Test MCP connection
test_mcp_connection() {
    print_step "Testing MCP connection..."
    
    # Wait a moment for the connection to establish
    sleep 2
    
    # Check MCP status
    if claude mcp list | grep -q "jetbrains.*✓ Connected"; then
        print_success "MCP connection established successfully!"
        return 0
    else
        print_warning "MCP connection test failed"
        print_info "Connection status:"
        claude mcp list
        return 1
    fi
}

# Test error detection capability
test_error_detection() {
    print_step "Testing error detection capability..."
    
    # Create test file with syntax error
    TEST_FILE="$SCRIPT_DIR/mcp-test-syntax.js"
    cat > "$TEST_FILE" << 'EOF'
const broken = function() {
  let test = "unclosed string
  return test;
}
EOF
    
    print_info "Testing Node.js syntax checking..."
    if node -c "$TEST_FILE" 2>&1 | grep -q "SyntaxError"; then
        print_success "Error detection is working!"
    else
        print_warning "Error detection test inconclusive"
    fi
    
    # Clean up test file
    rm -f "$TEST_FILE"
}

# Display manual setup instructions
show_manual_steps() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                     MANUAL SETUP REQUIRED                   ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${YELLOW}Please complete these steps in IntelliJ IDEA:${NC}"
    echo
    echo "1. Install MCP Server Plugin:"
    echo "   • Go to Settings → Plugins"
    echo "   • Search for 'MCP Server'"
    echo "   • Install from: https://plugins.jetbrains.com/plugin/26071-mcp-server"
    echo "   • Restart IntelliJ IDEA"
    echo
    echo "2. Enable External Connections:"
    echo "   • Go to Settings → Build, Execution, Deployment → Debugger"
    echo "   • ✅ Check 'Can accept external connections'"
    echo "   • Verify port is set to: $INTELLIJ_PORT"
    echo "   • Apply and restart IntelliJ"
    echo
    echo "3. Configure Windows Firewall (if needed):"
    echo "   Run as Administrator in Windows Command Prompt:"
    echo "   netsh advfirewall firewall add rule name=\"IntelliJ MCP\" dir=in action=allow protocol=TCP localport=$INTELLIJ_PORT"
    echo
    echo -e "${GREEN}After completing these steps, run this script again to test the connection.${NC}"
}

# Check if manual steps are completed
check_manual_steps() {
    echo -e "${YELLOW}Have you completed the manual IntelliJ setup steps?${NC}"
    echo "1. Installed MCP Server plugin"
    echo "2. Enabled 'Can accept external connections'"
    echo "3. Configured Windows firewall (if needed)"
    echo
    read -p "Continue with automated setup? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        show_manual_steps
        exit 0
    fi
}

# Main setup function
main() {
    print_header
    
    # Prerequisites check
    check_wsl2
    check_nodejs
    check_claude_code
    
    # Network setup
    detect_windows_ip
    get_intellij_port
    
    # Test connectivity
    if ! test_connectivity "$INTELLIJ_PORT"; then
        print_warning "Cannot connect to IntelliJ. Manual setup may be required."
        check_manual_steps
    fi
    
    # MCP setup
    cleanup_existing_mcp
    setup_mcp_server
    create_project_config
    
    # Testing
    echo
    print_step "Running connection tests..."
    
    if test_mcp_connection; then
        test_error_detection
        
        echo
        echo -e "${GREEN}"
        echo "╔══════════════════════════════════════════════════════════════╗"
        echo "║                    SETUP SUCCESSFUL! 🎉                     ║"
        echo "╚══════════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        
        echo -e "${GREEN}MCP integration is now active!${NC}"
        echo
        echo "You can now use Claude Code with:"
        echo "• Real-time error detection"
        echo "• Complete project analysis"
        echo "• IDE integration capabilities"
        echo
        echo "Test commands:"
        echo "  claude mcp list              # Check connection status"
        echo "  claude /tools                # List available capabilities"
        echo
        echo "For details, see: claude-mcp-intellij.md"
        
    else
        echo
        print_error "Setup completed but connection test failed"
        show_manual_steps
        
        echo -e "${YELLOW}Troubleshooting tips:${NC}"
        echo "• Ensure IntelliJ IDEA is running with a project open"
        echo "• Check that the MCP Server plugin is installed and enabled"
        echo "• Verify 'Can accept external connections' is checked"
        echo "• Try restarting IntelliJ IDEA"
        echo "• Run: ./troubleshoot-mcp.sh for detailed diagnostics"
    fi
}

# Run main function
main "$@"
#!/bin/bash

# MCP Troubleshooting Script
# Diagnoses and attempts to fix common MCP integration issues

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_header() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                  MCP Troubleshooting Tool                   ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_section() {
    echo -e "${PURPLE}[$1] $2${NC}"
}

print_check() {
    echo -e "${BLUE}  → $1${NC}"
}

print_ok() {
    echo -e "${GREEN}  ✅ $1${NC}"
}

print_warn() {
    echo -e "${YELLOW}  ⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}  ❌ $1${NC}"
}

print_fix() {
    echo -e "${CYAN}  🔧 $1${NC}"
}

# Diagnostic: Environment Check
diagnose_environment() {
    print_section "1" "Environment Diagnostics"
    
    # WSL2 Check
    print_check "Checking WSL2 environment..."
    if grep -qi microsoft /proc/version; then
        print_ok "Running in WSL2"
    else
        print_error "Not running in WSL2"
        return 1
    fi
    
    # Node.js Check
    print_check "Checking Node.js..."
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
        print_ok "Node.js $NODE_VERSION"
        
        if [ "$NODE_MAJOR" -lt 18 ]; then
            print_warn "Node.js version is below recommended (18+)"
            print_fix "Upgrade Node.js: curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs"
        fi
    else
        print_error "Node.js not found"
        print_fix "Install Node.js: curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs"
        return 1
    fi
    
    # Claude Code Check
    print_check "Checking Claude Code..."
    if command -v claude &> /dev/null; then
        print_ok "Claude Code found at $(which claude)"
    else
        print_error "Claude Code not found"
        print_fix "Install Claude Code or ensure it's in your PATH"
        return 1
    fi
    
    # NPX Check
    print_check "Checking npx availability..."
    if command -v npx &> /dev/null; then
        print_ok "npx available"
    else
        print_error "npx not found"
        print_fix "Install npm: sudo apt install npm"
        return 1
    fi
}

# Diagnostic: Network Configuration
diagnose_network() {
    print_section "2" "Network Configuration"
    
    # Detect Windows IP
    print_check "Detecting Windows host IP..."
    WINDOWS_IP_ROUTE=$(ip route show default | awk '{print $3}' | head -n1)
    WINDOWS_IP_DNS=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}' | head -n1)
    
    if [ -n "$WINDOWS_IP_ROUTE" ]; then
        print_ok "Default route: $WINDOWS_IP_ROUTE"
        WINDOWS_IP="$WINDOWS_IP_ROUTE"
    else
        print_warn "No default route found"
    fi
    
    if [ -n "$WINDOWS_IP_DNS" ]; then
        print_ok "DNS server: $WINDOWS_IP_DNS"
        if [ -z "$WINDOWS_IP" ]; then
            WINDOWS_IP="$WINDOWS_IP_DNS"
        fi
    else
        print_warn "No DNS server found"
    fi
    
    if [ -z "$WINDOWS_IP" ]; then
        print_error "Cannot determine Windows host IP"
        print_fix "Manually set Windows IP in MCP configuration"
        return 1
    fi
    
    # Test basic connectivity
    print_check "Testing Windows host connectivity..."
    if ping -c 1 -W 2 "$WINDOWS_IP" &> /dev/null; then
        print_ok "Can ping Windows host ($WINDOWS_IP)"
    else
        print_warn "Cannot ping Windows host (may be firewalled)"
    fi
    
    # Check common IntelliJ ports
    for port in 63341 63342 63343; do
        print_check "Testing port $port..."
        if timeout 3 bash -c "</dev/tcp/$WINDOWS_IP/$port" 2>/dev/null; then
            print_ok "Port $port is open"
        else
            print_warn "Port $port is closed or filtered"
        fi
    done
}

# Diagnostic: MCP Configuration
diagnose_mcp_config() {
    print_section "3" "MCP Configuration"
    
    # Check MCP server list
    print_check "Checking MCP server configuration..."
    if claude mcp list &>/dev/null; then
        print_ok "Claude MCP command working"
        
        if claude mcp list | grep -q "jetbrains"; then
            print_ok "JetBrains MCP server configured"
            
            # Show current status
            echo "  Current MCP status:"
            claude mcp list | grep "jetbrains" | sed 's/^/    /'
            
        else
            print_warn "JetBrains MCP server not configured"
            print_fix "Run: ./setup-mcp.sh to configure"
        fi
    else
        print_error "Claude MCP command failed"
        print_fix "Check Claude Code installation"
        return 1
    fi
    
    # Check project .mcp.json
    print_check "Checking project MCP configuration..."
    if [ -f ".mcp.json" ]; then
        print_ok "Project .mcp.json exists"
        
        # Validate JSON
        if python3 -m json.tool .mcp.json &>/dev/null; then
            print_ok "JSON syntax is valid"
        else
            print_error "Invalid JSON in .mcp.json"
            print_fix "Fix JSON syntax or regenerate with ./setup-mcp.sh"
        fi
        
        # Check required fields
        if grep -q '"HOST"' .mcp.json && grep -q '"IDE_PORT"' .mcp.json; then
            print_ok "Required configuration fields present"
        else
            print_warn "Missing required configuration fields"
            print_fix "Regenerate configuration with ./setup-mcp.sh"
        fi
    else
        print_warn "No project .mcp.json found"
        print_fix "Run: ./setup-mcp.sh to create configuration"
    fi
}

# Diagnostic: IntelliJ Integration
diagnose_intellij() {
    print_section "4" "IntelliJ IDEA Integration"
    
    print_check "Checking IntelliJ connection requirements..."
    
    echo "  Manual verification required:"
    echo "    1. ✅ IntelliJ IDEA is running"
    echo "    2. ✅ Project is open in IntelliJ"
    echo "    3. ✅ MCP Server plugin is installed"
    echo "    4. ✅ 'Can accept external connections' is enabled"
    echo "    5. ✅ Windows firewall allows the port"
    
    echo
    print_check "IntelliJ plugin verification..."
    echo "  To verify MCP Server plugin:"
    echo "    • Go to Settings → Plugins"
    echo "    • Search for 'MCP Server'"
    echo "    • Should be installed and enabled"
    echo "    • Plugin URL: https://plugins.jetbrains.com/plugin/26071-mcp-server"
    
    echo
    print_check "IntelliJ settings verification..."
    echo "  To verify external connections:"
    echo "    • Go to Settings → Build, Execution, Deployment → Debugger"
    echo "    • ✅ Check 'Can accept external connections'"
    echo "    • Note the port number (usually 63341 or 63342)"
    
    echo
    print_check "Windows firewall verification..."
    echo "  To configure Windows firewall:"
    echo "    • Open Command Prompt as Administrator"
    echo "    • Run: netsh advfirewall firewall add rule name=\"IntelliJ MCP\" dir=in action=allow protocol=TCP localport=63341"
}

# Diagnostic: Runtime Testing
diagnose_runtime() {
    print_section "5" "Runtime Testing"
    
    # Test error detection
    print_check "Testing error detection..."
    TEST_FILE="diagnostic-test.js"
    cat > "$TEST_FILE" << 'EOF'
const test = "unclosed string
EOF
    
    if node -c "$TEST_FILE" 2>&1 | grep -q "SyntaxError"; then
        print_ok "Error detection working"
    else
        print_warn "Error detection may not be working properly"
    fi
    
    rm -f "$TEST_FILE"
    
    # Test MCP proxy package
    print_check "Testing MCP proxy package..."
    if npx --help &>/dev/null; then
        print_ok "npx command working"
        
        # Test if we can download the package info
        if npm view @jetbrains/mcp-proxy version &>/dev/null; then
            print_ok "@jetbrains/mcp-proxy package is accessible"
        else
            print_warn "Cannot access @jetbrains/mcp-proxy package"
            print_fix "Check internet connection and npm registry access"
        fi
    else
        print_error "npx command failed"
        print_fix "Reinstall npm: sudo apt install npm"
    fi
}

# Automatic Fixes
attempt_fixes() {
    print_section "6" "Automatic Repair Attempts"
    
    print_check "Attempting to fix common issues..."
    
    # Fix 1: Reinstall MCP configuration
    print_fix "Cleaning and reinstalling MCP configuration..."
    
    # Remove existing configuration
    claude mcp remove jetbrains -s local 2>/dev/null || true
    claude mcp remove jetbrains -s project 2>/dev/null || true
    claude mcp remove jetbrains 2>/dev/null || true
    
    # Get network info
    WINDOWS_IP=$(ip route show default | awk '{print $3}' | head -n1)
    if [ -z "$WINDOWS_IP" ]; then
        WINDOWS_IP=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}' | head -n1)
    fi
    
    if [ -n "$WINDOWS_IP" ]; then
        # Add fresh configuration
        if claude mcp add jetbrains --env HOST="$WINDOWS_IP" --env IDE_PORT=63341 --env LOG_ENABLED=true -- npx -y @jetbrains/mcp-proxy; then
            print_ok "MCP configuration reinstalled"
        else
            print_error "Failed to reinstall MCP configuration"
        fi
    else
        print_error "Cannot determine Windows IP for configuration"
    fi
    
    # Fix 2: Update npm packages
    print_fix "Updating npm cache..."
    npm cache clean --force 2>/dev/null || true
    
    print_ok "Automatic fixes completed"
}

# Generate comprehensive report
generate_report() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    DIAGNOSTIC SUMMARY                       ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo "Current System Status:"
    echo "• Environment: $([[ -n "$(command -v node)" ]] && echo "✅ Ready" || echo "❌ Issues")"
    echo "• Network: $([[ -n "$WINDOWS_IP" ]] && echo "✅ Connected" || echo "❌ Issues")"
    echo "• MCP Config: $(claude mcp list | grep -q "jetbrains.*✓" && echo "✅ Active" || echo "❌ Issues")"
    
    echo
    echo "Next Steps:"
    echo "1. If issues remain, run: ./setup-mcp.sh"
    echo "2. Verify IntelliJ manual steps are completed"
    echo "3. Test with: ./test-mcp.sh"
    echo "4. For setup help, see README.md MCP section"
    
    echo
    echo "Support Resources:"
    echo "• Setup Guide: README.md → MCP Integration Setup"
    echo "• Capabilities: claude-mcp-intellij.md"
    echo "• Error Detection: ide-error-detection-capabilities.md"
}

# Main diagnostic routine
main() {
    print_header
    
    echo "Running comprehensive MCP diagnostics..."
    echo
    
    # Run all diagnostics
    diagnose_environment || true
    echo
    diagnose_network || true
    echo
    diagnose_mcp_config || true
    echo
    diagnose_intellij || true
    echo
    diagnose_runtime || true
    echo
    
    # Ask user if they want automatic fixes
    echo -e "${YELLOW}Would you like to attempt automatic fixes? (y/N)${NC}"
    read -p "> " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo
        attempt_fixes
    fi
    
    echo
    generate_report
}

# Run diagnostics
main "$@"
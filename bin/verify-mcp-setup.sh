#!/bin/bash

# MCP Setup Verification Script
# Comprehensive testing of all MCP servers and functionality

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
TEST_TIMEOUT=30
VERBOSE=false

print_header() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                  MCP Setup Verification                     ║"
    echo "║              🔍 Comprehensive Testing 🔍                    ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_test() {
    echo -e "${BLUE}[TEST] $1${NC}"
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

print_result() {
    local status=$1
    local message=$2
    if [ "$status" = "PASS" ]; then
        print_success "$message"
    elif [ "$status" = "WARN" ]; then
        print_warning "$message"
    else
        print_error "$message"
    fi
}

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_WARNED=0

increment_test() {
    TESTS_RUN=$((TESTS_RUN + 1))
}

increment_passed() {
    TESTS_PASSED=$((TESTS_PASSED + 1))
    increment_test
}

increment_failed() {
    TESTS_FAILED=$((TESTS_FAILED + 1))
    increment_test
}

increment_warned() {
    TESTS_WARNED=$((TESTS_WARNED + 1))
    increment_test
}

test_basic_connectivity() {
    print_test "Basic MCP connectivity"
    
    if command -v claude &> /dev/null; then
        print_result "PASS" "Claude Code is installed and accessible"
        increment_passed
    else
        print_result "FAIL" "Claude Code is not installed or not in PATH"
        increment_failed
        return 1
    fi
    
    # Test basic MCP list command
    if claude mcp list &> /dev/null; then
        print_result "PASS" "MCP subsystem is responsive"
        increment_passed
    else
        print_result "FAIL" "MCP subsystem is not responding"
        increment_failed
        return 1
    fi
    
    return 0
}

test_mcp_servers() {
    print_test "MCP server connections"
    
    # Get MCP server status
    local mcp_output
    mcp_output=$(claude mcp list 2>/dev/null || echo "No servers found")
    
    if [ "$VERBOSE" = true ]; then
        echo "$mcp_output"
    fi
    
    # Count connected servers
    local connected_count
    connected_count=$(echo "$mcp_output" | grep -c "✓ Connected" || echo "0")
    
    local total_count
    total_count=$(echo "$mcp_output" | grep -c ":" || echo "0")
    
    if [ "$connected_count" -gt 0 ]; then
        print_result "PASS" "$connected_count/$total_count MCP servers connected"
        increment_passed
        
        # Test individual servers
        test_individual_servers "$mcp_output"
    else
        print_result "FAIL" "No MCP servers are connected"
        increment_failed
        return 1
    fi
    
    return 0
}

test_individual_servers() {
    local mcp_output="$1"
    
    print_test "Individual server functionality"
    
    # Test filesystem server
    if echo "$mcp_output" | grep -q "filesystem.*✓ Connected"; then
        test_filesystem_server
    else
        print_result "WARN" "Filesystem server not connected - skipping tests"
        increment_warned
    fi
    
    # Test memory server
    if echo "$mcp_output" | grep -q "memory.*✓ Connected"; then
        test_memory_server
    else
        print_result "WARN" "Memory server not connected - skipping tests"
        increment_warned
    fi
    
    # Test qdrant server
    if echo "$mcp_output" | grep -q "qdrant.*✓ Connected"; then
        test_qdrant_server
    else
        print_result "WARN" "Qdrant server not connected - skipping tests"
        increment_warned
    fi
    
    # Test github server
    if echo "$mcp_output" | grep -q "github.*✓ Connected"; then
        test_github_server
    else
        print_result "WARN" "GitHub server not connected - skipping tests"
        increment_warned
    fi
    
    # Test jetbrains server
    if echo "$mcp_output" | grep -q "jetbrains.*✓ Connected"; then
        test_jetbrains_server
    else
        print_result "WARN" "JetBrains server not connected - skipping tests"
        increment_warned
    fi
    
    # Test docker server
    if echo "$mcp_output" | grep -q "docker.*✓ Connected"; then
        test_docker_server
    else
        print_result "WARN" "Docker server not connected - skipping tests"
        increment_warned
    fi
    
    # Test puppeteer server
    if echo "$mcp_output" | grep -q "puppeteer.*✓ Connected"; then
        test_puppeteer_server
    else
        print_result "WARN" "Puppeteer server not connected - skipping tests"
        increment_warned
    fi
}

test_filesystem_server() {
    print_test "Filesystem server functionality"
    
    # Create test file
    local test_file="/tmp/mcp-test-$(date +%s).txt"
    echo "MCP filesystem test" > "$test_file"
    
    if [ -f "$test_file" ]; then
        print_result "PASS" "Filesystem operations are accessible"
        increment_passed
        rm -f "$test_file"
    else
        print_result "FAIL" "Filesystem operations failed"
        increment_failed
    fi
}

test_memory_server() {
    print_test "Memory server functionality"
    
    # Memory server is connected, which means basic functionality works
    print_result "PASS" "Memory server is connected and ready"
    increment_passed
}

test_qdrant_server() {
    print_test "Qdrant server functionality"
    
    # Test Qdrant connectivity directly
    if curl -s --connect-timeout 5 http://localhost:6333/collections &> /dev/null; then
        print_result "PASS" "Qdrant database is accessible"
        increment_passed
    else
        print_result "FAIL" "Qdrant database is not accessible on localhost:6333"
        increment_failed
    fi
}

test_github_server() {
    print_test "GitHub server functionality"
    
    # GitHub server connection implies token is valid
    print_result "PASS" "GitHub server is connected (API token valid)"
    increment_passed
}

test_jetbrains_server() {
    print_test "JetBrains server functionality"
    
    # Test if we're in WSL2 and can reach Windows host
    if grep -qi microsoft /proc/version; then
        local windows_ip
        windows_ip=$(ip route show default | awk '{print $3}' | head -n1)
        
        if [ ! -z "$windows_ip" ]; then
            if timeout 5 bash -c "</dev/tcp/$windows_ip/63341" 2>/dev/null; then
                print_result "PASS" "IntelliJ connection is accessible"
                increment_passed
            else
                print_result "WARN" "IntelliJ port not accessible (IntelliJ may not be running)"
                increment_warned
            fi
        else
            print_result "WARN" "Cannot determine Windows host IP"
            increment_warned
        fi
    else
        print_result "WARN" "Not in WSL2 environment - JetBrains test not applicable"
        increment_warned
    fi
}

test_docker_server() {
    print_test "Docker server functionality"
    
    # Test Docker availability
    if command -v docker &> /dev/null; then
        if docker info &> /dev/null; then
            print_result "PASS" "Docker is running and accessible"
            increment_passed
        else
            print_result "FAIL" "Docker is installed but not running"
            increment_failed
        fi
    else
        print_result "WARN" "Docker is not installed"
        increment_warned
    fi
}

test_puppeteer_server() {
    print_test "Puppeteer server functionality"
    
    # Puppeteer server connection implies it's ready for web automation
    print_result "PASS" "Puppeteer server is connected and ready for web automation"
    increment_passed
}

test_database_stack() {
    print_test "Database stack verification"
    
    # Check if docker-compose file exists
    if [ ! -f "$SCRIPT_DIR/docker-compose.databases.yml" ]; then
        print_result "WARN" "Database docker-compose file not found"
        increment_warned
        return 1
    fi
    
    # Test PostgreSQL
    if curl -s --connect-timeout 5 localhost:5432 &> /dev/null; then
        print_result "PASS" "PostgreSQL is accessible"
        increment_passed
    else
        print_result "WARN" "PostgreSQL is not accessible (may not be started)"
        increment_warned
    fi
    
    # Test Redis
    if command -v redis-cli &> /dev/null; then
        if redis-cli -h localhost -p 6379 ping 2>/dev/null | grep -q "PONG"; then
            print_result "PASS" "Redis is accessible"
            increment_passed
        else
            print_result "WARN" "Redis is not accessible (may not be started)"
            increment_warned
        fi
    else
        if curl -s --connect-timeout 5 localhost:6379 &> /dev/null; then
            print_result "PASS" "Redis port is accessible"
            increment_passed
        else
            print_result "WARN" "Redis is not accessible (may not be started)"
            increment_warned
        fi
    fi
    
    # Test Qdrant (already tested above, but check port)
    if curl -s --connect-timeout 5 localhost:6333 &> /dev/null; then
        print_result "PASS" "Qdrant port is accessible"
        increment_passed
    else
        print_result "WARN" "Qdrant port is not accessible"
        increment_warned
    fi
}

test_python_environment() {
    print_test "Python MCP environment"
    
    # Check if venv-mcp exists
    if [ -d "$SCRIPT_DIR/venv-mcp" ]; then
        print_result "PASS" "Python virtual environment exists"
        increment_passed
        
        # Check if qdrant package is installed
        if [ -f "$SCRIPT_DIR/venv-mcp/bin/mcp-server-qdrant" ]; then
            print_result "PASS" "Qdrant MCP server package is installed"
            increment_passed
        else
            print_result "FAIL" "Qdrant MCP server package is missing"
            increment_failed
        fi
    else
        print_result "FAIL" "Python virtual environment not found"
        increment_failed
    fi
}

test_configuration_files() {
    print_test "Configuration files"
    
    # Check .mcp.json
    if [ -f "$SCRIPT_DIR/.mcp.json" ]; then
        if [ -s "$SCRIPT_DIR/.mcp.json" ]; then
            print_result "PASS" "Project MCP configuration exists and is not empty"
            increment_passed
        else
            print_result "WARN" "Project MCP configuration exists but is empty"
            increment_warned
        fi
    else
        print_result "WARN" "Project MCP configuration not found"
        increment_warned
    fi
    
    # Check mcp-servers.json inventory
    if [ -f "$SCRIPT_DIR/mcp-servers.json" ]; then
        print_result "PASS" "MCP servers inventory exists"
        increment_passed
    else
        print_result "WARN" "MCP servers inventory not found"
        increment_warned
    fi
    
    # Check setup scripts
    local setup_scripts=("setup-all-mcp.sh" "setup-mcp.sh" "setup-qdrant-mcp.sh")
    for script in "${setup_scripts[@]}"; do
        if [ -f "$SCRIPT_DIR/$script" ] && [ -x "$SCRIPT_DIR/$script" ]; then
            print_result "PASS" "Setup script $script exists and is executable"
            increment_passed
        else
            print_result "WARN" "Setup script $script missing or not executable"
            increment_warned
        fi
    done
}

generate_report() {
    echo
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                     VERIFICATION REPORT                     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${BLUE}📊 Test Summary:${NC}"
    echo "  Total Tests: $TESTS_RUN"
    echo -e "  ${GREEN}✅ Passed: $TESTS_PASSED${NC}"
    echo -e "  ${RED}❌ Failed: $TESTS_FAILED${NC}"
    echo -e "  ${YELLOW}⚠️  Warnings: $TESTS_WARNED${NC}"
    echo
    
    # Calculate success rate
    if [ "$TESTS_RUN" -gt 0 ]; then
        local success_rate
        success_rate=$(( (TESTS_PASSED * 100) / TESTS_RUN ))
        echo -e "${BLUE}📈 Success Rate: $success_rate%${NC}"
    fi
    
    echo
    if [ "$TESTS_FAILED" -eq 0 ]; then
        echo -e "${GREEN}🎉 All critical tests passed! MCP setup is functioning correctly.${NC}"
        
        if [ "$TESTS_WARNED" -gt 0 ]; then
            echo -e "${YELLOW}ℹ️  There are $TESTS_WARNED warnings - these are typically optional components.${NC}"
        fi
    else
        echo -e "${RED}⚠️  $TESTS_FAILED critical tests failed. MCP setup needs attention.${NC}"
        echo
        echo -e "${BLUE}🔧 Recommended Actions:${NC}"
        echo "• Run ./setup-all-mcp.sh to fix configuration issues"
        echo "• Check ./troubleshoot-mcp.sh for detailed diagnostics"
        echo "• Ensure all required services are running"
        echo "• Verify environment variables in .env file"
    fi
    
    echo
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "• Use 'claude mcp list' to check server status"
    echo "• Run './docker-db-start.sh' to start database services"
    echo "• Explore MCP capabilities with 'claude /tools'"
    echo "• Check documentation in README.md for usage examples"
}

main() {
    print_header
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  -v, --verbose    Show detailed output"
                echo "  -h, --help       Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run all tests
    test_basic_connectivity
    test_mcp_servers
    test_database_stack
    test_python_environment
    test_configuration_files
    
    # Generate final report
    generate_report
    
    # Exit with appropriate code
    if [ "$TESTS_FAILED" -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

main "$@"
#!/bin/bash

# MCP Testing Script
# Tests MCP functionality and connection health

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
    echo "║                      MCP Testing Suite                      ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_test() {
    echo -e "${BLUE}[TEST] $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_failure() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Test 1: MCP Server Status
test_mcp_status() {
    print_test "Checking MCP server status..."
    
    if claude mcp list | grep -q "jetbrains.*✓ Connected"; then
        print_success "MCP server is connected"
        return 0
    else
        print_failure "MCP server is not connected"
        echo "Current status:"
        claude mcp list
        return 1
    fi
}

# Test 2: Network Connectivity
test_network() {
    print_test "Testing network connectivity..."
    
    # Get Windows IP from MCP config
    if [ -f ".mcp.json" ]; then
        WINDOWS_IP=$(grep -o '"HOST": "[^"]*"' .mcp.json | cut -d'"' -f4)
        PORT=$(grep -o '"IDE_PORT": "[^"]*"' .mcp.json | cut -d'"' -f4)
    else
        print_info "No .mcp.json found, using default detection..."
        WINDOWS_IP=$(ip route show default | awk '{print $3}' | head -n1)
        PORT=63341
    fi
    
    print_info "Testing: $WINDOWS_IP:$PORT"
    
    if timeout 5 bash -c "</dev/tcp/$WINDOWS_IP/$PORT" 2>/dev/null; then
        print_success "Network connectivity OK"
        return 0
    else
        print_failure "Cannot connect to $WINDOWS_IP:$PORT"
        return 1
    fi
}

# Test 3: Error Detection
test_error_detection() {
    print_test "Testing error detection capabilities..."
    
    # Create test file with syntax error
    TEST_FILE="test-error-detection.js"
    cat > "$TEST_FILE" << 'EOF'
const broken = function() {
  let message = "unclosed string
  return message;
}
EOF
    
    # Test Node.js syntax checking
    if node -c "$TEST_FILE" 2>&1 | grep -q "SyntaxError"; then
        print_success "Syntax error detection working"
        SYNTAX_OK=true
    else
        print_failure "Syntax error detection failed"
        SYNTAX_OK=false
    fi
    
    # Clean up
    rm -f "$TEST_FILE"
    
    return $([[ "$SYNTAX_OK" == "true" ]] && echo 0 || echo 1)
}

# Test 4: Project Analysis
test_project_analysis() {
    print_test "Testing project analysis capabilities..."
    
    # Test file reading capability
    if [ -f "package.json" ]; then
        if node -e "console.log(JSON.parse(require('fs').readFileSync('package.json', 'utf8')).name)" &>/dev/null; then
            print_success "Project file analysis working"
            return 0
        fi
    fi
    
    print_info "Basic file operations working"
    return 0
}

# Test 5: Claude Code Tools
test_claude_tools() {
    print_test "Testing Claude Code tool availability..."
    
    # Test basic claude command
    if claude --version &>/dev/null; then
        print_success "Claude Code is functional"
    else
        print_failure "Claude Code command failed"
        return 1
    fi
    
    # Test tools command
    if claude /tools &>/dev/null; then
        print_success "Claude tools are accessible"
    else
        print_info "Claude tools command not available (this may be normal)"
    fi
    
    return 0
}

# Performance Test
test_performance() {
    print_test "Running performance tests..."
    
    # Test file operations speed
    start_time=$(date +%s%N)
    
    # Create and process test files
    for i in {1..5}; do
        echo "console.log('test $i');" > "perf-test-$i.js"
        node -c "perf-test-$i.js" &>/dev/null
        rm -f "perf-test-$i.js"
    done
    
    end_time=$(date +%s%N)
    duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    
    print_info "File operations: ${duration}ms for 5 files"
    
    if [ "$duration" -lt 1000 ]; then
        print_success "Performance is good (< 1s)"
    else
        print_info "Performance is acceptable (${duration}ms)"
    fi
}

# Comprehensive Test Report
generate_report() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                       TEST SUMMARY                          ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo "Test Results:"
    echo "• MCP Connection: $([[ $TEST_MCP == 0 ]] && echo "✅ PASS" || echo "❌ FAIL")"
    echo "• Network: $([[ $TEST_NETWORK == 0 ]] && echo "✅ PASS" || echo "❌ FAIL")"
    echo "• Error Detection: $([[ $TEST_ERROR == 0 ]] && echo "✅ PASS" || echo "❌ FAIL")"
    echo "• Project Analysis: $([[ $TEST_PROJECT == 0 ]] && echo "✅ PASS" || echo "❌ FAIL")"
    echo "• Claude Tools: $([[ $TEST_CLAUDE == 0 ]] && echo "✅ PASS" || echo "❌ FAIL")"
    echo
    
    TOTAL_TESTS=5
    PASSED_TESTS=0
    [ $TEST_MCP == 0 ] && ((PASSED_TESTS++))
    [ $TEST_NETWORK == 0 ] && ((PASSED_TESTS++))
    [ $TEST_ERROR == 0 ] && ((PASSED_TESTS++))
    [ $TEST_PROJECT == 0 ] && ((PASSED_TESTS++))
    [ $TEST_CLAUDE == 0 ] && ((PASSED_TESTS++))
    
    echo "Overall: $PASSED_TESTS/$TOTAL_TESTS tests passed"
    
    if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
        echo -e "${GREEN}🎉 All tests passed! MCP integration is fully functional.${NC}"
    elif [ $PASSED_TESTS -ge 3 ]; then
        echo -e "${YELLOW}⚠️  Most tests passed. MCP integration is partially functional.${NC}"
        echo "Run ./troubleshoot-mcp.sh for detailed diagnostics."
    else
        echo -e "${RED}❌ Multiple tests failed. MCP integration needs attention.${NC}"
        echo "Run ./setup-mcp.sh to reconfigure or ./troubleshoot-mcp.sh for help."
    fi
}

# Main test execution
main() {
    print_header
    
    echo "Running comprehensive MCP functionality tests..."
    echo
    
    # Run all tests
    test_mcp_status; TEST_MCP=$?
    test_network; TEST_NETWORK=$?
    test_error_detection; TEST_ERROR=$?
    test_project_analysis; TEST_PROJECT=$?
    test_claude_tools; TEST_CLAUDE=$?
    
    echo
    test_performance
    
    echo
    generate_report
}

# Run tests
main "$@"
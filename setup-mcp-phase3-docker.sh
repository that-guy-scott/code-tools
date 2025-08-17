#!/bin/bash

# MCP Phase 3 Docker Setup Script
# Container Management and Orchestration Integration

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
    echo "║                   MCP Phase 3 Docker Setup                  ║"
    echo "║              Container Management Integration                ║"
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

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check Claude Code
    if ! command -v claude &> /dev/null; then
        print_error "Claude Code is not installed"
        exit 1
    fi
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running"
        exit 1
    fi
    
    print_success "All prerequisites satisfied"
}

# Install Docker MCP server
install_docker_mcp() {
    print_step "Installing Docker MCP server..."
    
    # Add Docker MCP server
    if ! claude mcp list | grep -q "docker-mcp.*Connected"; then
        print_info "Adding Docker MCP server..."
        claude mcp add docker-mcp -- npx -y docker-mcp
        
        # Wait for connection
        sleep 3
        
        if claude mcp list | grep -q "docker-mcp.*Connected"; then
            print_success "Docker MCP server connected"
        else
            print_warning "Docker MCP server connection failed"
        fi
    else
        print_success "Docker MCP server already connected"
    fi
}

# Create Docker configuration files
create_docker_configs() {
    print_step "Creating Docker configuration files..."
    
    # Create docker directory if it doesn't exist
    mkdir -p docker
    
    # Create nginx configuration
    cat > docker/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Upstream for app
    upstream app {
        server app:3000;
    }
    
    server {
        listen 80;
        server_name localhost;
        
        # Health check endpoint
        location /health {
            access_log off;
            proxy_pass http://app;
        }
        
        # Main application
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF
    
    # Create Redis configuration
    cat > docker/redis.conf << 'EOF'
# Redis configuration for MCP integration
maxmemory 128mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dir /data
EOF
    
    # Create Prometheus configuration
    mkdir -p docker/prometheus
    cat > docker/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'app'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
    scrape_interval: 10s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
    scrape_interval: 10s
EOF
    
    print_success "Docker configuration files created"
}

# Set up Docker environment variables
setup_docker_env() {
    print_step "Setting up Docker environment..."
    
    # Create .env.docker file
    cat > .env.docker << 'EOF'
# Docker Environment Configuration
COMPOSE_PROJECT_NAME=code-tools
COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml

# Application
NODE_ENV=development
APP_PORT=3000
LOG_LEVEL=debug

# Database
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=codetools_dev
POSTGRES_USER=codetools
POSTGRES_PASSWORD=dev_password_123
DATABASE_URL=postgresql://codetools:dev_password_123@postgres:5432/codetools_dev

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_URL=redis://redis:6379

# MCP Configuration
MCP_DEBUG=true
MCP_TIMEOUT=30000
DOCKER_HOST=unix:///var/run/docker.sock

# Security
SECRET_KEY=your-secret-key-here
SESSION_SECRET=your-session-secret-here

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
GRAFANA_ADMIN_PASSWORD=admin123

# Admin
PGADMIN_PORT=8080
PGADMIN_EMAIL=admin@codetools.local
PGADMIN_PASSWORD=admin123
EOF
    
    print_success "Docker environment configured"
}

# Test Docker operations
test_docker_operations() {
    print_step "Testing Docker operations..."
    
    # Test basic Docker commands
    print_info "Testing Docker info..."
    if docker info &> /dev/null; then
        print_success "Docker daemon accessible"
    else
        print_warning "Docker daemon connection issues"
    fi
    
    # Test Docker Compose
    print_info "Testing Docker Compose..."
    if docker-compose --version &> /dev/null || docker compose version &> /dev/null; then
        print_success "Docker Compose available"
    else
        print_warning "Docker Compose not available"
    fi
    
    # Test existing containers
    print_info "Checking existing containers..."
    CONTAINER_COUNT=$(docker ps -q | wc -l)
    print_info "Currently running containers: $CONTAINER_COUNT"
    
    # List our project containers
    if [ "$CONTAINER_COUNT" -gt 0 ]; then
        print_info "Project containers:"
        docker ps --filter "name=code-tools" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    fi
}

# Create Docker management scripts
create_docker_scripts() {
    print_step "Creating Docker management scripts..."
    
    # Create start script
    cat > docker-start.sh << 'EOF'
#!/bin/bash
# Start development environment
echo "🚀 Starting code-tools development environment..."

# Load environment
set -a
source .env.docker
set +a

# Start core services
docker-compose up -d postgres redis

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check health
docker-compose exec postgres pg_isready -U codetools -d codetools_dev
docker-compose exec redis redis-cli ping

echo "✅ Development environment ready!"
echo "📊 Services:"
echo "   • PostgreSQL: localhost:5432"
echo "   • Redis: localhost:6379"
echo "   • pgAdmin: http://localhost:8080 (optional)"
EOF
    
    # Create stop script
    cat > docker-stop.sh << 'EOF'
#!/bin/bash
# Stop development environment
echo "🛑 Stopping code-tools development environment..."

docker-compose down

echo "✅ Environment stopped"
EOF
    
    # Create reset script
    cat > docker-reset.sh << 'EOF'
#!/bin/bash
# Reset development environment (removes volumes)
echo "🔄 Resetting code-tools development environment..."

read -p "This will remove all data. Continue? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose down -v
    docker-compose up -d postgres redis
    echo "✅ Environment reset complete"
else
    echo "❌ Reset cancelled"
fi
EOF
    
    # Create logs script
    cat > docker-logs.sh << 'EOF'
#!/bin/bash
# View logs from all services
echo "📋 Viewing code-tools logs..."

if [ $# -eq 0 ]; then
    docker-compose logs -f
else
    docker-compose logs -f "$@"
fi
EOF
    
    # Make scripts executable
    chmod +x docker-start.sh docker-stop.sh docker-reset.sh docker-logs.sh
    
    print_success "Docker management scripts created"
}

# Test MCP Docker integration
test_mcp_docker_integration() {
    print_step "Testing MCP Docker integration..."
    
    # Check MCP server status
    if claude mcp list | grep -q "docker-mcp.*Connected"; then
        print_success "Docker MCP server is connected"
        
        # Test basic docker command through MCP (if available)
        print_info "Docker MCP integration ready for testing"
    else
        print_warning "Docker MCP server not connected"
    fi
    
    # Test comprehensive MCP setup
    if [ -f "./test-mcp.sh" ]; then
        print_info "Running comprehensive MCP tests..."
        ./test-mcp.sh | tail -n 10
    fi
}

# Display setup summary
show_summary() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                   PHASE 3 DOCKER COMPLETE! 🐳               ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${GREEN}Phase 3 Docker Integration Complete!${NC}"
    echo
    echo "🐳 Docker MCP Capabilities:"
    echo "   • Container management through AI"
    echo "   • Docker Compose orchestration"
    echo "   • Multi-environment configurations"
    echo "   • Automated service management"
    echo
    echo "🛠️  Management Scripts:"
    echo "   • ./docker-start.sh     - Start development environment"
    echo "   • ./docker-stop.sh      - Stop all services"
    echo "   • ./docker-reset.sh     - Reset with fresh data"
    echo "   • ./docker-logs.sh      - View service logs"
    echo
    echo "📊 Available Configurations:"
    echo "   • docker-compose.yml         - Core services"
    echo "   • docker-compose.dev.yml     - Development environment"
    echo "   • .env.docker               - Environment variables"
    echo
    echo "🔧 Quick Commands:"
    echo "   • claude mcp list                    # Check MCP status"
    echo "   • docker-compose ps                 # Service status"
    echo "   • docker-compose --profile admin up -d pgadmin"
    echo "   • docker-compose --profile monitoring up -d prometheus grafana"
    echo
    echo "Ready for advanced container-based AI development! 🚀"
}

# Main execution
main() {
    print_header
    
    check_prerequisites
    install_docker_mcp
    create_docker_configs
    setup_docker_env
    create_docker_scripts
    test_docker_operations
    test_mcp_docker_integration
    
    echo
    show_summary
}

# Run main function
main "$@"
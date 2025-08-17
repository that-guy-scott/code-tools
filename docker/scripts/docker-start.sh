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

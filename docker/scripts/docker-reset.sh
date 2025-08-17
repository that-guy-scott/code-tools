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

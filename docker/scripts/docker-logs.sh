#!/bin/bash
# View logs from all services
echo "📋 Viewing code-tools logs..."

if [ $# -eq 0 ]; then
    docker-compose logs -f
else
    docker-compose logs -f "$@"
fi

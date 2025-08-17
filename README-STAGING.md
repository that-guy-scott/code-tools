# Claude Code Global Infrastructure - Staging Builder

## Quick Start

### 🚀 Build Staging Environment
```bash
# From the code-tools project directory:
./scripts/build-staging.sh
```

### ✅ After Building
```bash
# Validate staging
~/.claude-dev/global-infrastructure/scripts/validate-staging.sh

# Deploy when ready
~/.claude-dev/global-infrastructure/scripts/deploy-to-production.sh
```

## Complete Workflow

### 1. **Build Staging Environment**
```bash
# Standard build (preserves existing staging)
./scripts/build-staging.sh

# Clean rebuild (removes existing staging)
./scripts/build-staging.sh --clean

# Update existing staging with latest components
./scripts/build-staging.sh --update

# Preview what would be built
./scripts/build-staging.sh --dry-run
```

### 2. **Validate Staging**
```bash
# Comprehensive validation
~/.claude-dev/global-infrastructure/scripts/validate-staging.sh
```

### 3. **Deploy to Production**
```bash
# Preview deployment
~/.claude-dev/global-infrastructure/scripts/deploy-to-production.sh --dry-run

# Deploy to production
~/.claude-dev/global-infrastructure/scripts/deploy-to-production.sh
```

## What the Builder Does

### 📋 **Base Environment Setup**
- Copies essential Claude Code files from `~/.claude` (if exists)
  - `settings.json` - User preferences
  - `.credentials.json` - API keys and credentials
  - `projects/` - Project conversation history
  - `todos/` - Global todo management
- Creates minimal configuration if no production environment exists

### 🏗️ **Global Infrastructure Integration**
- Copies all code-tools components to `~/.claude-dev/global-infrastructure/`
- Sets up Universal LLM CLI v2 with global launcher
- Configures MCP server ecosystem (9 servers)
- Installs Node.js dependencies automatically
- Sets up database stack configuration
- Organizes documentation and management scripts

### ✅ **Validation and Testing**
- Tests CLI functionality in staging
- Validates all required components are present
- Checks script permissions and executability
- Verifies MCP configuration syntax
- Reports any issues or missing components

## Directory Structure Created

```
~/.claude-dev/
├── settings.json                    # Copied from ~/.claude
├── .credentials.json               # Copied from ~/.claude (if exists)
├── projects/                       # Copied from ~/.claude (if exists)
├── todos/                          # Copied from ~/.claude (if exists)
├── .mcp.json                       # Global MCP configuration
└── global-infrastructure/
    ├── bin/
    │   ├── llm                     # Global CLI launcher
    │   └── llm-cli.js              # Universal LLM CLI v2
    ├── docs/
    │   ├── GLOBAL-INFRASTRUCTURE.md
    │   ├── DEPLOYMENT-GUIDE.md
    │   └── README.md
    ├── scripts/
    │   ├── build-staging.sh        # This builder script
    │   ├── deploy-to-production.sh # Production deployment
    │   ├── validate-staging.sh     # Staging validation
    │   ├── manage-databases.sh     # Database management
    │   └── backup-restore.sh       # Backup/restore system
    ├── mcp/
    │   └── global-mcp.json         # MCP server configuration
    ├── databases/
    │   └── docker/                 # Database stack configuration
    ├── package.json                # Node.js dependencies
    └── node_modules/               # Installed dependencies
```

## Build Options

### `--clean`
- Removes existing `~/.claude-dev` completely
- Creates fresh staging environment from scratch
- **Use when**: Starting over or fixing corrupted staging

### `--update`
- Preserves existing staging configuration
- Updates components with latest from code-tools project
- **Use when**: Updating staging with new features/fixes

### `--dry-run`
- Shows what would be built without making changes
- Safe way to preview build process
- **Use when**: Checking what changes would be made

## Safety Features

- ✅ **Never modifies production** `~/.claude` directory
- ✅ **Automatic backup** of existing staging before rebuild
- ✅ **Comprehensive validation** ensures staging is properly built
- ✅ **Dry-run capability** for safe preview
- ✅ **Clear error messages** with troubleshooting guidance

## Troubleshooting

### Common Issues

**"This script must be run from the code-tools project directory"**
- Solution: `cd /home/owner/repo/code-tools` then run the script

**"Node.js not found" warning**
- Solution: Install Node.js for full CLI functionality
- Alternative: Dependencies can be installed later

**"CLI test failed"**
- Solution: Check Node.js installation and run `npm install` in staging
- Check: `~/.claude-dev/global-infrastructure/package.json` exists

**Validation errors**
- Solution: Run with `--clean` flag to rebuild from scratch
- Check: All required files are present in code-tools project

### Getting Help

- **Detailed help**: `./scripts/build-staging.sh --help`
- **Validation**: Run `~/.claude-dev/global-infrastructure/scripts/validate-staging.sh`
- **Documentation**: Check `~/.claude-dev/global-infrastructure/docs/`

## Integration with Claude Code

### Global Commands (After Deployment)
```bash
llm --version                    # Universal LLM CLI v2.0.0
llm --list-providers            # Multiple LLM providers
llm --list-tools                # 9+ MCP tools
llm "Hello world"               # Query any LLM provider
```

### Database Management
```bash
# Start global database stack
~/.claude/global-infrastructure/scripts/manage-databases.sh start

# Database services: PostgreSQL, Redis, Qdrant, Neo4j
# Available globally across all Claude Code sessions
```

### Knowledge Persistence
- **Neo4j agent memory**: Persistent knowledge across projects
- **Qdrant semantic search**: Cross-project document search
- **PostgreSQL storage**: Persistent data and configurations

## Benefits

### 🌐 **Universal Availability**
- One build, works everywhere
- Global CLI access from any directory
- Persistent knowledge across all projects

### 🔧 **Complete Toolkit**
- Multi-LLM provider support
- Rich MCP server ecosystem
- Database stack for AI applications
- Backup and management tools

### 🛡️ **Safe Development**
- Staging environment isolation
- Production deployment automation
- Comprehensive backup system
- Validation at every step

---

**Next Steps**: Run `./scripts/build-staging.sh` to create your staging environment!
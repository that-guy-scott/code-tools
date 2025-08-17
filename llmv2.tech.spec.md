# Universal LLM CLI v2 Technical Specification

**Project Name:** llm-cli.js  
**Version:** 2.0.0  
**Date:** 2025-08-17  
**Type:** Universal Multi-Provider LLM CLI with MCP Integration  

## Executive Summary

This specification defines the architecture for a universal command-line interface that supports multiple Large Language Model providers (Ollama, Gemini, OpenAI, Anthropic) with integrated Model Context Protocol (MCP) server tooling capabilities. The tool is designed for automation, AI agent use, and programmatic integration.

## Architecture Overview

### Core Design Principles
- **Single File Implementation** - SOLID OOP design contained in one JavaScript file
- **Provider Agnostic** - Abstract interface supporting multiple LLM providers
- **Automation First** - Command-driven interface optimized for scripting and AI agents
- **MCP Integration** - Auto-discovery and seamless integration with all MCP servers
- **Configuration Flexibility** - Multi-layer configuration with clear precedence
- **Output Versatility** - Multiple output formats for different consumption patterns

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         LLM CLI v2                          │
├─────────────────────────────────────────────────────────────┤
│  ConfigManager  │  MCPManager   │  ToolManager              │
├─────────────────────────────────────────────────────────────┤
│                  ProviderInterface                          │
├─────────────────────────────────────────────────────────────┤
│ OllamaProvider │ GeminiProvider │ OpenAIProvider │ Claude... │
├─────────────────────────────────────────────────────────────┤
│           OutputFormatter    │    ErrorHandler               │
└─────────────────────────────────────────────────────────────┘
```

## Class Architecture

### 1. ProviderInterface (Abstract Base Class)
**Purpose:** Define common interface for all LLM providers

**Methods:**
- `async getAvailableModels()` - Discover available models via API
- `async generateResponse(prompt, options)` - Generate LLM response
- `async callFunction(functionCall, context)` - Execute tool calls
- `validateModel(modelName)` - Verify model availability
- `formatToolsForProvider(tools)` - Convert universal tools to provider format

### 2. OllamaProvider (Concrete Implementation)
**Purpose:** Ollama-specific API implementation

**Features:**
- Dynamic model discovery via `/api/tags` endpoint
- Support for WSL2 → Windows API calls
- Native Ollama function calling integration
- Streaming response support

**Configuration:**
- Host URL (default: `http://172.31.240.1:11434`)
- Model selection
- Generation parameters (temperature, top_p, etc.)

### 3. GeminiProvider (Concrete Implementation)
**Purpose:** Google Gemini API implementation

**Features:**
- Google AI SDK integration
- Function calling via Gemini's native capabilities
- API key authentication
- Model family support (2.0-flash, 2.5-flash, 2.5-pro)

**Configuration:**
- API key via environment variable
- Model selection
- Generation parameters

### 4. MCPManager
**Purpose:** Auto-discovery and management of MCP servers

**Features:**
- Parse `.mcp.json` configuration file
- Establish connections to all configured MCP servers
- Health checking and connection validation
- Tool discovery and capability enumeration

**MCP Servers Supported:**
- jetbrains (IDE integration)
- github (Repository management)
- puppeteer (Browser automation)
- docker-mcp (Container management)
- postgres (Database operations)
- redis (Key-value operations)
- qdrant (Vector database)
- neo4j-agent-memory (AI agent memory)
- neo4j-server (Neo4j operations)

### 5. ToolManager
**Purpose:** Universal tool calling system

**Features:**
- Convert MCP tools to universal schema
- Tool filtering and selection
- Function call parsing and execution
- Result formatting and error handling

**Universal Tool Schema:**
```javascript
{
  name: "tool_name",
  description: "Tool description",
  parameters: {
    type: "object",
    properties: { ... },
    required: [ ... ]
  },
  server: "mcp_server_name"
}
```

### 6. ConfigManager
**Purpose:** Multi-layer configuration management

**Configuration Precedence (highest to lowest):**
1. CLI flags (`--model`, `--provider`, `--tools`)
2. Environment variables (`LLM_CLI_MODEL`, `LLM_CLI_PROVIDER`)
3. Configuration file (`.llm-cli.json`, `~/.llm-cli.json`)
4. Default values

**Configuration File Format:**
```json
{
  "defaultProvider": "ollama",
  "providers": {
    "ollama": {
      "host": "http://172.31.240.1:11434",
      "defaultModel": "gpt-oss:latest"
    },
    "gemini": {
      "apiKey": "${GOOGLE_AI_API_KEY}",
      "defaultModel": "gemini-2.0-flash"
    }
  },
  "tools": {
    "default": ["github", "postgres"],
    "development": ["github", "postgres", "docker", "jetbrains"],
    "research": ["github", "qdrant", "neo4j-agent-memory"]
  },
  "output": {
    "format": "text",
    "verbose": false
  }
}
```

### 7. OutputFormatter
**Purpose:** Handle multiple output formats

**Output Modes:**
- `text` (default) - Human-readable formatted output
- `json` - Structured JSON for automation
- `raw` - Raw model response only

**Features:**
- Consistent error formatting
- Proper exit codes (0 = success, 1+ = error)
- Logging level support (quiet/verbose/debug)
- Color coding for terminal output

### 8. LLMCli (Main Orchestrator)
**Purpose:** Main application controller

**Responsibilities:**
- Command-line argument parsing
- Provider selection and instantiation
- MCP server initialization
- Request orchestration
- Response formatting and output

## Command-Line Interface

### Basic Syntax
```bash
llm-cli "<prompt>" --provider <provider> --model <model> [options]
```

### Core Arguments
- `<prompt>` - The prompt to send to the LLM (required)
- `--provider, -p` - LLM provider (ollama, gemini, openai, anthropic)
- `--model, -m` - Specific model name

### Tool Integration Options
- `--tools` - Comma-separated list of MCP tools to enable
- `--no-tools` - Disable all tool calling
- `--list-tools` - List available MCP tools and exit

### Output Options
- `--output, -o` - Output format (text, json, raw)
- `--quiet, -q` - Minimal output
- `--verbose, -v` - Detailed output
- `--debug` - Debug logging

### Configuration Options
- `--config` - Path to configuration file
- `--list-models` - List available models for provider
- `--list-providers` - List available providers

### Provider-Specific Options
- `--temperature` - Generation temperature (0.0-2.0)
- `--max-tokens` - Maximum tokens to generate
- `--top-p` - Top-p sampling parameter
- `--stream` - Enable streaming output

## Tool Calling Implementation

### Universal Tool Calling Flow
1. **Tool Discovery** - MCPManager discovers all available tools
2. **Tool Filtering** - Apply user-specified tool filters
3. **Provider Formatting** - Convert tools to provider-specific format
4. **LLM Integration** - Include tools in provider's function calling system
5. **Execution** - Parse function calls and execute via appropriate MCP server
6. **Result Integration** - Format results and return to LLM for response generation

### Function Call Schema
```javascript
{
  type: "function_call",
  function: {
    name: "mcp_server__tool_name",
    arguments: { ... }
  }
}
```

### Error Handling
- Connection failures to MCP servers
- Invalid function calls or parameters
- Tool execution errors
- Provider API errors

## Model Discovery

### Dynamic Model Discovery
Each provider implements dynamic model discovery:

**Ollama:**
- API call to `/api/tags` endpoint
- Parse response for available models
- Cache results for session duration

**Gemini:**
- Predefined model list with API validation
- Support for model family detection
- Graceful fallback for unavailable models

**Future Providers:**
- OpenAI: API call to `/v1/models`
- Anthropic: Static list with API validation

## Configuration Management

### Environment Variables
- `LLM_CLI_PROVIDER` - Default provider
- `LLM_CLI_MODEL` - Default model
- `LLM_CLI_CONFIG` - Configuration file path
- `LLM_CLI_TOOLS` - Default tools list
- Provider-specific: `OLLAMA_HOST`, `GOOGLE_AI_API_KEY`

### Configuration File Locations
1. `--config` specified file
2. `./.llm-cli.json` (project directory)
3. `~/.llm-cli.json` (user home)
4. `~/.config/llm-cli/config.json` (XDG config)

## Error Handling & Logging

### Exit Codes
- `0` - Success
- `1` - General error
- `2` - Configuration error
- `3` - Provider connection error
- `4` - Tool execution error
- `5` - Invalid arguments

### Logging Levels
- **Quiet** - Errors only
- **Normal** - Basic operation info
- **Verbose** - Detailed operation info
- **Debug** - Full debug information including API calls

### Error Output Format
```json
{
  "error": {
    "code": "PROVIDER_CONNECTION_FAILED",
    "message": "Failed to connect to Ollama server",
    "details": {
      "provider": "ollama",
      "host": "http://172.31.240.1:11434",
      "cause": "Connection refused"
    }
  }
}
```

## Security Considerations

### API Key Management
- Environment variable loading via dotenv
- No API keys in configuration files
- Secure credential storage recommendations

### MCP Server Security
- Validate MCP server certificates
- Implement connection timeouts
- Sanitize tool inputs and outputs

### Input Validation
- Sanitize all user inputs
- Validate tool parameters
- Prevent injection attacks

## Performance Considerations

### Connection Pooling
- Reuse MCP server connections
- Implement connection health checks
- Graceful degradation for failed servers

### Caching
- Cache model lists for session duration
- Cache MCP tool schemas
- Implement response caching for development

### Resource Management
- Limit concurrent tool executions
- Implement request timeouts
- Memory management for large responses

## Testing Strategy

### Unit Tests
- Individual class testing
- Mock MCP server responses
- Configuration precedence validation

### Integration Tests
- End-to-end provider testing
- MCP server integration
- Tool calling workflows

### Automation Tests
- CLI interface testing
- Output format validation
- Error condition handling

## Migration Path

### Backward Compatibility
- Keep existing `ollama-cli.js` as wrapper script
- Keep existing `gemini-cli.js` as wrapper script
- Maintain current command-line interface

### Wrapper Implementation
```javascript
// ollama-cli.js (wrapper)
import { LLMCli } from './llm-cli.js';
process.argv.splice(2, 0, '--provider', 'ollama');
new LLMCli().run();
```

### Package.json Updates
```json
{
  "scripts": {
    "llm": "node llm-cli.js",
    "ollama": "node llm-cli.js --provider ollama",
    "gemini": "node llm-cli.js --provider gemini"
  }
}
```

## Future Extensibility

### Additional Providers
- OpenAI GPT models
- Anthropic Claude models
- Local model providers (llama.cpp, etc.)
- Custom provider plugins

### Enhanced Features
- Conversation context management
- Batch processing capabilities
- Template system for common prompts
- Custom tool development framework

### Enterprise Features
- Role-based access control
- Audit logging
- Cost tracking and quotas
- Team configuration management

## Implementation Timeline

### Phase 1: Core Architecture (Week 1)
- Implement base classes and interfaces
- Basic provider implementations (Ollama, Gemini)
- Configuration management system

### Phase 2: MCP Integration (Week 2)
- MCP server auto-discovery
- Universal tool calling system
- Tool filtering and management

### Phase 3: Features & Polish (Week 3)
- Output formatting and error handling
- Comprehensive logging
- Documentation and testing

### Phase 4: Migration & Deployment (Week 4)
- Backward compatibility wrappers
- Migration documentation
- Production deployment

## Dependencies

### Required Node.js Packages
- `commander` - CLI argument parsing
- `chalk` - Terminal color output
- `dotenv` - Environment variable loading
- `ollama` - Ollama API client
- `@google/generative-ai` - Gemini API client

### MCP Dependencies
- Existing `.mcp.json` configuration
- Running MCP servers for tool integration
- Proper environment variables for server connections

## Success Metrics

### Functional Requirements
- ✅ Support for multiple LLM providers in single interface
- ✅ Seamless MCP server integration and tool calling
- ✅ Dynamic model discovery via provider APIs
- ✅ Flexible configuration with clear precedence
- ✅ Multiple output formats for automation and human use

### Performance Requirements
- ✅ Sub-second startup time
- ✅ Tool execution under 5 seconds
- ✅ Graceful handling of provider timeouts
- ✅ Memory usage under 100MB for typical operations

### Usability Requirements
- ✅ Intuitive command-line interface
- ✅ Clear error messages and debugging
- ✅ Comprehensive documentation
- ✅ Smooth migration from existing tools

---

**Document Status:** Draft v1.0  
**Last Updated:** 2025-08-17  
**Next Review:** Implementation completion
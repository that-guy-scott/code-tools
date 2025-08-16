# Code Tools

A collection of command-line interfaces for interacting with different LLMs (Large Language Models).

## Available Tools

### Ollama CLI (`ollama-cli.js`)
Command-line interface for interacting with locally hosted Ollama models.

**Supported Models:**
- `gpt-oss:latest` (default)
- `qwen3:30b`
- `qwen3-coder:latest`
- `gemma3:27b`
- `qwen2.5-coder:32b`
- `nomic-embed-text:latest`

**Usage:**
```bash
node ollama-cli.js "Your prompt here"
node ollama-cli.js --model qwen3-coder:latest "Write a function"
node ollama-cli.js --stream "Tell me a story"
echo "Hello" | node ollama-cli.js --stdin
```

### Gemini CLI (`gemini-cli.js`)
Command-line interface for Google's Gemini models.

**Supported Models:**
- `gemini-2.0-flash` (default)
- `gemini-2.5-flash`
- `gemini-2.5-pro`

**Usage:**
```bash
node gemini-cli.js "Your prompt here"
node gemini-cli.js --model gemini-2.5-pro "Complex reasoning task"
node gemini-cli.js --stream "Write a story"
echo "Hello" | node gemini-cli.js --stdin
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **For Ollama CLI:**
   - Ensure Ollama is running locally
   - Default host: `http://172.31.240.1:11434`

3. **For Gemini CLI:**
   - Create a `.env` file with your Google AI API key:
     ```
     GOOGLE_AI_API_KEY=your_api_key_here
     ```
   - Get your API key from: https://aistudio.google.com/app/apikey

## Options

Both CLIs support similar options:

- `-m, --model <model>` - Select model to use
- `-s, --stream` - Enable streaming output
- `-t, --temperature <temp>` - Set temperature (0.0-1.0)
- `-p, --prompt <text>` - Prompt text (alternative to positional argument)
- `--stdin` - Read prompt from stdin
- `--max-tokens <num>` - Maximum tokens to generate
- `--top-p <num>` - Top-p sampling parameter
- `--top-k <num>` - Top-k sampling parameter

## Examples

```bash
# Compare responses from different models
node ollama-cli.js --model qwen3-coder:latest "Write a sorting algorithm"
node gemini-cli.js --model gemini-2.5-pro "Write a sorting algorithm"

# Use streaming for long responses
node ollama-cli.js --stream "Explain quantum computing in detail"

# Pipe content
cat document.txt | node gemini-cli.js --stdin "Summarize this"

# Use npm scripts
npm run gemini "What is the meaning of life?"
npm start "Hello from Ollama"
```

## Dependencies

- `commander` - Command-line argument parsing
- `chalk` - Terminal styling
- `ollama` - Ollama client library
- `@google/generative-ai` - Google Gemini client library
- `dotenv` - Environment variable loading

## License

MIT
#!/usr/bin/env node

import { program } from 'commander';
import { Ollama } from 'ollama';
import chalk from 'chalk';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

const ollama = new Ollama();

// Available models (update this list as needed)
const AVAILABLE_MODELS = [
  'gpt-oss:latest',
  'qwen3:30b', 
  'qwen3-coder:latest',
  'gemma3:27b',
  'qwen2.5-coder:32b',
  'nomic-embed-text:latest'
];

program
  .name('ollama-cli')
  .description('Simple CLI for interacting with Ollama LLM')
  .version('1.0.0')
  .argument('[prompt]', 'The prompt to send to the model')
  .option('-m, --model <model>', 'Model to use', 'gpt-oss:latest')
  .option('-h, --host <host>', 'Ollama host', 'http://172.31.240.1:11434')
  .option('-s, --stream', 'Enable streaming output', false)
  .option('-t, --temperature <temperature>', 'Temperature for generation', parseFloat, 0.7)
  .option('-p, --prompt <prompt>', 'Prompt text (alternative to positional argument)')
  .option('--stdin', 'Read prompt from stdin')
  .option('--max-tokens <tokens>', 'Maximum tokens to generate', parseInt)
  .option('--top-p <top_p>', 'Top-p sampling parameter', parseFloat)
  .option('--top-k <top_k>', 'Top-k sampling parameter', parseInt)
  .parse();

const options = program.opts();
const args = program.args;

async function readFromStdin() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const lines = [];
  for await (const line of rl) {
    lines.push(line);
  }
  
  return lines.join('\n');
}

async function generateResponse(prompt, config) {
  try {
    // Configure ollama client
    ollama.config.host = config.host;

    // Prepare generation options
    const generateOptions = {
      model: config.model,
      prompt: prompt,
      stream: config.stream,
      options: {}
    };

    // Add optional parameters
    if (config.temperature !== undefined) generateOptions.options.temperature = config.temperature;
    if (config.maxTokens !== undefined) generateOptions.options.num_predict = config.maxTokens;
    if (config.topP !== undefined) generateOptions.options.top_p = config.topP;
    if (config.topK !== undefined) generateOptions.options.top_k = config.topK;

    if (config.stream) {
      console.log(chalk.blue('Streaming response:'));
      console.log(chalk.gray('─'.repeat(50)));
      
      const stream = await ollama.generate(generateOptions);
      
      for await (const chunk of stream) {
        if (chunk.response) {
          process.stdout.write(chalk.white(chunk.response));
        }
      }
      console.log('\n' + chalk.gray('─'.repeat(50)));
    } else {
      console.log(chalk.blue('Generating response...'));
      
      const response = await ollama.generate(generateOptions);
      
      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.white(response.response));
      console.log(chalk.gray('─'.repeat(50)));
      
      // Show some metadata
      if (response.eval_count && response.eval_duration) {
        const tokensPerSecond = (response.eval_count / (response.eval_duration / 1e9)).toFixed(2);
        console.log(chalk.dim(`Tokens: ${response.eval_count} | Speed: ${tokensPerSecond} tokens/sec`));
      }
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    
    if (error.message.includes('connect')) {
      console.error(chalk.yellow('Make sure Ollama is running and accessible at:'), options.host);
      console.error(chalk.yellow('You can start Ollama with: ollama serve'));
    }
    
    if (error.message.includes('model')) {
      console.error(chalk.yellow('Available models can be listed with: ollama list'));
      console.error(chalk.yellow('Known models:'), AVAILABLE_MODELS.join(', '));
    }
    
    process.exit(1);
  }
}

async function main() {
  let prompt;

  // Determine prompt source
  if (options.stdin) {
    prompt = await readFromStdin();
  } else if (options.prompt) {
    prompt = options.prompt;
  } else if (args[0]) {
    prompt = args[0];
  } else {
    console.error(chalk.red('Error: No prompt provided'));
    console.error(chalk.yellow('Usage examples:'));
    console.error(chalk.white('  ollama-cli "What is the capital of France?"'));
    console.error(chalk.white('  ollama-cli --prompt "Explain quantum physics" --model llama2'));
    console.error(chalk.white('  echo "Hello world" | ollama-cli --stdin'));
    process.exit(1);
  }

  if (!prompt.trim()) {
    console.error(chalk.red('Error: Empty prompt provided'));
    process.exit(1);
  }

  // Show configuration
  console.log(chalk.dim(`Model: ${options.model} | Host: ${options.host}`));
  console.log(chalk.dim(`Prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`));
  
  await generateResponse(prompt, options);
}

main().catch((error) => {
  console.error(chalk.red('Unexpected error:'), error);
  process.exit(1);
});
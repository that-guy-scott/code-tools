#!/usr/bin/env node

import 'dotenv/config';
import { program } from 'commander';
import { GoogleGenerativeAI } from '@google/generative-ai';
import chalk from 'chalk';
import { createInterface } from 'readline';

program
  .name('gemini-cli')
  .description('Simple CLI for interacting with Google Gemini')
  .version('1.0.0')
  .argument('[prompt]', 'The prompt to send to the model')
  .option('-m, --model <model>', 'Model to use', 'gemini-2.0-flash')
  .option('-k, --api-key <key>', 'Google AI API key (or set GOOGLE_AI_API_KEY env var)')
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

// Available models
const AVAILABLE_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.5-flash', 
  'gemini-2.5-pro'
];

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
    // Get API key
    const apiKey = config.apiKey || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('Google AI API key not provided. Use --api-key option or set GOOGLE_AI_API_KEY environment variable.');
    }

    // Validate model
    if (!AVAILABLE_MODELS.includes(config.model)) {
      throw new Error(`Invalid model: ${config.model}. Available models: ${AVAILABLE_MODELS.join(', ')}`);
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: config.model,
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
        topP: config.topP,
        topK: config.topK,
      }
    });

    if (config.stream) {
      console.log(chalk.blue('Streaming response:'));
      console.log(chalk.gray('─'.repeat(50)));
      
      const result = await model.generateContentStream(prompt);
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          process.stdout.write(chalk.white(chunkText));
        }
      }
      console.log('\n' + chalk.gray('─'.repeat(50)));
    } else {
      console.log(chalk.blue('Generating response...'));
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.white(text));
      console.log(chalk.gray('─'.repeat(50)));
      
      // Show some metadata if available
      const usage = response.usageMetadata;
      if (usage) {
        console.log(chalk.dim(`Tokens: ${usage.totalTokenCount || 'N/A'} | Input: ${usage.promptTokenCount || 'N/A'} | Output: ${usage.candidatesTokenCount || 'N/A'}`));
      }
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    
    if (error.message.includes('API key')) {
      console.error(chalk.yellow('Get your API key from: https://aistudio.google.com/app/apikey'));
    }
    
    if (error.message.includes('model')) {
      console.error(chalk.yellow('Available models:'), AVAILABLE_MODELS.join(', '));
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
    console.error(chalk.white('  gemini-cli "What is the capital of France?"'));
    console.error(chalk.white('  gemini-cli --prompt "Explain quantum physics" --model gemini-2.5-pro'));
    console.error(chalk.white('  echo "Hello world" | gemini-cli --stdin'));
    console.error(chalk.white('  gemini-cli --api-key YOUR_KEY "Tell me a joke"'));
    process.exit(1);
  }

  if (!prompt.trim()) {
    console.error(chalk.red('Error: Empty prompt provided'));
    process.exit(1);
  }

  // Show configuration
  console.log(chalk.dim(`Model: ${options.model}`));
  console.log(chalk.dim(`Prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`));
  
  await generateResponse(prompt, options);
}

main().catch((error) => {
  console.error(chalk.red('Unexpected error:'), error);
  process.exit(1);
});
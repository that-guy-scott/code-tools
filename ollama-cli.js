#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('⚠️  ollama-cli.js is deprecated. Use "npm run ollama" or "llm-cli --provider ollama" instead.');
console.log('🔄 Redirecting to Universal LLM CLI v2...\n');

const args = ['llm-cli.js', '--provider', 'ollama', ...process.argv.slice(2)];
const child = spawn('node', args, {
  stdio: 'inherit',
  cwd: process.cwd()
});

child.on('exit', (code) => {
  process.exit(code);
});
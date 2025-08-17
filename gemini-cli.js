#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('⚠️  gemini-cli.js is deprecated. Use "npm run gemini" or "llm-cli --provider gemini" instead.');
console.log('🔄 Redirecting to Universal LLM CLI v2...\n');

const args = ['llm-cli.js', '--provider', 'gemini', ...process.argv.slice(2)];
const child = spawn('node', args, {
  stdio: 'inherit',
  cwd: process.cwd()
});

child.on('exit', (code) => {
  process.exit(code);
});
#!/usr/bin/env node

import { spawn } from 'child_process';
import chalk from 'chalk';

console.log(chalk.blue('🧪 Testing Universal LLM CLI v2'));
console.log(chalk.gray('=' .repeat(50)));

const tests = [
  {
    name: 'List Providers',
    command: './llm-cli.js',
    args: ['--list-providers']
  },
  {
    name: 'List Ollama Models',
    command: './llm-cli.js',
    args: ['--provider', 'ollama', '--list-models']
  },
  {
    name: 'List MCP Tools',
    command: './llm-cli.js',
    args: ['--list-tools']
  },
  {
    name: 'NPM Script - Ollama',
    command: 'npm',
    args: ['run', 'ollama', '--', '--list-models']
  },
  {
    name: 'Backward Compatibility - Ollama',
    command: './ollama-cli.js',
    args: ['--list-models']
  },
  {
    name: 'Backward Compatibility - Gemini',
    command: './gemini-cli.js',
    args: ['--help']
  }
];

async function runTest(test) {
  return new Promise((resolve) => {
    console.log(chalk.yellow(`\n🔍 Testing: ${test.name}`));
    console.log(chalk.gray(`Command: ${test.command} ${test.args.join(' ')}`));
    
    const child = spawn(test.command, test.args, {
      stdio: 'pipe',
      timeout: 10000
    });
    
    let output = '';
    let error = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    child.on('exit', (code) => {
      if (code === 0) {
        console.log(chalk.green(`✅ ${test.name} - PASSED`));
        console.log(chalk.gray(`Output lines: ${output.split('\n').length - 1}`));
      } else {
        console.log(chalk.red(`❌ ${test.name} - FAILED (exit code: ${code})`));
        if (error) console.log(chalk.red(`Error: ${error.substring(0, 200)}...`));
      }
      resolve({ name: test.name, success: code === 0, output, error, code });
    });
    
    child.on('error', (err) => {
      console.log(chalk.red(`❌ ${test.name} - ERROR: ${err.message}`));
      resolve({ name: test.name, success: false, error: err.message, code: -1 });
    });
  });
}

async function runAllTests() {
  const results = [];
  
  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
  }
  
  console.log(chalk.blue('\n📊 Test Summary'));
  console.log(chalk.gray('=' .repeat(50)));
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(chalk.green(`✅ Passed: ${passed}/${total}`));
  console.log(chalk.red(`❌ Failed: ${total - passed}/${total}`));
  
  if (passed === total) {
    console.log(chalk.green('\n🎉 All tests passed! Universal LLM CLI v2 is working correctly.'));
  } else {
    console.log(chalk.yellow('\n⚠️  Some tests failed. Check the output above for details.'));
  }
  
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}
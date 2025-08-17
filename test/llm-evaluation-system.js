#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

class LLMEvaluationSystem {
  constructor() {
    this.scoringCriteria = {
      correctness: {
        weight: 25,
        description: 'Function works correctly and solves the problem'
      },
      error_handling: {
        weight: 25,
        description: 'Proper error handling for edge cases'
      },
      test_cases: {
        weight: 25,
        description: 'Comprehensive test cases provided'
      },
      code_quality: {
        weight: 25,
        description: 'Code quality, documentation, and best practices'
      }
    };
  }

  extractResponseContent(jsonFile) {
    try {
      const content = readFileSync(jsonFile, 'utf8');
      const lines = content.split('\n');
      
      // Find the JSON part (starts after the CLI output)
      let jsonStart = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('{')) {
          jsonStart = i;
          break;
        }
      }
      
      if (jsonStart === -1) {
        throw new Error('No JSON content found');
      }
      
      const jsonContent = lines.slice(jsonStart).join('\n');
      const parsed = JSON.parse(jsonContent);
      
      return {
        provider: parsed.provider,
        model: parsed.model,
        prompt: parsed.prompt,
        response: parsed.response?.response || parsed.response?.text || parsed.response || 'No response content',
        timestamp: parsed.timestamp,
        metadata: {
          responseTime: this.extractResponseTime(parsed),
          tokens: this.extractTokenCount(parsed)
        }
      };
    } catch (error) {
      console.error(chalk.red(`Error parsing ${jsonFile}:`), error.message);
      return null;
    }
  }

  extractResponseTime(parsed) {
    if (parsed.response?.eval_duration) {
      return Math.round(parsed.response.eval_duration / 1000000); // Convert to milliseconds
    }
    return null;
  }

  extractTokenCount(parsed) {
    if (parsed.response?.eval_count) {
      return parsed.response.eval_count;
    }
    return null;
  }

  scoreResponse(response) {
    const content = response.response;
    const scores = {};
    let totalScore = 0;

    // Score correctness (25 points)
    scores.correctness = this.scoreCorrectness(content);
    
    // Score error handling (25 points)
    scores.error_handling = this.scoreErrorHandling(content);
    
    // Score test cases (25 points)
    scores.test_cases = this.scoreTestCases(content);
    
    // Score code quality (25 points)
    scores.code_quality = this.scoreCodeQuality(content);

    // Calculate total score
    for (const [criteria, score] of Object.entries(scores)) {
      totalScore += score;
    }

    return {
      totalScore,
      breakdown: scores,
      details: this.generateScoreDetails(scores, content)
    };
  }

  scoreCorrectness(content) {
    let score = 0;
    
    // Check for function definition
    if (content.includes('def ') && content.includes('two_sum') || content.includes('find_two_sum')) {
      score += 8;
    }
    
    // Check for return statement
    if (content.includes('return')) {
      score += 5;
    }
    
    // Check for algorithm (hash map or dictionary)
    if (content.includes('dict') || content.includes('{}') || content.includes('seen') || content.includes('complement')) {
      score += 7;
    }
    
    // Check for proper logic
    if (content.includes('target - ') || content.includes('sum')) {
      score += 5;
    }
    
    return Math.min(score, 25);
  }

  scoreErrorHandling(content) {
    let score = 0;
    
    // Check for try/catch or explicit error handling
    if (content.includes('try:') && content.includes('except:')) {
      score += 8;
    } else if (content.includes('raise ') || content.includes('ValueError') || content.includes('TypeError')) {
      score += 10;
    }
    
    // Check for input validation
    if (content.includes('isinstance') || content.includes('type(')) {
      score += 8;
    }
    
    // Check for edge case handling
    if (content.includes('len(') && content.includes('< 2')) {
      score += 7;
    }
    
    return Math.min(score, 25);
  }

  scoreTestCases(content) {
    let score = 0;
    
    // Check for test function or test cases
    if (content.includes('test') || content.includes('Test')) {
      score += 10;
    }
    
    // Count test scenarios
    const testIndicators = ['test case', 'Test ', 'assert', 'print(', 'example'];
    const testCount = testIndicators.reduce((count, indicator) => {
      return count + (content.toLowerCase().split(indicator.toLowerCase()).length - 1);
    }, 0);
    
    score += Math.min(testCount * 2, 10);
    
    // Check for diverse test cases
    if (content.includes('negative') || content.includes('-')) {
      score += 3;
    }
    if (content.includes('duplicate') || content.includes('same')) {
      score += 2;
    }
    
    return Math.min(score, 25);
  }

  scoreCodeQuality(content) {
    let score = 0;
    
    // Check for documentation
    if (content.includes('"""') || content.includes("'''")) {
      score += 8;
    }
    
    // Check for comments
    if (content.includes('#')) {
      score += 5;
    }
    
    // Check for proper variable names
    if (content.includes('nums') && content.includes('target')) {
      score += 5;
    }
    
    // Check for efficiency (O(n) algorithm)
    if (content.includes('O(n)') || (content.includes('dict') || content.includes('{}'))) {
      score += 4;
    }
    
    // Check for proper formatting and structure
    if (content.includes('def ') && content.includes(':') && content.includes('    ')) {
      score += 3;
    }
    
    return Math.min(score, 25);
  }

  generateScoreDetails(scores, content) {
    const details = {};
    
    for (const [criteria, score] of Object.entries(scores)) {
      const maxScore = this.scoringCriteria[criteria].weight;
      details[criteria] = {
        score,
        maxScore,
        percentage: Math.round((score / maxScore) * 100),
        description: this.scoringCriteria[criteria].description
      };
    }
    
    return details;
  }

  evaluateAllResults() {
    const testDir = './test';
    const files = readdirSync(testDir).filter(f => f.endsWith('-result.json'));
    const results = [];

    console.log(chalk.blue('🔍 Evaluating LLM Test Results'));
    console.log(chalk.gray('=' .repeat(50)));

    for (const file of files) {
      console.log(chalk.yellow(`Analyzing ${file}...`));
      
      const filePath = join(testDir, file);
      const response = this.extractResponseContent(filePath);
      
      if (!response) {
        console.log(chalk.red(`❌ Failed to parse ${file}`));
        continue;
      }
      
      const evaluation = this.scoreResponse(response);
      
      const result = {
        file,
        provider: response.provider,
        model: response.model,
        score: evaluation.totalScore,
        breakdown: evaluation.breakdown,
        details: evaluation.details,
        metadata: response.metadata,
        timestamp: response.timestamp
      };
      
      results.push(result);
      
      console.log(chalk.green(`✅ Score: ${evaluation.totalScore}/100`));
      console.log(chalk.gray(`   Correctness: ${evaluation.breakdown.correctness}/25`));
      console.log(chalk.gray(`   Error Handling: ${evaluation.breakdown.error_handling}/25`));
      console.log(chalk.gray(`   Test Cases: ${evaluation.breakdown.test_cases}/25`));
      console.log(chalk.gray(`   Code Quality: ${evaluation.breakdown.code_quality}/25`));
      console.log();
    }

    return results.sort((a, b) => b.score - a.score);
  }

  generateReport(results) {
    console.log(chalk.blue('\n📊 Final Results Ranking'));
    console.log(chalk.gray('=' .repeat(50)));

    results.forEach((result, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📍';
      console.log(`${medal} ${index + 1}. ${chalk.bold(result.provider)} (${result.model})`);
      console.log(`   Score: ${chalk.green(result.score + '/100')}`);
      
      if (result.metadata.responseTime) {
        console.log(`   Response Time: ${result.metadata.responseTime}ms`);
      }
      if (result.metadata.tokens) {
        console.log(`   Tokens: ${result.metadata.tokens}`);
      }
      console.log();
    });

    return {
      summary: {
        totalTests: results.length,
        averageScore: Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length),
        topPerformer: results[0],
        scoringCriteria: this.scoringCriteria
      },
      results
    };
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const evaluator = new LLMEvaluationSystem();
  const results = evaluator.evaluateAllResults();
  const report = evaluator.generateReport(results);
  
  // Save detailed results
  writeFileSync('./test/evaluation-results.json', JSON.stringify(report, null, 2));
  console.log(chalk.green('📄 Detailed results saved to test/evaluation-results.json'));
}
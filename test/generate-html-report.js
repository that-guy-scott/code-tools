#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import chalk from 'chalk';

function generateHTMLReport() {
  const results = JSON.parse(readFileSync('./test/evaluation-results.json', 'utf8'));
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Universal LLM CLI v2 - Coding Evaluation Results</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 700;
        }

        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }

        .summary {
            background: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%);
            color: white;
            padding: 30px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }

        .summary-card {
            text-align: center;
        }

        .summary-card h3 {
            font-size: 2rem;
            margin-bottom: 5px;
        }

        .summary-card p {
            opacity: 0.9;
        }

        .results {
            padding: 40px;
        }

        .result-card {
            background: white;
            border: 1px solid #e1e8ed;
            border-radius: 15px;
            margin-bottom: 30px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .result-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }

        .result-header {
            padding: 25px;
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .result-header.first {
            background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
        }

        .result-header.second {
            background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
        }

        .result-header.third {
            background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
            color: #333;
        }

        .provider-info h3 {
            font-size: 1.5rem;
            margin-bottom: 5px;
        }

        .provider-info p {
            opacity: 0.9;
        }

        .score-circle {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: rgba(255,255,255,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            font-weight: bold;
        }

        .score-breakdown {
            padding: 25px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }

        .criterion {
            background: #f8fafc;
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid #4facfe;
        }

        .criterion h4 {
            margin-bottom: 10px;
            color: #2d3748;
        }

        .criterion p {
            color: #718096;
            margin-bottom: 15px;
            font-size: 0.9rem;
        }

        .progress-bar {
            background: #e2e8f0;
            height: 8px;
            border-radius: 4px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            transition: width 0.3s ease;
        }

        .score-text {
            margin-top: 8px;
            font-weight: 600;
            color: #2d3748;
        }

        .metadata {
            padding: 25px;
            background: #f7fafc;
            border-top: 1px solid #e2e8f0;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }

        .metadata-item {
            text-align: center;
        }

        .metadata-item strong {
            display: block;
            color: #2d3748;
            font-size: 1.1rem;
        }

        .metadata-item span {
            color: #718096;
            font-size: 0.9rem;
        }

        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            margin-right: 10px;
        }

        .badge.excellent {
            background: #c6f6d5;
            color: #22543d;
        }

        .badge.good {
            background: #fed7d7;
            color: #742a2a;
        }

        .badge.failed {
            background: #fed7d7;
            color: #742a2a;
        }

        .technical-details {
            margin-top: 40px;
            padding: 30px;
            background: #f7fafc;
            border-radius: 15px;
        }

        .technical-details h3 {
            margin-bottom: 20px;
            color: #2d3748;
        }

        .tech-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }

        .tech-item {
            background: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            border: 1px solid #e2e8f0;
        }

        .tech-item h4 {
            color: #4facfe;
            margin-bottom: 10px;
        }

        @media (max-width: 768px) {
            .header h1 {
                font-size: 2rem;
            }
            
            .summary {
                grid-template-columns: 1fr;
            }
            
            .result-header {
                flex-direction: column;
                text-align: center;
                gap: 15px;
            }
            
            .score-breakdown {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Universal LLM CLI v2</h1>
            <p>Coding Capability Evaluation Results</p>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>${results.summary.totalTests}</h3>
                <p>Models Tested</p>
            </div>
            <div class="summary-card">
                <h3>${results.summary.averageScore}/100</h3>
                <p>Average Score</p>
            </div>
            <div class="summary-card">
                <h3>${results.summary.topPerformer.provider}</h3>
                <p>Top Performer</p>
            </div>
            <div class="summary-card">
                <h3>${new Date().toLocaleDateString()}</h3>
                <p>Test Date</p>
            </div>
        </div>

        <div class="results">
            ${results.results.map((result, index) => `
                <div class="result-card">
                    <div class="result-header ${index === 0 ? 'first' : index === 1 ? 'second' : index === 2 ? 'third' : ''}">
                        <div class="provider-info">
                            <h3>${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📍'} ${result.provider.toUpperCase()}</h3>
                            <p>${result.model}</p>
                            <span class="badge ${result.score >= 90 ? 'excellent' : result.score >= 50 ? 'good' : 'failed'}">
                                ${result.score >= 90 ? 'Excellent' : result.score >= 50 ? 'Good' : 'Failed'}
                            </span>
                        </div>
                        <div class="score-circle">
                            ${result.score}/100
                        </div>
                    </div>

                    <div class="score-breakdown">
                        ${Object.entries(result.details).map(([key, detail]) => `
                            <div class="criterion">
                                <h4>${detail.description}</h4>
                                <p>${key.replace('_', ' ').toUpperCase()}</p>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${detail.percentage}%"></div>
                                </div>
                                <div class="score-text">${detail.score}/${detail.maxScore} (${detail.percentage}%)</div>
                            </div>
                        `).join('')}
                    </div>

                    ${result.metadata.responseTime ? `
                        <div class="metadata">
                            <div class="metadata-item">
                                <strong>${result.metadata.responseTime}ms</strong>
                                <span>Response Time</span>
                            </div>
                            <div class="metadata-item">
                                <strong>${result.metadata.tokens || 'N/A'}</strong>
                                <span>Tokens Generated</span>
                            </div>
                            <div class="metadata-item">
                                <strong>${result.metadata.responseTime ? Math.round(result.metadata.tokens / (result.metadata.responseTime / 1000)) : 'N/A'}</strong>
                                <span>Tokens/Second</span>
                            </div>
                        </div>
                    ` : `
                        <div class="metadata">
                            <div class="metadata-item">
                                <strong>Failed</strong>
                                <span>No Response</span>
                            </div>
                        </div>
                    `}
                </div>
            `).join('')}

            <div class="technical-details">
                <h3>📋 Technical Details</h3>
                <div class="tech-grid">
                    <div class="tech-item">
                        <h4>Test Framework</h4>
                        <p>Universal LLM CLI v2</p>
                    </div>
                    <div class="tech-item">
                        <h4>Evaluation System</h4>
                        <p>Automated Scoring</p>
                    </div>
                    <div class="tech-item">
                        <h4>Storage</h4>
                        <p>PostgreSQL + Neo4j</p>
                    </div>
                    <div class="tech-item">
                        <h4>MCP Integration</h4>
                        <p>9 Server Ecosystem</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Add animations on scroll
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        document.querySelectorAll('.result-card').forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(card);
        });

        // Animate progress bars
        setTimeout(() => {
            document.querySelectorAll('.progress-fill').forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0%';
                setTimeout(() => {
                    bar.style.width = width;
                }, 200);
            });
        }, 500);
    </script>
</body>
</html>
  `;

  writeFileSync('./test/llm-evaluation-report.html', html);
  console.log(chalk.green('✨ HTML report generated: test/llm-evaluation-report.html'));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateHTMLReport();
}
-- LLM Test Results Table
-- Stores testing results for different LLM providers and models

CREATE TABLE IF NOT EXISTS llm_test_results (
    id SERIAL PRIMARY KEY,
    test_name VARCHAR(255) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    model VARCHAR(255) NOT NULL,
    prompt_text TEXT NOT NULL,
    response_text TEXT NOT NULL,
    response_time_ms INTEGER,
    tokens_used INTEGER,
    temperature DECIMAL(3,2),
    max_tokens INTEGER,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    scoring_criteria JSONB,
    test_metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'llm-cli-v2',
    
    -- Indexes for performance
    INDEX idx_llm_test_provider (provider),
    INDEX idx_llm_test_model (model),
    INDEX idx_llm_test_created_at (created_at),
    INDEX idx_llm_test_score (score)
);

-- Comments
COMMENT ON TABLE llm_test_results IS 'Stores test results and performance metrics for LLM provider comparisons';
COMMENT ON COLUMN llm_test_results.test_name IS 'Name/identifier for the test case';
COMMENT ON COLUMN llm_test_results.provider IS 'LLM provider (ollama, gemini, openai, anthropic)';
COMMENT ON COLUMN llm_test_results.model IS 'Specific model used for generation';
COMMENT ON COLUMN llm_test_results.prompt_text IS 'Input prompt sent to the model';
COMMENT ON COLUMN llm_test_results.response_text IS 'Generated response from the model';
COMMENT ON COLUMN llm_test_results.response_time_ms IS 'Time taken for generation in milliseconds';
COMMENT ON COLUMN llm_test_results.tokens_used IS 'Number of tokens used in generation';
COMMENT ON COLUMN llm_test_results.score IS 'Quality score from 0-100 based on evaluation criteria';
COMMENT ON COLUMN llm_test_results.scoring_criteria IS 'JSON object describing how the score was calculated';
COMMENT ON COLUMN llm_test_results.test_metadata IS 'Additional test configuration and context';

-- Insert sample coding prompt for testing
INSERT INTO llm_test_results (
    test_name,
    provider,
    model,
    prompt_text,
    response_text,
    score,
    scoring_criteria,
    test_metadata
) VALUES (
    'coding-prompt-standard',
    'reference',
    'reference',
    'Write a Python function that takes a list of integers and returns the two numbers that sum to a target value. Include error handling for edge cases and write a few test cases to demonstrate it works.',
    'Reference prompt for LLM coding comparison testing',
    100,
    '{"correctness": 25, "error_handling": 25, "test_cases": 25, "code_quality": 25}',
    '{"test_type": "coding", "difficulty": "intermediate", "expected_features": ["function definition", "error handling", "test cases", "documentation"]}'
) ON CONFLICT DO NOTHING;
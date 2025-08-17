-- Technical Specifications Table Creation
-- Database: codetools_dev
-- Purpose: Store technical specifications for project features and implementations
-- Created: 2025-08-17

-- Create tech_specs table
CREATE TABLE IF NOT EXISTS tech_specs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    version VARCHAR(50) NOT NULL,
    type VARCHAR(100) NOT NULL, -- e.g., 'CLI Tool', 'API', 'Library', 'Feature'
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'review', 'approved', 'implemented', 'deprecated'
    description TEXT,
    specification_text TEXT NOT NULL, -- Full technical specification content
    architecture_summary TEXT,
    key_features JSONB, -- Array of key features
    dependencies JSONB, -- Array of dependencies
    implementation_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'system',
    file_path VARCHAR(500), -- Path to specification file if exists
    
    -- Constraints
    CONSTRAINT tech_specs_status_check CHECK (status IN ('draft', 'review', 'approved', 'implemented', 'deprecated')),
    CONSTRAINT tech_specs_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT tech_specs_version_not_empty CHECK (LENGTH(TRIM(version)) > 0)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tech_specs_name ON tech_specs(name);
CREATE INDEX IF NOT EXISTS idx_tech_specs_type ON tech_specs(type);
CREATE INDEX IF NOT EXISTS idx_tech_specs_status ON tech_specs(status);
CREATE INDEX IF NOT EXISTS idx_tech_specs_created_at ON tech_specs(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_tech_specs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tech_specs_updated_at_trigger ON tech_specs;
CREATE TRIGGER tech_specs_updated_at_trigger
    BEFORE UPDATE ON tech_specs
    FOR EACH ROW
    EXECUTE FUNCTION update_tech_specs_updated_at();

-- Add comments
COMMENT ON TABLE tech_specs IS 'Technical specifications for project features, components, and implementations';
COMMENT ON COLUMN tech_specs.id IS 'Unique identifier for the technical specification';
COMMENT ON COLUMN tech_specs.name IS 'Human-readable name of the specification (must be unique)';
COMMENT ON COLUMN tech_specs.version IS 'Version number of the specification (e.g., v1.0.0, v2.1.0)';
COMMENT ON COLUMN tech_specs.type IS 'Type of specification (CLI Tool, API, Library, Feature, etc.)';
COMMENT ON COLUMN tech_specs.status IS 'Current status of the specification in development lifecycle';
COMMENT ON COLUMN tech_specs.description IS 'Brief description of what this specification covers';
COMMENT ON COLUMN tech_specs.specification_text IS 'Full technical specification content (markdown supported)';
COMMENT ON COLUMN tech_specs.architecture_summary IS 'High-level architecture overview';
COMMENT ON COLUMN tech_specs.key_features IS 'JSON array of key features and capabilities';
COMMENT ON COLUMN tech_specs.dependencies IS 'JSON array of technical dependencies';
COMMENT ON COLUMN tech_specs.implementation_notes IS 'Additional notes for implementation';
COMMENT ON COLUMN tech_specs.file_path IS 'Path to specification file on filesystem (if applicable)';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON tech_specs TO codetools_user;
-- GRANT USAGE, SELECT ON SEQUENCE tech_specs_id_seq TO codetools_user;

-- Example usage queries (commented out for safety)
/*
-- Insert a new tech spec
INSERT INTO tech_specs (
    name, 
    version, 
    type, 
    description, 
    specification_text, 
    key_features, 
    dependencies
) VALUES (
    'Universal LLM CLI v2',
    '2.0.0',
    'CLI Tool',
    'Universal command-line interface supporting multiple LLM providers with MCP integration',
    'Full specification content here...',
    '["Multi-provider support", "MCP integration", "Tool calling", "Universal interface"]'::jsonb,
    '["Node.js 18+", "commander", "chalk", "dotenv", "ollama", "@google/generative-ai"]'::jsonb
);

-- Query tech specs
SELECT id, name, version, type, status, created_at 
FROM tech_specs 
ORDER BY created_at DESC;

-- Update tech spec status
UPDATE tech_specs 
SET status = 'approved', implementation_notes = 'Ready for implementation'
WHERE name = 'Universal LLM CLI v2';
*/
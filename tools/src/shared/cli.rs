use anyhow::{Context, Result};
use serde_json::Value;
use super::OutputFormat;

/// Common CLI options structure
#[derive(Debug, Clone)]
pub struct CommonOptions {
    pub format: OutputFormat,
    pub debug: bool,
}

impl CommonOptions {
    pub fn new(format: OutputFormat, debug: bool) -> Self {
        Self { format, debug }
    }
    
    /// Set debug mode in environment if enabled
    pub fn setup_debug(&self) {
        if self.debug {
            std::env::set_var("DEBUG", "1");
        }
    }
}

/// Environment variable helpers
pub fn get_env_or_default(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.to_string())
}

/// Parse JSON string from CLI argument with better error messages
pub fn parse_json_arg(json_str: &str, arg_name: &str) -> Result<Value> {
    serde_json::from_str(json_str)
        .with_context(|| format!("Failed to parse {} as JSON: {}", arg_name, json_str))
}
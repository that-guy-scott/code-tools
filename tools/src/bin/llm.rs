use clap::Parser;
use serde::{Deserialize, Serialize};
use std::env;
use std::io::{self, Read};
use std::time::Duration;
use anyhow::{Result, anyhow};
use tokio::time::timeout;
use reqwest;
use regex::Regex;
use dotenv::dotenv;

#[derive(Parser)]
#[command(name = "llm")]
#[command(about = "High-performance LLM CLI client for multiple providers")]
#[command(version = "1.0.0")]
struct Cli {
    /// Prompt text to send to the LLM
    prompt: Option<String>,
    
    /// Specify model (default: gpt-oss:latest)
    #[arg(long)]
    model: Option<String>,
    
    /// List available Ollama models
    #[arg(long)]
    list_models: bool,
    
    /// Show detailed information
    #[arg(short, long)]
    verbose: bool,
    
    /// Request timeout in seconds (default: 30)
    #[arg(long, default_value = "30")]
    timeout: u64,
    
    /// Maximum response tokens (default: 1000)
    #[arg(long, default_value = "1000")]
    max_tokens: u32,
    
    /// Strip markdown formatting from output (default: true)
    #[arg(long, action = clap::ArgAction::SetTrue)]
    strip_markdown: Option<bool>,
    
    /// Keep markdown formatting in output
    #[arg(long, action = clap::ArgAction::SetTrue)]
    no_strip_markdown: Option<bool>,
}

#[derive(Debug)]
pub struct LLMError {
    pub message: String,
    pub code: String,
    pub provider: String,
}

impl std::fmt::Display for LLMError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for LLMError {}

impl LLMError {
    pub fn new(message: &str, code: &str, provider: &str) -> Self {
        Self {
            message: message.to_string(),
            code: code.to_string(),
            provider: provider.to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatResponse {
    pub content: String,
}

pub enum Provider {
    Ollama(OllamaProvider),
    Gemini(GeminiProvider),
    OpenAI(OpenAIProvider),
    Claude(ClaudeProvider),
}

impl Provider {
    pub async fn chat(&self, input: &str) -> Result<ChatResponse, LLMError> {
        match self {
            Provider::Ollama(p) => p.chat(input).await,
            Provider::Gemini(p) => p.chat(input).await,
            Provider::OpenAI(p) => p.chat(input).await,
            Provider::Claude(p) => p.chat(input).await,
        }
    }
    
    pub async fn list_models(&self) -> Result<Vec<String>, LLMError> {
        match self {
            Provider::Ollama(p) => p.list_models().await,
            _ => Err(LLMError::new("Model listing not supported", "NOT_SUPPORTED", "Provider"))
        }
    }
}

#[async_trait::async_trait]
pub trait LLMProvider {
    async fn chat(&self, input: &str) -> Result<ChatResponse, LLMError>;
    fn validate_model(&self, model: &str) -> bool;
    fn get_default_model() -> String;
    async fn list_models(&self) -> Result<Vec<String>, LLMError> {
        Err(LLMError::new("Model listing not supported", "NOT_SUPPORTED", "Provider"))
    }
}

pub struct OllamaProvider {
    pub model: String,
    pub client: reqwest::Client,
    pub base_url: String,
    pub timeout: Duration,
}

impl OllamaProvider {
    pub fn new(model: Option<String>, timeout: Duration) -> Self {
        Self {
            model: model.unwrap_or_else(|| Self::get_default_model()),
            client: reqwest::Client::new(),
            base_url: "http://localhost:11434".to_string(),
            timeout,
        }
    }
}

#[async_trait::async_trait]
impl LLMProvider for OllamaProvider {
    async fn chat(&self, input: &str) -> Result<ChatResponse, LLMError> {
        let request_body = serde_json::json!({
            "model": self.model,
            "prompt": input,
            "stream": false
        });

        let response = timeout(self.timeout,
            self.client.post(&format!("{}/api/generate", self.base_url))
                .header("Content-Type", "application/json")
                .json(&request_body)
                .send()
        ).await
        .map_err(|_| LLMError::new("Request timeout", "NETWORK_ERROR", "Ollama"))?
        .map_err(|e| LLMError::new(&format!("Network error: {}", e), "NETWORK_ERROR", "Ollama"))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(LLMError::new(&format!("Ollama error: {}", error_text), "PROVIDER_ERROR", "Ollama"));
        }

        let data: serde_json::Value = response.json().await
            .map_err(|e| LLMError::new(&format!("Invalid JSON response: {}", e), "PROVIDER_ERROR", "Ollama"))?;

        let content = data.get("response")
            .and_then(|v| v.as_str())
            .unwrap_or("No response")
            .to_string();

        Ok(ChatResponse { content })
    }

    fn validate_model(&self, model: &str) -> bool {
        !model.is_empty()
    }

    fn get_default_model() -> String {
        "gpt-oss:latest".to_string()
    }

    async fn list_models(&self) -> Result<Vec<String>, LLMError> {
        let response = timeout(self.timeout,
            self.client.get(&format!("{}/api/tags", self.base_url))
                .send()
        ).await
        .map_err(|_| LLMError::new("Request timeout", "NETWORK_ERROR", "Ollama"))?
        .map_err(|e| LLMError::new(&format!("Network error: {}", e), "NETWORK_ERROR", "Ollama"))?;

        if !response.status().is_success() {
            return Err(LLMError::new("Failed to fetch Ollama models", "PROVIDER_ERROR", "Ollama"));
        }

        let data: serde_json::Value = response.json().await
            .map_err(|e| LLMError::new(&format!("Invalid JSON response: {}", e), "PROVIDER_ERROR", "Ollama"))?;

        let models = data.get("models")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|model| model.get("name").and_then(|n| n.as_str()).map(String::from))
                    .collect()
            })
            .unwrap_or_default();

        Ok(models)
    }
}

pub struct GeminiProvider {
    pub model: String,
    pub api_key: String,
    pub client: reqwest::Client,
    pub timeout: Duration,
}

impl GeminiProvider {
    pub fn new(api_key: String, model: Option<String>, timeout: Duration) -> Self {
        Self {
            model: model.unwrap_or_else(|| Self::get_default_model()),
            api_key,
            client: reqwest::Client::new(),
            timeout,
        }
    }
}

#[async_trait::async_trait]
impl LLMProvider for GeminiProvider {
    async fn chat(&self, input: &str) -> Result<ChatResponse, LLMError> {
        let model = if self.model == "gemini" {
            Self::get_default_model()
        } else {
            self.model.clone()
        };

        let request_body = serde_json::json!({
            "contents": [{
                "parts": [{ "text": input }]
            }]
        });

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            model, self.api_key
        );

        let response = timeout(self.timeout,
            self.client.post(&url)
                .header("Content-Type", "application/json")
                .json(&request_body)
                .send()
        ).await
        .map_err(|_| LLMError::new("Request timeout", "NETWORK_ERROR", "Gemini"))?
        .map_err(|e| LLMError::new(&format!("Network error: {}", e), "NETWORK_ERROR", "Gemini"))?;

        if !response.status().is_success() {
            let error_data: serde_json::Value = response.json().await.unwrap_or_default();
            let error_message = error_data
                .get("error")
                .and_then(|e| e.get("message"))
                .and_then(|m| m.as_str())
                .unwrap_or("Request failed");
            return Err(LLMError::new(&format!("Gemini error: {}", error_message), "PROVIDER_ERROR", "Gemini"));
        }

        let data: serde_json::Value = response.json().await
            .map_err(|e| LLMError::new(&format!("Invalid JSON response: {}", e), "PROVIDER_ERROR", "Gemini"))?;

        let content = data
            .get("candidates")
            .and_then(|c| c.as_array())
            .and_then(|arr| arr.first())
            .and_then(|candidate| candidate.get("content"))
            .and_then(|content| content.get("parts"))
            .and_then(|parts| parts.as_array())
            .and_then(|arr| arr.first())
            .and_then(|part| part.get("text"))
            .and_then(|text| text.as_str())
            .unwrap_or("No response")
            .to_string();

        Ok(ChatResponse { content })
    }

    fn validate_model(&self, model: &str) -> bool {
        let valid_models = ["gemini", "gemini-2.0-flash-exp", "gemini-2.5-pro", "gemini-2.5-flash"];
        valid_models.contains(&model) || model.starts_with("gemini")
    }

    fn get_default_model() -> String {
        "gemini-2.0-flash-exp".to_string()
    }
}

pub struct OpenAIProvider {
    pub model: String,
    pub api_key: String,
    pub client: reqwest::Client,
    pub timeout: Duration,
    pub max_tokens: u32,
}

impl OpenAIProvider {
    pub fn new(api_key: String, model: Option<String>, timeout: Duration, max_tokens: u32) -> Self {
        Self {
            model: model.unwrap_or_else(|| Self::get_default_model()),
            api_key,
            client: reqwest::Client::new(),
            timeout,
            max_tokens,
        }
    }
}

#[async_trait::async_trait]
impl LLMProvider for OpenAIProvider {
    async fn chat(&self, input: &str) -> Result<ChatResponse, LLMError> {
        let model = if self.model == "gpt" || self.model == "openai" {
            Self::get_default_model()
        } else {
            self.model.clone()
        };

        let request_body = serde_json::json!({
            "model": model,
            "messages": [{ "role": "user", "content": input }],
            "max_tokens": self.max_tokens
        });

        let response = timeout(self.timeout,
            self.client.post("https://api.openai.com/v1/chat/completions")
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {}", self.api_key))
                .json(&request_body)
                .send()
        ).await
        .map_err(|_| LLMError::new("Request timeout", "NETWORK_ERROR", "OpenAI"))?
        .map_err(|e| LLMError::new(&format!("Network error: {}", e), "NETWORK_ERROR", "OpenAI"))?;

        if !response.status().is_success() {
            let error_data: serde_json::Value = response.json().await.unwrap_or_default();
            let error_message = error_data
                .get("error")
                .and_then(|e| e.get("message"))
                .and_then(|m| m.as_str())
                .unwrap_or("Request failed");
            return Err(LLMError::new(&format!("OpenAI error: {}", error_message), "PROVIDER_ERROR", "OpenAI"));
        }

        let data: serde_json::Value = response.json().await
            .map_err(|e| LLMError::new(&format!("Invalid JSON response: {}", e), "PROVIDER_ERROR", "OpenAI"))?;

        let content = data
            .get("choices")
            .and_then(|c| c.as_array())
            .and_then(|arr| arr.first())
            .and_then(|choice| choice.get("message"))
            .and_then(|message| message.get("content"))
            .and_then(|content| content.as_str())
            .unwrap_or("No response")
            .to_string();

        Ok(ChatResponse { content })
    }

    fn validate_model(&self, model: &str) -> bool {
        let valid_models = ["gpt", "gpt-4o-mini", "gpt-4o", "gpt-4o-latest", "openai"];
        valid_models.contains(&model) || model.starts_with("gpt")
    }

    fn get_default_model() -> String {
        "gpt-4o-mini".to_string()
    }
}

pub struct ClaudeProvider {
    pub model: String,
    pub api_key: String,
    pub client: reqwest::Client,
    pub timeout: Duration,
    pub max_tokens: u32,
}

impl ClaudeProvider {
    pub fn new(api_key: String, model: Option<String>, timeout: Duration, max_tokens: u32) -> Self {
        Self {
            model: model.unwrap_or_else(|| Self::get_default_model()),
            api_key,
            client: reqwest::Client::new(),
            timeout,
            max_tokens,
        }
    }
}

#[async_trait::async_trait]
impl LLMProvider for ClaudeProvider {
    async fn chat(&self, input: &str) -> Result<ChatResponse, LLMError> {
        let model = if self.model == "claude" {
            Self::get_default_model()
        } else {
            self.model.clone()
        };

        let request_body = serde_json::json!({
            "model": model,
            "max_tokens": self.max_tokens,
            "messages": [{ "role": "user", "content": input }]
        });

        let response = timeout(self.timeout,
            self.client.post("https://api.anthropic.com/v1/messages")
                .header("Content-Type", "application/json")
                .header("x-api-key", &self.api_key)
                .header("anthropic-version", "2023-06-01")
                .json(&request_body)
                .send()
        ).await
        .map_err(|_| LLMError::new("Request timeout", "NETWORK_ERROR", "Claude"))?
        .map_err(|e| LLMError::new(&format!("Network error: {}", e), "NETWORK_ERROR", "Claude"))?;

        if !response.status().is_success() {
            let error_data: serde_json::Value = response.json().await.unwrap_or_default();
            let error_message = error_data
                .get("error")
                .and_then(|e| e.get("message"))
                .and_then(|m| m.as_str())
                .unwrap_or("Request failed");
            return Err(LLMError::new(&format!("Claude error: {}", error_message), "PROVIDER_ERROR", "Claude"));
        }

        let data: serde_json::Value = response.json().await
            .map_err(|e| LLMError::new(&format!("Invalid JSON response: {}", e), "PROVIDER_ERROR", "Claude"))?;

        let content = data
            .get("content")
            .and_then(|c| c.as_array())
            .and_then(|arr| arr.first())
            .and_then(|item| item.get("text"))
            .and_then(|text| text.as_str())
            .unwrap_or("No response")
            .to_string();

        Ok(ChatResponse { content })
    }

    fn validate_model(&self, model: &str) -> bool {
        let valid_models = ["claude", "claude-3-5-sonnet-20241022", "claude-3-opus-20240229"];
        valid_models.contains(&model) || model.starts_with("claude")
    }

    fn get_default_model() -> String {
        "claude-3-5-sonnet-20241022".to_string()
    }
}

pub struct MarkdownStripper;

impl MarkdownStripper {
    pub fn strip(text: &str) -> String {
        if text.is_empty() {
            return text.to_string();
        }
        
        let mut result = text.to_string();
        
        // Remove code blocks (both ``` and ```)
        let code_block_re = Regex::new(r"```[\s\S]*?```").unwrap();
        result = code_block_re.replace_all(&result, |caps: &regex::Captures| {
            let content = &caps[0];
            let lines: Vec<&str> = content.split('\n').collect();
            if lines.len() > 2 {
                lines[1..lines.len()-1].join("\n")
            } else {
                String::new()
            }
        }).to_string();
        
        // Remove inline code (`code`)
        let inline_code_re = Regex::new(r"`([^`\n]+)`").unwrap();
        result = inline_code_re.replace_all(&result, "$1").to_string();
        
        // Remove headers (# ## ###) - handle multiline
        let header_re = Regex::new(r"(?m)^#{1,6}\s+(.*)$").unwrap();
        result = header_re.replace_all(&result, "$1").to_string();
        
        // Remove bold (**text** or __text__) - separate patterns since no backrefs
        let bold_re1 = Regex::new(r"\*\*(.*?)\*\*").unwrap();
        result = bold_re1.replace_all(&result, "$1").to_string();
        let bold_re2 = Regex::new(r"__(.*?)__").unwrap();
        result = bold_re2.replace_all(&result, "$1").to_string();
        
        // Remove italic (*text* or _text_) - separate patterns
        let italic_re1 = Regex::new(r"\*(.*?)\*").unwrap();
        result = italic_re1.replace_all(&result, "$1").to_string();
        let italic_re2 = Regex::new(r"_(.*?)_").unwrap();
        result = italic_re2.replace_all(&result, "$1").to_string();
        
        // Remove strikethrough (~~text~~)
        let strike_re = Regex::new(r"~~(.*?)~~").unwrap();
        result = strike_re.replace_all(&result, "$1").to_string();
        
        // Remove links ([text](url) or [text][ref])
        let link_re1 = Regex::new(r"\[([^\]]+)\]\([^)]+\)").unwrap();
        result = link_re1.replace_all(&result, "$1").to_string();
        let link_re2 = Regex::new(r"\[([^\]]+)\]\[[^\]]*\]").unwrap();
        result = link_re2.replace_all(&result, "$1").to_string();
        
        // Remove horizontal rules (--- or ***)
        let hr_re = Regex::new(r"(?m)^[-*]{3,}$").unwrap();
        result = hr_re.replace_all(&result, "").to_string();
        
        // Remove blockquotes (> text) - multiline
        let quote_re = Regex::new(r"(?m)^>\s*").unwrap();
        result = quote_re.replace_all(&result, "").to_string();
        
        // Remove list markers (- * + and numbered lists) - multiline
        let list_re1 = Regex::new(r"(?m)^[\s]*[-*+]\s+").unwrap();
        result = list_re1.replace_all(&result, "").to_string();
        let list_re2 = Regex::new(r"(?m)^[\s]*\d+\.\s+").unwrap();
        result = list_re2.replace_all(&result, "").to_string();
        
        // Remove table formatting
        result = result.replace("|", " ");
        let table_re = Regex::new(r"(?m)^[\s]*[-:]+[\s]*$").unwrap();
        result = table_re.replace_all(&result, "").to_string();
        
        // Clean up extra whitespace
        let newline_re = Regex::new(r"\n{3,}").unwrap();
        result = newline_re.replace_all(&result, "\n\n").to_string();
        let trailing_re = Regex::new(r"(?m)[ \t]+$").unwrap();
        result = trailing_re.replace_all(&result, "").to_string();
        
        result.trim().to_string()
    }
}

#[derive(Debug, Clone)]
pub struct Config {
    pub model: String,
    pub list_models: bool,
    pub verbose: bool,
    pub strip_markdown: bool,
    pub timeout: u64,
    pub max_tokens: u32,
    pub prompt: Option<String>,
    pub gemini_api_key: Option<String>,
    pub openai_api_key: Option<String>,
    pub anthropic_api_key: Option<String>,
}

impl Config {
    pub fn from_args(args: Cli) -> Result<Self> {
        // Load .env file if it exists
        let _ = dotenv();
        
        // Determine strip_markdown setting
        let strip_markdown = if args.no_strip_markdown == Some(true) {
            false
        } else if args.strip_markdown == Some(true) {
            true
        } else {
            true // Default is true
        };
        
        Ok(Config {
            model: args.model.unwrap_or_else(|| "gpt-oss:latest".to_string()),
            list_models: args.list_models,
            verbose: args.verbose,
            strip_markdown,
            timeout: args.timeout,
            max_tokens: args.max_tokens,
            prompt: args.prompt,
            gemini_api_key: env::var("GEMINI_API_KEY").ok(),
            openai_api_key: env::var("OPENAI_API_KEY").ok(),
            anthropic_api_key: env::var("ANTHROPIC_API_KEY").ok(),
        })
    }
}

pub struct InputHandler;

impl InputHandler {
    pub async fn get_input(prompt: Option<String>) -> Result<String> {
        let mut stdin_input = String::new();
        
        // Check if there's piped input
        if !atty::is(atty::Stream::Stdin) {
            io::stdin().read_to_string(&mut stdin_input)?;
            stdin_input = stdin_input.trim().to_string();
        }
        
        // Combine stdin and prompt if both exist
        if !stdin_input.is_empty() && prompt.is_some() {
            Ok(format!("{}\n\n{}", stdin_input, prompt.unwrap()))
        } else if !stdin_input.is_empty() {
            Ok(stdin_input)
        } else if let Some(p) = prompt {
            Ok(p)
        } else {
            Ok(String::new())
        }
    }
    
    pub fn validate_input(input: &str) -> Result<String, LLMError> {
        let trimmed = input.trim();
        
        if trimmed.is_empty() {
            return Err(LLMError::new("No input provided", "INVALID_INPUT", "Input"));
        }
        
        if trimmed.len() > 50000 {
            return Err(LLMError::new("Input too long (max 50,000 characters)", "INVALID_INPUT", "Input"));
        }
        
        Ok(trimmed.to_string())
    }
}

fn show_help() {
    println!(r#"
Usage: llm [options] "prompt"

Options:
  --model <model>       Specify model (default: gpt-oss:latest)
  --list-models         List available Ollama models
  --verbose, -v         Show detailed information
  --timeout <sec>       Request timeout in seconds (default: 30)
  --max-tokens <n>      Maximum response tokens (default: 1000)
  --strip-markdown      Strip markdown formatting from output (default: on)
  --no-strip-markdown   Keep markdown formatting in output
  --help, -h            Show this help

Examples:
  llm "Why is the sky blue?"
  llm --model=gemini "Explain quantum physics"
  llm --model=gpt-4o "Write a poem"
  llm --model=claude "Analyze this code"
  llm --no-strip-markdown "Format this as a table"
  echo "data" | llm "Summarize this"
  ps aux | llm "What are the top 3 processes?"

Providers:
  ollama    - Local models (default)
  gemini    - Google Gemini (requires GEMINI_API_KEY)
  openai    - OpenAI GPT (requires OPENAI_API_KEY)  
  claude    - Anthropic Claude (requires ANTHROPIC_API_KEY)

Set API keys in .env file or environment variables.
"#);
}

pub struct ProviderFactory;

impl ProviderFactory {
    pub fn create_provider(config: &Config) -> Result<Provider, LLMError> {
        let timeout = Duration::from_secs(config.timeout);
        let provider_type = Self::detect_provider(&config.model);

        match provider_type.as_str() {
            "gemini" => {
                let api_key = config.gemini_api_key.as_ref()
                    .ok_or_else(|| LLMError::new("GEMINI_API_KEY required", "AUTH_ERROR", "Gemini"))?;
                Ok(Provider::Gemini(GeminiProvider::new(
                    api_key.clone(),
                    Some(config.model.clone()),
                    timeout,
                )))
            },
            "openai" => {
                let api_key = config.openai_api_key.as_ref()
                    .ok_or_else(|| LLMError::new("OPENAI_API_KEY required", "AUTH_ERROR", "OpenAI"))?;
                Ok(Provider::OpenAI(OpenAIProvider::new(
                    api_key.clone(),
                    Some(config.model.clone()),
                    timeout,
                    config.max_tokens,
                )))
            },
            "claude" => {
                let api_key = config.anthropic_api_key.as_ref()
                    .ok_or_else(|| LLMError::new("ANTHROPIC_API_KEY required", "AUTH_ERROR", "Claude"))?;
                Ok(Provider::Claude(ClaudeProvider::new(
                    api_key.clone(),
                    Some(config.model.clone()),
                    timeout,
                    config.max_tokens,
                )))
            },
            _ => {
                Ok(Provider::Ollama(OllamaProvider::new(
                    Some(config.model.clone()),
                    timeout,
                )))
            }
        }
    }

    fn detect_provider(model_name: &str) -> String {
        if model_name.is_empty() {
            return "ollama".to_string();
        }
        if model_name.contains(':') {
            return "ollama".to_string();
        }
        if model_name.starts_with("gemini") {
            return "gemini".to_string();
        }
        if model_name.starts_with("gpt") || model_name == "openai" {
            return "openai".to_string();
        }
        if model_name.starts_with("claude") {
            return "claude".to_string();
        }
        "ollama".to_string()
    }
}

pub struct LLMClient {
    config: Config,
}

impl LLMClient {
    pub fn new(config: Config) -> Self {
        Self { config }
    }

    pub async fn execute(&self) -> Result<()> {
        if self.config.list_models {
            self.list_models().await?;
            return Ok(());
        }

        let input = InputHandler::get_input(self.config.prompt.clone()).await?;
        let validated_input = InputHandler::validate_input(&input)
            .map_err(|e| anyhow!(e.message))?;

        let provider = ProviderFactory::create_provider(&self.config)
            .map_err(|e| anyhow!(e.message))?;

        if self.config.verbose {
            eprintln!("Model: {}", self.config.model);
            eprintln!("Input length: {} characters", validated_input.len());
            eprintln!("Strip markdown: {}", self.config.strip_markdown);
            eprintln!("---");
        }

        let result = provider.chat(&validated_input).await
            .map_err(|e| anyhow!("Error: {}", e.message))?;

        let mut output = result.content;
        if self.config.strip_markdown {
            output = MarkdownStripper::strip(&output);
        }

        println!("{}", output);
        Ok(())
    }

    async fn list_models(&self) -> Result<()> {
        let provider = Provider::Ollama(OllamaProvider::new(None, Duration::from_secs(self.config.timeout)));
        
        match provider.list_models().await {
            Ok(models) => {
                println!("Available Ollama models:");
                for model in models {
                    println!("  {}", model);
                }

                println!("\nOther providers:");
                println!("  gemini (requires GEMINI_API_KEY)");
                println!("  openai/gpt (requires OPENAI_API_KEY)");
                println!("  claude (requires ANTHROPIC_API_KEY)");
            }
            Err(e) => {
                eprintln!("Could not list models: {}", e.message);
                return Err(anyhow!("Model listing failed"));
            }
        }

        Ok(())
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Cli::parse();
    let config = Config::from_args(args)?;
    let client = LLMClient::new(config);
    
    client.execute().await
}
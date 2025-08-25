#!/usr/bin/env cargo run --bin http --

use clap::{Parser, Subcommand, ValueEnum};
use reqwest::{header::{HeaderMap, HeaderName, HeaderValue}, Client, Method};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs;
use std::sync::Arc;
use std::time::Instant;

use code_tools_connectors::shared::{format_output, handle_error, OutputFormat, CommonOptions};

/// High-performance HTTP/API client
#[derive(Parser)]
#[command(name = "http")]
#[command(about = "High-performance HTTP client and API testing tool")]
#[command(version = "1.0.0")]
struct Cli {
    /// Output format (json|text|csv)
    #[arg(short, long, default_value = "json")]
    format: OutputFormat,
    
    /// Enable debug mode
    #[arg(short, long)]
    debug: bool,
    
    /// Request timeout in seconds
    #[arg(long, default_value = "30")]
    timeout: u64,
    
    /// Follow redirects
    #[arg(long, default_value = "true")]
    follow_redirects: bool,
    
    /// Verify SSL certificates
    #[arg(long, default_value = "true")]
    verify_ssl: bool,
    
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Send GET request
    Get {
        /// Target URL
        url: String,
        
        /// Headers in key:value format
        #[arg(short = 'H', long, value_name = "KEY:VALUE")]
        headers: Vec<String>,
        
        /// Query parameters in key=value format
        #[arg(short, long, value_name = "KEY=VALUE")]
        query: Vec<String>,
        
        /// Authentication
        #[command(flatten)]
        auth: AuthOptions,
    },
    
    /// Send POST request
    Post {
        /// Target URL
        url: String,
        
        /// Headers in key:value format
        #[arg(short = 'H', long, value_name = "KEY:VALUE")]
        headers: Vec<String>,
        
        /// Request body (JSON string, @file, or form data)
        #[arg(short, long)]
        body: Option<String>,
        
        /// Form data in key=value format
        #[arg(short, long, value_name = "KEY=VALUE")]
        form: Vec<String>,
        
        /// JSON data as string
        #[arg(short, long)]
        json: Option<String>,
        
        /// Authentication
        #[command(flatten)]
        auth: AuthOptions,
    },
    
    /// Send PUT request
    Put {
        /// Target URL
        url: String,
        
        /// Headers in key:value format
        #[arg(short = 'H', long, value_name = "KEY:VALUE")]
        headers: Vec<String>,
        
        /// Request body (JSON string, @file, or form data)
        #[arg(short, long)]
        body: Option<String>,
        
        /// JSON data as string
        #[arg(short, long)]
        json: Option<String>,
        
        /// Authentication
        #[command(flatten)]
        auth: AuthOptions,
    },
    
    /// Send DELETE request
    Delete {
        /// Target URL
        url: String,
        
        /// Headers in key:value format
        #[arg(short = 'H', long, value_name = "KEY:VALUE")]
        headers: Vec<String>,
        
        /// Authentication
        #[command(flatten)]
        auth: AuthOptions,
    },
    
    /// Send PATCH request
    Patch {
        /// Target URL
        url: String,
        
        /// Headers in key:value format
        #[arg(short = 'H', long, value_name = "KEY:VALUE")]
        headers: Vec<String>,
        
        /// Request body (JSON string, @file, or form data)
        #[arg(short, long)]
        body: Option<String>,
        
        /// JSON data as string
        #[arg(short, long)]
        json: Option<String>,
        
        /// Authentication
        #[command(flatten)]
        auth: AuthOptions,
    },
    
    /// Send HEAD request
    Head {
        /// Target URL
        url: String,
        
        /// Headers in key:value format
        #[arg(short = 'H', long, value_name = "KEY:VALUE")]
        headers: Vec<String>,
        
        /// Authentication
        #[command(flatten)]
        auth: AuthOptions,
    },
    
    /// Send OPTIONS request
    Options {
        /// Target URL
        url: String,
        
        /// Headers in key:value format
        #[arg(short = 'H', long, value_name = "KEY:VALUE")]
        headers: Vec<String>,
        
        /// Authentication
        #[command(flatten)]
        auth: AuthOptions,
    },
    
    /// Execute batch requests from config file
    Batch {
        /// Config file path (JSON format)
        config: String,
        
        /// Number of concurrent requests
        #[arg(short, long, default_value = "5")]
        concurrency: usize,
    },
    
    /// Test API endpoints with assertions
    Test {
        /// Test config file path (JSON format)
        config: String,
        
        /// Continue on test failures
        #[arg(long)]
        continue_on_failure: bool,
    },
    
    /// Benchmark endpoint performance
    Benchmark {
        /// Target URL
        url: String,
        
        /// Number of requests to send
        #[arg(short, long, default_value = "100")]
        requests: usize,
        
        /// Number of concurrent requests
        #[arg(short, long, default_value = "10")]
        concurrency: usize,
        
        /// HTTP method to use
        #[arg(short, long, default_value = "get")]
        method: HttpMethod,
        
        /// Headers in key:value format
        #[arg(short = 'H', long, value_name = "KEY:VALUE")]
        headers: Vec<String>,
        
        /// Authentication
        #[command(flatten)]
        auth: AuthOptions,
    },
}

#[derive(clap::Args)]
struct AuthOptions {
    /// Bearer token authentication
    #[arg(long)]
    bearer: Option<String>,
    
    /// Basic authentication (username:password)
    #[arg(long)]
    basic: Option<String>,
    
    /// API key header (e.g., "X-API-Key:value")
    #[arg(long)]
    api_key: Option<String>,
}

#[derive(ValueEnum, Clone, Debug)]
enum HttpMethod {
    Get,
    Post,
    Put,
    Delete,
    Patch,
    Head,
    Options,
}

impl From<HttpMethod> for Method {
    fn from(method: HttpMethod) -> Self {
        match method {
            HttpMethod::Get => Method::GET,
            HttpMethod::Post => Method::POST,
            HttpMethod::Put => Method::PUT,
            HttpMethod::Delete => Method::DELETE,
            HttpMethod::Patch => Method::PATCH,
            HttpMethod::Head => Method::HEAD,
            HttpMethod::Options => Method::OPTIONS,
        }
    }
}

#[derive(serde::Deserialize, Clone)]
struct BatchRequest {
    name: Option<String>,
    method: String,
    url: String,
    headers: Option<HashMap<String, String>>,
    body: Option<Value>,
    query: Option<HashMap<String, String>>,
    auth: Option<BatchAuth>,
}

#[derive(serde::Deserialize, Clone)]
struct BatchAuth {
    bearer: Option<String>,
    basic: Option<String>,
    api_key: Option<String>,
}

#[derive(serde::Deserialize)]
struct BatchConfig {
    requests: Vec<BatchRequest>,
    defaults: Option<BatchDefaults>,
}

#[derive(serde::Deserialize)]
struct BatchDefaults {
    headers: Option<HashMap<String, String>>,
    timeout: Option<u64>,
    auth: Option<BatchAuth>,
}

async fn create_client(timeout: u64, follow_redirects: bool, verify_ssl: bool) -> Result<Client, anyhow::Error> {
    let mut client_builder = Client::builder()
        .timeout(std::time::Duration::from_secs(timeout))
        .cookie_store(true);
    
    if !follow_redirects {
        client_builder = client_builder.redirect(reqwest::redirect::Policy::none());
    }
    
    if !verify_ssl {
        client_builder = client_builder.danger_accept_invalid_certs(true);
    }
    
    Ok(client_builder.build()?)
}

fn parse_headers(headers: &[String]) -> Result<HeaderMap, anyhow::Error> {
    let mut header_map = HeaderMap::new();
    
    for header in headers {
        if let Some((key, value)) = header.split_once(':') {
            let header_name = HeaderName::from_bytes(key.trim().as_bytes())?;
            let header_value = HeaderValue::from_str(value.trim())?;
            header_map.insert(header_name, header_value);
        } else {
            return Err(anyhow::anyhow!("Invalid header format: '{}'. Expected 'key:value'", header));
        }
    }
    
    Ok(header_map)
}

fn parse_query_params(params: &[String]) -> Result<Vec<(String, String)>, anyhow::Error> {
    let mut query_params = Vec::new();
    
    for param in params {
        if let Some((key, value)) = param.split_once('=') {
            query_params.push((key.trim().to_string(), value.trim().to_string()));
        } else {
            return Err(anyhow::anyhow!("Invalid query parameter format: '{}'. Expected 'key=value'", param));
        }
    }
    
    Ok(query_params)
}

fn parse_form_data(form_data: &[String]) -> Result<Vec<(String, String)>, anyhow::Error> {
    let mut form_params = Vec::new();
    
    for param in form_data {
        if let Some((key, value)) = param.split_once('=') {
            form_params.push((key.trim().to_string(), value.trim().to_string()));
        } else {
            return Err(anyhow::anyhow!("Invalid form data format: '{}'. Expected 'key=value'", param));
        }
    }
    
    Ok(form_params)
}

fn apply_auth(request_builder: reqwest::RequestBuilder, auth: &AuthOptions) -> Result<reqwest::RequestBuilder, anyhow::Error> {
    let mut request_builder = request_builder;
    
    if let Some(bearer_token) = &auth.bearer {
        request_builder = request_builder.bearer_auth(bearer_token);
    }
    
    if let Some(basic_auth) = &auth.basic {
        if let Some((username, password)) = basic_auth.split_once(':') {
            request_builder = request_builder.basic_auth(username, Some(password));
        } else {
            return Err(anyhow::anyhow!("Invalid basic auth format. Expected 'username:password'"));
        }
    }
    
    if let Some(api_key) = &auth.api_key {
        if let Some((header_name, header_value)) = api_key.split_once(':') {
            request_builder = request_builder.header(header_name.trim(), header_value.trim());
        } else {
            return Err(anyhow::anyhow!("Invalid API key format. Expected 'header:value'"));
        }
    }
    
    Ok(request_builder)
}

fn load_body_content(body_input: &str) -> Result<String, anyhow::Error> {
    if body_input.starts_with('@') {
        // Load from file
        let file_path = &body_input[1..];
        Ok(fs::read_to_string(file_path)?)
    } else {
        // Use as-is
        Ok(body_input.to_string())
    }
}

async fn execute_request(
    client: &Client,
    method: Method,
    url: String,
    headers: Vec<String>,
    query_params: Vec<String>,
    body_content: Option<String>,
    form_data: Vec<String>,
    json_data: Option<String>,
    auth: &AuthOptions,
) -> Result<Value, anyhow::Error> {
    let start_time = Instant::now();
    
    // Parse headers
    let header_map = parse_headers(&headers)?;
    let query_params_parsed = parse_query_params(&query_params)?;
    
    // Build request
    let mut request_builder = client.request(method.clone(), &url)
        .headers(header_map)
        .query(&query_params_parsed);
    
    // Apply authentication
    request_builder = apply_auth(request_builder, auth)?;
    
    // Handle body content
    if let Some(json_str) = json_data {
        let json_value: Value = serde_json::from_str(&json_str)?;
        request_builder = request_builder.json(&json_value);
    } else if !form_data.is_empty() {
        let form_params = parse_form_data(&form_data)?;
        request_builder = request_builder.form(&form_params);
    } else if let Some(body) = body_content {
        let content = load_body_content(&body)?;
        request_builder = request_builder.body(content);
    }
    
    // Execute request
    let response = request_builder.send().await?;
    let elapsed = start_time.elapsed();
    
    // Extract response details
    let status = response.status();
    let headers: HashMap<String, String> = response
        .headers()
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
        .collect();
    
    let response_text = response.text().await?;
    
    // Try to parse response body as JSON, fallback to text
    let body_value = serde_json::from_str::<Value>(&response_text)
        .unwrap_or_else(|_| Value::String(response_text));
    
    Ok(json!({
        "request": {
            "method": method.to_string(),
            "url": url,
            "headers": HashMap::<String, String>::new()
        },
        "response": {
            "status": status.as_u16(),
            "status_text": status.canonical_reason().unwrap_or("Unknown"),
            "headers": headers,
            "body": body_value,
            "size_bytes": body_value.to_string().len()
        },
        "timing": {
            "total_ms": elapsed.as_millis(),
            "total_seconds": elapsed.as_secs_f64()
        }
    }))
}

async fn handle_get_command(
    client: &Client,
    url: String,
    headers: Vec<String>,
    query: Vec<String>,
    auth: &AuthOptions,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let result = execute_request(
        client,
        Method::GET,
        url,
        headers,
        query,
        None,
        vec![],
        None,
        auth,
    ).await?;
    
    println!("{}", format_output(&result, options.format));
    Ok(())
}

async fn handle_post_command(
    client: &Client,
    url: String,
    headers: Vec<String>,
    body: Option<String>,
    form: Vec<String>,
    json: Option<String>,
    auth: &AuthOptions,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let result = execute_request(
        client,
        Method::POST,
        url,
        headers,
        vec![],
        body,
        form,
        json,
        auth,
    ).await?;
    
    println!("{}", format_output(&result, options.format));
    Ok(())
}

async fn handle_batch_command(
    client: &Client,
    config_path: String,
    concurrency: usize,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let config_content = fs::read_to_string(config_path)?;
    let batch_config: BatchConfig = serde_json::from_str(&config_content)?;
    
    let mut tasks = Vec::new();
    let semaphore = Arc::new(tokio::sync::Semaphore::new(concurrency));
    
    for (index, request) in batch_config.requests.iter().enumerate() {
        let client = client.clone();
        let request = request.clone();
        let permit = semaphore.clone().acquire_owned().await?;
        
        let task = tokio::spawn(async move {
            let _permit = permit;
            let start_time = Instant::now();
            
            // Build method
            let method = match request.method.to_uppercase().as_str() {
                "GET" => Method::GET,
                "POST" => Method::POST,
                "PUT" => Method::PUT,
                "DELETE" => Method::DELETE,
                "PATCH" => Method::PATCH,
                "HEAD" => Method::HEAD,
                "OPTIONS" => Method::OPTIONS,
                _ => return Err(anyhow::anyhow!("Unsupported HTTP method: {}", request.method)),
            };
            
            // Build request
            let mut request_builder = client.request(method.clone(), &request.url);
            
            // Add headers
            if let Some(headers) = &request.headers {
                for (key, value) in headers {
                    request_builder = request_builder.header(key, value);
                }
            }
            
            // Add query parameters
            if let Some(query) = &request.query {
                request_builder = request_builder.query(query);
            }
            
            // Add body
            if let Some(body) = &request.body {
                request_builder = request_builder.json(body);
            }
            
            // Add auth
            if let Some(auth) = &request.auth {
                if let Some(bearer) = &auth.bearer {
                    request_builder = request_builder.bearer_auth(bearer);
                }
                if let Some(basic) = &auth.basic {
                    if let Some((username, password)) = basic.split_once(':') {
                        request_builder = request_builder.basic_auth(username, Some(password));
                    }
                }
                if let Some(api_key) = &auth.api_key {
                    if let Some((header_name, header_value)) = api_key.split_once(':') {
                        request_builder = request_builder.header(header_name.trim(), header_value.trim());
                    }
                }
            }
            
            // Execute request
            let response = request_builder.send().await?;
            let elapsed = start_time.elapsed();
            
            let status = response.status();
            let headers: HashMap<String, String> = response
                .headers()
                .iter()
                .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
                .collect();
            
            let response_text = response.text().await?;
            let body_value = serde_json::from_str::<Value>(&response_text)
                .unwrap_or_else(|_| Value::String(response_text));
            
            Ok(json!({
                "request_index": index,
                "request_name": request.name.clone().unwrap_or_else(|| format!("Request {}", index + 1)),
                "request": {
                    "method": method.to_string(),
                    "url": request.url,
                },
                "response": {
                    "status": status.as_u16(),
                    "status_text": status.canonical_reason().unwrap_or("Unknown"),
                    "headers": headers,
                    "body": body_value,
                },
                "timing": {
                    "total_ms": elapsed.as_millis(),
                    "total_seconds": elapsed.as_secs_f64()
                }
            }))
        });
        
        tasks.push(task);
    }
    
    let results: Result<Vec<_>, _> = futures::future::try_join_all(tasks).await;
    match results {
        Ok(results) => {
            let batch_results: Result<Vec<_>, _> = results.into_iter().collect();
            match batch_results {
                Ok(responses) => {
                    let summary = json!({
                        "batch_summary": {
                            "total_requests": responses.len(),
                            "concurrency": concurrency,
                        },
                        "results": responses
                    });
                    println!("{}", format_output(&summary, options.format));
                    Ok(())
                }
                Err(e) => Err(e),
            }
        }
        Err(e) => Err(anyhow::anyhow!("Batch execution failed: {}", e)),
    }
}

async fn handle_benchmark_command(
    client: &Client,
    url: String,
    requests: usize,
    concurrency: usize,
    method: HttpMethod,
    headers: Vec<String>,
    auth: &AuthOptions,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let start_time = Instant::now();
    let mut tasks = Vec::new();
    let semaphore = Arc::new(tokio::sync::Semaphore::new(concurrency));
    
    for i in 0..requests {
        let client = client.clone();
        let url = url.clone();
        let headers = headers.clone();
        let method = method.clone();
        let auth = AuthOptions {
            bearer: auth.bearer.clone(),
            basic: auth.basic.clone(),
            api_key: auth.api_key.clone(),
        };
        let permit = semaphore.clone().acquire_owned().await?;
        
        let task = tokio::spawn(async move {
            let _permit = permit;
            let request_start = Instant::now();
            
            let result = execute_request(
                &client,
                method.into(),
                url,
                headers,
                vec![],
                None,
                vec![],
                None,
                &auth,
            ).await;
            
            let elapsed = request_start.elapsed();
            
            match result {
                Ok(response) => {
                    let status = response["response"]["status"].as_u64().unwrap_or(0);
                    Ok(json!({
                        "request_id": i,
                        "status": status,
                        "duration_ms": elapsed.as_millis(),
                        "success": status >= 200 && status < 400
                    }))
                }
                Err(e) => Ok(json!({
                    "request_id": i,
                    "status": 0,
                    "duration_ms": elapsed.as_millis(),
                    "success": false,
                    "error": e.to_string()
                }))
            }
        });
        
        tasks.push(task);
    }
    
    let results: Result<Vec<_>, _> = futures::future::try_join_all(tasks).await;
    let total_elapsed = start_time.elapsed();
    
    match results {
        Ok(results) => {
            let benchmark_results: Result<Vec<_>, _> = results.into_iter().collect();
            match benchmark_results {
                Ok(responses) => {
                    let successful_requests = responses.iter().filter(|r| r["success"].as_bool().unwrap_or(false)).count();
                    let failed_requests = responses.len() - successful_requests;
                    
                    let durations: Vec<u64> = responses.iter()
                        .filter_map(|r| r["duration_ms"].as_u64())
                        .collect();
                    
                    let total_duration_ms: u64 = durations.iter().sum();
                    let avg_duration_ms = if !durations.is_empty() { total_duration_ms / durations.len() as u64 } else { 0 };
                    let min_duration_ms = durations.iter().min().cloned().unwrap_or(0);
                    let max_duration_ms = durations.iter().max().cloned().unwrap_or(0);
                    
                    let requests_per_second = if total_elapsed.as_secs_f64() > 0.0 {
                        successful_requests as f64 / total_elapsed.as_secs_f64()
                    } else {
                        0.0
                    };
                    
                    let summary = json!({
                        "benchmark_summary": {
                            "url": url,
                            "method": format!("{:?}", method),
                            "total_requests": requests,
                            "concurrency": concurrency,
                            "successful_requests": successful_requests,
                            "failed_requests": failed_requests,
                            "success_rate_percent": (successful_requests as f64 / requests as f64) * 100.0,
                            "total_time_seconds": total_elapsed.as_secs_f64(),
                            "requests_per_second": requests_per_second,
                            "response_times": {
                                "avg_ms": avg_duration_ms,
                                "min_ms": min_duration_ms,
                                "max_ms": max_duration_ms
                            }
                        },
                        "detailed_results": responses
                    });
                    
                    println!("{}", format_output(&summary, options.format));
                    Ok(())
                }
                Err(e) => Err(e),
            }
        }
        Err(e) => Err(anyhow::anyhow!("Benchmark execution failed: {}", e)),
    }
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();
    let options = CommonOptions::new(cli.format, cli.debug);
    options.setup_debug();
    
    let client = match create_client(cli.timeout, cli.follow_redirects, cli.verify_ssl).await {
        Ok(client) => client,
        Err(e) => handle_error(e, "Failed to create HTTP client"),
    };
    
    let result = match cli.command {
        Commands::Get { url, headers, query, auth } => {
            handle_get_command(&client, url, headers, query, &auth, &options).await
        }
        Commands::Post { url, headers, body, form, json, auth } => {
            handle_post_command(&client, url, headers, body, form, json, &auth, &options).await
        }
        Commands::Put { url, headers, body, json, auth } => {
            let result = execute_request(
                &client,
                Method::PUT,
                url,
                headers,
                vec![],
                body,
                vec![],
                json,
                &auth,
            ).await;
            match result {
                Ok(result) => {
                    println!("{}", format_output(&result, options.format));
                    Ok(())
                }
                Err(e) => Err(e)
            }
        }
        Commands::Delete { url, headers, auth } => {
            let result = execute_request(
                &client,
                Method::DELETE,
                url,
                headers,
                vec![],
                None,
                vec![],
                None,
                &auth,
            ).await;
            match result {
                Ok(result) => {
                    println!("{}", format_output(&result, options.format));
                    Ok(())
                }
                Err(e) => Err(e)
            }
        }
        Commands::Patch { url, headers, body, json, auth } => {
            let result = execute_request(
                &client,
                Method::PATCH,
                url,
                headers,
                vec![],
                body,
                vec![],
                json,
                &auth,
            ).await;
            match result {
                Ok(result) => {
                    println!("{}", format_output(&result, options.format));
                    Ok(())
                }
                Err(e) => Err(e)
            }
        }
        Commands::Head { url, headers, auth } => {
            let result = execute_request(
                &client,
                Method::HEAD,
                url,
                headers,
                vec![],
                None,
                vec![],
                None,
                &auth,
            ).await;
            match result {
                Ok(result) => {
                    println!("{}", format_output(&result, options.format));
                    Ok(())
                }
                Err(e) => Err(e)
            }
        }
        Commands::Options { url, headers, auth } => {
            let result = execute_request(
                &client,
                Method::OPTIONS,
                url,
                headers,
                vec![],
                None,
                vec![],
                None,
                &auth,
            ).await;
            match result {
                Ok(result) => {
                    println!("{}", format_output(&result, options.format));
                    Ok(())
                }
                Err(e) => Err(e)
            }
        }
        Commands::Batch { config, concurrency } => {
            handle_batch_command(&client, config, concurrency, &options).await
        }
        Commands::Test { config: _, continue_on_failure: _ } => {
            // TODO: Implement API testing with assertions
            Err(anyhow::anyhow!("Test command not yet implemented"))
        }
        Commands::Benchmark { url, requests, concurrency, method, headers, auth } => {
            handle_benchmark_command(&client, url, requests, concurrency, method, headers, &auth, &options).await
        }
    };
    
    if let Err(e) = result {
        handle_error(e, "HTTP command execution failed");
    }
}
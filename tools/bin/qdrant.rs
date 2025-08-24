#!/usr/bin/env cargo run --bin qdrant --

use clap::{Parser, Subcommand};
use serde_json::{json, Value};

use code_tools_connectors::shared::{format_output, handle_error, OutputFormat, CommonOptions, parse_json_arg};

/// Qdrant vector database CLI
#[derive(Parser)]
#[command(name = "qdrant")]
#[command(about = "High-performance Qdrant vector database connector")]
#[command(version = "1.0.0")]
struct Cli {
    /// Output format (json|text|csv)
    #[arg(short, long, default_value = "json")]
    format: OutputFormat,
    
    /// Enable debug mode
    #[arg(short, long)]
    debug: bool,
    
    /// Qdrant server URL
    #[arg(long, default_value = "http://localhost:6333")]
    url: String,
    
    /// API key for authentication
    #[arg(long)]
    api_key: Option<String>,
    
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// List all collections
    List,
    
    /// Health check
    Health,
    
    /// Create a new collection
    Create {
        /// Collection name
        name: String,
        
        /// Vector size (dimension)
        #[arg(short, long)]
        size: u32,
        
        /// Distance metric (Cosine, Euclidean, Dot, Manhattan)
        #[arg(short, long, default_value = "Cosine")]
        distance: String,
        
        /// Payload schema as JSON
        #[arg(short, long)]
        payload_schema: Option<String>,
    },
    
    /// Delete a collection
    Delete {
        /// Collection name
        name: String,
    },
    
    /// Get collection info
    Info {
        /// Collection name
        name: String,
    },
    
    /// Insert or update points
    Upsert {
        /// Collection name
        collection: String,
        
        /// Points data as JSON array
        #[arg(short, long)]
        points: String,
        
        /// Wait for indexing to complete
        #[arg(short, long)]
        wait: bool,
    },
    
    /// Search for similar vectors
    Search {
        /// Collection name
        collection: String,
        
        /// Query vector as JSON array
        #[arg(short, long)]
        vector: String,
        
        /// Number of results to return
        #[arg(short, long, default_value = "10")]
        limit: u32,
        
        /// Minimum similarity score
        #[arg(short, long)]
        score_threshold: Option<f32>,
        
        /// Filter conditions as JSON
        #[arg(short, long)]
        filter: Option<String>,
    },
    
    /// Delete points from collection
    DeletePoints {
        /// Collection name
        collection: String,
        
        /// Point IDs to delete (comma-separated)
        #[arg(short, long)]
        ids: String,
        
        /// Wait for operation to complete
        #[arg(short, long)]
        wait: bool,
    },
    
    /// Scroll through collection points
    Scroll {
        /// Collection name
        collection: String,
        
        /// Number of points to return
        #[arg(short, long, default_value = "10")]
        limit: u32,
        
        /// Offset ID to start from
        #[arg(short, long)]
        offset: Option<String>,
        
        /// Filter conditions as JSON
        #[arg(short, long)]
        filter: Option<String>,
    },
    
    /// Get collection statistics
    Count {
        /// Collection name
        collection: String,
        
        /// Filter conditions as JSON
        #[arg(short, long)]
        filter: Option<String>,
    },
}

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    let cli = Cli::parse();
    let options = CommonOptions::new(cli.format, cli.debug);
    options.setup_debug();
    
    let result = match cli.command {
        Commands::List => handle_list_command(&cli.url, cli.api_key.as_deref(), &options).await,
        Commands::Health => handle_health_command(&cli.url, cli.api_key.as_deref(), &options).await,
        Commands::Create { name, size, distance, payload_schema } => {
            handle_create_command(&cli.url, cli.api_key.as_deref(), &name, size, &distance, payload_schema.as_deref(), &options).await
        },
        Commands::Delete { name } => {
            handle_delete_command(&cli.url, cli.api_key.as_deref(), &name, &options).await
        },
        Commands::Info { name } => {
            handle_info_command(&cli.url, cli.api_key.as_deref(), &name, &options).await
        },
        Commands::Upsert { collection, points, wait } => {
            handle_upsert_command(&cli.url, cli.api_key.as_deref(), &collection, &points, wait, &options).await
        },
        Commands::Search { collection, vector, limit, score_threshold, filter } => {
            handle_search_command(&cli.url, cli.api_key.as_deref(), &collection, &vector, limit, score_threshold, filter.as_deref(), &options).await
        },
        Commands::DeletePoints { collection, ids, wait } => {
            handle_delete_points_command(&cli.url, cli.api_key.as_deref(), &collection, &ids, wait, &options).await
        },
        Commands::Scroll { collection, limit, offset, filter } => {
            handle_scroll_command(&cli.url, cli.api_key.as_deref(), &collection, limit, offset.as_deref(), filter.as_deref(), &options).await
        },
        Commands::Count { collection, filter } => {
            handle_count_command(&cli.url, cli.api_key.as_deref(), &collection, filter.as_deref(), &options).await
        },
    };
    
    if let Err(e) = result {
        handle_error(e, "Command execution failed");
    }
    
    Ok(())
}

async fn handle_list_command(
    url: &str,
    _api_key: Option<&str>,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let collections_url = format!("{}/collections", url);
    let response = reqwest::get(&collections_url).await?;
    let collections_data: Value = response.json().await?;
    
    // Extract collections from the response
    let collections = collections_data["result"]["collections"].as_array()
        .unwrap_or(&Vec::new())
        .iter()
        .map(|c| json!({"name": c["name"]}))
        .collect::<Vec<_>>();
    
    let result = json!({"collections": collections});
    println!("{}", format_output(&result, options.format));
    Ok(())
}

async fn handle_health_command(
    url: &str,
    _api_key: Option<&str>,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let health_url = format!("{}/", url);  // Health endpoint is the root
    let response = reqwest::get(&health_url).await?;
    let health_data: Value = response.json().await?;
    
    let result = json!({
        "status": "healthy",
        "response": health_data
    });
    println!("{}", format_output(&result, options.format));
    
    Ok(())
}

// Helper function to build HTTP client with optional API key
fn build_client(api_key: Option<&str>) -> reqwest::Client {
    let mut headers = reqwest::header::HeaderMap::new();
    if let Some(key) = api_key {
        headers.insert("api-key", key.parse().unwrap());
    }
    headers.insert("Content-Type", "application/json".parse().unwrap());
    
    reqwest::Client::builder()
        .default_headers(headers)
        .build()
        .unwrap()
}

async fn handle_create_command(
    url: &str,
    api_key: Option<&str>,
    name: &str,
    size: u32,
    distance: &str,
    payload_schema: Option<&str>,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let client = build_client(api_key);
    let create_url = format!("{}/collections/{}", url, name);
    
    // Validate distance metric
    let distance_metric = match distance.to_lowercase().as_str() {
        "cosine" => "Cosine",
        "euclidean" => "Euclidean", 
        "dot" => "Dot",
        "manhattan" => "Manhattan",
        _ => return Err(anyhow::anyhow!("Invalid distance metric. Use: Cosine, Euclidean, Dot, or Manhattan")),
    };
    
    let mut config = json!({
        "vectors": {
            "size": size,
            "distance": distance_metric
        }
    });
    
    // Add payload schema if provided
    if let Some(schema_str) = payload_schema {
        let schema: Value = parse_json_arg(schema_str, "payload_schema")?;
        config["payload_schema"] = schema;
    }
    
    let response = client.put(&create_url)
        .json(&config)
        .send()
        .await?;
    
    if !response.status().is_success() {
        let error_text = response.text().await?;
        return Err(anyhow::anyhow!("Failed to create collection: {}", error_text));
    }
    
    let result_data: Value = response.json().await?;
    println!("{}", format_output(&result_data, options.format));
    
    Ok(())
}

async fn handle_delete_command(
    url: &str,
    api_key: Option<&str>,
    name: &str,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let client = build_client(api_key);
    let delete_url = format!("{}/collections/{}", url, name);
    
    let response = client.delete(&delete_url).send().await?;
    
    if !response.status().is_success() {
        let error_text = response.text().await?;
        return Err(anyhow::anyhow!("Failed to delete collection: {}", error_text));
    }
    
    let result = json!({
        "status": "success",
        "message": format!("Collection '{}' deleted successfully", name)
    });
    
    println!("{}", format_output(&result, options.format));
    Ok(())
}

async fn handle_info_command(
    url: &str,
    api_key: Option<&str>,
    name: &str,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let client = build_client(api_key);
    let info_url = format!("{}/collections/{}", url, name);
    
    let response = client.get(&info_url).send().await?;
    
    if !response.status().is_success() {
        let error_text = response.text().await?;
        return Err(anyhow::anyhow!("Failed to get collection info: {}", error_text));
    }
    
    let info_data: Value = response.json().await?;
    println!("{}", format_output(&info_data, options.format));
    
    Ok(())
}

async fn handle_upsert_command(
    url: &str,
    api_key: Option<&str>,
    collection: &str,
    points_str: &str,
    wait: bool,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let client = build_client(api_key);
    let upsert_url = format!("{}/collections/{}/points", url, collection);
    
    let points_data: Value = parse_json_arg(points_str, "points")?;
    
    let mut request_body = json!({
        "points": points_data
    });
    
    if wait {
        request_body["wait"] = json!(true);
    }
    
    let response = client.put(&upsert_url)
        .json(&request_body)
        .send()
        .await?;
    
    if !response.status().is_success() {
        let error_text = response.text().await?;
        return Err(anyhow::anyhow!("Failed to upsert points: {}", error_text));
    }
    
    let result_data: Value = response.json().await?;
    println!("{}", format_output(&result_data, options.format));
    
    Ok(())
}

async fn handle_search_command(
    url: &str,
    api_key: Option<&str>,
    collection: &str,
    vector_str: &str,
    limit: u32,
    score_threshold: Option<f32>,
    filter: Option<&str>,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let client = build_client(api_key);
    let search_url = format!("{}/collections/{}/points/search", url, collection);
    
    let vector_data: Value = parse_json_arg(vector_str, "vector")?;
    
    let mut search_body = json!({
        "vector": vector_data,
        "limit": limit
    });
    
    if let Some(threshold) = score_threshold {
        search_body["score_threshold"] = json!(threshold);
    }
    
    if let Some(filter_str) = filter {
        let filter_data: Value = parse_json_arg(filter_str, "filter")?;
        search_body["filter"] = filter_data;
    }
    
    let response = client.post(&search_url)
        .json(&search_body)
        .send()
        .await?;
    
    if !response.status().is_success() {
        let error_text = response.text().await?;
        return Err(anyhow::anyhow!("Failed to search: {}", error_text));
    }
    
    let result_data: Value = response.json().await?;
    println!("{}", format_output(&result_data, options.format));
    
    Ok(())
}

async fn handle_delete_points_command(
    url: &str,
    api_key: Option<&str>,
    collection: &str,
    ids_str: &str,
    wait: bool,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let client = build_client(api_key);
    let delete_url = format!("{}/collections/{}/points/delete", url, collection);
    
    // Parse comma-separated IDs
    let ids: Vec<Value> = ids_str
        .split(',')
        .map(|id| {
            id.trim().parse::<i64>()
                .map(|n| json!(n))
                .unwrap_or_else(|_| json!(id.trim()))
        })
        .collect();
    
    let mut request_body = json!({
        "points": ids
    });
    
    if wait {
        request_body["wait"] = json!(true);
    }
    
    let response = client.post(&delete_url)
        .json(&request_body)
        .send()
        .await?;
    
    if !response.status().is_success() {
        let error_text = response.text().await?;
        return Err(anyhow::anyhow!("Failed to delete points: {}", error_text));
    }
    
    let result_data: Value = response.json().await?;
    println!("{}", format_output(&result_data, options.format));
    
    Ok(())
}

async fn handle_scroll_command(
    url: &str,
    api_key: Option<&str>,
    collection: &str,
    limit: u32,
    offset: Option<&str>,
    filter: Option<&str>,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let client = build_client(api_key);
    let scroll_url = format!("{}/collections/{}/points/scroll", url, collection);
    
    let mut scroll_body = json!({
        "limit": limit,
        "with_payload": true,
        "with_vector": true
    });
    
    if let Some(offset_str) = offset {
        // Try to parse as number, otherwise use as string
        let offset_value = offset_str.parse::<i64>()
            .map(|n| json!(n))
            .unwrap_or_else(|_| json!(offset_str));
        scroll_body["offset"] = offset_value;
    }
    
    if let Some(filter_str) = filter {
        let filter_data: Value = parse_json_arg(filter_str, "filter")?;
        scroll_body["filter"] = filter_data;
    }
    
    let response = client.post(&scroll_url)
        .json(&scroll_body)
        .send()
        .await?;
    
    if !response.status().is_success() {
        let error_text = response.text().await?;
        return Err(anyhow::anyhow!("Failed to scroll points: {}", error_text));
    }
    
    let result_data: Value = response.json().await?;
    println!("{}", format_output(&result_data, options.format));
    
    Ok(())
}

async fn handle_count_command(
    url: &str,
    api_key: Option<&str>,
    collection: &str,
    filter: Option<&str>,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let client = build_client(api_key);
    let count_url = format!("{}/collections/{}/points/count", url, collection);
    
    let mut count_body = json!({
        "exact": true
    });
    
    if let Some(filter_str) = filter {
        let filter_data: Value = parse_json_arg(filter_str, "filter")?;
        count_body["filter"] = filter_data;
    }
    
    let response = client.post(&count_url)
        .json(&count_body)
        .send()
        .await?;
    
    if !response.status().is_success() {
        let error_text = response.text().await?;
        return Err(anyhow::anyhow!("Failed to count points: {}", error_text));
    }
    
    let result_data: Value = response.json().await?;
    println!("{}", format_output(&result_data, options.format));
    
    Ok(())
}
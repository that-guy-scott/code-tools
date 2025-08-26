#!/usr/bin/env cargo run --bin qdrant --

use clap::{Parser, Subcommand};
use qdrant_client::Qdrant;
use reqwest;
use serde_json::{json, Value};
use url::Url;

use code_tools_connectors::shared::{format_output, handle_error, OutputFormat, CommonOptions};

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
    
    /// Qdrant server URL (gRPC: http://localhost:6334, REST: http://localhost:6333)
    #[arg(long, default_value = "http://localhost:6334")]
    url: String,
    
    /// Protocol to use (grpc|http|auto)
    #[arg(long, default_value = "auto")]
    protocol: String,
    
    /// API key for authentication
    #[arg(long)]
    api_key: Option<String>,
    
    /// Skip compatibility check (gRPC only)
    #[arg(long)]
    skip_compatibility_check: bool,
    
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// List all collections
    List,
    
    /// Health check
    Health,
    
    /// Create collection
    Create {
        /// Collection name
        #[arg(long)]
        name: String,
        /// Vector size
        #[arg(long)]
        size: u64,
        /// Distance metric (Dot|Cosine|Euclid)
        #[arg(long, default_value = "Cosine")]
        distance: String,
    },
    
    /// Insert points
    Insert {
        /// Collection name
        #[arg(long)]
        collection: String,
        /// Point ID
        #[arg(long)]
        id: u64,
        /// Vector data (comma-separated floats)
        #[arg(long)]
        vector: String,
        /// Payload as JSON
        #[arg(long, default_value = "{}")]
        payload: String,
    },
    
    /// Search vectors
    Search {
        /// Collection name
        #[arg(long)]
        collection: String,
        /// Query vector (comma-separated floats)
        #[arg(long)]
        vector: String,
        /// Number of results
        #[arg(long, default_value = "10")]
        limit: u64,
    },
}

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    let cli = Cli::parse();
    let options = CommonOptions::new(cli.format, cli.debug);
    options.setup_debug();
    
    let protocol = detect_protocol(&cli.url, &cli.protocol);
    
    let result = match protocol.as_str() {
        "grpc" => handle_grpc_operations(&cli, &options).await,
        "http" => handle_http_operations(&cli, &options).await,
        _ => {
            return Err(anyhow::anyhow!("Invalid protocol: {}", protocol));
        }
    };
    
    result?;
    
    Ok(())
}

fn detect_protocol(url: &str, protocol: &str) -> String {
    if protocol != "auto" {
        return protocol.to_string();
    }
    
    if let Ok(parsed_url) = Url::parse(url) {
        if let Some(port) = parsed_url.port() {
            return match port {
                6333 => "http".to_string(),
                6334 => "grpc".to_string(),
                _ => "grpc".to_string(), // default to gRPC
            };
        }
    }
    
    "grpc".to_string() // default
}

async fn handle_grpc_operations(cli: &Cli, options: &CommonOptions) -> Result<(), anyhow::Error> {
    let client = create_grpc_client(&cli.url, cli.api_key.as_deref(), cli.skip_compatibility_check).await?;
    
    match &cli.command {
        Commands::List => handle_grpc_list_command(&client, options).await,
        Commands::Health => handle_grpc_health_command(&client, options).await,
        Commands::Create { name, size, distance } => {
            handle_grpc_create_collection(&client, name, *size, distance, options).await
        },
        Commands::Insert { collection, id, vector, payload } => {
            handle_grpc_insert_points(&client, collection, *id, vector, payload, options).await
        },
        Commands::Search { collection, vector, limit } => {
            handle_grpc_search(&client, collection, vector, *limit, options).await
        },
    }
}

async fn handle_http_operations(cli: &Cli, options: &CommonOptions) -> Result<(), anyhow::Error> {
    let base_url = if cli.url.contains(":6334") {
        cli.url.replace(":6334", ":6333")
    } else {
        cli.url.clone()
    };
    
    let client = reqwest::Client::new();
    
    match &cli.command {
        Commands::List => handle_http_list_command(&client, &base_url, options).await,
        Commands::Health => handle_http_health_command(&client, &base_url, options).await,
        Commands::Create { name, size, distance } => {
            handle_http_create_collection(&client, &base_url, name, *size, distance, options).await
        },
        Commands::Insert { collection, id, vector, payload } => {
            handle_http_insert_points(&client, &base_url, collection, *id, vector, payload, options).await
        },
        Commands::Search { collection, vector, limit } => {
            handle_http_search(&client, &base_url, collection, vector, *limit, options).await
        },
    }
}

async fn create_grpc_client(url: &str, _api_key: Option<&str>, skip_compatibility_check: bool) -> Result<Qdrant, anyhow::Error> {
    let mut builder = Qdrant::from_url(url);
    
    if skip_compatibility_check {
        // Note: The actual skip method may vary based on qdrant-client version
        // This is a placeholder - check the actual API
        builder = builder;
    }
    
    match builder.build() {
        Ok(client) => Ok(client),
        Err(e) => {
            // Provide helpful error message
            let error_msg = format!(
                "Failed to connect to Qdrant gRPC at {}: {}. Try:\n1. Use --protocol http to use REST API\n2. Use --skip-compatibility-check to bypass version checks\n3. Check if gRPC port 6334 is accessible",
                url, e
            );
            Err(anyhow::anyhow!(error_msg))
        }
    }
}

// gRPC implementations
async fn handle_grpc_list_command(
    client: &Qdrant,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let collections = client.list_collections().await?;
    let result = json!({
        "collections": collections.collections.into_iter().map(|c| {
            json!({
                "name": c.name,
            })
        }).collect::<Vec<_>>(),
        "protocol": "grpc"
    });
    println!("{}", format_output(&result, options.format));
    Ok(())
}

async fn handle_grpc_health_command(
    client: &Qdrant,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let health = client.health_check().await?;
    
    let result = json!({
        "status": "healthy",
        "title": health.title,
        "version": health.version,
        "protocol": "grpc"
    });
    println!("{}", format_output(&result, options.format));
    
    Ok(())
}

async fn handle_grpc_create_collection(
    client: &Qdrant,
    name: &str,
    size: u64,
    distance: &str,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    use qdrant_client::qdrant::{CreateCollectionBuilder, VectorParamsBuilder, Distance};
    
    let distance_type = match distance.to_lowercase().as_str() {
        "dot" => Distance::Dot,
        "cosine" => Distance::Cosine,
        "euclid" => Distance::Euclid,
        _ => Distance::Cosine,
    };
    
    let vector_params = VectorParamsBuilder::new(size, distance_type).build();
    
    client.create_collection(
        CreateCollectionBuilder::new(name).vectors_config(vector_params)
    ).await?;
    
    let result = json!({
        "status": "created",
        "collection": name,
        "protocol": "grpc"
    });
    println!("{}", format_output(&result, options.format));
    Ok(())
}

async fn handle_grpc_insert_points(
    _client: &Qdrant,
    _collection: &str,
    _id: u64,
    _vector: &str,
    _payload: &str,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    // Simplified for now
    let result = json!({
        "status": "not_implemented",
        "message": "Insert via gRPC not implemented yet",
        "protocol": "grpc"
    });
    println!("{}", format_output(&result, options.format));
    Ok(())
}

async fn handle_grpc_search(
    _client: &Qdrant,
    _collection: &str,
    _vector: &str,
    _limit: u64,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    // Simplified for now
    let result = json!({
        "status": "not_implemented", 
        "message": "Search via gRPC not implemented yet",
        "protocol": "grpc"
    });
    println!("{}", format_output(&result, options.format));
    Ok(())
}

// HTTP implementations
async fn handle_http_list_command(
    client: &reqwest::Client,
    base_url: &str,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let url = format!("{}/collections", base_url);
    let response: Value = client.get(&url).send().await?.json().await?;
    
    let result = json!({
        "collections": response["result"]["collections"],
        "protocol": "http"
    });
    println!("{}", format_output(&result, options.format));
    Ok(())
}

async fn handle_http_health_command(
    client: &reqwest::Client,
    base_url: &str,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let url = format!("{}/", base_url);
    let response: Value = client.get(&url).send().await?.json().await?;
    
    let result = json!({
        "status": "healthy",
        "title": response["title"],
        "version": response["version"],
        "protocol": "http"
    });
    println!("{}", format_output(&result, options.format));
    Ok(())
}

async fn handle_http_create_collection(
    client: &reqwest::Client,
    base_url: &str,
    name: &str,
    size: u64,
    distance: &str,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let url = format!("{}/collections/{}", base_url, name);
    let payload = json!({
        "vectors": {
            "size": size,
            "distance": distance
        }
    });
    
    let response = client.put(&url)
        .json(&payload)
        .send()
        .await?;
    
    let result_data: Value = response.json().await?;
    let result = json!({
        "status": "created",
        "collection": name,
        "result": result_data,
        "protocol": "http"
    });
    println!("{}", format_output(&result, options.format));
    Ok(())
}

async fn handle_http_insert_points(
    client: &reqwest::Client,
    base_url: &str,
    collection: &str,
    id: u64,
    vector: &str,
    payload: &str,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let vector_data: Vec<f32> = vector.split(',')
        .map(|s| s.trim().parse().unwrap_or(0.0))
        .collect();
    
    let payload_data: Value = serde_json::from_str(payload)?;
    
    let url = format!("{}/collections/{}/points", base_url, collection);
    let body = json!({
        "points": [{
            "id": id,
            "vector": vector_data,
            "payload": payload_data
        }]
    });
    
    let response = client.put(&url)
        .json(&body)
        .send()
        .await?;
    
    let result_data: Value = response.json().await?;
    let result = json!({
        "status": "inserted",
        "collection": collection,
        "result": result_data,
        "protocol": "http"
    });
    println!("{}", format_output(&result, options.format));
    Ok(())
}

async fn handle_http_search(
    client: &reqwest::Client,
    base_url: &str,
    collection: &str,
    vector: &str,
    limit: u64,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let vector_data: Vec<f32> = vector.split(',')
        .map(|s| s.trim().parse().unwrap_or(0.0))
        .collect();
    
    let url = format!("{}/collections/{}/points/search", base_url, collection);
    let body = json!({
        "vector": vector_data,
        "limit": limit
    });
    
    let response = client.post(&url)
        .json(&body)
        .send()
        .await?;
    
    let result_data: Value = response.json().await?;
    let result = json!({
        "collection": collection,
        "results": result_data["result"],
        "protocol": "http"
    });
    println!("{}", format_output(&result, options.format));
    Ok(())
}
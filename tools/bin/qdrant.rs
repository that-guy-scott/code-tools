#!/usr/bin/env cargo run --bin qdrant --

use clap::{Parser, Subcommand};
use qdrant_client::Qdrant;
use serde_json::{json, Value};

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
}

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    let cli = Cli::parse();
    let options = CommonOptions::new(cli.format, cli.debug);
    options.setup_debug();
    
    let result = match create_client(&cli.url, cli.api_key.as_deref()).await {
        Ok(client) => {
            match cli.command {
                Commands::List => handle_list_command(&client, &options).await,
                Commands::Health => handle_health_command(&client, &options).await,
            }
        },
        Err(e) => {
            handle_error(e, "Failed to connect to Qdrant");
            std::process::exit(1);
        }
    };
    
    if let Err(e) = result {
        handle_error(e, "Command execution failed");
        std::process::exit(1);
    }
    
    Ok(())
}

async fn create_client(url: &str, _api_key: Option<&str>) -> Result<Qdrant, anyhow::Error> {
    let client = Qdrant::from_url(url).build()?;
    Ok(client)
}

async fn handle_list_command(
    client: &Qdrant,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let collections = client.list_collections().await?;
    let result = json!({
        "collections": collections.collections.into_iter().map(|c| {
            json!({
                "name": c.name,
            })
        }).collect::<Vec<_>>()
    });
    println!("{}", format_output(&result, options.format));
    Ok(())
}

async fn handle_health_command(
    client: &Qdrant,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let health = client.health_check().await?;
    
    let result = json!({
        "status": "healthy",
        "title": health.title,
        "version": health.version
    });
    println!("{}", format_output(&result, options.format));
    
    Ok(())
}
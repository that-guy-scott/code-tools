#!/usr/bin/env cargo run --bin neo4j --

use clap::{Parser, Subcommand};
use neo4rs::*;
use serde_json::{json, Value};

use code_tools_connectors::shared::{format_output, handle_error, parse_json_arg,
        OutputFormat, CommonOptions};

/// Neo4j graph database CLI
#[derive(Parser)]
#[command(name = "neo4j")]
#[command(about = "High-performance Neo4j graph database connector")]
#[command(version = "1.0.0")]
struct Cli {
    /// Output format (json|text|csv)
    #[arg(short, long, default_value = "json")]
    format: OutputFormat,
    
    /// Enable debug mode
    #[arg(short, long)]
    debug: bool,
    
    /// Neo4j URI
    #[arg(long, default_value = "bolt://localhost:7687")]
    uri: String,
    
    /// Neo4j username
    #[arg(long, default_value = "neo4j")]
    username: String,
    
    /// Neo4j password
    #[arg(long, default_value = "dev_password_123")]
    password: String,
    
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Search memories by query text
    Search {
        /// Search query text
        query: String,
        
        /// Maximum results to return
        #[arg(short, long, default_value = "5")]
        limit: i64,
        
        /// Filter by memory label
        #[arg(long)]
        label: Option<String>,
        
        /// Relationship depth to include
        #[arg(short, long, default_value = "1")]
        depth: i64,
    },
    
    /// Create a new memory node
    Create {
        /// Memory label
        label: String,
        
        /// Memory properties as JSON
        #[arg(short, long, default_value = "{}")]
        properties: String,
    },
    
    /// Create a relationship between two nodes
    Connect {
        /// From node ID
        from_id: i64,
        
        /// To node ID  
        to_id: i64,
        
        /// Relationship type
        #[arg(short, long)]
        rel_type: String,
        
        /// Relationship properties as JSON
        #[arg(short, long, default_value = "{}")]
        properties: String,
    },
    
    /// Update memory properties
    Update {
        /// Memory ID to update
        id: i64,
        
        /// Properties to update as JSON
        #[arg(short, long)]
        properties: String,
    },
    
    /// Delete a memory by ID
    Delete {
        /// Memory ID to delete
        id: i64,
    },
    
    /// Run arbitrary Cypher query
    Query {
        /// Cypher query to execute
        #[arg(short, long)]
        cypher: String,
        
        /// Query parameters as JSON
        #[arg(short, long, default_value = "{}")]
        params: String,
        
        /// Read-only mode (default: false)
        #[arg(long)]
        read_only: bool,
    },
    
    /// Health check
    Health,
    
    /// Database statistics
    Stats,
}

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    let cli = Cli::parse();
    let options = CommonOptions::new(cli.format, cli.debug);
    options.setup_debug();
    
    let result = match connect_to_neo4j(&cli.uri, &cli.username, &cli.password).await {
        Ok(graph) => {
            match cli.command {
                Commands::Search { query, limit, label, depth } => {
                    handle_search_command(&graph, query, limit, label, depth, &options).await
                },
                Commands::Create { label, properties } => {
                    handle_create_command(&graph, label, properties, &options).await
                },
                Commands::Connect { from_id, to_id, rel_type, properties } => {
                    handle_connect_command(&graph, from_id, to_id, rel_type, properties, &options).await
                },
                Commands::Update { id, properties } => {
                    handle_update_command(&graph, id, properties, &options).await
                },
                Commands::Delete { id } => {
                    handle_delete_command(&graph, id, &options).await
                },
                Commands::Query { cypher, params, read_only } => {
                    handle_query_command(&graph, cypher, params, read_only, &options).await
                },
                Commands::Health => {
                    handle_health_command(&graph, &options).await
                },
                Commands::Stats => {
                    handle_stats_command(&graph, &options).await
                },
            }
        },
        Err(e) => {
            handle_error(e, "Connection failed");
            std::process::exit(1);
        }
    };
    
    if let Err(e) = result {
        handle_error(e, "Execution failed");
        std::process::exit(1);
    }
    
    Ok(())
}

async fn connect_to_neo4j(uri: &str, username: &str, password: &str) -> Result<Graph, anyhow::Error> {
    let config = ConfigBuilder::default()
        .uri(uri)
        .user(username)
        .password(password)
        .max_connections(10)
        .build()?;
    
    Graph::connect(config).await
        .map_err(|e| anyhow::anyhow!("Failed to connect to Neo4j: {}", e))
}

async fn handle_search_command(
    graph: &Graph,
    query: String,
    limit: i64,
    label: Option<String>,
    _depth: i64,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let mut cypher = String::from(
        "MATCH (m) 
         WHERE (m.name IS NOT NULL AND toLower(toString(m.name)) CONTAINS toLower($query))
            OR (m.content IS NOT NULL AND toLower(toString(m.content)) CONTAINS toLower($query))
            OR (m.description IS NOT NULL AND toLower(toString(m.description)) CONTAINS toLower($query))
            OR (m.purpose IS NOT NULL AND toLower(toString(m.purpose)) CONTAINS toLower($query))"
    );
    
    let mut params = vec![("query", query.as_str())];
    
    if let Some(ref label_filter) = label {
        cypher.push_str(" AND $label IN labels(m)");
        params.push(("label", label_filter.as_str()));
    }
    
    cypher.push_str(" RETURN m, id(m) as nodeId, labels(m) as labels ORDER BY m.created_at DESC LIMIT $limit");
    let limit_str = limit.to_string();
    params.push(("limit", &limit_str));
    
    let mut result = graph.execute(Query::new(cypher).params(params)).await?;
    
    let mut memories = Vec::new();
    while let Ok(Some(row)) = result.next().await {
        // Use serde to convert directly to JSON - neo4rs v0.7 feature
        let record: Value = row.to()?;
        memories.push(record);
    }
    
    let result_json = Value::Array(memories);
    println!("{}", format_output(&result_json, options.format));
    
    Ok(())
}

async fn handle_create_command(
    graph: &Graph,
    label: String,
    properties_str: String,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let mut properties: Value = parse_json_arg(&properties_str, "properties")?;
    
    // Add timestamp if not provided
    if let Value::Object(ref mut obj) = properties {
        if !obj.contains_key("created_at") {
            obj.insert("created_at".to_string(), Value::String(chrono::Utc::now().to_rfc3339()));
        }
    }
    
    // For v0.7 compatibility, create node with basic properties as strings
    let mut cypher = format!("CREATE (m:{}{{", label);
    let mut params = Vec::new();
    let mut first = true;
    
    if let Value::Object(obj) = &properties {
        for (key, value) in obj {
            if !first { cypher.push_str(", "); }
            first = false;
            
            cypher.push_str(&format!("{}: ${}", key, key));
            let value_str = match value {
                Value::String(s) => s.clone(),
                Value::Number(n) => n.to_string(),
                Value::Bool(b) => b.to_string(),
                _ => value.to_string(), // JSON representation for complex types
            };
            params.push((key.clone(), value_str));
        }
    }
    cypher.push_str("}) RETURN m, id(m) as nodeId, labels(m) as labels");
    
    // Convert to references for the API
    let param_refs: Vec<(&str, &str)> = params.iter()
        .map(|(k, v)| (k.as_str(), v.as_str()))
        .collect();
    
    let mut result = graph.execute(Query::new(cypher).params(param_refs)).await?;
    
    if let Ok(Some(row)) = result.next().await {
        let response: Value = row.to()?;
        println!("{}", format_output(&response, options.format));
    }
    
    Ok(())
}

async fn handle_connect_command(
    graph: &Graph,
    from_id: i64,
    to_id: i64,
    rel_type: String,
    properties_str: String,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let mut properties: Value = parse_json_arg(&properties_str, "relationship properties")?;
    
    // Add timestamp if not provided
    if let Value::Object(ref mut obj) = properties {
        if !obj.contains_key("created_at") {
            obj.insert("created_at".to_string(), Value::String(chrono::Utc::now().to_rfc3339()));
        }
    }
    
    let cypher = format!(
        "MATCH (from), (to) WHERE id(from) = $fromId AND id(to) = $toId 
         CREATE (from)-[r:{}]->(to) 
         RETURN r, type(r) as relType, id(from) as fromId, id(to) as toId",
        rel_type
    );
    
    let from_id_str = from_id.to_string();
    let to_id_str = to_id.to_string();
    let params = vec![
        ("fromId", from_id_str.as_str()),
        ("toId", to_id_str.as_str()),
    ];
    
    let mut result = graph.execute(Query::new(cypher).params(params)).await?;
    
    if let Ok(Some(row)) = result.next().await {
        let response: Value = row.to()?;
        println!("{}", format_output(&response, options.format));
    }
    
    Ok(())
}

async fn handle_update_command(
    graph: &Graph,
    id: i64,
    properties_str: String,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let _properties: Value = parse_json_arg(&properties_str, "properties")?;
    
    let cypher = "MATCH (m) WHERE id(m) = $id RETURN m, id(m) as nodeId, labels(m) as labels";
    let id_str = id.to_string();
    let params = vec![("id", id_str.as_str())];
    
    let mut result = graph.execute(Query::new(cypher.to_string()).params(params)).await?;
    
    if let Ok(Some(row)) = result.next().await {
        let response: Value = row.to()?;
        println!("{}", format_output(&response, options.format));
    }
    
    Ok(())
}

async fn handle_delete_command(
    graph: &Graph,
    id: i64,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let cypher = "MATCH (m) WHERE id(m) = $id DETACH DELETE m RETURN count(m) as deleted";
    let id_str = id.to_string();
    let params = vec![("id", id_str.as_str())];
    
    let mut result = graph.execute(Query::new(cypher.to_string()).params(params)).await?;
    
    if let Ok(Some(row)) = result.next().await {
        let response: Value = row.to()?;
        println!("{}", format_output(&response, options.format));
    }
    
    Ok(())
}

async fn handle_query_command(
    graph: &Graph,
    cypher: String,
    params_str: String,
    _read_only: bool,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let params_json: Value = parse_json_arg(&params_str, "parameters")?;
    
    // For v0.7 compatibility, only support string parameters for now
    let params: Vec<(&str, &str)> = if let Value::Object(obj) = &params_json {
        obj.iter()
            .filter_map(|(k, v)| {
                if let Value::String(s) = v {
                    Some((k.as_str(), s.as_str()))
                } else {
                    None
                }
            })
            .collect()
    } else {
        vec![]
    };
    
    let mut result = graph.execute(Query::new(cypher).params(params)).await?;
    
    let mut records = Vec::new();
    while let Ok(Some(row)) = result.next().await {
        // Convert row to serde_json::Value using neo4rs v0.7 serde integration
        let record: Value = row.to()?;
        records.push(record);
    }
    
    let result_json = Value::Array(records);
    println!("{}", format_output(&result_json, options.format));
    
    Ok(())
}

async fn handle_health_command(
    graph: &Graph,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    // Simple connectivity check
    let mut result = graph.execute(Query::new("RETURN 'Neo4j connected' as message".to_string())).await?;
    
    if let Ok(Some(row)) = result.next().await {
        let response: Value = row.to()?;
        let health = json!({
            "status": "healthy",
            "data": response
        });
        println!("{}", format_output(&health, options.format));
    }
    
    Ok(())
}

async fn handle_stats_command(
    graph: &Graph,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let queries = vec![
        ("total_nodes", "MATCH (n) RETURN count(n) as count"),
        ("total_relationships", "MATCH ()-[r]->() RETURN count(r) as count"),
        ("node_labels", "MATCH (n) RETURN labels(n) as labels, count(n) as count GROUP BY labels(n) ORDER BY count DESC LIMIT 10"),
    ];
    
    let mut stats = serde_json::Map::new();
    
    for (name, cypher_query) in queries {
        let mut result = graph.execute(Query::new(cypher_query.to_string())).await?;
        let mut records = Vec::new();
        
        while let Ok(Some(row)) = result.next().await {
            let record: Value = row.to()?;
            records.push(record);
        }
        
        stats.insert(name.to_string(), Value::Array(records));
    }
    
    let result_json = Value::Object(stats);
    println!("{}", format_output(&result_json, options.format));
    
    Ok(())
}
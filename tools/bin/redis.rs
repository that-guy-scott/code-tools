#!/usr/bin/env cargo run --bin redis --

use clap::{Parser, Subcommand};
use redis::{aio::ConnectionManager, AsyncCommands, Client, RedisResult};
use serde_json::json;

use code_tools_connectors::shared::{format_output, handle_error, OutputFormat, CommonOptions};

/// Redis database CLI
#[derive(Parser)]
#[command(name = "redis")]
#[command(about = "High-performance Redis database connector")]
#[command(version = "1.0.0")]
struct Cli {
    /// Output format (json|text|csv)
    #[arg(short, long, default_value = "json")]
    format: OutputFormat,
    
    /// Enable debug mode
    #[arg(short, long)]
    debug: bool,
    
    /// Redis URL
    #[arg(long, default_value = "redis://localhost:6379")]
    url: String,
    
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Set a key-value pair
    Set {
        /// Key name
        key: String,
        
        /// Value to store
        value: String,
        
        /// Expiration time in seconds (optional)
        #[arg(short, long)]
        expire: Option<u64>,
    },
    
    /// Get value by key
    Get {
        /// Key name
        key: String,
    },
    
    /// Delete one or more keys
    Delete {
        /// Key names to delete
        keys: Vec<String>,
    },
    
    /// List keys matching a pattern
    List {
        /// Pattern to match keys (default: *)
        #[arg(default_value = "*")]
        pattern: String,
        
        /// Limit number of results
        #[arg(short, long)]
        limit: Option<usize>,
    },
    
    /// Set expiration for a key
    Expire {
        /// Key name
        key: String,
        
        /// Expiration time in seconds
        seconds: u64,
    },
    
    /// Get time to live for a key
    Ttl {
        /// Key name
        key: String,
    },
    
    /// Hash operations
    Hash {
        #[command(subcommand)]
        operation: HashOperation,
    },
    
    /// List operations
    ListOp {
        #[command(subcommand)]
        operation: ListOperation,
    },
    
    /// Set operations
    SetOp {
        #[command(subcommand)]
        operation: SetOperation,
    },
    
    /// Get Redis server information
    Info {
        /// Specific info section (optional)
        section: Option<String>,
    },
    
    /// Clear current database
    FlushDb,
    
    /// Get database size
    DbSize,
    
    /// Health check
    Health,
}

#[derive(Subcommand)]
enum HashOperation {
    /// Get hash field value
    Get {
        /// Hash key
        key: String,
        /// Field name
        field: String,
    },
    
    /// Set hash field value
    Set {
        /// Hash key
        key: String,
        /// Field name
        field: String,
        /// Field value
        value: String,
    },
    
    /// Get all hash fields and values
    GetAll {
        /// Hash key
        key: String,
    },
    
    /// Delete hash fields
    Delete {
        /// Hash key
        key: String,
        /// Field names to delete
        fields: Vec<String>,
    },
}

#[derive(Subcommand)]
enum ListOperation {
    /// Push element to left of list
    PushLeft {
        /// List key
        key: String,
        /// Values to push
        values: Vec<String>,
    },
    
    /// Push element to right of list
    PushRight {
        /// List key
        key: String,
        /// Values to push
        values: Vec<String>,
    },
    
    /// Pop element from left of list
    PopLeft {
        /// List key
        key: String,
    },
    
    /// Pop element from right of list
    PopRight {
        /// List key
        key: String,
    },
    
    /// Get list elements by range
    Range {
        /// List key
        key: String,
        /// Start index
        #[arg(default_value = "0")]
        start: isize,
        /// End index (-1 for end of list)
        #[arg(default_value = "-1")]
        end: isize,
    },
    
    /// Get list length
    Len {
        /// List key
        key: String,
    },
}

#[derive(Subcommand)]
enum SetOperation {
    /// Add members to set
    Add {
        /// Set key
        key: String,
        /// Members to add
        members: Vec<String>,
    },
    
    /// Get all set members
    Members {
        /// Set key
        key: String,
    },
    
    /// Check if member exists in set
    IsMember {
        /// Set key
        key: String,
        /// Member to check
        member: String,
    },
    
    /// Remove members from set
    Remove {
        /// Set key
        key: String,
        /// Members to remove
        members: Vec<String>,
    },
    
    /// Get set cardinality (size)
    Card {
        /// Set key
        key: String,
    },
}

async fn create_connection_manager(url: &str) -> Result<ConnectionManager, anyhow::Error> {
    let client = Client::open(url)?;
    let manager = client.get_connection_manager().await?;
    Ok(manager)
}

async fn handle_set_command(
    manager: &mut ConnectionManager,
    key: String,
    value: String,
    expire: Option<u64>,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let result: RedisResult<String> = manager.set(&key, &value).await;
    
    match result {
        Ok(_) => {
            if let Some(exp_seconds) = expire {
                let _: RedisResult<i32> = manager.expire(&key, exp_seconds as i64).await;
            }
            
            let response = json!({
                "status": "ok",
                "key": key,
                "value": value,
                "expired": expire
            });
            println!("{}", format_output(&response, options.format));
        }
        Err(e) => return Err(anyhow::anyhow!("Failed to set key '{}': {}", key, e)),
    }
    
    Ok(())
}

async fn handle_get_command(
    manager: &mut ConnectionManager,
    key: String,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let result: RedisResult<Option<String>> = manager.get(&key).await;
    
    match result {
        Ok(Some(value)) => {
            let response = json!({
                "key": key,
                "value": value,
                "exists": true
            });
            println!("{}", format_output(&response, options.format));
        }
        Ok(None) => {
            let response = json!({
                "key": key,
                "value": null,
                "exists": false
            });
            println!("{}", format_output(&response, options.format));
        }
        Err(e) => return Err(anyhow::anyhow!("Failed to get key '{}': {}", key, e)),
    }
    
    Ok(())
}

async fn handle_delete_command(
    manager: &mut ConnectionManager,
    keys: Vec<String>,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let result: RedisResult<i32> = manager.del(&keys).await;
    
    match result {
        Ok(deleted_count) => {
            let response = json!({
                "deleted": deleted_count,
                "requested": keys.len(),
                "keys": keys
            });
            println!("{}", format_output(&response, options.format));
        }
        Err(e) => return Err(anyhow::anyhow!("Failed to delete keys: {}", e)),
    }
    
    Ok(())
}

async fn handle_list_command(
    manager: &mut ConnectionManager,
    pattern: String,
    limit: Option<usize>,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let result: RedisResult<Vec<String>> = manager.keys(&pattern).await;
    
    match result {
        Ok(mut keys) => {
            if let Some(limit_val) = limit {
                keys.truncate(limit_val);
            }
            
            let response = json!({
                "pattern": pattern,
                "count": keys.len(),
                "keys": keys
            });
            println!("{}", format_output(&response, options.format));
        }
        Err(e) => return Err(anyhow::anyhow!("Failed to list keys with pattern '{}': {}", pattern, e)),
    }
    
    Ok(())
}

async fn handle_expire_command(
    manager: &mut ConnectionManager,
    key: String,
    seconds: u64,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let result: RedisResult<i32> = manager.expire(&key, seconds as i64).await;
    
    match result {
        Ok(1) => {
            let response = json!({
                "key": key,
                "expiration_set": true,
                "seconds": seconds
            });
            println!("{}", format_output(&response, options.format));
        }
        Ok(0) => {
            let response = json!({
                "key": key,
                "expiration_set": false,
                "error": "Key does not exist"
            });
            println!("{}", format_output(&response, options.format));
        }
        Ok(_) | Err(_) => {
            return Err(anyhow::anyhow!("Failed to set expiration for key '{}'", key));
        }
    }
    
    Ok(())
}

async fn handle_ttl_command(
    manager: &mut ConnectionManager,
    key: String,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let result: RedisResult<i64> = manager.ttl(&key).await;
    
    match result {
        Ok(ttl) => {
            let status = match ttl {
                -2 => "key_not_exists",
                -1 => "no_expiration",
                _ => "has_expiration",
            };
            
            let response = json!({
                "key": key,
                "ttl_seconds": ttl,
                "status": status
            });
            println!("{}", format_output(&response, options.format));
        }
        Err(e) => return Err(anyhow::anyhow!("Failed to get TTL for key '{}': {}", key, e)),
    }
    
    Ok(())
}

async fn handle_info_command(
    manager: &mut ConnectionManager,
    section: Option<String>,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let info_cmd = if let Some(sect) = section {
        format!("INFO {}", sect)
    } else {
        "INFO".to_string()
    };
    
    let result: RedisResult<String> = redis::cmd(&info_cmd).query_async(manager).await;
    
    match result {
        Ok(info_text) => {
            let response = json!({
                "info": info_text.trim()
            });
            println!("{}", format_output(&response, options.format));
        }
        Err(e) => return Err(anyhow::anyhow!("Failed to get Redis info: {}", e)),
    }
    
    Ok(())
}

async fn handle_flushdb_command(
    manager: &mut ConnectionManager,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let result: RedisResult<String> = redis::cmd("FLUSHDB").query_async(manager).await;
    
    match result {
        Ok(_) => {
            let response = json!({
                "status": "ok",
                "message": "Database cleared"
            });
            println!("{}", format_output(&response, options.format));
        }
        Err(e) => return Err(anyhow::anyhow!("Failed to flush database: {}", e)),
    }
    
    Ok(())
}

async fn handle_dbsize_command(
    manager: &mut ConnectionManager,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let result: RedisResult<i32> = redis::cmd("DBSIZE").query_async(manager).await;
    
    match result {
        Ok(size) => {
            let response = json!({
                "database_size": size
            });
            println!("{}", format_output(&response, options.format));
        }
        Err(e) => return Err(anyhow::anyhow!("Failed to get database size: {}", e)),
    }
    
    Ok(())
}

async fn handle_health_command(
    manager: &mut ConnectionManager,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let result: RedisResult<String> = redis::cmd("PING").arg("health-check").query_async(manager).await;
    
    match result {
        Ok(response) => {
            let health = json!({
                "status": "healthy",
                "ping_response": response
            });
            println!("{}", format_output(&health, options.format));
        }
        Err(e) => return Err(anyhow::anyhow!("Redis health check failed: {}", e)),
    }
    
    Ok(())
}

// Hash operations
async fn handle_hash_get(
    manager: &mut ConnectionManager,
    key: String,
    field: String,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let result: RedisResult<Option<String>> = manager.hget(&key, &field).await;
    
    match result {
        Ok(Some(value)) => {
            let response = json!({
                "key": key,
                "field": field,
                "value": value,
                "exists": true
            });
            println!("{}", format_output(&response, options.format));
        }
        Ok(None) => {
            let response = json!({
                "key": key,
                "field": field,
                "value": null,
                "exists": false
            });
            println!("{}", format_output(&response, options.format));
        }
        Err(e) => return Err(anyhow::anyhow!("Failed to get hash field '{}' from key '{}': {}", field, key, e)),
    }
    
    Ok(())
}

async fn handle_hash_set(
    manager: &mut ConnectionManager,
    key: String,
    field: String,
    value: String,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let result: RedisResult<i32> = manager.hset(&key, &field, &value).await;
    
    match result {
        Ok(created) => {
            let response = json!({
                "key": key,
                "field": field,
                "value": value,
                "created_new_field": created == 1
            });
            println!("{}", format_output(&response, options.format));
        }
        Err(e) => return Err(anyhow::anyhow!("Failed to set hash field '{}' in key '{}': {}", field, key, e)),
    }
    
    Ok(())
}

async fn handle_hash_getall(
    manager: &mut ConnectionManager,
    key: String,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let result: RedisResult<std::collections::HashMap<String, String>> = manager.hgetall(&key).await;
    
    match result {
        Ok(hash) => {
            let response = json!({
                "key": key,
                "field_count": hash.len(),
                "fields": hash
            });
            println!("{}", format_output(&response, options.format));
        }
        Err(e) => return Err(anyhow::anyhow!("Failed to get all hash fields from key '{}': {}", key, e)),
    }
    
    Ok(())
}

// List operations  
async fn handle_list_push_left(
    manager: &mut ConnectionManager,
    key: String,
    values: Vec<String>,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let result: RedisResult<i32> = manager.lpush(&key, &values).await;
    
    match result {
        Ok(length) => {
            let response = json!({
                "key": key,
                "pushed": values.len(),
                "new_length": length,
                "values": values
            });
            println!("{}", format_output(&response, options.format));
        }
        Err(e) => return Err(anyhow::anyhow!("Failed to push to left of list '{}': {}", key, e)),
    }
    
    Ok(())
}

async fn handle_list_range(
    manager: &mut ConnectionManager,
    key: String,
    start: isize,
    end: isize,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let result: RedisResult<Vec<String>> = manager.lrange(&key, start, end).await;
    
    match result {
        Ok(elements) => {
            let response = json!({
                "key": key,
                "start": start,
                "end": end,
                "count": elements.len(),
                "elements": elements
            });
            println!("{}", format_output(&response, options.format));
        }
        Err(e) => return Err(anyhow::anyhow!("Failed to get range from list '{}': {}", key, e)),
    }
    
    Ok(())
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();
    let options = CommonOptions::new(cli.format, cli.debug);
    options.setup_debug();
    
    let mut manager = match create_connection_manager(&cli.url).await {
        Ok(manager) => manager,
        Err(e) => handle_error(e, "Failed to create Redis connection manager"),
    };
    
    let result = match cli.command {
        Commands::Set { key, value, expire } => {
            handle_set_command(&mut manager, key, value, expire, &options).await
        }
        Commands::Get { key } => {
            handle_get_command(&mut manager, key, &options).await
        }
        Commands::Delete { keys } => {
            handle_delete_command(&mut manager, keys, &options).await
        }
        Commands::List { pattern, limit } => {
            handle_list_command(&mut manager, pattern, limit, &options).await
        }
        Commands::Expire { key, seconds } => {
            handle_expire_command(&mut manager, key, seconds, &options).await
        }
        Commands::Ttl { key } => {
            handle_ttl_command(&mut manager, key, &options).await
        }
        Commands::Hash { operation } => {
            match operation {
                HashOperation::Get { key, field } => {
                    handle_hash_get(&mut manager, key, field, &options).await
                }
                HashOperation::Set { key, field, value } => {
                    handle_hash_set(&mut manager, key, field, value, &options).await
                }
                HashOperation::GetAll { key } => {
                    handle_hash_getall(&mut manager, key, &options).await
                }
                HashOperation::Delete { key, fields } => {
                    let result: RedisResult<i32> = manager.hdel(&key, &fields).await;
                    match result {
                        Ok(deleted) => {
                            let response = json!({
                                "key": key,
                                "fields_deleted": deleted,
                                "fields_requested": fields.len()
                            });
                            println!("{}", format_output(&response, options.format));
                            Ok(())
                        }
                        Err(e) => Err(anyhow::anyhow!("Failed to delete hash fields: {}", e)),
                    }
                }
            }
        }
        Commands::ListOp { operation } => {
            match operation {
                ListOperation::PushLeft { key, values } => {
                    handle_list_push_left(&mut manager, key, values, &options).await
                }
                ListOperation::PushRight { key, values } => {
                    let result: RedisResult<i32> = manager.rpush(&key, &values).await;
                    match result {
                        Ok(length) => {
                            let response = json!({
                                "key": key,
                                "pushed": values.len(),
                                "new_length": length,
                                "values": values
                            });
                            println!("{}", format_output(&response, options.format));
                            Ok(())
                        }
                        Err(e) => Err(anyhow::anyhow!("Failed to push to right of list '{}': {}", key, e)),
                    }
                }
                ListOperation::PopLeft { key } => {
                    let result: RedisResult<Option<String>> = manager.lpop(&key, None).await;
                    match result {
                        Ok(Some(value)) => {
                            let response = json!({
                                "key": key,
                                "value": value,
                                "operation": "pop_left"
                            });
                            println!("{}", format_output(&response, options.format));
                            Ok(())
                        }
                        Ok(None) => {
                            let response = json!({
                                "key": key,
                                "value": null,
                                "operation": "pop_left",
                                "list_empty": true
                            });
                            println!("{}", format_output(&response, options.format));
                            Ok(())
                        }
                        Err(e) => Err(anyhow::anyhow!("Failed to pop from left of list '{}': {}", key, e)),
                    }
                }
                ListOperation::PopRight { key } => {
                    let result: RedisResult<Option<String>> = manager.rpop(&key, None).await;
                    match result {
                        Ok(Some(value)) => {
                            let response = json!({
                                "key": key,
                                "value": value,
                                "operation": "pop_right"
                            });
                            println!("{}", format_output(&response, options.format));
                            Ok(())
                        }
                        Ok(None) => {
                            let response = json!({
                                "key": key,
                                "value": null,
                                "operation": "pop_right",
                                "list_empty": true
                            });
                            println!("{}", format_output(&response, options.format));
                            Ok(())
                        }
                        Err(e) => Err(anyhow::anyhow!("Failed to pop from right of list '{}': {}", key, e)),
                    }
                }
                ListOperation::Range { key, start, end } => {
                    handle_list_range(&mut manager, key, start, end, &options).await
                }
                ListOperation::Len { key } => {
                    let result: RedisResult<i32> = manager.llen(&key).await;
                    match result {
                        Ok(length) => {
                            let response = json!({
                                "key": key,
                                "length": length
                            });
                            println!("{}", format_output(&response, options.format));
                            Ok(())
                        }
                        Err(e) => Err(anyhow::anyhow!("Failed to get length of list '{}': {}", key, e)),
                    }
                }
            }
        }
        Commands::SetOp { operation } => {
            match operation {
                SetOperation::Add { key, members } => {
                    let result: RedisResult<i32> = manager.sadd(&key, &members).await;
                    match result {
                        Ok(added) => {
                            let response = json!({
                                "key": key,
                                "members_added": added,
                                "members_requested": members.len(),
                                "members": members
                            });
                            println!("{}", format_output(&response, options.format));
                            Ok(())
                        }
                        Err(e) => Err(anyhow::anyhow!("Failed to add members to set '{}': {}", key, e)),
                    }
                }
                SetOperation::Members { key } => {
                    let result: RedisResult<Vec<String>> = manager.smembers(&key).await;
                    match result {
                        Ok(members) => {
                            let response = json!({
                                "key": key,
                                "count": members.len(),
                                "members": members
                            });
                            println!("{}", format_output(&response, options.format));
                            Ok(())
                        }
                        Err(e) => Err(anyhow::anyhow!("Failed to get members of set '{}': {}", key, e)),
                    }
                }
                SetOperation::IsMember { key, member } => {
                    let result: RedisResult<bool> = manager.sismember(&key, &member).await;
                    match result {
                        Ok(is_member) => {
                            let response = json!({
                                "key": key,
                                "member": member,
                                "is_member": is_member
                            });
                            println!("{}", format_output(&response, options.format));
                            Ok(())
                        }
                        Err(e) => Err(anyhow::anyhow!("Failed to check membership in set '{}': {}", key, e)),
                    }
                }
                SetOperation::Remove { key, members } => {
                    let result: RedisResult<i32> = manager.srem(&key, &members).await;
                    match result {
                        Ok(removed) => {
                            let response = json!({
                                "key": key,
                                "members_removed": removed,
                                "members_requested": members.len()
                            });
                            println!("{}", format_output(&response, options.format));
                            Ok(())
                        }
                        Err(e) => Err(anyhow::anyhow!("Failed to remove members from set '{}': {}", key, e)),
                    }
                }
                SetOperation::Card { key } => {
                    let result: RedisResult<i32> = manager.scard(&key).await;
                    match result {
                        Ok(cardinality) => {
                            let response = json!({
                                "key": key,
                                "cardinality": cardinality
                            });
                            println!("{}", format_output(&response, options.format));
                            Ok(())
                        }
                        Err(e) => Err(anyhow::anyhow!("Failed to get cardinality of set '{}': {}", key, e)),
                    }
                }
            }
        }
        Commands::Info { section } => {
            handle_info_command(&mut manager, section, &options).await
        }
        Commands::FlushDb => {
            handle_flushdb_command(&mut manager, &options).await
        }
        Commands::DbSize => {
            handle_dbsize_command(&mut manager, &options).await
        }
        Commands::Health => {
            handle_health_command(&mut manager, &options).await
        }
    };
    
    if let Err(e) = result {
        handle_error(e, "Redis command execution failed");
    }
}
#!/usr/bin/env cargo run --bin postgres --

use clap::{Parser, Subcommand};
use deadpool_postgres::{Config, Pool, Runtime};
use serde_json::{json, Value, Map};
// use std::collections::HashMap; // Unused
use tokio_postgres::{types::ToSql, NoTls, Row};

use code_tools_connectors::shared::{format_output, handle_error, parse_json_arg, // get_env_or_default, // Unused
        OutputFormat, CommonOptions};

/// PostgreSQL database CLI
#[derive(Parser)]
#[command(name = "postgres")]
#[command(about = "High-performance PostgreSQL database connector")]
#[command(version = "1.0.0")]
struct Cli {
    /// Output format (json|text|csv)
    #[arg(short, long, default_value = "json")]
    format: OutputFormat,
    
    /// Enable debug mode
    #[arg(short, long)]
    debug: bool,
    
    /// Database URL
    #[arg(long)]
    database_url: Option<String>,
    
    /// PostgreSQL host
    #[arg(long, default_value = "localhost")]
    host: String,
    
    /// PostgreSQL port
    #[arg(long, default_value = "5432")]
    port: u16,
    
    /// Database name
    #[arg(long, default_value = "code_tools_dev")]
    database: String,
    
    /// Username
    #[arg(long, default_value = "dev_user")]
    user: String,
    
    /// Password
    #[arg(long, default_value = "dev_password_123")]
    password: String,
    
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Execute SELECT queries and data retrieval operations
    Select {
        /// SQL SELECT query to execute
        query: String,
        
        /// Parameter values as JSON array
        #[arg(short, long, default_value = "[]")]
        params: String,
        
        /// Maximum number of rows to return
        #[arg(short, long)]
        limit: Option<i64>,
    },
    
    /// Execute data modification operations (INSERT/UPDATE/DELETE/UPSERT)
    Mutate {
        /// Operation type
        #[command(subcommand)]
        operation: MutateOperation,
    },
    
    /// Execute arbitrary SQL statements
    Execute {
        /// SQL statement to execute
        sql: String,
        
        /// Parameter values as JSON array
        #[arg(short, long, default_value = "[]")]
        params: String,
        
        /// Use transaction
        #[arg(short, long)]
        transactional: bool,
        
        /// Expect rows back
        #[arg(long, default_value = "true")]
        expect_rows: bool,
    },
    
    /// Schema management operations
    Schema {
        #[command(subcommand)]
        operation: SchemaOperation,
    },
    
    /// User and permission management
    Users {
        #[command(subcommand)]
        operation: UserOperation,
    },
    
    /// Database monitoring and statistics
    Monitor {
        #[command(subcommand)]
        operation: MonitorOperation,
    },
    
    /// Export/Import operations
    Transfer {
        #[command(subcommand)]
        operation: TransferOperation,
    },
    
    /// Health check
    Health,
}

#[derive(Subcommand)]
enum MutateOperation {
    /// Insert new records
    Insert {
        /// Table name
        #[arg(short, long)]
        table: String,
        
        /// Data as JSON object or array of objects
        #[arg(short, long)]
        data: String,
        
        /// RETURNING clause
        #[arg(short, long)]
        returning: Option<String>,
    },
    
    /// Update existing records
    Update {
        /// Table name
        #[arg(short, long)]
        table: String,
        
        /// Data to update as JSON object
        #[arg(short, long)]
        data: String,
        
        /// WHERE clause (without WHERE keyword)
        #[arg(short, long)]
        where_clause: String,
        
        /// RETURNING clause
        #[arg(short, long)]
        returning: Option<String>,
    },
    
    /// Delete records
    Delete {
        /// Table name
        #[arg(short, long)]
        table: String,
        
        /// WHERE clause (without WHERE keyword)
        #[arg(short, long)]
        where_clause: String,
    },
}

#[derive(Subcommand)]
enum SchemaOperation {
    /// List tables and their info
    Tables {
        /// Specific table name
        table: Option<String>,
    },
    
    /// Create a new table
    CreateTable {
        /// Table name
        table: String,
        
        /// Column definitions as JSON
        columns: String,
    },
    
    /// List/manage indexes
    Indexes {
        /// Table name filter
        table: Option<String>,
        
        /// Include usage statistics
        #[arg(long)]
        stats: bool,
    },
}

#[derive(Subcommand)]
enum UserOperation {
    /// List users
    List,
    
    /// Create user
    Create {
        /// Username
        username: String,
        
        /// Password
        password: String,
        
        /// Additional options as JSON
        #[arg(short, long, default_value = "{}")]
        options: String,
    },
}

#[derive(Subcommand)]
enum MonitorOperation {
    /// Get database statistics
    Stats,
    
    /// Monitor active connections
    Connections,
    
    /// Show slow queries
    SlowQueries {
        /// Minimum duration in milliseconds
        #[arg(short, long, default_value = "1000")]
        min_duration: f64,
        
        /// Limit results
        #[arg(short, long, default_value = "10")]
        limit: i64,
    },
}

#[derive(Subcommand)]
enum TransferOperation {
    /// Export table data to JSON
    Export {
        /// Table name
        table: String,
        
        /// Output file path
        #[arg(short, long)]
        output: String,
        
        /// WHERE clause filter
        #[arg(short, long)]
        where_clause: Option<String>,
        
        /// Limit rows
        #[arg(short, long)]
        limit: Option<i64>,
    },
}

async fn create_pool(
    database_url: Option<String>,
    host: String,
    port: u16,
    database: String,
    user: String,
    password: String,
) -> Result<Pool, anyhow::Error> {
    let mut cfg = Config::new();
    
    if let Some(_url) = database_url {
        // URL parsing for deadpool-postgres has changed in newer versions
        // For now, fall back to individual parameters
        eprintln!("Warning: URL configuration not supported in this version, using individual parameters");
    } 
    {
        cfg.host = Some(host);
        cfg.port = Some(port);
        cfg.dbname = Some(database);
        cfg.user = Some(user);
        cfg.password = Some(password);
    }
    
    cfg.manager = Some(deadpool_postgres::ManagerConfig {
        recycling_method: deadpool_postgres::RecyclingMethod::Fast,
    });
    
    cfg.create_pool(Some(Runtime::Tokio1), NoTls)
        .map_err(|e| anyhow::anyhow!("Failed to create connection pool: {}", e))
}

fn row_to_json(row: &Row) -> Result<Value, anyhow::Error> {
    let mut obj = Map::new();
    
    for (i, column) in row.columns().iter().enumerate() {
        let value = postgres_value_to_json(row, i, column.type_())?;
        obj.insert(column.name().to_string(), value);
    }
    
    Ok(Value::Object(obj))
}

fn postgres_value_to_json(row: &Row, idx: usize, col_type: &tokio_postgres::types::Type) -> Result<Value, anyhow::Error> {
    use tokio_postgres::types::Type;
    
    if row.try_get::<_, Option<String>>(idx)?.is_none() {
        return Ok(Value::Null);
    }
    
    match *col_type {
        Type::BOOL => Ok(Value::Bool(row.get(idx))),
        Type::INT2 => Ok(Value::Number(serde_json::Number::from(row.get::<_, i16>(idx)))),
        Type::INT4 => Ok(Value::Number(serde_json::Number::from(row.get::<_, i32>(idx)))),
        Type::INT8 => Ok(Value::Number(serde_json::Number::from(row.get::<_, i64>(idx)))),
        Type::FLOAT4 => {
            let val: f32 = row.get(idx);
            Ok(serde_json::Number::from_f64(val as f64)
                .map(Value::Number)
                .unwrap_or(Value::Null))
        },
        Type::FLOAT8 => {
            let val: f64 = row.get(idx);
            Ok(serde_json::Number::from_f64(val)
                .map(Value::Number)
                .unwrap_or(Value::Null))
        },
        Type::TEXT | Type::VARCHAR | Type::CHAR | Type::NAME => {
            Ok(Value::String(row.get(idx)))
        },
        Type::JSON | Type::JSONB => {
            let json_val: serde_json::Value = row.get(idx);
            Ok(json_val)
        },
        Type::UUID => {
            let uuid: uuid::Uuid = row.get(idx);
            Ok(Value::String(uuid.to_string()))
        },
        Type::TIMESTAMP => {
            let ts: chrono::NaiveDateTime = row.get(idx);
            Ok(Value::String(ts.to_string()))
        },
        Type::TIMESTAMPTZ => {
            let ts: chrono::DateTime<chrono::Utc> = row.get(idx);
            Ok(Value::String(ts.to_rfc3339()))
        },
        Type::DATE => {
            let date: chrono::NaiveDate = row.get(idx);
            Ok(Value::String(date.to_string()))
        },
        Type::TIME => {
            let time: chrono::NaiveTime = row.get(idx);
            Ok(Value::String(time.to_string()))
        },
        _ => {
            // Fallback to string representation
            let val: String = row.get(idx);
            Ok(Value::String(val))
        },
    }
}

fn json_to_sql_params(params: &Value) -> Result<Vec<Box<dyn ToSql + Send + Sync>>, anyhow::Error> {
    match params {
        Value::Array(arr) => {
            let mut sql_params: Vec<Box<dyn ToSql + Send + Sync>> = Vec::new();
            
            for value in arr {
                match value {
                    Value::String(s) => sql_params.push(Box::new(s.clone())),
                    Value::Number(n) => {
                        if let Some(i) = n.as_i64() {
                            sql_params.push(Box::new(i));
                        } else if let Some(f) = n.as_f64() {
                            sql_params.push(Box::new(f));
                        } else {
                            return Err(anyhow::anyhow!("Invalid number parameter"));
                        }
                    },
                    Value::Bool(b) => sql_params.push(Box::new(*b)),
                    Value::Null => sql_params.push(Box::new(Option::<String>::None)),
                    _ => return Err(anyhow::anyhow!("Unsupported parameter type")),
                }
            }
            
            Ok(sql_params)
        },
        _ => Err(anyhow::anyhow!("Parameters must be a JSON array")),
    }
}

async fn handle_select_command(
    pool: &Pool,
    query: String,
    params_str: String,
    limit: Option<i64>,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let params_json: Value = parse_json_arg(&params_str, "parameters")?;
    let _sql_params = json_to_sql_params(&params_json)?;
    
    let mut final_query = query;
    if let Some(limit_val) = limit {
        if !final_query.to_uppercase().contains("LIMIT") {
            final_query.push_str(&format!(" LIMIT {}", limit_val));
        }
    }
    
    let client = pool.get().await?;
    let rows = client.query(&final_query, &[]).await?;
    
    let mut results = Vec::new();
    for row in rows {
        results.push(row_to_json(&row)?);
    }
    
    let result_json = Value::Array(results);
    println!("{}", format_output(&result_json, options.format));
    
    Ok(())
}

async fn handle_mutate_insert(
    pool: &Pool,
    table: String,
    data_str: String,
    returning: Option<String>,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let data_json: Value = parse_json_arg(&data_str, "data")?;
    
    let records = match data_json {
        Value::Array(arr) => arr,
        Value::Object(_) => vec![data_json],
        _ => return Err(anyhow::anyhow!("Data must be JSON object or array of objects")),
    };
    
    if records.is_empty() {
        return Err(anyhow::anyhow!("No data to insert"));
    }
    
    // Get column names from first record
    let first_record = records.first().unwrap();
    if let Value::Object(obj) = first_record {
        let columns: Vec<String> = obj.keys().cloned().collect();
        let placeholders: Vec<String> = (1..=columns.len()).map(|i| format!("${}", i)).collect();
        
        let mut insert_query = format!(
            "INSERT INTO {} ({}) VALUES ({})",
            table,
            columns.join(", "),
            placeholders.join(", ")
        );
        
        if let Some(ref ret) = returning {
            insert_query.push_str(&format!(" RETURNING {}", ret));
        }
        
        let client = pool.get().await?;
        let mut results = Vec::new();
        
        for record in records {
            if let Value::Object(record_obj) = record {
                let mut values = Vec::new();
                for col in &columns {
                    let value = record_obj.get(col).cloned().unwrap_or(Value::Null);
                    values.push(value);
                }
                
                if returning.is_some() {
                    let rows = client.query(&insert_query, &[]).await?;
                    for row in rows {
                        results.push(row_to_json(&row)?);
                    }
                } else {
                    client.execute(&insert_query, &[]).await?;
                    results.push(json!({"inserted": true}));
                }
            }
        }
        
        let result_json = Value::Array(results);
        println!("{}", format_output(&result_json, options.format));
    }
    
    Ok(())
}

async fn handle_execute_command(
    pool: &Pool,
    sql: String,
    params_str: String,
    transactional: bool,
    expect_rows: bool,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let params_json: Value = parse_json_arg(&params_str, "parameters")?;
    let _sql_params = json_to_sql_params(&params_json)?;
    
    let mut client = pool.get().await?;
    
    if transactional {
        let transaction = client.transaction().await?;
        
        if expect_rows {
            let rows = transaction.query(&sql, &[]).await?;
            let mut results = Vec::new();
            for row in rows {
                results.push(row_to_json(&row)?);
            }
            transaction.commit().await?;
            
            let result_json = Value::Array(results);
            println!("{}", format_output(&result_json, options.format));
        } else {
            let affected = transaction.execute(&sql, &[]).await?;
            transaction.commit().await?;
            
            let result = json!({"affected_rows": affected});
            println!("{}", format_output(&result, options.format));
        }
    } else {
        if expect_rows {
            let rows = client.query(&sql, &[]).await?;
            let mut results = Vec::new();
            for row in rows {
                results.push(row_to_json(&row)?);
            }
            
            let result_json = Value::Array(results);
            println!("{}", format_output(&result_json, options.format));
        } else {
            let affected = client.execute(&sql, &[]).await?;
            let result = json!({"affected_rows": affected});
            println!("{}", format_output(&result, options.format));
        }
    }
    
    Ok(())
}

async fn handle_schema_tables(
    pool: &Pool,
    table: Option<String>,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let query = if let Some(table_name) = table {
        format!(
            "SELECT 
                table_name,
                table_schema,
                table_type
             FROM information_schema.tables 
             WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
             AND table_name = '{}'
             ORDER BY table_schema, table_name",
            table_name
        )
    } else {
        "SELECT 
            table_name,
            table_schema,
            table_type
         FROM information_schema.tables 
         WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
         ORDER BY table_schema, table_name".to_string()
    };
    
    let client = pool.get().await?;
    let rows = client.query(&query, &[]).await?;
    
    let mut results = Vec::new();
    for row in rows {
        results.push(row_to_json(&row)?);
    }
    
    let result_json = Value::Array(results);
    println!("{}", format_output(&result_json, options.format));
    
    Ok(())
}

async fn handle_health_command(
    pool: &Pool,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let client = pool.get().await?;
    let rows = client.query("SELECT version() as version, current_database() as database", &[]).await?;
    
    if let Some(row) = rows.first() {
        let result = row_to_json(row)?;
        let health = json!({
            "status": "healthy",
            "database_info": result
        });
        println!("{}", format_output(&health, options.format));
    }
    
    Ok(())
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();
    let options = CommonOptions::new(cli.format, cli.debug);
    options.setup_debug();
    
    let pool = match create_pool(
        cli.database_url,
        cli.host,
        cli.port,
        cli.database,
        cli.user,
        cli.password,
    ).await {
        Ok(pool) => pool,
        Err(e) => handle_error(e, "Failed to create database connection pool"),
    };
    
    let result = match cli.command {
        Commands::Select { query, params, limit } => {
            handle_select_command(&pool, query, params, limit, &options).await
        },
        Commands::Mutate { operation } => {
            match operation {
                MutateOperation::Insert { table, data, returning } => {
                    handle_mutate_insert(&pool, table, data, returning, &options).await
                },
                MutateOperation::Update { table: _table, data: _data, where_clause: _where_clause, returning: _returning } => {
                    // This is a simplified implementation - full implementation would parse the data JSON
                    // and construct proper SET clauses
                    Err(anyhow::anyhow!("Update operation not fully implemented yet"))
                },
                MutateOperation::Delete { table, where_clause } => {
                    let delete_query = format!("DELETE FROM {} WHERE {}", table, where_clause);
                    handle_execute_command(&pool, delete_query, "[]".to_string(), false, false, &options).await
                },
            }
        },
        Commands::Execute { sql, params, transactional, expect_rows } => {
            handle_execute_command(&pool, sql, params, transactional, expect_rows, &options).await
        },
        Commands::Schema { operation } => {
            match operation {
                SchemaOperation::Tables { table } => {
                    handle_schema_tables(&pool, table, &options).await
                },
                SchemaOperation::CreateTable { table: _, columns: _ } => {
                    Err(anyhow::anyhow!("Create table operation not implemented yet"))
                },
                SchemaOperation::Indexes { table: _, stats: _ } => {
                    Err(anyhow::anyhow!("Index operations not implemented yet"))
                },
            }
        },
        Commands::Users { operation: _ } => {
            Err(anyhow::anyhow!("User operations not implemented yet"))
        },
        Commands::Monitor { operation: _ } => {
            Err(anyhow::anyhow!("Monitor operations not implemented yet"))
        },
        Commands::Transfer { operation: _ } => {
            Err(anyhow::anyhow!("Transfer operations not implemented yet"))
        },
        Commands::Health => {
            handle_health_command(&pool, &options).await
        },
    };
    
    if let Err(e) = result {
        handle_error(e, "Command execution failed");
    }
}
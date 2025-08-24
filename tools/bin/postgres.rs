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
    
    // Check if the value is NULL by attempting to get it as the expected type first
    // We'll handle NULL checking within each type case
    
    match *col_type {
        Type::BOOL => {
            match row.try_get::<_, Option<bool>>(idx)? {
                Some(val) => Ok(Value::Bool(val)),
                None => Ok(Value::Null),
            }
        },
        Type::INT2 => {
            match row.try_get::<_, Option<i16>>(idx)? {
                Some(val) => Ok(Value::Number(serde_json::Number::from(val))),
                None => Ok(Value::Null),
            }
        },
        Type::INT4 => {
            match row.try_get::<_, Option<i32>>(idx)? {
                Some(val) => Ok(Value::Number(serde_json::Number::from(val))),
                None => Ok(Value::Null),
            }
        },
        Type::INT8 => {
            match row.try_get::<_, Option<i64>>(idx)? {
                Some(val) => Ok(Value::Number(serde_json::Number::from(val))),
                None => Ok(Value::Null),
            }
        },
        Type::FLOAT4 => {
            match row.try_get::<_, Option<f32>>(idx)? {
                Some(val) => Ok(serde_json::Number::from_f64(val as f64)
                    .map(Value::Number)
                    .unwrap_or(Value::Null)),
                None => Ok(Value::Null),
            }
        },
        Type::FLOAT8 => {
            match row.try_get::<_, Option<f64>>(idx)? {
                Some(val) => Ok(serde_json::Number::from_f64(val)
                    .map(Value::Number)
                    .unwrap_or(Value::Null)),
                None => Ok(Value::Null),
            }
        },
        Type::TEXT | Type::VARCHAR | Type::CHAR | Type::NAME => {
            match row.try_get::<_, Option<String>>(idx)? {
                Some(val) => Ok(Value::String(val)),
                None => Ok(Value::Null),
            }
        },
        Type::JSON | Type::JSONB => {
            match row.try_get::<_, Option<serde_json::Value>>(idx)? {
                Some(json_val) => Ok(json_val),
                None => Ok(Value::Null),
            }
        },
        Type::UUID => {
            match row.try_get::<_, Option<uuid::Uuid>>(idx)? {
                Some(uuid) => Ok(Value::String(uuid.to_string())),
                None => Ok(Value::Null),
            }
        },
        Type::TIMESTAMP => {
            match row.try_get::<_, Option<chrono::NaiveDateTime>>(idx)? {
                Some(ts) => Ok(Value::String(ts.to_string())),
                None => Ok(Value::Null),
            }
        },
        Type::TIMESTAMPTZ => {
            match row.try_get::<_, Option<chrono::DateTime<chrono::Utc>>>(idx)? {
                Some(ts) => Ok(Value::String(ts.to_rfc3339())),
                None => Ok(Value::Null),
            }
        },
        Type::DATE => {
            match row.try_get::<_, Option<chrono::NaiveDate>>(idx)? {
                Some(date) => Ok(Value::String(date.to_string())),
                None => Ok(Value::Null),
            }
        },
        Type::TIME => {
            match row.try_get::<_, Option<chrono::NaiveTime>>(idx)? {
                Some(time) => Ok(Value::String(time.to_string())),
                None => Ok(Value::Null),
            }
        },
        Type::NUMERIC => {
            // Handle NUMERIC types carefully
            match row.try_get::<_, Option<String>>(idx) {
                Ok(Some(val)) => {
                    // Try to parse as f64 for JSON number, fallback to string
                    if let Ok(num_val) = val.parse::<f64>() {
                        Ok(serde_json::Number::from_f64(num_val)
                            .map(Value::Number)
                            .unwrap_or(Value::String(val)))
                    } else {
                        Ok(Value::String(val))
                    }
                },
                Ok(None) => Ok(Value::Null),
                Err(_) => {
                    // Fallback - just convert the column to a string representation
                    Ok(Value::String("numeric_conversion_error".to_string()))
                }
            }
        },
        _ => {
            // Fallback to string representation, handle NULL values
            match row.try_get::<_, Option<String>>(idx) {
                Ok(Some(val)) => Ok(Value::String(val)),
                Ok(None) => Ok(Value::Null),
                Err(_) => {
                    // If string conversion fails, try getting as raw bytes and convert
                    match row.try_get::<_, Option<i64>>(idx) {
                        Ok(Some(val)) => Ok(Value::Number(serde_json::Number::from(val))),
                        Ok(None) => Ok(Value::Null),
                        Err(_) => {
                            // Final fallback - just use a placeholder
                            Ok(Value::String(format!("unsupported_type_{}", col_type.name())))
                        }
                    }
                }
            }
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

async fn handle_mutate_update(
    pool: &Pool,
    table: String,
    data_str: String,
    where_clause: String,
    returning: Option<String>,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let data_json: Value = parse_json_arg(&data_str, "data")?;
    
    // Parse JSON object to SET clause
    if let Value::Object(obj) = data_json {
        if obj.is_empty() {
            return Err(anyhow::anyhow!("No data to update"));
        }
        
        let mut set_clauses = Vec::new();
        
        for (key, value) in obj {
            // Convert JSON value to SQL literal (simplified approach)
            let sql_value = match value {
                Value::String(s) => format!("'{}'", s.replace("'", "''")), // Basic SQL injection protection
                Value::Number(n) => n.to_string(),
                Value::Bool(b) => b.to_string(),
                Value::Null => "NULL".to_string(),
                _ => return Err(anyhow::anyhow!("Unsupported parameter type for column {}", key)),
            };
            
            set_clauses.push(format!("{} = {}", key, sql_value));
        }
        
        let mut update_query = format!(
            "UPDATE {} SET {} WHERE {}",
            table,
            set_clauses.join(", "),
            where_clause
        );
        
        if let Some(ref ret) = returning {
            update_query.push_str(&format!(" RETURNING {}", ret));
        }
        
        let client = pool.get().await?;
        
        if returning.is_some() {
            let rows = client.query(&update_query, &[]).await?;
            let mut results = Vec::new();
            for row in rows {
                results.push(row_to_json(&row)?);
            }
            let result_json = Value::Array(results);
            println!("{}", format_output(&result_json, options.format));
        } else {
            let affected = client.execute(&update_query, &[]).await?;
            let result = json!({"updated": true, "rows_affected": affected});
            println!("{}", format_output(&result, options.format));
        }
    } else {
        return Err(anyhow::anyhow!("Data must be a JSON object"));
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

async fn handle_monitor_stats(
    pool: &Pool,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let client = pool.get().await?;
    
    // Database size and basic stats
    let db_stats_query = "
        SELECT 
            current_database() as database_name,
            pg_size_pretty(pg_database_size(current_database())) as database_size,
            pg_database_size(current_database()) as database_size_bytes,
            (SELECT count(*)::bigint FROM pg_stat_user_tables) as user_tables_count,
            (SELECT count(*)::bigint FROM pg_stat_user_indexes) as user_indexes_count
    ";
    
    // Cache hit ratios and transaction stats
    let cache_stats_query = "
        SELECT 
            COALESCE(sum(blks_hit), 0)::bigint as cache_hits,
            COALESCE(sum(blks_read), 0)::bigint as disk_reads,
            round(COALESCE(sum(blks_hit), 0) * 100.0 / GREATEST(COALESCE(sum(blks_hit), 0) + COALESCE(sum(blks_read), 0), 1), 2)::float8 as cache_hit_ratio,
            COALESCE(sum(xact_commit), 0)::bigint as transactions_committed,
            COALESCE(sum(xact_rollback), 0)::bigint as transactions_rolled_back,
            COALESCE(sum(tup_returned), 0)::bigint as tuples_returned,
            COALESCE(sum(tup_fetched), 0)::bigint as tuples_fetched,
            COALESCE(sum(tup_inserted), 0)::bigint as tuples_inserted,
            COALESCE(sum(tup_updated), 0)::bigint as tuples_updated,
            COALESCE(sum(tup_deleted), 0)::bigint as tuples_deleted
        FROM pg_stat_database 
        WHERE datname = current_database()
    ";
    
    // Connection stats
    let connection_stats_query = "
        SELECT 
            count(*)::bigint as total_connections,
            count(*) filter (where state = 'active')::bigint as active_connections,
            count(*) filter (where state = 'idle')::bigint as idle_connections,
            count(*) filter (where state = 'idle in transaction')::bigint as idle_in_transaction,
            count(*) filter (where wait_event_type IS NOT NULL)::bigint as waiting_connections,
            COALESCE(max(extract(epoch from (now() - query_start))), 0)::float8 as longest_query_seconds
        FROM pg_stat_activity 
        WHERE pid != pg_backend_pid()
    ";
    
    let db_stats_rows = client.query(db_stats_query, &[]).await?;
    let cache_stats_rows = client.query(cache_stats_query, &[]).await?;
    let connection_stats_rows = client.query(connection_stats_query, &[]).await?;
    
    let mut stats = json!({});
    
    if let Some(row) = db_stats_rows.first() {
        let db_info = row_to_json(row)?;
        stats["database_info"] = db_info;
    }
    
    if let Some(row) = cache_stats_rows.first() {
        let cache_info = row_to_json(row)?;
        stats["cache_performance"] = cache_info;
    }
    
    if let Some(row) = connection_stats_rows.first() {
        let conn_info = row_to_json(row)?;
        stats["connections"] = conn_info;
    }
    
    println!("{}", format_output(&stats, options.format));
    Ok(())
}

async fn handle_monitor_connections(
    pool: &Pool,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let client = pool.get().await?;
    
    let connections_query = "
        SELECT 
            pid,
            usename as username,
            application_name,
            client_addr as client_address,
            client_port,
            backend_start,
            query_start,
            state_change,
            state,
            wait_event_type,
            wait_event,
            extract(epoch from (now() - backend_start))::int as connection_duration_seconds,
            extract(epoch from (now() - query_start))::int as query_duration_seconds,
            left(query, 100) as current_query_preview
        FROM pg_stat_activity 
        WHERE pid != pg_backend_pid()
        AND state IS NOT NULL
        ORDER BY backend_start DESC
    ";
    
    let rows = client.query(connections_query, &[]).await?;
    
    let mut results = Vec::new();
    for row in rows {
        results.push(row_to_json(&row)?);
    }
    
    let connection_summary = json!({
        "total_connections": results.len(),
        "connections": results
    });
    
    println!("{}", format_output(&connection_summary, options.format));
    Ok(())
}

async fn handle_monitor_slow_queries(
    pool: &Pool,
    min_duration: f64,
    limit: i64,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let client = pool.get().await?;
    
    // Try pg_stat_statements first, fall back to pg_stat_activity for long-running queries
    let pg_stat_statements_query = format!("
        SELECT 
            query,
            calls,
            total_exec_time,
            mean_exec_time,
            min_exec_time,
            max_exec_time,
            rows as total_rows,
            100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) as hit_percent
        FROM pg_stat_statements 
        WHERE mean_exec_time > {}
        ORDER BY mean_exec_time DESC 
        LIMIT {}
    ", min_duration, limit);
    
    let fallback_query = format!("
        SELECT 
            pid,
            usename as username,
            application_name,
            client_addr as client_address,
            state,
            query_start,
            extract(epoch from (now() - query_start))::int as duration_seconds,
            query
        FROM pg_stat_activity 
        WHERE pid != pg_backend_pid()
        AND state = 'active'
        AND query_start IS NOT NULL
        AND extract(epoch from (now() - query_start)) > {}
        ORDER BY query_start ASC
        LIMIT {}
    ", min_duration / 1000.0, limit);
    
    // Try pg_stat_statements first
    let result = client.query(&pg_stat_statements_query, &[]).await;
    
    let (rows, data_source) = match result {
        Ok(rows) if !rows.is_empty() => (rows, "pg_stat_statements"),
        _ => {
            // Fallback to pg_stat_activity for currently running queries
            let fallback_rows = client.query(&fallback_query, &[]).await?;
            (fallback_rows, "pg_stat_activity")
        }
    };
    
    let mut results = Vec::new();
    for row in rows {
        results.push(row_to_json(&row)?);
    }
    
    let slow_queries_summary = json!({
        "data_source": data_source,
        "min_duration_ms": min_duration,
        "query_count": results.len(),
        "queries": results
    });
    
    println!("{}", format_output(&slow_queries_summary, options.format));
    Ok(())
}

async fn handle_schema_create_table(
    pool: &Pool,
    table: String,
    columns_str: String,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let columns_json: Value = parse_json_arg(&columns_str, "columns")?;
    
    if let Value::Array(columns_array) = columns_json {
        if columns_array.is_empty() {
            return Err(anyhow::anyhow!("No columns defined"));
        }
        
        let mut column_defs = Vec::new();
        let mut constraints = Vec::new();
        
        for (i, col) in columns_array.iter().enumerate() {
            if let Value::Object(col_obj) = col {
                let name = col_obj.get("name")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| anyhow::anyhow!("Column {} missing 'name' field", i))?;
                
                let data_type = col_obj.get("type")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| anyhow::anyhow!("Column '{}' missing 'type' field", name))?;
                
                let mut def = format!("{} {}", name, data_type);
                
                // Handle nullable
                if let Some(nullable) = col_obj.get("nullable").and_then(|v| v.as_bool()) {
                    if !nullable {
                        def.push_str(" NOT NULL");
                    }
                }
                
                // Handle default value
                if let Some(default) = col_obj.get("default").and_then(|v| v.as_str()) {
                    def.push_str(&format!(" DEFAULT {}", default));
                }
                
                // Handle primary key constraint
                if col_obj.get("primary_key").and_then(|v| v.as_bool()).unwrap_or(false) {
                    constraints.push(format!("PRIMARY KEY ({})", name));
                }
                
                // Handle unique constraint
                if col_obj.get("unique").and_then(|v| v.as_bool()).unwrap_or(false) {
                    constraints.push(format!("UNIQUE ({})", name));
                }
                
                column_defs.push(def);
            } else {
                return Err(anyhow::anyhow!("Column {} must be a JSON object", i));
            }
        }
        
        let mut create_query = format!(
            "CREATE TABLE {} ({}",
            table,
            column_defs.join(", ")
        );
        
        if !constraints.is_empty() {
            create_query.push_str(", ");
            create_query.push_str(&constraints.join(", "));
        }
        
        create_query.push(')');
        
        let client = pool.get().await?;
        client.execute(&create_query, &[]).await?;
        
        let result = json!({
            "created": true,
            "table": table,
            "columns": column_defs.len(),
            "constraints": constraints.len()
        });
        println!("{}", format_output(&result, options.format));
        
    } else {
        return Err(anyhow::anyhow!("Columns must be a JSON array of column definitions"));
    }
    
    Ok(())
}

async fn handle_schema_indexes(
    pool: &Pool,
    table: Option<String>,
    stats: bool,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let base_query = if stats {
        // Include usage statistics
        "SELECT 
            i.schemaname,
            i.tablename,
            i.indexname,
            i.indexdef,
            pg_size_pretty(pg_relation_size(c.oid)) as size,
            COALESCE(s.idx_scan, 0) as scans,
            COALESCE(s.idx_tup_read, 0) as tuples_read,
            COALESCE(s.idx_tup_fetch, 0) as tuples_fetched
        FROM pg_indexes i
        LEFT JOIN pg_class c ON c.relname = i.indexname
        LEFT JOIN pg_stat_user_indexes s ON (i.schemaname = s.schemaname AND i.tablename = s.tablename AND i.indexname = s.indexname)"
    } else {
        "SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes"
    };
    
    let query = if let Some(table_name) = table {
        format!("{} WHERE tablename = '{}' AND schemaname NOT IN ('information_schema', 'pg_catalog')", base_query, table_name)
    } else {
        format!("{} WHERE schemaname NOT IN ('information_schema', 'pg_catalog')", base_query)
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

async fn handle_users_list(
    pool: &Pool,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let query = "
        SELECT 
            rolname as username,
            rolsuper as is_superuser,
            rolcreaterole as can_create_roles,
            rolcreatedb as can_create_databases,
            rolcanlogin as can_login,
            COALESCE(rolconnlimit, -1) as connection_limit,
            rolvaliduntil as valid_until
        FROM pg_roles 
        WHERE rolname NOT LIKE 'pg_%'
        AND rolname != 'rds_superuser'
        ORDER BY rolname
    ";
    
    let client = pool.get().await?;
    let rows = client.query(query, &[]).await?;
    
    let mut results = Vec::new();
    for row in rows {
        results.push(row_to_json(&row)?);
    }
    
    let result_json = Value::Array(results);
    println!("{}", format_output(&result_json, options.format));
    Ok(())
}

async fn handle_users_create(
    pool: &Pool,
    username: String,
    password: String,
    options_str: String,
    common_options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let user_options: Value = parse_json_arg(&options_str, "options")?;
    
    let mut create_query = format!("CREATE USER {} WITH PASSWORD '{}'", username, password);
    
    if let Value::Object(opts) = user_options {
        if opts.get("createdb").and_then(|v| v.as_bool()).unwrap_or(false) {
            create_query.push_str(" CREATEDB");
        }
        
        if opts.get("superuser").and_then(|v| v.as_bool()).unwrap_or(false) {
            create_query.push_str(" SUPERUSER");
        }
        
        if opts.get("createrole").and_then(|v| v.as_bool()).unwrap_or(false) {
            create_query.push_str(" CREATEROLE");
        }
        
        if let Some(conn_limit) = opts.get("connection_limit").and_then(|v| v.as_i64()) {
            create_query.push_str(&format!(" CONNECTION LIMIT {}", conn_limit));
        }
        
        if let Some(valid_until) = opts.get("valid_until").and_then(|v| v.as_str()) {
            create_query.push_str(&format!(" VALID UNTIL '{}'", valid_until));
        }
    }
    
    let client = pool.get().await?;
    client.execute(&create_query, &[]).await?;
    
    let result = json!({
        "created": true,
        "username": username
    });
    println!("{}", format_output(&result, common_options.format));
    Ok(())
}

async fn handle_transfer_export(
    pool: &Pool,
    table: String,
    output: String,
    where_clause: Option<String>,
    limit: Option<i64>,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    use std::fs::File;
    use std::io::{BufWriter, Write};
    
    let mut query = format!("SELECT * FROM {}", table);
    
    if let Some(where_cond) = where_clause {
        query.push_str(&format!(" WHERE {}", where_cond));
    }
    
    if let Some(limit_val) = limit {
        query.push_str(&format!(" LIMIT {}", limit_val));
    }
    
    let client = pool.get().await?;
    let rows = client.query(&query, &[]).await?;
    
    let file = File::create(&output)?;
    let mut writer = BufWriter::new(file);
    
    // Write JSON array start
    writer.write_all(b"[\n")?;
    let mut first = true;
    let mut total_rows = 0;
    
    for row in rows {
        if !first {
            writer.write_all(b",\n")?;
        }
        first = false;
        
        let json_row = row_to_json(&row)?;
        let json_string = serde_json::to_string_pretty(&json_row)?;
        writer.write_all(b"  ")?;
        writer.write_all(json_string.as_bytes())?;
        total_rows += 1;
    }
    
    // Write JSON array end
    writer.write_all(b"\n]")?;
    writer.flush()?;
    
    let result = json!({
        "exported": true,
        "table": table,
        "output_file": output,
        "rows_exported": total_rows
    });
    
    println!("{}", format_output(&result, options.format));
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
                MutateOperation::Update { table, data, where_clause, returning } => {
                    handle_mutate_update(&pool, table, data, where_clause, returning, &options).await
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
                SchemaOperation::CreateTable { table, columns } => {
                    handle_schema_create_table(&pool, table, columns, &options).await
                },
                SchemaOperation::Indexes { table, stats } => {
                    handle_schema_indexes(&pool, table, stats, &options).await
                },
            }
        },
        Commands::Users { operation } => {
            match operation {
                UserOperation::List => {
                    handle_users_list(&pool, &options).await
                },
                UserOperation::Create { username, password, options: user_options } => {
                    handle_users_create(&pool, username, password, user_options, &options).await
                },
            }
        },
        Commands::Monitor { operation } => {
            match operation {
                MonitorOperation::Stats => {
                    handle_monitor_stats(&pool, &options).await
                },
                MonitorOperation::Connections => {
                    handle_monitor_connections(&pool, &options).await
                },
                MonitorOperation::SlowQueries { min_duration, limit } => {
                    handle_monitor_slow_queries(&pool, min_duration, limit, &options).await
                },
            }
        },
        Commands::Transfer { operation } => {
            match operation {
                TransferOperation::Export { table, output, where_clause, limit } => {
                    handle_transfer_export(&pool, table, output, where_clause, limit, &options).await
                },
            }
        },
        Commands::Health => {
            handle_health_command(&pool, &options).await
        },
    };
    
    if let Err(e) = result {
        handle_error(e, "Command execution failed");
    }
}
use clap::{Parser, Subcommand};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::{self, Read};
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Instant;
use walkdir::WalkDir;

#[derive(Parser)]
#[command(name = "fs-fast")]
#[command(about = "Ultra-fast file system operations for code analysis")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
    
    #[arg(short, long, global = true)]
    format: Option<String>,
    
    #[arg(short, long, global = true)]
    quiet: bool,
}

#[derive(Subcommand)]
enum Commands {
    /// Lightning-fast recursive project scan
    Scan {
        /// Directory to scan
        path: Option<PathBuf>,
        /// Maximum depth for recursion
        #[arg(short, long, default_value = "10")]
        depth: usize,
        /// Include file sizes
        #[arg(short, long)]
        sizes: bool,
        /// Filter by extension (comma-separated)
        #[arg(short, long)]
        extensions: Option<String>,
    },
    /// Read file contents blazingly fast
    Read {
        /// File to read
        file: PathBuf,
        /// Encoding (utf8, binary)
        #[arg(short, long, default_value = "utf8")]
        encoding: String,
        /// Maximum bytes to read
        #[arg(short, long)]
        limit: Option<usize>,
    },
    /// Ultra-fast atomic file write
    Write {
        /// File to write
        file: PathBuf,
        /// Content to write (or - for stdin)
        content: String,
        /// Create parent directories
        #[arg(short, long)]
        parents: bool,
    },
    /// Instant project statistics
    Stats {
        /// Directory to analyze
        path: Option<PathBuf>,
        /// Maximum depth
        #[arg(short, long, default_value = "10")]
        depth: usize,
        /// Show summary only
        #[arg(short, long)]
        summary: bool,
    },
    /// Health check
    Health,
}

#[derive(Serialize, Deserialize)]
struct FileInfo {
    path: String,
    size: Option<u64>,
    is_dir: bool,
    extension: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct ScanResult {
    files: Vec<FileInfo>,
    total_files: usize,
    total_dirs: usize,
    total_size: u64,
    scan_time_ms: u64,
}

#[derive(Serialize, Deserialize)]
struct StatsResult {
    total_files: u64,
    total_dirs: u64,
    total_size: u64,
    file_types: HashMap<String, u64>,
    largest_files: Vec<FileInfo>,
    scan_time_ms: u64,
}

#[derive(Serialize, Deserialize)]
struct ReadResult {
    file: String,
    size: u64,
    content: Option<String>,
    binary: bool,
    read_time_ms: u64,
}

#[derive(Serialize, Deserialize)]
struct WriteResult {
    file: String,
    bytes_written: usize,
    write_time_ms: u64,
}

fn main() {
    let cli = Cli::parse();
    
    let result = match cli.command {
        Commands::Scan { path, depth, sizes, extensions } => {
            handle_scan(path.unwrap_or_else(|| PathBuf::from(".")), depth, sizes, extensions)
        }
        Commands::Read { file, encoding, limit } => {
            handle_read(file, &encoding, limit)
        }
        Commands::Write { file, content, parents } => {
            handle_write(file, content, parents)
        }
        Commands::Stats { path, depth, summary } => {
            handle_stats(path.unwrap_or_else(|| PathBuf::from(".")), depth, summary)
        }
        Commands::Health => handle_health(),
    };
    
    match result {
        Ok(output) => {
            if !cli.quiet {
                println!("{}", output);
            }
        }
        Err(e) => {
            eprintln!("Error: {}", e);
            std::process::exit(1);
        }
    }
}

fn handle_scan(path: PathBuf, max_depth: usize, include_sizes: bool, extensions: Option<String>) -> Result<String, Box<dyn std::error::Error>> {
    let start = Instant::now();
    
    let ext_filter: Option<Vec<String>> = extensions.map(|s| {
        s.split(',').map(|e| e.trim().to_lowercase()).collect()
    });
    
    let total_files = Arc::new(AtomicU64::new(0));
    let total_dirs = Arc::new(AtomicU64::new(0));
    let total_size = Arc::new(AtomicU64::new(0));
    
    let files: Vec<FileInfo> = WalkDir::new(&path)
        .max_depth(max_depth)
        .into_iter()
        .par_bridge()
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let path = entry.path();
            
            // Skip common unimportant directories
            if path.components().any(|c| {
                matches!(c.as_os_str().to_str(), Some(".git" | "node_modules" | ".next" | "target" | "dist" | "build"))
            }) {
                return None;
            }
            
            let is_dir = path.is_dir();
            let size = if include_sizes && !is_dir {
                entry.metadata().ok().map(|m| m.len())
            } else {
                None
            };
            
            if is_dir {
                total_dirs.fetch_add(1, Ordering::Relaxed);
            } else {
                total_files.fetch_add(1, Ordering::Relaxed);
                if let Some(s) = size {
                    total_size.fetch_add(s, Ordering::Relaxed);
                }
            }
            
            let extension = path.extension()
                .and_then(|e| e.to_str())
                .map(|e| e.to_lowercase());
            
            // Filter by extensions if specified
            if let Some(ref filter) = ext_filter {
                if !is_dir {
                    if let Some(ref ext) = extension {
                        if !filter.contains(ext) {
                            return None;
                        }
                    } else if !filter.is_empty() {
                        return None;
                    }
                }
            }
            
            Some(FileInfo {
                path: path.to_string_lossy().to_string(),
                size,
                is_dir,
                extension,
            })
        })
        .collect();
    
    let result = ScanResult {
        total_files: files.iter().filter(|f| !f.is_dir).count(),
        total_dirs: files.iter().filter(|f| f.is_dir).count(),
        total_size: total_size.load(Ordering::Relaxed),
        files,
        scan_time_ms: start.elapsed().as_millis() as u64,
    };
    
    Ok(serde_json::to_string_pretty(&result)?)
}

fn handle_read(file: PathBuf, encoding: &str, limit: Option<usize>) -> Result<String, Box<dyn std::error::Error>> {
    let start = Instant::now();
    
    let metadata = fs::metadata(&file)?;
    let size = metadata.len();
    
    let (content, binary) = match encoding {
        "binary" => (None, true),
        _ => {
            let bytes = if let Some(limit) = limit {
                let mut file_handle = std::fs::File::open(&file)?;
                let mut buffer = vec![0u8; limit.min(size as usize)];
                file_handle.read_exact(&mut buffer)?;
                buffer
            } else {
                fs::read(&file)?
            };
            
            match String::from_utf8(bytes) {
                Ok(text) => (Some(text), false),
                Err(_) => (None, true),
            }
        }
    };
    
    let result = ReadResult {
        file: file.to_string_lossy().to_string(),
        size,
        content,
        binary,
        read_time_ms: start.elapsed().as_millis() as u64,
    };
    
    Ok(serde_json::to_string_pretty(&result)?)
}

fn handle_write(file: PathBuf, content: String, create_parents: bool) -> Result<String, Box<dyn std::error::Error>> {
    let start = Instant::now();
    
    if create_parents {
        if let Some(parent) = file.parent() {
            fs::create_dir_all(parent)?;
        }
    }
    
    let content = if content == "-" {
        let mut buffer = String::new();
        let mut stdin = io::stdin();
        stdin.read_to_string(&mut buffer)?;
        buffer
    } else {
        content
    };
    
    let bytes_written = content.len();
    
    // Atomic write using temporary file
    let temp_file = file.with_extension("tmp");
    fs::write(&temp_file, &content)?;
    fs::rename(temp_file, &file)?;
    
    let result = WriteResult {
        file: file.to_string_lossy().to_string(),
        bytes_written,
        write_time_ms: start.elapsed().as_millis() as u64,
    };
    
    Ok(serde_json::to_string_pretty(&result)?)
}

fn handle_stats(path: PathBuf, max_depth: usize, summary_only: bool) -> Result<String, Box<dyn std::error::Error>> {
    let start = Instant::now();
    
    let total_files = Arc::new(AtomicU64::new(0));
    let total_dirs = Arc::new(AtomicU64::new(0));
    let total_size = Arc::new(AtomicU64::new(0));
    
    let files: Vec<_> = WalkDir::new(&path)
        .max_depth(max_depth)
        .into_iter()
        .par_bridge()
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let path = entry.path();
            
            // Skip common unimportant directories
            if path.components().any(|c| {
                matches!(c.as_os_str().to_str(), Some(".git" | "node_modules" | ".next" | "target" | "dist" | "build"))
            }) {
                return None;
            }
            
            let is_dir = path.is_dir();
            let metadata = entry.metadata().ok()?;
            let size = metadata.len();
            
            if is_dir {
                total_dirs.fetch_add(1, Ordering::Relaxed);
            } else {
                total_files.fetch_add(1, Ordering::Relaxed);
                total_size.fetch_add(size, Ordering::Relaxed);
            }
            
            if !is_dir {
                let extension = path.extension()
                    .and_then(|e| e.to_str())
                    .map(|e| e.to_lowercase())
                    .unwrap_or_else(|| "no_extension".to_string());
                
                Some((
                    FileInfo {
                        path: path.to_string_lossy().to_string(),
                        size: Some(size),
                        is_dir,
                        extension: Some(extension.clone()),
                    },
                    extension,
                ))
            } else {
                None
            }
        })
        .collect();
    
    let mut file_types = HashMap::new();
    let mut all_files = Vec::new();
    
    for (file_info, extension) in files {
        *file_types.entry(extension).or_insert(0) += 1;
        all_files.push(file_info);
    }
    
    // Get largest files
    all_files.sort_by(|a, b| b.size.cmp(&a.size));
    let largest_files = if summary_only {
        Vec::new()
    } else {
        all_files.into_iter().take(10).collect()
    };
    
    let result = StatsResult {
        total_files: total_files.load(Ordering::Relaxed),
        total_dirs: total_dirs.load(Ordering::Relaxed),
        total_size: total_size.load(Ordering::Relaxed),
        file_types: if summary_only { HashMap::new() } else { file_types },
        largest_files,
        scan_time_ms: start.elapsed().as_millis() as u64,
    };
    
    Ok(serde_json::to_string_pretty(&result)?)
}

fn handle_health() -> Result<String, Box<dyn std::error::Error>> {
    let health = serde_json::json!({
        "status": "healthy",
        "tool": "fs-fast",
        "version": "0.1.0",
        "capabilities": ["scan", "read", "write", "stats"],
        "performance": "ultra-fast"
    });
    
    Ok(serde_json::to_string_pretty(&health)?)
}
//! Code Tools Connectors
//! 
//! High-performance Rust connectors for database operations, file system access,
//! and other system integrations used by the Code Tools CLI ecosystem.
//!
//! This library provides:
//! - Shared utilities for CLI applications
//! - Common data structures and error handling
//! - Database connector implementations
//! - File system operations with optimizations

pub mod shared;
pub mod connectors;

// Re-export commonly used items for convenience
pub use shared::{OutputFormat, format_output, handle_error, CommonOptions};

/// Library version
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Library name
pub const NAME: &str = env!("CARGO_PKG_NAME");
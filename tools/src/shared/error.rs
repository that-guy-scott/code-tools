/// Handle CLI errors consistently across all connectors
pub fn handle_error(error: anyhow::Error, message: &str) -> ! {
    eprintln!("Error: {}", message);
    eprintln!("Details: {}", error);
    
    // Show debug info if DEBUG env var is set
    if std::env::var("DEBUG").is_ok() {
        eprintln!("Debug trace:");
        error.chain().skip(1).for_each(|cause| eprintln!("  Caused by: {}", cause));
    }
    
    std::process::exit(1);
}
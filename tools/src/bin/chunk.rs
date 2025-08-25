use std::fs;
use std::path::Path;
use clap::{Parser, Subcommand, ValueEnum};
use anyhow::{Context, Result};
use serde::{Serialize, Deserialize};
use serde_json::json;
use unicode_segmentation::UnicodeSegmentation;
use reqwest::Client;
use tokio;

use code_tools_connectors::shared::{OutputFormat, format_output};

/// High-performance text chunking tool with AI-powered semantic analysis
#[derive(Parser)]
#[command(name = "chunk")]
#[command(about = "🦀 High-performance text chunking with AI-powered semantic analysis via Ollama + Nomic embeddings")]
#[command(long_about = "
USAGE:
    chunk <SUBCOMMAND> [OPTIONS]

STRATEGIES:
    semantic   AI-powered chunking using Ollama + Nomic embeddings
    smart      Hybrid: semantic analysis with size constraints
    sentence   Sentence-aware chunking (Unicode support)
    paragraph  Paragraph-based chunking (for structured docs)
    code       Code-aware chunking (function/class boundaries)
    fixed      Fixed-size chunks with configurable overlap

KEY FEATURES:
    - Unicode-safe text processing (emojis, international)
    - Multiple output formats: json, text, csv
    - Batch processing for directories
    - Rich metadata and performance tracking
    - Comprehensive error handling

**Examples:**
  # Semantic chunking with Ollama + Nomic embeddings
  chunk text \"document content...\" --strategy semantic --model nomic-embed-text
  
  # Smart hybrid approach  
  chunk file document.md --strategy smart --size 1000 --threshold 0.8
  
  # Traditional sentence chunking
  chunk text \"content...\" --strategy sentence --format json
  
  # Code-aware chunking
  chunk file code.rs --strategy code --size 800
  
  # Batch processing
  chunk batch ./docs --pattern \"*.md\" --strategy paragraph --output-dir chunks

**Requirements for Semantic Chunking:**
• Ollama running on localhost:11434
• nomic-embed-text model: `ollama pull nomic-embed-text`
")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Chunk text content directly
    Text {
        /// Text content to chunk
        content: String,
        
        /// Chunking strategy: fixed, sentence, paragraph, code, semantic, smart
        #[arg(long, short = 's', default_value = "fixed")]
        strategy: ChunkStrategy,
        
        /// Target chunk size in characters (semantic strategy may vary)
        #[arg(long, default_value = "500")]
        size: usize,
        
        /// Character overlap between adjacent chunks (ignored by semantic)
        #[arg(long, default_value = "50")]
        overlap: usize,
        
        /// Output format
        #[arg(long, short = 'f', default_value = "json")]
        format: OutputFormat,
        
        /// Ollama model for semantic embeddings (use 'ollama pull nomic-embed-text' first)
        #[arg(long, default_value = "nomic-embed-text")]
        model: String,
        
        /// Ollama API endpoint URL (ensure Ollama is running for semantic chunking)
        #[arg(long, default_value = "http://localhost:11434")]
        ollama_url: String,
        
        /// Semantic similarity threshold: higher = fewer, larger chunks (0.0-1.0)
        #[arg(long, default_value = "0.8")]
        threshold: f32,
    },
    
    /// Chunk text from file
    File {
        /// Input file path
        path: String,
        
        /// Chunking strategy: fixed, sentence, paragraph, code, semantic, smart
        #[arg(long, short = 's', default_value = "fixed")]
        strategy: ChunkStrategy,
        
        /// Target chunk size in characters (semantic strategy may vary)
        #[arg(long, default_value = "500")]
        size: usize,
        
        /// Character overlap between adjacent chunks (ignored by semantic)
        #[arg(long, default_value = "50")]
        overlap: usize,
        
        /// Output format
        #[arg(long, short = 'f', default_value = "json")]
        format: OutputFormat,
        
        /// Output file path (writes to stdout if not specified)
        #[arg(long, short = 'o')]
        output: Option<String>,
        
        /// Ollama model for semantic embeddings (use 'ollama pull nomic-embed-text' first)
        #[arg(long, default_value = "nomic-embed-text")]
        model: String,
        
        /// Ollama API endpoint URL (ensure Ollama is running for semantic chunking)
        #[arg(long, default_value = "http://localhost:11434")]
        ollama_url: String,
        
        /// Semantic similarity threshold: higher = fewer, larger chunks (0.0-1.0)
        #[arg(long, default_value = "0.8")]
        threshold: f32,
    },
    
    /// Batch process multiple files
    Batch {
        /// Directory path containing files to chunk
        dir: String,
        
        /// File pattern/extension filter (e.g., "*.txt", "*.md", "*.rs")
        #[arg(long, short = 'p', default_value = "*")]
        pattern: String,
        
        /// Chunking strategy: fixed, sentence, paragraph, code, semantic, smart
        #[arg(long, short = 's', default_value = "fixed")]
        strategy: ChunkStrategy,
        
        /// Target chunk size in characters (semantic strategy may vary)
        #[arg(long, default_value = "500")]
        size: usize,
        
        /// Character overlap between adjacent chunks (ignored by semantic)
        #[arg(long, default_value = "50")]
        overlap: usize,
        
        /// Output format
        #[arg(long, short = 'f', default_value = "json")]
        format: OutputFormat,
        
        /// Output directory for chunked files (created if doesn't exist)
        #[arg(long, short = 'o', default_value = "chunks")]
        output_dir: String,
        
        /// Ollama model for semantic embeddings (use 'ollama pull nomic-embed-text' first)
        #[arg(long, default_value = "nomic-embed-text")]
        model: String,
        
        /// Ollama API endpoint URL (ensure Ollama is running for semantic chunking)
        #[arg(long, default_value = "http://localhost:11434")]
        ollama_url: String,
        
        /// Semantic similarity threshold: higher = fewer, larger chunks (0.0-1.0)
        #[arg(long, default_value = "0.8")]
        threshold: f32,
    },
}

#[derive(Clone, Debug, ValueEnum)]
enum ChunkStrategy {
    /// Fixed-size character chunks with configurable overlap (fastest, simple)
    Fixed,
    /// Sentence-aware chunking preserving natural language boundaries
    Sentence,
    /// Paragraph-aware chunking for structured documents (markdown, articles)
    Paragraph,
    /// Code-aware chunking respecting function/class boundaries (programming files)
    Code,
    /// AI-powered semantic chunking using Ollama + Nomic embeddings (requires Ollama)
    Semantic,
    /// Smart hybrid combining semantic analysis with size constraints (best of both)
    Smart,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Chunk {
    /// Chunk content
    content: String,
    /// Start position in original text
    start: usize,
    /// End position in original text
    end: usize,
    /// Chunk index/number
    index: usize,
    /// Size in characters
    size: usize,
    /// Overlap with previous chunk
    overlap: usize,
    /// Strategy used to create this chunk
    strategy: String,
    /// Optional semantic similarity score
    similarity: Option<f32>,
    /// Optional embedding vector
    embedding: Option<Vec<f32>>,
    /// Source information (filename, line numbers, etc.)
    source: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
struct ChunkingResult {
    /// List of text chunks
    chunks: Vec<Chunk>,
    /// Total number of chunks
    total_chunks: usize,
    /// Original text length
    original_length: usize,
    /// Strategy used
    strategy: String,
    /// Chunking parameters
    parameters: ChunkingParameters,
    /// Processing metadata
    metadata: ProcessingMetadata,
}

#[derive(Serialize, Deserialize, Debug)]
struct ChunkingParameters {
    chunk_size: usize,
    overlap: usize,
    threshold: Option<f32>,
    model: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
struct ProcessingMetadata {
    processing_time_ms: u64,
    total_size: usize,
    average_chunk_size: f32,
    embeddings_used: bool,
    source_file: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
struct OllamaEmbedRequest {
    model: String,
    prompt: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct OllamaEmbedResponse {
    embedding: Vec<f32>,
}

struct TextChunker {
    client: Client,
    ollama_url: String,
}

impl TextChunker {
    fn new(ollama_url: String) -> Self {
        Self {
            client: Client::new(),
            ollama_url,
        }
    }
    
    async fn chunk_text(
        &self,
        text: &str,
        strategy: ChunkStrategy,
        size: usize,
        overlap: usize,
        model: &str,
        threshold: f32,
        source: Option<String>,
    ) -> Result<ChunkingResult> {
        let start_time = std::time::Instant::now();
        
        let chunks = match strategy {
            ChunkStrategy::Fixed => self.chunk_fixed(text, size, overlap),
            ChunkStrategy::Sentence => self.chunk_sentence(text, size, overlap),
            ChunkStrategy::Paragraph => self.chunk_paragraph(text, size, overlap),
            ChunkStrategy::Code => self.chunk_code(text, size, overlap),
            ChunkStrategy::Semantic => self.chunk_semantic(text, size, model, threshold).await?,
            ChunkStrategy::Smart => self.chunk_smart(text, size, overlap, model, threshold).await?,
        };
        
        let processing_time = start_time.elapsed();
        let total_chunks = chunks.len();
        let average_chunk_size = if total_chunks > 0 {
            chunks.iter().map(|c| c.size).sum::<usize>() as f32 / total_chunks as f32
        } else {
            0.0
        };
        
        let embeddings_used = matches!(strategy, ChunkStrategy::Semantic | ChunkStrategy::Smart);
        
        Ok(ChunkingResult {
            chunks,
            total_chunks,
            original_length: text.len(),
            strategy: format!("{:?}", strategy).to_lowercase(),
            parameters: ChunkingParameters {
                chunk_size: size,
                overlap,
                threshold: if embeddings_used { Some(threshold) } else { None },
                model: if embeddings_used { Some(model.to_string()) } else { None },
            },
            metadata: ProcessingMetadata {
                processing_time_ms: processing_time.as_millis() as u64,
                total_size: text.len(),
                average_chunk_size,
                embeddings_used,
                source_file: source,
            },
        })
    }
    
    fn chunk_fixed(&self, text: &str, size: usize, overlap: usize) -> Vec<Chunk> {
        let mut chunks = Vec::new();
        let text_chars: Vec<char> = text.chars().collect();
        let total_chars = text_chars.len();
        
        if total_chars == 0 {
            return chunks;
        }
        
        let mut start = 0;
        let mut index = 0;
        
        loop {
            let end = std::cmp::min(start + size, total_chars);
            let content: String = text_chars[start..end].iter().collect();
            
            let actual_overlap = if index > 0 { 
                std::cmp::min(overlap, end - start) 
            } else { 
                0 
            };
            
            chunks.push(Chunk {
                content,
                start,
                end,
                index,
                size: end - start,
                overlap: actual_overlap,
                strategy: "fixed".to_string(),
                similarity: None,
                embedding: None,
                source: None,
            });
            
            if end >= total_chars {
                break;
            }
            
            // Move start position forward, ensuring progress
            let step = if size > overlap { size - overlap } else { 1 };
            start = std::cmp::min(start + step, total_chars);
            
            if start >= total_chars {
                break;
            }
            
            index += 1;
        }
        
        chunks
    }
    
    fn chunk_sentence(&self, text: &str, target_size: usize, _overlap: usize) -> Vec<Chunk> {
        let sentences: Vec<&str> = text.unicode_sentences().collect();
        let mut chunks = Vec::new();
        let mut current_chunk = String::new();
        let mut current_sentences = Vec::new();
        let mut index = 0;
        
        for sentence in sentences {
            if current_chunk.chars().count() + sentence.chars().count() > target_size && !current_chunk.is_empty() {
                // Create chunk from current sentences
                chunks.push(Chunk {
                    content: current_chunk.trim().to_string(),
                    start: 0, // Position in original text - simplified for now
                    end: current_chunk.chars().count(),
                    index,
                    size: current_chunk.chars().count(),
                    overlap: 0,
                    strategy: "sentence".to_string(),
                    similarity: None,
                    embedding: None,
                    source: None,
                });
                
                // Start new chunk with current sentence
                current_chunk = sentence.to_string();
                current_sentences = vec![sentence];
                index += 1;
            } else {
                current_chunk.push_str(sentence);
                current_sentences.push(sentence);
            }
        }
        
        // Add final chunk if not empty
        if !current_chunk.is_empty() {
            chunks.push(Chunk {
                content: current_chunk.trim().to_string(),
                start: 0,
                end: current_chunk.chars().count(),
                index,
                size: current_chunk.chars().count(),
                overlap: 0,
                strategy: "sentence".to_string(),
                similarity: None,
                embedding: None,
                source: None,
            });
        }
        
        chunks
    }
    
    fn chunk_paragraph(&self, text: &str, target_size: usize, _overlap: usize) -> Vec<Chunk> {
        let paragraphs: Vec<&str> = text.split("\n\n").collect();
        let mut chunks = Vec::new();
        let mut current_chunk = String::new();
        let mut index = 0;
        
        for paragraph in paragraphs {
            let paragraph_chars = paragraph.chars().count();
            let current_chars = current_chunk.chars().count();
            
            if current_chars + paragraph_chars > target_size && !current_chunk.is_empty() {
                // Create chunk
                chunks.push(Chunk {
                    content: current_chunk.trim().to_string(),
                    start: 0, // Simplified positioning
                    end: current_chars,
                    index,
                    size: current_chars,
                    overlap: 0,
                    strategy: "paragraph".to_string(),
                    similarity: None,
                    embedding: None,
                    source: None,
                });
                
                current_chunk = paragraph.to_string();
                index += 1;
            } else {
                if !current_chunk.is_empty() {
                    current_chunk.push_str("\n\n");
                }
                current_chunk.push_str(paragraph);
            }
        }
        
        // Add final chunk
        if !current_chunk.is_empty() {
            let final_chars = current_chunk.chars().count();
            chunks.push(Chunk {
                content: current_chunk.trim().to_string(),
                start: 0,
                end: final_chars,
                index,
                size: final_chars,
                overlap: 0,
                strategy: "paragraph".to_string(),
                similarity: None,
                embedding: None,
                source: None,
            });
        }
        
        chunks
    }
    
    fn chunk_code(&self, text: &str, target_size: usize, _overlap: usize) -> Vec<Chunk> {
        // Basic code-aware chunking - split on function boundaries, class definitions, etc.
        let lines: Vec<&str> = text.lines().collect();
        let mut chunks = Vec::new();
        let mut current_chunk = String::new();
        let mut chunk_start_line = 0;
        let mut current_line = 0;
        let mut index = 0;
        
        for line in lines {
            // Check for function/class boundaries
            let is_boundary = line.trim_start().starts_with("fn ") ||
                              line.trim_start().starts_with("function ") ||
                              line.trim_start().starts_with("class ") ||
                              line.trim_start().starts_with("def ") ||
                              line.trim_start().starts_with("impl ") ||
                              line.trim_start().starts_with("struct ");
                              
            if current_chunk.len() + line.len() > target_size && !current_chunk.is_empty() && is_boundary {
                // Create chunk at function boundary
                chunks.push(Chunk {
                    content: current_chunk.trim_end().to_string(),
                    start: chunk_start_line,
                    end: current_line,
                    index,
                    size: current_chunk.len(),
                    overlap: 0,
                    strategy: "code".to_string(),
                    similarity: None,
                    embedding: None,
                    source: Some(format!("lines {}-{}", chunk_start_line + 1, current_line)),
                });
                
                current_chunk = line.to_string() + "\n";
                chunk_start_line = current_line;
                index += 1;
            } else {
                current_chunk.push_str(line);
                current_chunk.push('\n');
            }
            
            current_line += 1;
        }
        
        // Add final chunk
        if !current_chunk.is_empty() {
            chunks.push(Chunk {
                content: current_chunk.trim_end().to_string(),
                start: chunk_start_line,
                end: current_line,
                index,
                size: current_chunk.len(),
                overlap: 0,
                strategy: "code".to_string(),
                similarity: None,
                embedding: None,
                source: Some(format!("lines {}-{}", chunk_start_line + 1, current_line)),
            });
        }
        
        chunks
    }
    
    async fn chunk_semantic(&self, text: &str, _target_size: usize, model: &str, threshold: f32) -> Result<Vec<Chunk>> {
        // First split into sentences for semantic analysis
        let sentences: Vec<&str> = text.unicode_sentences().collect();
        
        if sentences.is_empty() {
            return Ok(Vec::new());
        }
        
        // Get embeddings for each sentence
        let mut embeddings = Vec::new();
        for sentence in &sentences {
            if let Ok(embedding) = self.get_embedding(sentence, model).await {
                embeddings.push(embedding);
            } else {
                // Fallback: use zero vector if embedding fails
                embeddings.push(vec![0.0; 768]); // Nomic embeddings are 768-dimensional
            }
        }
        
        // Group sentences based on semantic similarity
        let mut chunks = Vec::new();
        let mut current_group = vec![0];
        let mut current_start = 0;
        
        for i in 1..sentences.len() {
            let similarity = cosine_similarity(&embeddings[i-1], &embeddings[i]);
            
            if similarity < threshold {
                // Create chunk from current group
                let chunk_text = current_group.iter()
                    .map(|&idx| sentences[idx])
                    .collect::<Vec<_>>()
                    .join(" ");
                
                let chunk_end = current_start + chunk_text.len();
                chunks.push(Chunk {
                    content: chunk_text.clone(),
                    start: current_start,
                    end: chunk_end,
                    index: chunks.len(),
                    size: chunk_text.len(),
                    overlap: 0,
                    strategy: "semantic".to_string(),
                    similarity: Some(similarity),
                    embedding: Some(embeddings[i-1].clone()),
                    source: None,
                });
                
                current_group = vec![i];
                current_start = chunk_end;
            } else {
                current_group.push(i);
            }
        }
        
        // Add final chunk
        if !current_group.is_empty() {
            let chunk_text = current_group.iter()
                .map(|&idx| sentences[idx])
                .collect::<Vec<_>>()
                .join(" ");
                
            chunks.push(Chunk {
                content: chunk_text.clone(),
                start: current_start,
                end: current_start + chunk_text.len(),
                index: chunks.len(),
                size: chunk_text.len(),
                overlap: 0,
                strategy: "semantic".to_string(),
                similarity: None,
                embedding: current_group.last()
                    .and_then(|&idx| embeddings.get(idx))
                    .cloned(),
                source: None,
            });
        }
        
        Ok(chunks)
    }
    
    async fn chunk_smart(&self, text: &str, size: usize, overlap: usize, model: &str, threshold: f32) -> Result<Vec<Chunk>> {
        // Smart chunking: Use semantic analysis to find natural boundaries,
        // but respect size constraints
        
        // First try semantic chunking
        if let Ok(semantic_chunks) = self.chunk_semantic(text, size, model, threshold).await {
            let mut smart_chunks = Vec::new();
            
            for chunk in semantic_chunks {
                if chunk.size <= size * 2 { // Allow some flexibility
                    smart_chunks.push(chunk);
                } else {
                    // If semantic chunk is too large, fall back to sentence chunking
                    let sub_chunks = self.chunk_sentence(&chunk.content, size, overlap);
                    for mut sub_chunk in sub_chunks {
                        sub_chunk.strategy = "smart".to_string();
                        sub_chunk.index = smart_chunks.len();
                        smart_chunks.push(sub_chunk);
                    }
                }
            }
            
            Ok(smart_chunks)
        } else {
            // Fallback to sentence chunking if semantic fails
            Ok(self.chunk_sentence(text, size, overlap))
        }
    }
    
    async fn get_embedding(&self, text: &str, model: &str) -> Result<Vec<f32>> {
        let request = OllamaEmbedRequest {
            model: model.to_string(),
            prompt: text.to_string(),
        };
        
        let response = self.client
            .post(&format!("{}/api/embeddings", self.ollama_url))
            .json(&request)
            .send()
            .await
            .context("Failed to send request to Ollama")?;
        
        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Ollama API returned error: {}", response.status()));
        }
        
        let embed_response: OllamaEmbedResponse = response
            .json()
            .await
            .context("Failed to parse Ollama response")?;
        
        Ok(embed_response.embedding)
    }
}

fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() {
        return 0.0;
    }
    
    let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let magnitude_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let magnitude_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    
    if magnitude_a == 0.0 || magnitude_b == 0.0 {
        0.0
    } else {
        dot_product / (magnitude_a * magnitude_b)
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    
    match cli.command {
        Commands::Text { 
            content, strategy, size, overlap, format, model, ollama_url, threshold 
        } => {
            let chunker = TextChunker::new(ollama_url);
            let result = chunker.chunk_text(&content, strategy, size, overlap, &model, threshold, None).await?;
            let output = format_output(&json!(result), format);
            println!("{}", output);
        }
        
        Commands::File { 
            path, strategy, size, overlap, format, output, model, ollama_url, threshold 
        } => {
            let content = fs::read_to_string(&path)
                .with_context(|| format!("Failed to read file: {}", path))?;
            
            let chunker = TextChunker::new(ollama_url);
            let result = chunker.chunk_text(&content, strategy, size, overlap, &model, threshold, Some(path.clone())).await?;
            let output_text = format_output(&json!(result), format);
            
            if let Some(output_path) = output {
                fs::write(&output_path, &output_text)
                    .with_context(|| format!("Failed to write output file: {}", output_path))?;
                println!("Chunks written to: {}", output_path);
            } else {
                println!("{}", output_text);
            }
        }
        
        Commands::Batch { 
            dir, pattern, strategy, size, overlap, format, output_dir, model, ollama_url, threshold 
        } => {
            // Create output directory
            fs::create_dir_all(&output_dir)
                .with_context(|| format!("Failed to create output directory: {}", output_dir))?;
            
            let dir_path = Path::new(&dir);
            if !dir_path.exists() {
                return Err(anyhow::anyhow!("Directory does not exist: {}", dir));
            }
            
            let chunker = TextChunker::new(ollama_url);
            let mut processed_files = 0;
            
            for entry in fs::read_dir(dir_path)? {
                let entry = entry?;
                let file_path = entry.path();
                
                if file_path.is_file() {
                    // Simple pattern matching (could be enhanced with glob patterns)
                    let file_name = file_path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("");
                    
                    if pattern == "*" || file_name.contains(&pattern.replace("*", "")) {
                        let content = fs::read_to_string(&file_path)?;
                        let result = chunker.chunk_text(
                            &content, 
                            strategy.clone(), 
                            size, 
                            overlap, 
                            &model, 
                            threshold,
                            Some(file_path.to_string_lossy().to_string())
                        ).await?;
                        
                        let output_file = format!("{}/{}_chunks.{}", 
                            output_dir, 
                            file_path.file_stem().unwrap().to_string_lossy(),
                            match format {
                                OutputFormat::Json => "json",
                                OutputFormat::Csv => "csv",
                                OutputFormat::Text => "txt",
                            }
                        );
                        
                        let output_text = format_output(&json!(result), format);
                        fs::write(&output_file, &output_text)?;
                        
                        processed_files += 1;
                        println!("Processed: {} -> {}", file_path.display(), output_file);
                    }
                }
            }
            
            println!("Batch processing complete. Processed {} files.", processed_files);
        }
    }
    
    Ok(())
}
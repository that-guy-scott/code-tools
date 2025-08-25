#!/usr/bin/env cargo run --bin crypto --

use clap::{Parser, Subcommand, ValueEnum};
use serde_json::json;
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};
use sha2::Digest;
use base64::prelude::*;

use code_tools_connectors::shared::{format_output, handle_error, OutputFormat, CommonOptions};

/// High-performance cryptography and security tool
#[derive(Parser)]
#[command(name = "crypto")]
#[command(about = "Cryptographic operations, hashing, encoding, and JWT handling")]
#[command(version = "1.0.0")]
struct Cli {
    /// Output format (json|text|csv)
    #[arg(short, long, default_value = "json")]
    format: OutputFormat,
    
    /// Enable debug mode
    #[arg(short, long)]
    debug: bool,
    
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// JWT operations
    Jwt {
        #[command(subcommand)]
        operation: JwtOperation,
    },
    
    /// Hashing operations
    Hash {
        #[command(subcommand)]
        operation: HashOperation,
    },
    
    /// Encryption operations
    Encrypt {
        /// Input data (string or @filename)
        input: String,
        
        /// Encryption key
        #[arg(short, long)]
        key: String,
        
        /// Encryption algorithm
        #[arg(short, long, default_value = "aes256-gcm")]
        algorithm: EncryptionAlgorithm,
        
        /// Output file (optional)
        #[arg(short, long)]
        output: Option<String>,
    },
    
    /// Decryption operations
    Decrypt {
        /// Input data (string or @filename)
        input: String,
        
        /// Decryption key
        #[arg(short, long)]
        key: String,
        
        /// Encryption algorithm
        #[arg(short, long, default_value = "aes256-gcm")]
        algorithm: EncryptionAlgorithm,
        
        /// Output file (optional)
        #[arg(short, long)]
        output: Option<String>,
    },
    
    /// Encoding operations
    Encode {
        /// Input data (string or @filename)
        input: String,
        
        /// Encoding format
        #[arg(short, long, default_value = "base64")]
        format: EncodingFormat,
        
        /// Output file (optional)
        #[arg(short, long)]
        output: Option<String>,
    },
    
    /// Decoding operations
    Decode {
        /// Input data (string or @filename)
        input: String,
        
        /// Decoding format
        #[arg(short, long, default_value = "base64")]
        format: EncodingFormat,
        
        /// Output file (optional)
        #[arg(short, long)]
        output: Option<String>,
    },
    
    /// Random data generation
    Random {
        /// Length in bytes
        #[arg(short, long, default_value = "32")]
        length: usize,
        
        /// Output format
        #[arg(short, long, default_value = "hex")]
        format: EncodingFormat,
    },
    
    /// Password generation
    Password {
        /// Password length
        #[arg(short, long, default_value = "16")]
        length: usize,
        
        /// Character set
        #[arg(short, long, default_value = "alphanumeric")]
        charset: CharSet,
    },
}

#[derive(Subcommand)]
enum JwtOperation {
    /// Generate JWT token
    Generate {
        /// JWT payload as JSON string
        #[arg(short, long)]
        payload: String,
        
        /// Secret key for signing
        #[arg(short, long)]
        secret: String,
        
        /// JWT algorithm
        #[arg(short, long, default_value = "hs256")]
        algorithm: JwtAlgorithm,
        
        /// Expiration time in seconds from now
        #[arg(short, long)]
        expires_in: Option<i64>,
    },
    
    /// Verify JWT token
    Verify {
        /// JWT token to verify
        #[arg(short, long)]
        token: String,
        
        /// Secret key for verification
        #[arg(short, long)]
        secret: String,
        
        /// JWT algorithm
        #[arg(short, long, default_value = "hs256")]
        algorithm: JwtAlgorithm,
    },
    
    /// Decode JWT token (without verification)
    Decode {
        /// JWT token to decode
        #[arg(short, long)]
        token: String,
        
        /// Include header in output
        #[arg(long)]
        header: bool,
        
        /// Include payload in output
        #[arg(long, default_value = "true")]
        payload: bool,
    },
}

#[derive(Subcommand)]
enum HashOperation {
    /// Hash input with specified algorithm
    Hash {
        /// Input data (string or @filename)
        input: String,
        
        /// Hash algorithm
        #[arg(short, long, default_value = "sha256")]
        algorithm: HashAlgorithm,
        
        /// Output format
        #[arg(short = 'f', long, default_value = "hex")]
        format: EncodingFormat,
        
        /// Number of rounds for bcrypt
        #[arg(short, long, default_value = "12")]
        rounds: u32,
    },
    
    /// Verify hash against input
    Verify {
        /// Input data (string or @filename)
        input: String,
        
        /// Expected hash value
        #[arg(short = 'e', long)]
        expected: String,
        
        /// Hash algorithm
        #[arg(short, long, default_value = "sha256")]
        algorithm: HashAlgorithm,
    },
    
    /// Hash a file
    File {
        /// File path to hash
        file: String,
        
        /// Hash algorithm
        #[arg(short, long, default_value = "sha256")]
        algorithm: HashAlgorithm,
        
        /// Output format
        #[arg(short = 'f', long, default_value = "hex")]
        format: EncodingFormat,
    },
}

#[derive(ValueEnum, Clone, Debug)]
enum JwtAlgorithm {
    HS256,
    HS384,
    HS512,
}

#[derive(ValueEnum, Clone, Debug)]
enum HashAlgorithm {
    Sha256,
    Sha384,
    Sha512,
    Sha3_256,
    Sha3_384,
    Sha3_512,
    Bcrypt,
}

#[derive(ValueEnum, Clone, Debug)]
enum EncryptionAlgorithm {
    Aes256Gcm,
    ChaCha20Poly1305,
}

#[derive(ValueEnum, Clone, Debug)]
enum EncodingFormat {
    Base64,
    Hex,
    Url,
}

#[derive(ValueEnum, Clone, Debug)]
enum CharSet {
    Alphanumeric,
    AlphanumericSymbols,
    Lowercase,
    Uppercase,
    Numbers,
}

fn load_input(input: &str) -> Result<Vec<u8>, anyhow::Error> {
    if input.starts_with('@') {
        // Load from file
        let file_path = &input[1..];
        Ok(fs::read(file_path)?)
    } else {
        // Use string as-is
        Ok(input.as_bytes().to_vec())
    }
}

fn save_output(data: &[u8], output_path: Option<&String>) -> Result<(), anyhow::Error> {
    if let Some(path) = output_path {
        fs::write(path, data)?;
    }
    Ok(())
}

// JWT Operations
fn handle_jwt_generate(
    payload: String,
    secret: String,
    algorithm: JwtAlgorithm,
    expires_in: Option<i64>,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
    
    // Parse payload JSON
    let mut claims: serde_json::Value = serde_json::from_str(&payload)?;
    
    // Add expiration if specified
    if let Some(exp_seconds) = expires_in {
        let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();
        let exp = now + exp_seconds as u64;
        claims["exp"] = json!(exp);
    }
    
    // Set algorithm
    let alg = match algorithm {
        JwtAlgorithm::HS256 => Algorithm::HS256,
        JwtAlgorithm::HS384 => Algorithm::HS384,
        JwtAlgorithm::HS512 => Algorithm::HS512,
    };
    
    let header = Header::new(alg);
    let key = EncodingKey::from_secret(secret.as_ref());
    
    let token = encode(&header, &claims, &key)?;
    
    let result = json!({
        "token": token,
        "algorithm": format!("{:?}", algorithm),
        "payload": claims,
        "expires_in": expires_in
    });
    
    println!("{}", format_output(&result, options.format));
    Ok(())
}

fn handle_jwt_verify(
    token: String,
    secret: String,
    algorithm: JwtAlgorithm,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
    
    let alg = match algorithm {
        JwtAlgorithm::HS256 => Algorithm::HS256,
        JwtAlgorithm::HS384 => Algorithm::HS384,
        JwtAlgorithm::HS512 => Algorithm::HS512,
    };
    
    let key = DecodingKey::from_secret(secret.as_ref());
    let validation = Validation::new(alg);
    
    match decode::<serde_json::Value>(&token, &key, &validation) {
        Ok(token_data) => {
            let result = json!({
                "valid": true,
                "algorithm": format!("{:?}", algorithm),
                "header": token_data.header,
                "claims": token_data.claims
            });
            println!("{}", format_output(&result, options.format));
        }
        Err(e) => {
            let result = json!({
                "valid": false,
                "error": e.to_string(),
                "algorithm": format!("{:?}", algorithm)
            });
            println!("{}", format_output(&result, options.format));
        }
    }
    
    Ok(())
}

fn handle_jwt_decode(
    token: String,
    include_header: bool,
    include_payload: bool,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    use jsonwebtoken::decode_header;
    
    let mut result = json!({});
    
    if include_header {
        match decode_header(&token) {
            Ok(header) => {
                result["header"] = json!(header);
            }
            Err(e) => {
                result["header_error"] = json!(e.to_string());
            }
        }
    }
    
    if include_payload {
        // For payload, we'll decode manually using base64 since dangerous_insecure_decode is not available
        let parts: Vec<&str> = token.split('.').collect();
        if parts.len() >= 2 {
            match BASE64_URL_SAFE_NO_PAD.decode(parts[1]) {
                Ok(payload_bytes) => {
                    match String::from_utf8(payload_bytes) {
                        Ok(payload_str) => {
                            match serde_json::from_str::<serde_json::Value>(&payload_str) {
                                Ok(payload_json) => {
                                    result["payload"] = payload_json;
                                }
                                Err(e) => {
                                    result["payload_error"] = json!(format!("JSON parse error: {}", e));
                                }
                            }
                        }
                        Err(e) => {
                            result["payload_error"] = json!(format!("UTF-8 decode error: {}", e));
                        }
                    }
                }
                Err(e) => {
                    result["payload_error"] = json!(format!("Base64 decode error: {}", e));
                }
            }
        } else {
            result["payload_error"] = json!("Invalid JWT format");
        }
    }
    
    println!("{}", format_output(&result, options.format));
    Ok(())
}

// Hash Operations
fn handle_hash_operation(
    input: String,
    algorithm: HashAlgorithm,
    format: EncodingFormat,
    rounds: u32,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let data = load_input(&input)?;
    
    let hash_result = match algorithm {
        HashAlgorithm::Sha256 => {
            use sha2::{Sha256, Digest};
            let mut hasher = Sha256::new();
            hasher.update(&data);
            hasher.finalize().to_vec()
        }
        HashAlgorithm::Sha384 => {
            use sha2::{Sha384, Digest};
            let mut hasher = Sha384::new();
            hasher.update(&data);
            hasher.finalize().to_vec()
        }
        HashAlgorithm::Sha512 => {
            use sha2::{Sha512, Digest};
            let mut hasher = Sha512::new();
            hasher.update(&data);
            hasher.finalize().to_vec()
        }
        HashAlgorithm::Sha3_256 => {
            use sha3::{Sha3_256, Digest};
            let mut hasher = Sha3_256::new();
            hasher.update(&data);
            hasher.finalize().to_vec()
        }
        HashAlgorithm::Sha3_384 => {
            use sha3::{Sha3_384, Digest};
            let mut hasher = Sha3_384::new();
            hasher.update(&data);
            hasher.finalize().to_vec()
        }
        HashAlgorithm::Sha3_512 => {
            use sha3::{Sha3_512, Digest};
            let mut hasher = Sha3_512::new();
            hasher.update(&data);
            hasher.finalize().to_vec()
        }
        HashAlgorithm::Bcrypt => {
            let input_str = String::from_utf8(data)?;
            let input_len = input_str.len();
            let hash = bcrypt::hash(input_str, rounds)?;
            return Ok(println!("{}", format_output(&json!({
                "algorithm": "bcrypt",
                "rounds": rounds,
                "hash": hash,
                "input_length": input_len
            }), options.format)));
        }
    };
    
    let formatted_hash = match format {
        EncodingFormat::Hex => hex::encode(hash_result),
        EncodingFormat::Base64 => base64::prelude::BASE64_STANDARD.encode(hash_result),
        EncodingFormat::Url => urlencoding::encode(&String::from_utf8_lossy(&hash_result)).to_string(),
    };
    
    let result = json!({
        "algorithm": format!("{:?}", algorithm).to_lowercase(),
        "format": format!("{:?}", format).to_lowercase(),
        "hash": formatted_hash,
        "input_length": data.len()
    });
    
    println!("{}", format_output(&result, options.format));
    Ok(())
}

fn handle_hash_verify(
    input: String,
    expected: String,
    algorithm: HashAlgorithm,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let data = load_input(&input)?;
    
    let matches = match algorithm {
        HashAlgorithm::Bcrypt => {
            let input_str = String::from_utf8(data.clone())?;
            bcrypt::verify(input_str, &expected)?
        }
        _ => {
            // For other algorithms, compute hash and compare
            let computed_hash = match algorithm {
                HashAlgorithm::Sha256 => {
                    use sha2::{Sha256, Digest};
                    let mut hasher = Sha256::new();
                    hasher.update(&data);
                    hex::encode(hasher.finalize())
                }
                HashAlgorithm::Sha384 => {
                    use sha2::{Sha384, Digest};
                    let mut hasher = Sha384::new();
                    hasher.update(&data);
                    hex::encode(hasher.finalize())
                }
                HashAlgorithm::Sha512 => {
                    use sha2::{Sha512, Digest};
                    let mut hasher = Sha512::new();
                    hasher.update(&data);
                    hex::encode(hasher.finalize())
                }
                _ => return Err(anyhow::anyhow!("Unsupported algorithm for verification")),
            };
            computed_hash == expected
        }
    };
    
    let result = json!({
        "algorithm": format!("{:?}", algorithm).to_lowercase(),
        "matches": matches,
        "expected": expected,
        "input_length": data.len()
    });
    
    println!("{}", format_output(&result, options.format));
    Ok(())
}

// Encryption Operations
fn handle_encrypt(
    input: String,
    key: String,
    algorithm: EncryptionAlgorithm,
    output: Option<String>,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    use rand::RngCore;
    
    let plaintext = load_input(&input)?;
    
    let (ciphertext, nonce) = match algorithm {
        EncryptionAlgorithm::Aes256Gcm => {
            use aes_gcm::{Aes256Gcm, Key, Nonce, aead::{Aead, KeyInit}};
            
            let key_bytes = sha2::Sha256::digest(key.as_bytes());
            let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
            let cipher = Aes256Gcm::new(&key);
            
            let mut nonce_bytes = [0u8; 12];
            rand::thread_rng().fill_bytes(&mut nonce_bytes);
            let nonce = Nonce::from_slice(&nonce_bytes);
            
            let ciphertext = cipher.encrypt(nonce, plaintext.as_ref()).map_err(|e| anyhow::anyhow!("Encryption failed: {:?}", e))?;
            (ciphertext, nonce_bytes.to_vec())
        }
        EncryptionAlgorithm::ChaCha20Poly1305 => {
            use chacha20poly1305::{ChaCha20Poly1305, Key, Nonce, aead::{Aead, KeyInit}};
            
            let key_bytes = sha2::Sha256::digest(key.as_bytes());
            let key = Key::from_slice(&key_bytes);
            let cipher = ChaCha20Poly1305::new(&key);
            
            let mut nonce_bytes = [0u8; 12];
            rand::thread_rng().fill_bytes(&mut nonce_bytes);
            let nonce = Nonce::from_slice(&nonce_bytes);
            
            let ciphertext = cipher.encrypt(nonce, plaintext.as_ref()).map_err(|e| anyhow::anyhow!("Encryption failed: {:?}", e))?;
            (ciphertext, nonce_bytes.to_vec())
        }
    };
    
    // Combine nonce + ciphertext
    let mut encrypted_data = nonce.clone();
    encrypted_data.extend_from_slice(&ciphertext);
    
    save_output(&encrypted_data, output.as_ref())?;
    
    let result = json!({
        "algorithm": format!("{:?}", algorithm).to_lowercase(),
        "encrypted": BASE64_STANDARD.encode(&encrypted_data),
        "nonce": hex::encode(nonce),
        "ciphertext_length": ciphertext.len(),
        "total_length": encrypted_data.len(),
        "output_file": output
    });
    
    println!("{}", format_output(&result, options.format));
    Ok(())
}

fn handle_decrypt(
    input: String,
    key: String,
    algorithm: EncryptionAlgorithm,
    output: Option<String>,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let encrypted_data = load_input(&input)?;
    
    let plaintext = match algorithm {
        EncryptionAlgorithm::Aes256Gcm => {
            use aes_gcm::{Aes256Gcm, Key, Nonce, aead::{Aead, KeyInit}};
            
            if encrypted_data.len() < 12 {
                return Err(anyhow::anyhow!("Invalid encrypted data: too short"));
            }
            
            let key_bytes = sha2::Sha256::digest(key.as_bytes());
            let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
            let cipher = Aes256Gcm::new(&key);
            
            let nonce = Nonce::from_slice(&encrypted_data[0..12]);
            let ciphertext = &encrypted_data[12..];
            
            cipher.decrypt(nonce, ciphertext).map_err(|e| anyhow::anyhow!("Decryption failed: {:?}", e))?
        }
        EncryptionAlgorithm::ChaCha20Poly1305 => {
            use chacha20poly1305::{ChaCha20Poly1305, Key, Nonce, aead::{Aead, KeyInit}};
            
            if encrypted_data.len() < 12 {
                return Err(anyhow::anyhow!("Invalid encrypted data: too short"));
            }
            
            let key_bytes = sha2::Sha256::digest(key.as_bytes());
            let key = Key::from_slice(&key_bytes);
            let cipher = ChaCha20Poly1305::new(&key);
            
            let nonce = Nonce::from_slice(&encrypted_data[0..12]);
            let ciphertext = &encrypted_data[12..];
            
            cipher.decrypt(nonce, ciphertext).map_err(|e| anyhow::anyhow!("Decryption failed: {:?}", e))?
        }
    };
    
    save_output(&plaintext, output.as_ref())?;
    
    let result = json!({
        "algorithm": format!("{:?}", algorithm).to_lowercase(),
        "decrypted_length": plaintext.len(),
        "decrypted": String::from_utf8_lossy(&plaintext),
        "output_file": output
    });
    
    println!("{}", format_output(&result, options.format));
    Ok(())
}

// Encoding Operations
fn handle_encode(
    input: String,
    format: EncodingFormat,
    output: Option<String>,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let data = load_input(&input)?;
    
    let encoded = match format {
        EncodingFormat::Base64 => BASE64_STANDARD.encode(&data),
        EncodingFormat::Hex => hex::encode(&data),
        EncodingFormat::Url => urlencoding::encode(&String::from_utf8_lossy(&data)).to_string(),
    };
    
    save_output(encoded.as_bytes(), output.as_ref())?;
    
    let result = json!({
        "format": format!("{:?}", format).to_lowercase(),
        "input_length": data.len(),
        "encoded_length": encoded.len(),
        "encoded": encoded,
        "output_file": output
    });
    
    println!("{}", format_output(&result, options.format));
    Ok(())
}

fn handle_decode(
    input: String,
    format: EncodingFormat,
    output: Option<String>,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    let data = load_input(&input)?;
    let input_str = String::from_utf8(data)?;
    
    let decoded = match format {
        EncodingFormat::Base64 => BASE64_STANDARD.decode(input_str.trim())?,
        EncodingFormat::Hex => hex::decode(input_str.trim())?,
        EncodingFormat::Url => urlencoding::decode(&input_str)?.as_bytes().to_vec(),
    };
    
    save_output(&decoded, output.as_ref())?;
    
    let result = json!({
        "format": format!("{:?}", format).to_lowercase(),
        "input_length": input_str.len(),
        "decoded_length": decoded.len(),
        "decoded": String::from_utf8_lossy(&decoded),
        "output_file": output
    });
    
    println!("{}", format_output(&result, options.format));
    Ok(())
}

// Random Generation
fn handle_random(
    length: usize,
    format: EncodingFormat,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    use rand::RngCore;
    
    let mut random_bytes = vec![0u8; length];
    rand::thread_rng().fill_bytes(&mut random_bytes);
    
    let formatted = match format {
        EncodingFormat::Base64 => BASE64_STANDARD.encode(&random_bytes),
        EncodingFormat::Hex => hex::encode(&random_bytes),
        EncodingFormat::Url => urlencoding::encode(&String::from_utf8_lossy(&random_bytes)).to_string(),
    };
    
    let result = json!({
        "length": length,
        "format": format!("{:?}", format).to_lowercase(),
        "random": formatted
    });
    
    println!("{}", format_output(&result, options.format));
    Ok(())
}

fn handle_password(
    length: usize,
    charset: CharSet,
    options: &CommonOptions,
) -> Result<(), anyhow::Error> {
    use rand::seq::SliceRandom;
    
    let chars = match charset {
        CharSet::Alphanumeric => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        CharSet::AlphanumericSymbols => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?",
        CharSet::Lowercase => "abcdefghijklmnopqrstuvwxyz",
        CharSet::Uppercase => "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        CharSet::Numbers => "0123456789",
    }.chars().collect::<Vec<_>>();
    
    let password: String = (0..length)
        .map(|_| *chars.choose(&mut rand::thread_rng()).unwrap())
        .collect();
    
    let result = json!({
        "length": length,
        "charset": format!("{:?}", charset).to_lowercase(),
        "password": password
    });
    
    println!("{}", format_output(&result, options.format));
    Ok(())
}

fn main() {
    let cli = Cli::parse();
    let options = CommonOptions::new(cli.format, cli.debug);
    options.setup_debug();
    
    let result = match cli.command {
        Commands::Jwt { operation } => match operation {
            JwtOperation::Generate { payload, secret, algorithm, expires_in } => {
                handle_jwt_generate(payload, secret, algorithm, expires_in, &options)
            }
            JwtOperation::Verify { token, secret, algorithm } => {
                handle_jwt_verify(token, secret, algorithm, &options)
            }
            JwtOperation::Decode { token, header, payload } => {
                handle_jwt_decode(token, header, payload, &options)
            }
        },
        Commands::Hash { operation } => match operation {
            HashOperation::Hash { input, algorithm, format, rounds } => {
                handle_hash_operation(input, algorithm, format, rounds, &options)
            }
            HashOperation::Verify { input, expected, algorithm } => {
                handle_hash_verify(input, expected, algorithm, &options)
            }
            HashOperation::File { file, algorithm, format } => {
                handle_hash_operation(format!("@{}", file), algorithm, format, 12, &options)
            }
        },
        Commands::Encrypt { input, key, algorithm, output } => {
            handle_encrypt(input, key, algorithm, output, &options)
        }
        Commands::Decrypt { input, key, algorithm, output } => {
            handle_decrypt(input, key, algorithm, output, &options)
        }
        Commands::Encode { input, format, output } => {
            handle_encode(input, format, output, &options)
        }
        Commands::Decode { input, format, output } => {
            handle_decode(input, format, output, &options)
        }
        Commands::Random { length, format } => {
            handle_random(length, format, &options)
        }
        Commands::Password { length, charset } => {
            handle_password(length, charset, &options)
        }
    };
    
    if let Err(e) = result {
        handle_error(e, "Crypto operation failed");
    }
}
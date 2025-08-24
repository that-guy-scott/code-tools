use serde_json::Value;
use std::fmt;

/// Output format options for CLI commands
#[derive(Debug, Clone, Copy)]
pub enum OutputFormat {
    Json,
    Text,
    Csv,
}

impl fmt::Display for OutputFormat {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            OutputFormat::Json => write!(f, "json"),
            OutputFormat::Text => write!(f, "text"),
            OutputFormat::Csv => write!(f, "csv"),
        }
    }
}

impl std::str::FromStr for OutputFormat {
    type Err = anyhow::Error;
    
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "json" => Ok(OutputFormat::Json),
            "text" => Ok(OutputFormat::Text),
            "csv" => Ok(OutputFormat::Csv),
            _ => Err(anyhow::anyhow!("Invalid output format: {}", s)),
        }
    }
}

/// Format output data based on requested format
pub fn format_output(data: &Value, format: OutputFormat) -> String {
    match format {
        OutputFormat::Json => serde_json::to_string_pretty(data).unwrap_or_default(),
        OutputFormat::Text => format_as_text(data),
        OutputFormat::Csv => format_as_csv(data),
    }
}

/// Format JSON value as human-readable text
fn format_as_text(data: &Value) -> String {
    match data {
        Value::Array(arr) => {
            arr.iter()
                .enumerate()
                .map(|(i, item)| format!("{}. {}", i + 1, format_value_as_text(item)))
                .collect::<Vec<_>>()
                .join("\n")
        }
        Value::Object(obj) => {
            obj.iter()
                .map(|(key, value)| format!("{}: {}", key, format_value_as_text(value)))
                .collect::<Vec<_>>()
                .join("\n")
        }
        _ => format_value_as_text(data),
    }
}

/// Format a single JSON value as text
fn format_value_as_text(value: &Value) -> String {
    match value {
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        Value::Bool(b) => b.to_string(),
        Value::Null => "null".to_string(),
        Value::Array(arr) => format!("[{}]", arr.iter().map(format_value_as_text).collect::<Vec<_>>().join(", ")),
        Value::Object(obj) => {
            let fields: Vec<String> = obj.iter()
                .map(|(k, v)| format!("{}: {}", k, format_value_as_text(v)))
                .collect();
            format!("{{{}}}", fields.join(", "))
        }
    }
}

/// Format JSON data as CSV (if it's an array of objects)
fn format_as_csv(data: &Value) -> String {
    match data {
        Value::Array(arr) if !arr.is_empty() => {
            // Check if all elements are objects with the same keys
            if let Some(Value::Object(first_obj)) = arr.first() {
                let mut headers: Vec<String> = first_obj.keys().cloned().collect();
                headers.sort();
                let header_line = headers.join(",");
                
                let rows: Vec<String> = arr.iter()
                    .filter_map(|item| {
                        if let Value::Object(obj) = item {
                            let row: Vec<String> = headers.iter()
                                .map(|header| {
                                    let value = obj.get(header)
                                        .map(format_csv_value)
                                        .unwrap_or_default();
                                    escape_csv_value(&value)
                                })
                                .collect();
                            Some(row.join(","))
                        } else {
                            None
                        }
                    })
                    .collect();
                
                format!("{}\n{}", header_line, rows.join("\n"))
            } else {
                // Fallback to text format for non-object arrays
                format_as_text(data)
            }
        }
        _ => format_as_text(data),
    }
}

/// Format a JSON value for CSV output
fn format_csv_value(value: &Value) -> String {
    match value {
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        Value::Bool(b) => b.to_string(),
        Value::Null => String::new(),
        _ => serde_json::to_string(value).unwrap_or_default(),
    }
}

/// Escape a CSV value (wrap in quotes if contains comma, quote, or newline)
fn escape_csv_value(value: &str) -> String {
    if value.contains(',') || value.contains('"') || value.contains('\n') {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_output_format_parsing() {
        assert!(matches!("json".parse::<OutputFormat>().unwrap(), OutputFormat::Json));
        assert!(matches!("text".parse::<OutputFormat>().unwrap(), OutputFormat::Text));
        assert!(matches!("csv".parse::<OutputFormat>().unwrap(), OutputFormat::Csv));
        assert!("invalid".parse::<OutputFormat>().is_err());
    }

    #[test]
    fn test_json_formatting() {
        let data = json!({"name": "test", "value": 42});
        let formatted = format_output(&data, OutputFormat::Json);
        assert!(formatted.contains("\"name\": \"test\""));
    }

    #[test]
    fn test_text_formatting() {
        let data = json!({"name": "test", "value": 42});
        let formatted = format_output(&data, OutputFormat::Text);
        assert!(formatted.contains("name: test"));
        assert!(formatted.contains("value: 42"));
    }

    #[test]
    fn test_csv_formatting() {
        let data = json!([
            {"name": "Alice", "age": 30},
            {"name": "Bob", "age": 25}
        ]);
        let formatted = format_output(&data, OutputFormat::Csv);
        assert!(formatted.starts_with("age,name"));
        assert!(formatted.contains("30,Alice"));
        assert!(formatted.contains("25,Bob"));
    }

    #[test]
    fn test_csv_escaping() {
        assert_eq!(escape_csv_value("simple"), "simple");
        assert_eq!(escape_csv_value("with,comma"), "\"with,comma\"");
        assert_eq!(escape_csv_value("with\"quote"), "\"with\"\"quote\"");
    }
}
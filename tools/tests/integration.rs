use code_tools_connectors::shared::{OutputFormat, format_output};
use serde_json::json;

#[test]
fn test_shared_output_formatting() {
    let data = json!({"test": "value", "number": 42});
    
    // Test JSON formatting
    let json_output = format_output(&data, OutputFormat::Json);
    assert!(json_output.contains("\"test\": \"value\""));
    
    // Test text formatting  
    let text_output = format_output(&data, OutputFormat::Text);
    assert!(text_output.contains("test: value"));
    assert!(text_output.contains("number: 42"));
}

#[test]
fn test_csv_formatting() {
    let data = json!([
        {"name": "Alice", "age": 30},
        {"name": "Bob", "age": 25}
    ]);
    
    let csv_output = format_output(&data, OutputFormat::Csv);
    assert!(csv_output.starts_with("name,age"));
    assert!(csv_output.contains("Alice,30"));
    assert!(csv_output.contains("Bob,25"));
}
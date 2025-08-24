import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the CLI tool
const CLI_PATH = path.resolve(__dirname, '../../tools/postgres-connector/postgres-cli.js');

// Test environment variables
const TEST_ENV = {
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://dev_user:dev_password_123@localhost:5432/code_tools_dev'
};

/**
 * Execute CLI command and return parsed JSON result
 */
function runCliCommand(command, expectError = false) {
    try {
        const result = execSync(`${CLI_PATH} ${command}`, {
            encoding: 'utf8',
            env: { ...process.env, ...TEST_ENV },
            timeout: 30000 // 30 second timeout
        });
        
        if (expectError) {
            throw new Error('Expected command to fail but it succeeded');
        }
        
        return JSON.parse(result.trim());
    } catch (error) {
        if (expectError) {
            // For expected errors, try to parse error output as JSON
            try {
                return JSON.parse(error.stdout || error.message);
            } catch {
                return { error: error.message };
            }
        }
        throw error;
    }
}

describe('PostgreSQL CLI Integration Tests', () => {
    // Test data storage
    let testTables = [];
    let testFiles = [];

    beforeAll(async () => {
        // Verify PostgreSQL is accessible before running tests
        try {
            const health = runCliCommand('health');
            expect(health.status).toBe('healthy');
        } catch (error) {
            throw new Error(`PostgreSQL is not accessible. Please ensure Docker container is running: ${error.message}`);
        }
    });

    afterAll(async () => {
        // Cleanup: Drop all test tables created during testing
        for (const tableName of testTables) {
            try {
                runCliCommand(`drop-table ${tableName} --confirm`);
            } catch (error) {
                // Ignore cleanup errors
                console.warn(`Failed to cleanup test table ${tableName}:`, error.message);
            }
        }
        
        // Cleanup: Remove test files
        for (const filePath of testFiles) {
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (error) {
                console.warn(`Failed to cleanup test file ${filePath}:`, error.message);
            }
        }
    });

    describe('Connection and Health Tests', () => {
        it('should return healthy status when connection is working', () => {
            const result = runCliCommand('health');
            
            expect(result).toMatchObject({
                status: 'healthy',
                database: 'code_tools_dev',
                user: 'dev_user'
            });
            expect(result.connection).toContain('postgresql://dev_user:***@localhost:5432/code_tools_dev');
            expect(result.version).toContain('PostgreSQL');
            expect(result).toHaveProperty('timestamp');
        });

        it('should return database statistics', () => {
            const result = runCliCommand('stats');
            
            expect(result).toHaveProperty('database_size');
            expect(result).toHaveProperty('total_tables');
            expect(result).toHaveProperty('connections');
            expect(result).toHaveProperty('tables');
            expect(Array.isArray(result.tables)).toBe(true);
            expect(typeof result.total_tables).toBe('number');
            expect(result.connections).toHaveProperty('total_connections');
            expect(result.connections).toHaveProperty('active_connections');
            expect(result.connections).toHaveProperty('idle_connections');
        });

        it('should list databases', () => {
            const result = runCliCommand('databases');
            
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
            
            result.forEach(db => {
                expect(db).toHaveProperty('name');
                expect(db).toHaveProperty('encoding');
                expect(db).toHaveProperty('collate');
                expect(db).toHaveProperty('ctype');
                expect(db).toHaveProperty('size');
                expect(typeof db.name).toBe('string');
            });
        });

        it('should list tables in current database', () => {
            const result = runCliCommand('tables');
            
            expect(Array.isArray(result)).toBe(true);
            // Result might be empty if no tables exist yet
        });
    });

    describe('Schema Operations Tests', () => {
        describe('Create Table Operations', () => {
            it('should create table with various column types', () => {
                const tableName = 'test_create_' + Date.now();
                testTables.push(tableName);
                
                const columns = 'id:SERIAL:PRIMARY KEY,name:VARCHAR(100):NOT NULL,email:VARCHAR(255):UNIQUE,age:INTEGER,active:BOOLEAN:DEFAULT TRUE,created_at:TIMESTAMP:DEFAULT CURRENT_TIMESTAMP';
                
                const result = runCliCommand(`create-table ${tableName} "${columns}"`);
                
                expect(result).toMatchObject({
                    schema: 'public',
                    table: tableName,
                    status: 'created'
                });
                expect(result.columns).toHaveLength(6);
                expect(result.columns).toContain('id SERIAL PRIMARY KEY');
                expect(result.columns).toContain('name VARCHAR(100) NOT NULL');
                expect(result.columns).toContain('email VARCHAR(255) UNIQUE');
            });

            it('should create simple table with minimal columns', () => {
                const tableName = 'test_simple_' + Date.now();
                testTables.push(tableName);
                
                const result = runCliCommand(`create-table ${tableName} "id:INTEGER,name:TEXT"`);
                
                expect(result).toMatchObject({
                    schema: 'public',
                    table: tableName,
                    status: 'created'
                });
                expect(result.columns).toHaveLength(2);
            });

            it('should create table in specific schema', () => {
                // First ensure public schema works (we'll use public since we don't want to create schemas)
                const tableName = 'test_schema_' + Date.now();
                testTables.push(tableName);
                
                const result = runCliCommand(`create-table ${tableName} "id:INTEGER,data:TEXT" --schema public`);
                
                expect(result.schema).toBe('public');
                expect(result.status).toBe('created');
            });
        });

        describe('Describe Table Operations', () => {
            let describeTestTable;

            beforeEach(() => {
                describeTestTable = 'test_describe_' + Date.now();
                testTables.push(describeTestTable);
                runCliCommand(`create-table ${describeTestTable} "id:SERIAL:PRIMARY KEY,name:VARCHAR(50):NOT NULL,optional_field:INTEGER"`);
            });

            it('should describe table schema', () => {
                const result = runCliCommand(`describe ${describeTestTable}`);
                
                expect(result).toMatchObject({
                    schema: 'public',
                    table: describeTestTable
                });
                expect(result.columns).toHaveLength(3);
                
                const idColumn = result.columns.find(col => col.name === 'id');
                const nameColumn = result.columns.find(col => col.name === 'name');
                const optionalColumn = result.columns.find(col => col.name === 'optional_field');
                
                expect(idColumn).toMatchObject({
                    name: 'id',
                    type: 'integer',
                    nullable: false,
                    position: 1
                });
                expect(idColumn.default).toContain('nextval');
                
                expect(nameColumn).toMatchObject({
                    name: 'name',
                    type: 'character varying',
                    max_length: 50,
                    nullable: false,
                    position: 2
                });
                
                expect(optionalColumn).toMatchObject({
                    name: 'optional_field',
                    type: 'integer',
                    nullable: true,
                    position: 3
                });
            });

            it('should show table indexes', () => {
                const result = runCliCommand(`indexes ${describeTestTable}`);
                
                expect(result).toMatchObject({
                    schema: 'public',
                    table: describeTestTable
                });
                expect(Array.isArray(result.indexes)).toBe(true);
                // Should have at least primary key index
                expect(result.indexes.length).toBeGreaterThan(0);
                
                const primaryIndex = result.indexes.find(idx => idx.primary);
                expect(primaryIndex).toBeDefined();
                expect(primaryIndex.columns).toContain('id');
            });
        });

        describe('Drop Table Operations', () => {
            it('should drop existing table', () => {
                const tableName = 'test_drop_' + Date.now();
                
                // Create table first
                runCliCommand(`create-table ${tableName} "id:INTEGER,name:TEXT"`);
                
                // Drop it
                const result = runCliCommand(`drop-table ${tableName} --confirm`);
                
                expect(result).toMatchObject({
                    schema: 'public',
                    table: tableName,
                    status: 'dropped'
                });
                
                // Verify it's gone by trying to describe it
                try {
                    runCliCommand(`describe ${tableName}`);
                    expect(false).toBe(true); // Should not reach here
                } catch (error) {
                    expect(error.message).toContain('not found');
                }
            });

            it('should require confirmation flag for drop', () => {
                const tableName = 'test_drop_confirm_' + Date.now();
                testTables.push(tableName);
                runCliCommand(`create-table ${tableName} "id:INTEGER"`);
                
                try {
                    runCliCommand(`drop-table ${tableName}`);
                    expect(false).toBe(true); // Should not reach here
                } catch (error) {
                    expect(error.message).toContain('Use --confirm flag');
                }
            });
        });
    });

    describe('Query Operations Tests', () => {
        let queryTestTable;

        beforeEach(() => {
            queryTestTable = 'test_query_' + Date.now();
            testTables.push(queryTestTable);
            runCliCommand(`create-table ${queryTestTable} "id:SERIAL:PRIMARY KEY,name:VARCHAR(100),category:VARCHAR(50),value:INTEGER"`);
        });

        describe('Raw Query Operations', () => {
            it('should execute simple SELECT query', () => {
                const result = runCliCommand(`query "SELECT 1 as number, 'hello' as greeting"`);
                
                expect(result.rows).toHaveLength(1);
                expect(result.rows[0]).toMatchObject({
                    number: 1,
                    greeting: 'hello'
                });
                expect(result.rows_affected).toBe(1);
            });

            it('should execute query with parameters', () => {
                // Insert test data first
                runCliCommand(`query "INSERT INTO ${queryTestTable} (name, category, value) VALUES ('Test Item', 'Category A', 42)"`);
                
                const result = runCliCommand(`query "SELECT * FROM ${queryTestTable} WHERE value = $1" --params "[42]"`);
                
                expect(result.rows).toHaveLength(1);
                expect(result.rows[0]).toMatchObject({
                    name: 'Test Item',
                    category: 'Category A',
                    value: 42
                });
            });

            it('should execute transaction query', () => {
                const result = runCliCommand(`query "INSERT INTO ${queryTestTable} (name, value) VALUES ('Transaction Test', 100)" --transaction`);
                
                expect(result.rows_affected).toBe(1);
            });

            it('should handle query errors gracefully', () => {
                const result = runCliCommand(`query "SELECT * FROM non_existent_table"`, true);
                expect(result).toHaveProperty('error');
            });
        });

        describe('Select Operations', () => {
            beforeEach(() => {
                // Insert test data
                const testData = [
                    { name: 'Item 1', category: 'A', value: 10 },
                    { name: 'Item 2', category: 'B', value: 20 },
                    { name: 'Item 3', category: 'A', value: 30 }
                ];
                
                for (const item of testData) {
                    runCliCommand(`insert ${queryTestTable} '${JSON.stringify(item)}'`);
                }
            });

            it('should select all rows', () => {
                const result = runCliCommand(`select ${queryTestTable}`);
                
                expect(Array.isArray(result)).toBe(true);
                expect(result.length).toBe(3);
                result.forEach(row => {
                    expect(row).toHaveProperty('id');
                    expect(row).toHaveProperty('name');
                    expect(row).toHaveProperty('category');
                    expect(row).toHaveProperty('value');
                });
            });

            it('should select specific columns', () => {
                const result = runCliCommand(`select ${queryTestTable} --columns "name,value"`);
                
                expect(result.length).toBe(3);
                result.forEach(row => {
                    expect(row).toHaveProperty('name');
                    expect(row).toHaveProperty('value');
                    expect(row).not.toHaveProperty('category');
                });
            });

            it('should select with WHERE condition', () => {
                const result = runCliCommand(`select ${queryTestTable} --where "category = 'A'"`);
                
                expect(result.length).toBe(2);
                result.forEach(row => {
                    expect(row.category).toBe('A');
                });
            });

            it('should select with LIMIT', () => {
                const result = runCliCommand(`select ${queryTestTable} --limit 2`);
                
                expect(result.length).toBe(2);
            });

            it('should select with ORDER BY', () => {
                const result = runCliCommand(`select ${queryTestTable} --order-by "value DESC"`);
                
                expect(result.length).toBe(3);
                expect(result[0].value).toBeGreaterThanOrEqual(result[1].value);
                expect(result[1].value).toBeGreaterThanOrEqual(result[2].value);
            });

            it('should select with OFFSET for pagination', () => {
                const result = runCliCommand(`select ${queryTestTable} --limit 2 --offset 1`);
                
                expect(result.length).toBe(2);
            });
        });

        describe('Insert Operations', () => {
            it('should insert single record', () => {
                const data = { name: 'Single Insert', category: 'Test', value: 99 };
                
                const result = runCliCommand(`insert ${queryTestTable} '${JSON.stringify(data)}'`);
                
                expect(result).toMatchObject({
                    table: queryTestTable,
                    inserted: 1
                });
                expect(result.rows).toHaveLength(1);
                expect(result.rows[0]).toMatchObject(data);
                expect(result.rows[0]).toHaveProperty('id');
            });

            it('should insert multiple records', () => {
                const data = [
                    { name: 'Multi Insert 1', category: 'Batch', value: 101 },
                    { name: 'Multi Insert 2', category: 'Batch', value: 102 }
                ];
                
                const result = runCliCommand(`insert ${queryTestTable} '${JSON.stringify(data)}'`);
                
                expect(result.inserted).toBe(2);
                expect(result.rows).toHaveLength(2);
            });

            it('should handle insert with special characters', () => {
                const data = { name: "Quote's Test \"Data\"", category: 'Special\nChars', value: 0 };
                
                const result = runCliCommand(`insert ${queryTestTable} '${JSON.stringify(data)}'`);
                
                expect(result.inserted).toBe(1);
                expect(result.rows[0].name).toBe(data.name);
                expect(result.rows[0].category).toBe(data.category);
            });
        });

        describe('Update Operations', () => {
            let updateTestId;

            beforeEach(() => {
                const insertResult = runCliCommand(`insert ${queryTestTable} '{"name": "Update Test", "category": "Original", "value": 50}'`);
                updateTestId = insertResult.rows[0].id;
            });

            it('should update single record', () => {
                const updateData = { name: 'Updated Name', value: 75 };
                
                const result = runCliCommand(`update ${queryTestTable} '${JSON.stringify(updateData)}' "id = ${updateTestId}"`);
                
                expect(result).toMatchObject({
                    table: queryTestTable,
                    updated: 1
                });
                expect(result.rows).toHaveLength(1);
                expect(result.rows[0]).toMatchObject({
                    id: updateTestId,
                    name: 'Updated Name',
                    category: 'Original', // Should preserve unchanged fields
                    value: 75
                });
            });

            it('should update multiple records', () => {
                // Insert additional test data
                runCliCommand(`insert ${queryTestTable} '{"name": "Multi Update 1", "category": "Multi", "value": 10}'`);
                runCliCommand(`insert ${queryTestTable} '{"name": "Multi Update 2", "category": "Multi", "value": 20}'`);
                
                const result = runCliCommand(`update ${queryTestTable} '{"value": 999}' "category = 'Multi'"`);
                
                expect(result.updated).toBe(2);
                result.rows.forEach(row => {
                    expect(row.value).toBe(999);
                    expect(row.category).toBe('Multi');
                });
            });

            it('should handle update with no matching records', () => {
                const result = runCliCommand(`update ${queryTestTable} '{"value": 999}' "id = 999999"`);
                
                expect(result.updated).toBe(0);
                expect(result.rows).toHaveLength(0);
            });
        });
    });

    describe('Data Management Tests', () => {
        let dataTestTable;

        beforeEach(() => {
            dataTestTable = 'test_data_' + Date.now();
            testTables.push(dataTestTable);
            runCliCommand(`create-table ${dataTestTable} "id:SERIAL:PRIMARY KEY,name:VARCHAR(100),status:VARCHAR(20)"`);
            
            // Insert test data
            const testData = [
                { name: 'Active Item 1', status: 'active' },
                { name: 'Active Item 2', status: 'active' },
                { name: 'Inactive Item', status: 'inactive' }
            ];
            
            for (const item of testData) {
                runCliCommand(`insert ${dataTestTable} '${JSON.stringify(item)}'`);
            }
        });

        describe('Count Operations', () => {
            it('should count all rows', () => {
                const result = runCliCommand(`count ${dataTestTable}`);
                
                expect(result).toMatchObject({
                    schema: 'public',
                    table: dataTestTable,
                    count: 3,
                    condition: 'none'
                });
            });

            it('should count with WHERE condition', () => {
                const result = runCliCommand(`count ${dataTestTable} --where "status = 'active'"`);
                
                expect(result.count).toBe(2);
                expect(result.condition).toBe("status = 'active'");
            });

            it('should count empty results', () => {
                const result = runCliCommand(`count ${dataTestTable} --where "status = 'nonexistent'"`);
                
                expect(result.count).toBe(0);
            });
        });

        describe('Truncate Operations', () => {
            it('should truncate table', () => {
                const result = runCliCommand(`truncate ${dataTestTable} --confirm`);
                
                expect(result).toMatchObject({
                    schema: 'public',
                    table: dataTestTable,
                    status: 'truncated'
                });
                
                // Verify table is empty
                const countResult = runCliCommand(`count ${dataTestTable}`);
                expect(countResult.count).toBe(0);
            });

            it('should require confirmation flag for truncate', () => {
                try {
                    runCliCommand(`truncate ${dataTestTable}`);
                    expect(false).toBe(true); // Should not reach here
                } catch (error) {
                    expect(error.message).toContain('Use --confirm flag');
                }
            });
        });

        describe('Backup Operations', () => {
            it('should backup table to JSON file', () => {
                const backupFile = path.join(__dirname, `backup_test_${Date.now()}.json`);
                testFiles.push(backupFile);
                
                const result = runCliCommand(`backup-table ${dataTestTable} "${backupFile}"`);
                
                expect(result).toMatchObject({
                    schema: 'public',
                    table: dataTestTable,
                    file: backupFile,
                    rows_exported: 3,
                    status: 'completed'
                });
                
                // Verify file was created and contains correct data
                expect(fs.existsSync(backupFile)).toBe(true);
                
                const backupContent = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
                expect(backupContent).toHaveProperty('schema', 'public');
                expect(backupContent).toHaveProperty('table', dataTestTable);
                expect(backupContent).toHaveProperty('row_count', 3);
                expect(backupContent).toHaveProperty('data');
                expect(Array.isArray(backupContent.data)).toBe(true);
                expect(backupContent.data).toHaveLength(3);
            });

            it('should backup with WHERE condition', () => {
                const backupFile = path.join(__dirname, `backup_filtered_${Date.now()}.json`);
                testFiles.push(backupFile);
                
                const result = runCliCommand(`backup-table ${dataTestTable} "${backupFile}" --where "status = 'active'"`);
                
                expect(result.rows_exported).toBe(2);
                
                const backupContent = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
                expect(backupContent.row_count).toBe(2);
                expect(backupContent.condition).toBe("status = 'active'");
                backupContent.data.forEach(row => {
                    expect(row.status).toBe('active');
                });
            });
        });
    });

    describe('Error Handling Tests', () => {
        it('should handle non-existent table in select', () => {
            const result = runCliCommand('select non_existent_table', true);
            expect(result).toHaveProperty('error');
        });

        it('should handle invalid JSON in insert', () => {
            const tableName = 'test_error_' + Date.now();
            testTables.push(tableName);
            runCliCommand(`create-table ${tableName} "id:INTEGER,name:TEXT"`);
            
            const result = runCliCommand(`insert ${tableName} 'invalid-json'`, true);
            expect(result).toHaveProperty('error');
        });

        it('should handle invalid column definition', () => {
            const result = runCliCommand('create-table invalid_table "invalid-column-def"', true);
            expect(result).toHaveProperty('error');
        });

        it('should handle constraint violations', () => {
            const tableName = 'test_constraint_' + Date.now();
            testTables.push(tableName);
            runCliCommand(`create-table ${tableName} "id:INTEGER:PRIMARY KEY,email:VARCHAR(100):UNIQUE"`);
            
            // Insert first record
            runCliCommand(`insert ${tableName} '{"id": 1, "email": "test@example.com"}'`);
            
            // Try to insert duplicate
            const result = runCliCommand(`insert ${tableName} '{"id": 2, "email": "test@example.com"}'`, true);
            expect(result).toHaveProperty('error');
        });

        it('should handle malformed SQL query', () => {
            const result = runCliCommand('query "INVALID SQL SYNTAX"', true);
            expect(result).toHaveProperty('error');
        });
    });

    describe('Output Format Tests', () => {
        let formatTestTable;

        beforeAll(() => {
            formatTestTable = 'test_format_' + Date.now();
            testTables.push(formatTestTable);
            runCliCommand(`create-table ${formatTestTable} "id:INTEGER,name:TEXT,value:DECIMAL"`);
            runCliCommand(`insert ${formatTestTable} '{"id": 1, "name": "Test Item", "value": 123.45}'`);
        });

        it('should support JSON format (default)', () => {
            const result = runCliCommand(`select ${formatTestTable}`);
            expect(Array.isArray(result)).toBe(true);
            expect(result[0]).toHaveProperty('id');
            expect(result[0]).toHaveProperty('name');
            expect(result[0]).toHaveProperty('value');
        });

        it('should support text format', () => {
            try {
                const result = execSync(`${CLI_PATH} select ${formatTestTable} --format text`, {
                    encoding: 'utf8',
                    env: { ...process.env, ...TEST_ENV }
                });
                
                expect(typeof result).toBe('string');
                expect(result).toContain('id');
                expect(result).toContain('name');
                expect(result).toContain('value');
                expect(result).toContain('Test Item');
            } catch (error) {
                throw error;
            }
        });

        it('should support CSV format', () => {
            try {
                const result = execSync(`${CLI_PATH} select ${formatTestTable} --format csv`, {
                    encoding: 'utf8',
                    env: { ...process.env, ...TEST_ENV }
                });
                
                expect(typeof result).toBe('string');
                expect(result).toContain('id,name,value');
                expect(result).toContain('1,Test Item,123.45');
            } catch (error) {
                throw error;
            }
        });
    });

    describe('Integration Workflow Tests', () => {
        it('should complete full workflow: create → insert → select → update → count → backup → drop', () => {
            const workflowTable = 'workflow_test_' + Date.now();
            
            // Step 1: Create table
            const createResult = runCliCommand(`create-table ${workflowTable} "id:SERIAL:PRIMARY KEY,name:VARCHAR(100):NOT NULL,category:VARCHAR(50),priority:INTEGER:DEFAULT 1"`);
            expect(createResult.status).toBe('created');
            
            // Step 2: Insert data
            const insertData = [
                { name: 'Task 1', category: 'work', priority: 3 },
                { name: 'Task 2', category: 'personal', priority: 1 },
                { name: 'Task 3', category: 'work', priority: 2 }
            ];
            
            const insertResult = runCliCommand(`insert ${workflowTable} '${JSON.stringify(insertData)}'`);
            expect(insertResult.inserted).toBe(3);
            
            // Step 3: Select data
            const selectResult = runCliCommand(`select ${workflowTable} --order-by "priority DESC"`);
            expect(selectResult.length).toBe(3);
            expect(selectResult[0].priority).toBe(3);
            
            // Step 4: Update data
            const updateResult = runCliCommand(`update ${workflowTable} '{"priority": 5}' "category = 'work'"`);
            expect(updateResult.updated).toBe(2);
            
            // Step 5: Count verification
            const countResult = runCliCommand(`count ${workflowTable} --where "priority = 5"`);
            expect(countResult.count).toBe(2);
            
            // Step 6: Backup data
            const backupFile = path.join(__dirname, `workflow_backup_${Date.now()}.json`);
            testFiles.push(backupFile);
            const backupResult = runCliCommand(`backup-table ${workflowTable} "${backupFile}"`);
            expect(backupResult.rows_exported).toBe(3);
            expect(fs.existsSync(backupFile)).toBe(true);
            
            // Step 7: Drop table
            const dropResult = runCliCommand(`drop-table ${workflowTable} --confirm`);
            expect(dropResult.status).toBe('dropped');
            
            // Verify table is gone
            try {
                runCliCommand(`describe ${workflowTable}`);
                expect(false).toBe(true); // Should not reach here
            } catch (error) {
                expect(error.message).toContain('not found');
            }
        });
    });
});
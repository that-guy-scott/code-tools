import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { execSync, spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the CLI tool
const CLI_PATH = path.resolve(__dirname, '../../tools/neo4j-connector/neo4j-cli.js');

// Test environment variables
const TEST_ENV = {
    NEO4J_URI: process.env.NEO4J_URI || 'bolt://localhost:7687',
    NEO4J_USERNAME: process.env.NEO4J_USERNAME || 'neo4j',
    NEO4J_PASSWORD: process.env.NEO4J_PASSWORD || 'dev_password_123'
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

describe('Neo4j CLI Integration Tests', () => {
    // Test data storage
    let testNodeIds = [];
    let testRelationshipIds = [];

    beforeAll(async () => {
        // Verify Neo4j is accessible before running tests
        try {
            const health = runCliCommand('health');
            expect(health.status).toBe('healthy');
        } catch (error) {
            throw new Error(`Neo4j is not accessible. Please ensure Docker container is running: ${error.message}`);
        }
    });

    afterAll(async () => {
        // Cleanup: Delete all test nodes created during testing
        for (const nodeId of testNodeIds) {
            try {
                runCliCommand(`delete ${nodeId}`);
            } catch (error) {
                // Ignore cleanup errors
                console.warn(`Failed to cleanup test node ${nodeId}:`, error.message);
            }
        }
    });

    describe('Connection and Health Tests', () => {
        it('should return healthy status when connection is working', () => {
            const result = runCliCommand('health');
            
            expect(result).toMatchObject({
                status: 'healthy',
                connection: TEST_ENV.NEO4J_URI,
                username: TEST_ENV.NEO4J_USERNAME,
                message: 'Neo4j connected'
            });
        });

        it('should return database statistics', () => {
            const result = runCliCommand('stats');
            
            expect(result).toHaveProperty('nodeCount');
            expect(result).toHaveProperty('relationshipCount');
            expect(result).toHaveProperty('labels');
            expect(result).toHaveProperty('relationshipTypes');
            expect(typeof result.nodeCount).toBe('number');
            expect(typeof result.relationshipCount).toBe('number');
            expect(Array.isArray(result.labels)).toBe(true);
            expect(Array.isArray(result.relationshipTypes)).toBe(true);
        });

        it('should list memory labels', () => {
            const result = runCliCommand('labels');
            
            expect(Array.isArray(result)).toBe(true);
            result.forEach(label => {
                expect(label).toHaveProperty('label');
                expect(label).toHaveProperty('count');
                expect(typeof label.label).toBe('string');
                expect(typeof label.count).toBe('number');
            });
        });
    });

    describe('Memory Operations Tests', () => {
        describe('Create Operations', () => {
            it('should create a new memory node with properties', () => {
                const properties = {
                    name: 'test-memory',
                    type: 'unit-test',
                    description: 'Test memory node for CLI testing'
                };
                
                const result = runCliCommand(`create test_memory '${JSON.stringify(properties)}'`);
                testNodeIds.push(result.id); // Store for cleanup
                
                expect(result).toHaveProperty('id');
                expect(result).toHaveProperty('labels');
                expect(result).toHaveProperty('properties');
                expect(result.labels).toContain('test_memory');
                expect(result.properties.name).toBe(properties.name);
                expect(result.properties.type).toBe(properties.type);
                expect(result.properties.description).toBe(properties.description);
                expect(result.properties).toHaveProperty('created_at');
            });

            it('should create memory node with minimal properties', () => {
                const properties = { name: 'minimal-test' };
                
                const result = runCliCommand(`create minimal '${JSON.stringify(properties)}'`);
                testNodeIds.push(result.id);
                
                expect(result.properties.name).toBe('minimal-test');
                expect(result.properties).toHaveProperty('created_at');
                expect(result.labels).toContain('minimal');
            });

            it('should handle special characters in properties', () => {
                const properties = {
                    name: 'special-chars',
                    content: 'Test with "quotes" and \\backslashes\\ and émojis 🚀',
                    code: 'function test() { return "hello"; }'
                };
                
                const result = runCliCommand(`create special '${JSON.stringify(properties)}'`);
                testNodeIds.push(result.id);
                
                expect(result.properties.content).toBe(properties.content);
                expect(result.properties.code).toBe(properties.code);
            });
        });

        describe('Search Operations', () => {
            let searchTestNodeId;

            beforeEach(() => {
                // Create a test node for searching
                const result = runCliCommand(`create searchable '{"name": "searchable-node", "content": "This is a test node for search operations", "category": "testing"}'`);
                searchTestNodeId = result.id;
                testNodeIds.push(searchTestNodeId);
            });

            it('should search memories by name', () => {
                const result = runCliCommand('search "searchable-node" --limit 5');
                
                expect(Array.isArray(result)).toBe(true);
                expect(result.length).toBeGreaterThan(0);
                
                const found = result.find(node => node.id === searchTestNodeId);
                expect(found).toBeDefined();
                expect(found.properties.name).toBe('searchable-node');
            });

            it('should search memories by content', () => {
                const result = runCliCommand('search "search operations" --limit 5');
                
                const found = result.find(node => node.id === searchTestNodeId);
                expect(found).toBeDefined();
            });

            it('should filter search by label', () => {
                const result = runCliCommand('search "searchable" --label searchable --limit 5');
                
                expect(result.every(node => node.labels.includes('searchable'))).toBe(true);
            });

            it('should limit search results', () => {
                const result = runCliCommand('search "test" --limit 2');
                expect(result.length).toBeLessThanOrEqual(2);
            });

            it('should return empty array for non-existent search', () => {
                const result = runCliCommand('search "nonexistent-search-term-12345"');
                expect(Array.isArray(result)).toBe(true);
                expect(result.length).toBe(0);
            });
        });

        describe('Connect Operations', () => {
            let sourceNodeId, targetNodeId;

            beforeEach(() => {
                // Create source and target nodes for connection testing
                const source = runCliCommand(`create source '{"name": "source-node", "type": "connection-test"}'`);
                const target = runCliCommand(`create target '{"name": "target-node", "type": "connection-test"}'`);
                
                sourceNodeId = source.id;
                targetNodeId = target.id;
                testNodeIds.push(sourceNodeId, targetNodeId);
            });

            it('should create relationship between nodes', () => {
                const relationshipProps = {
                    strength: 'strong',
                    type: 'test-relationship'
                };
                
                const result = runCliCommand(`connect ${sourceNodeId} ${targetNodeId} CONNECTS '${JSON.stringify(relationshipProps)}'`);
                
                expect(result).toHaveProperty('type', 'CONNECTS');
                expect(result).toHaveProperty('fromId', sourceNodeId);
                expect(result).toHaveProperty('toId', targetNodeId);
                expect(result.properties.strength).toBe('strong');
                expect(result.properties.type).toBe('test-relationship');
                expect(result.properties).toHaveProperty('created_at');
            });

            it('should create relationship with minimal properties', () => {
                const result = runCliCommand(`connect ${sourceNodeId} ${targetNodeId} LINKS`);
                
                expect(result.type).toBe('LINKS');
                expect(result.fromId).toBe(sourceNodeId);
                expect(result.toId).toBe(targetNodeId);
                expect(result.properties).toHaveProperty('created_at');
            });

            it('should handle different relationship types', () => {
                const relationshipTypes = ['DEPENDS_ON', 'INCLUDES', 'REFERENCES', 'CONTAINS'];
                
                for (const relType of relationshipTypes) {
                    const result = runCliCommand(`connect ${sourceNodeId} ${targetNodeId} ${relType}`);
                    expect(result.type).toBe(relType);
                }
            });
        });

        describe('Update Operations', () => {
            let updateTestNodeId;

            beforeEach(() => {
                const result = runCliCommand(`create updatable '{"name": "updatable-node", "status": "initial", "version": 1}'`);
                updateTestNodeId = result.id;
                testNodeIds.push(updateTestNodeId);
            });

            it('should update node properties', () => {
                const updateProps = {
                    status: 'updated',
                    version: 2,
                    newProperty: 'added'
                };
                
                const result = runCliCommand(`update ${updateTestNodeId} '${JSON.stringify(updateProps)}'`);
                
                expect(result.properties.status).toBe('updated');
                expect(result.properties.version).toBe(2);
                expect(result.properties.newProperty).toBe('added');
                expect(result.properties.name).toBe('updatable-node'); // Original property preserved
                expect(result.properties).toHaveProperty('updated_at');
            });

            it('should merge properties without overwriting all', () => {
                const updateProps = { additionalInfo: 'extra data' };
                
                const result = runCliCommand(`update ${updateTestNodeId} '${JSON.stringify(updateProps)}'`);
                
                expect(result.properties.name).toBe('updatable-node');
                expect(result.properties.status).toBe('initial');
                expect(result.properties.additionalInfo).toBe('extra data');
            });
        });

        describe('Delete Operations', () => {
            it('should delete a node and return its details', () => {
                // Create a node to delete
                const created = runCliCommand(`create deletable '{"name": "to-be-deleted", "purpose": "deletion-test"}'`);
                
                const result = runCliCommand(`delete ${created.id}`);
                
                expect(result).toHaveProperty('deleted', true);
                expect(result.id).toBe(created.id);
                expect(result.properties.name).toBe('to-be-deleted');
                
                // Verify node is actually deleted by trying to search for it
                const searchResult = runCliCommand(`search "to-be-deleted"`);
                expect(searchResult.find(node => node.id === created.id)).toBeUndefined();
            });

            it('should delete node with relationships', () => {
                // Create two nodes and connect them
                const node1 = runCliCommand(`create deletable1 '{"name": "node-with-relationship"}'`);
                const node2 = runCliCommand(`create deletable2 '{"name": "connected-node"}'`);
                testNodeIds.push(node2.id); // Keep node2 for later cleanup
                
                runCliCommand(`connect ${node1.id} ${node2.id} CONNECTED`);
                
                // Delete node1 (should also delete the relationship)
                const result = runCliCommand(`delete ${node1.id}`);
                
                expect(result.deleted).toBe(true);
                expect(result.id).toBe(node1.id);
            });
        });
    });

    describe('Database Operations Tests', () => {
        describe('Raw Query Operations', () => {
            it('should execute simple read query', () => {
                const result = runCliCommand('query "RETURN 1 as number, \'hello\' as greeting" --read-only');
                
                expect(Array.isArray(result)).toBe(true);
                expect(result.length).toBe(1);
                expect(result[0]).toMatchObject({
                    number: 1,
                    greeting: 'hello'
                });
            });

            it('should execute query with parameters', () => {
                const params = { name: 'test-param', value: 42 };
                const result = runCliCommand(`query 'RETURN $name as name, $value as value' --params '${JSON.stringify(params)}' --read-only`);
                
                expect(result[0]).toMatchObject({
                    name: 'test-param',
                    value: 42
                });
            });

            it('should execute write query', () => {
                const result = runCliCommand(`query "CREATE (n:temp_test {name: 'temp-node'}) RETURN id(n) as nodeId"`);
                
                expect(result[0]).toHaveProperty('nodeId');
                expect(typeof result[0].nodeId).toBe('number');
                
                // Cleanup the temporary node
                const nodeId = result[0].nodeId;
                runCliCommand(`delete ${nodeId}`);
            });

            it('should return node and relationship data', () => {
                // Create test data for complex query
                const node1 = runCliCommand(`create querytest1 '{"name": "query-node-1"}'`);
                const node2 = runCliCommand(`create querytest2 '{"name": "query-node-2"}'`);
                testNodeIds.push(node1.id, node2.id);
                
                runCliCommand(`connect ${node1.id} ${node2.id} QUERY_TEST '{"weight": 5}'`);
                
                const result = runCliCommand(`query "MATCH (a:querytest1)-[r:QUERY_TEST]->(b:querytest2) RETURN a.name, type(r), b.name, r.weight" --read-only`);
                
                expect(result[0]).toMatchObject({
                    'a.name': 'query-node-1',
                    'type(r)': 'QUERY_TEST',
                    'b.name': 'query-node-2',
                    'r.weight': 5
                });
            });
        });

        describe('Schema Operations', () => {
            it('should return schema information', () => {
                const result = runCliCommand('schema');
                
                expect(result).toHaveProperty('constraints');
                expect(result).toHaveProperty('indexes');
                expect(Array.isArray(result.constraints)).toBe(true);
                expect(Array.isArray(result.indexes)).toBe(true);
            });
        });
    });

    describe('Error Handling Tests', () => {
        it('should handle invalid JSON in create command', () => {
            const result = runCliCommand('create test \'invalid-json\'', true);
            expect(result).toHaveProperty('error');
        });

        it('should handle non-existent node ID in update', () => {
            const result = runCliCommand('update 999999 \'{"test": "value"}\'', true);
            expect(result).toHaveProperty('error');
        });

        it('should handle non-existent node ID in delete', () => {
            const result = runCliCommand('delete 999999', true);
            expect(result).toHaveProperty('error');
        });

        it('should handle invalid node IDs in connect', () => {
            const result = runCliCommand('connect 999999 999998 TEST_REL', true);
            expect(result).toHaveProperty('error');
        });

        it('should handle malformed Cypher query', () => {
            const result = runCliCommand('query "INVALID CYPHER SYNTAX"', true);
            expect(result).toHaveProperty('error');
        });

        it('should handle invalid JSON parameters', () => {
            const result = runCliCommand('query "RETURN 1" --params "invalid-json"', true);
            expect(result).toHaveProperty('error');
        });
    });

    describe('Output Format Tests', () => {
        it('should support JSON format (default)', () => {
            const result = runCliCommand('health');
            expect(typeof result).toBe('object');
            expect(result).toHaveProperty('status');
        });

        it('should support text format', () => {
            try {
                const result = execSync(`${CLI_PATH} health --format text`, {
                    encoding: 'utf8',
                    env: { ...process.env, ...TEST_ENV }
                });
                
                // Text format should return string representation
                expect(typeof result).toBe('string');
                expect(result.trim()).toContain('healthy');
            } catch (error) {
                throw error;
            }
        });
    });

    describe('Integration Workflow Tests', () => {
        it('should complete full workflow: create → connect → search → update → delete', () => {
            // Step 1: Create two nodes
            const project = runCliCommand(`create project '{"name": "workflow-project", "status": "active"}'`);
            const task = runCliCommand(`create task '{"name": "workflow-task", "priority": "high"}'`);
            
            expect(project.id).toBeDefined();
            expect(task.id).toBeDefined();
            
            // Step 2: Connect them
            const relationship = runCliCommand(`connect ${project.id} ${task.id} CONTAINS '{"assigned_date": "2025-08-23"}'`);
            expect(relationship.type).toBe('CONTAINS');
            
            // Step 3: Search for them
            const searchResults = runCliCommand('search "workflow"');
            expect(searchResults.length).toBeGreaterThanOrEqual(2);
            
            // Step 4: Update one node
            const updatedTask = runCliCommand(`update ${task.id} '{"status": "completed", "priority": "done"}'`);
            expect(updatedTask.properties.status).toBe('completed');
            expect(updatedTask.properties.priority).toBe('done');
            expect(updatedTask.properties.name).toBe('workflow-task'); // Original preserved
            
            // Step 5: Query the relationship
            const queryResult = runCliCommand(`query "MATCH (p:project)-[r:CONTAINS]->(t:task) WHERE id(p) = ${project.id} RETURN t.status, r.assigned_date" --read-only`);
            expect(queryResult[0]).toMatchObject({
                't.status': 'completed',
                'r.assigned_date': '2025-08-23'
            });
            
            // Step 6: Clean up
            runCliCommand(`delete ${task.id}`);
            runCliCommand(`delete ${project.id}`);
            
            // Verify deletion
            const finalSearch = runCliCommand('search "workflow"');
            expect(finalSearch.find(node => node.id === project.id || node.id === task.id)).toBeUndefined();
        });
    });
});
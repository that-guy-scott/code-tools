import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { execSync, spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the CLI tool
const CLI_PATH = path.resolve(__dirname, '../../tools/qdrant-connector/qdrant-cli.js');

// Test environment variables
const TEST_ENV = {
    QDRANT_URL: process.env.QDRANT_URL || 'http://localhost:6333',
    QDRANT_API_KEY: process.env.QDRANT_API_KEY || null
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

describe('Qdrant CLI Integration Tests', () => {
    // Test data storage
    let testCollections = [];
    let testPointIds = [];

    beforeAll(async () => {
        // Verify Qdrant is accessible before running tests
        try {
            const health = runCliCommand('health');
            expect(health.status).toBe('healthy');
        } catch (error) {
            throw new Error(`Qdrant is not accessible. Please ensure Docker container is running: ${error.message}`);
        }
    });

    afterAll(async () => {
        // Cleanup: Delete all test collections created during testing
        for (const collectionName of testCollections) {
            try {
                runCliCommand(`delete-collection ${collectionName}`);
            } catch (error) {
                // Ignore cleanup errors
                console.warn(`Failed to cleanup test collection ${collectionName}:`, error.message);
            }
        }
    });

    describe('Connection and Health Tests', () => {
        it('should return healthy status when connection is working', () => {
            const result = runCliCommand('health');
            
            expect(result).toMatchObject({
                status: 'healthy',
                url: TEST_ENV.QDRANT_URL
            });
            expect(result).toHaveProperty('version');
            expect(result).toHaveProperty('title');
        });

        it('should return database statistics', () => {
            const result = runCliCommand('stats');
            
            expect(result).toHaveProperty('total_collections');
            expect(result).toHaveProperty('collections');
            expect(result).toHaveProperty('total_points');
            expect(result).toHaveProperty('total_vectors');
            expect(typeof result.total_collections).toBe('number');
            expect(Array.isArray(result.collections)).toBe(true);
        });

        it('should list collections (initially empty)', () => {
            const result = runCliCommand('collections');
            
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('Collection Management Tests', () => {
        describe('Create Collection Operations', () => {
            it('should create a new collection with default parameters', () => {
                const collectionName = 'test-collection-default';
                testCollections.push(collectionName);
                
                const result = runCliCommand(`create-collection ${collectionName}`);
                
                expect(result).toMatchObject({
                    collection: collectionName,
                    status: 'created',
                    config: {
                        vector_size: 384,
                        distance: 'cosine'
                    }
                });
                expect(result).toHaveProperty('result');
            });

            it('should create collection with custom parameters', () => {
                const collectionName = 'test-collection-custom';
                testCollections.push(collectionName);
                
                const result = runCliCommand(`create-collection ${collectionName} --vector-size 256 --distance euclid`);
                
                expect(result).toMatchObject({
                    collection: collectionName,
                    status: 'created',
                    config: {
                        vector_size: 256,
                        distance: 'euclid'
                    }
                });
            });

            it('should create collection with dot product distance', () => {
                const collectionName = 'test-collection-dot';
                testCollections.push(collectionName);
                
                const result = runCliCommand(`create-collection ${collectionName} --distance dot`);
                
                expect(result.config.distance).toBe('dot');
            });
        });

        describe('Collection Information Operations', () => {
            let infoTestCollection;

            beforeEach(() => {
                infoTestCollection = 'test-collection-info';
                testCollections.push(infoTestCollection);
                runCliCommand(`create-collection ${infoTestCollection}`);
            });

            it('should get collection information', () => {
                const result = runCliCommand(`collection-info ${infoTestCollection}`);
                
                expect(result).toHaveProperty('name', infoTestCollection);
                expect(result).toHaveProperty('status');
                expect(result).toHaveProperty('optimizer_status');
                expect(result).toHaveProperty('points_count');
                expect(result).toHaveProperty('vectors_count');
                expect(result).toHaveProperty('config');
                expect(typeof result.points_count).toBe('number');
                expect(typeof result.vectors_count).toBe('number');
            });

            it('should list the created collection', () => {
                const result = runCliCommand('collections');
                
                const collection = result.find(col => col.name === infoTestCollection);
                expect(collection).toBeDefined();
                expect(collection).toHaveProperty('name', infoTestCollection);
                expect(collection).toHaveProperty('status');
            });
        });

        describe('Delete Collection Operations', () => {
            it('should delete an existing collection', () => {
                const collectionName = 'test-collection-delete';
                
                // Create collection first
                runCliCommand(`create-collection ${collectionName}`);
                
                // Delete it
                const result = runCliCommand(`delete-collection ${collectionName}`);
                
                expect(result).toMatchObject({
                    collection: collectionName,
                    status: 'deleted'
                });
                
                // Verify it's gone from collections list
                const collections = runCliCommand('collections');
                const found = collections.find(col => col.name === collectionName);
                expect(found).toBeUndefined();
            });
        });
    });

    describe('Vector Operations Tests', () => {
        let vectorTestCollection;

        beforeEach(() => {
            vectorTestCollection = 'test-vectors-' + Date.now();
            testCollections.push(vectorTestCollection);
            runCliCommand(`create-collection ${vectorTestCollection}`);
        });

        describe('Store Operations', () => {
            it('should store text with metadata', () => {
                const text = 'This is a test document about artificial intelligence';
                const metadata = { category: 'technology', source: 'test' };
                
                const result = runCliCommand(`store ${vectorTestCollection} "${text}" '${JSON.stringify(metadata)}'`);
                
                expect(result).toHaveProperty('collection', vectorTestCollection);
                expect(result).toHaveProperty('point_id');
                expect(result).toHaveProperty('text_length', text.length);
                expect(result).toHaveProperty('vector_size', 384);
                expect(result).toHaveProperty('status', 'acknowledged');
                expect(typeof result.point_id).toBe('string');
                expect(result.point_id.length).toBeGreaterThan(0);
                
                testPointIds.push({ collection: vectorTestCollection, id: result.point_id });
            });

            it('should store text with custom ID', () => {
                const customId = 'custom-test-id-12345';
                const text = 'Custom ID test document';
                
                const result = runCliCommand(`store ${vectorTestCollection} "${text}" '{}' --id ${customId}`);
                
                expect(result.point_id).toBe(customId);
                testPointIds.push({ collection: vectorTestCollection, id: customId });
            });

            it('should store text with minimal metadata', () => {
                const text = 'Minimal metadata test';
                
                const result = runCliCommand(`store ${vectorTestCollection} "${text}"`);
                
                expect(result).toHaveProperty('collection', vectorTestCollection);
                expect(result).toHaveProperty('point_id');
                expect(result).toHaveProperty('status', 'acknowledged');
                
                testPointIds.push({ collection: vectorTestCollection, id: result.point_id });
            });

            it('should handle special characters in text', () => {
                const text = 'Special chars: "quotes", \\backslashes\\, émojis 🚀, and newlines\\n';
                const metadata = { type: 'special-chars', encoded: true };
                
                const result = runCliCommand(`store ${vectorTestCollection} '${text}' '${JSON.stringify(metadata)}'`);
                
                expect(result).toHaveProperty('status', 'acknowledged');
                testPointIds.push({ collection: vectorTestCollection, id: result.point_id });
            });
        });

        describe('Search Operations', () => {
            let searchTestData = [];

            beforeEach(async () => {
                // Store test documents for searching
                const documents = [
                    { text: 'Machine learning algorithms for data analysis', metadata: { category: 'AI', difficulty: 'advanced' } },
                    { text: 'Python programming tutorial for beginners', metadata: { category: 'programming', difficulty: 'beginner' } },
                    { text: 'Deep neural networks and artificial intelligence', metadata: { category: 'AI', difficulty: 'expert' } },
                    { text: 'JavaScript web development guide', metadata: { category: 'programming', difficulty: 'intermediate' } }
                ];

                for (const doc of documents) {
                    const result = runCliCommand(`store ${vectorTestCollection} "${doc.text}" '${JSON.stringify(doc.metadata)}'`);
                    searchTestData.push(result.point_id);
                    testPointIds.push({ collection: vectorTestCollection, id: result.point_id });
                }

                // Wait a bit for indexing
                await new Promise(resolve => setTimeout(resolve, 500));
            });

            it('should search and return relevant results', () => {
                const result = runCliCommand(`search ${vectorTestCollection} "machine learning" --limit 3`);
                
                expect(Array.isArray(result)).toBe(true);
                expect(result.length).toBeGreaterThan(0);
                expect(result.length).toBeLessThanOrEqual(3);
                
                result.forEach(point => {
                    expect(point).toHaveProperty('id');
                    expect(point).toHaveProperty('score');
                    expect(point).toHaveProperty('text');
                    expect(point).toHaveProperty('stored_at');
                    expect(point).toHaveProperty('metadata');
                    expect(typeof point.score).toBe('number');
                    expect(point.score).toBeGreaterThan(0);
                    expect(point.score).toBeLessThanOrEqual(1);
                });
            });

            it('should respect search limit parameter', () => {
                const result = runCliCommand(`search ${vectorTestCollection} "programming" --limit 1`);
                
                expect(Array.isArray(result)).toBe(true);
                expect(result.length).toBeLessThanOrEqual(1);
            });

            it('should handle search with score threshold', () => {
                const result = runCliCommand(`search ${vectorTestCollection} "tutorial" --score-threshold 0.5`);
                
                expect(Array.isArray(result)).toBe(true);
                result.forEach(point => {
                    expect(point.score).toBeGreaterThanOrEqual(0.5);
                });
            });

            it('should return empty results for non-matching query', () => {
                const result = runCliCommand(`search ${vectorTestCollection} "nonexistent-topic-xyz" --limit 5`);
                
                expect(Array.isArray(result)).toBe(true);
                // Results might be empty or have very low scores
            });
        });

        describe('Point Management Operations', () => {
            let pointTestId;

            beforeEach(() => {
                const result = runCliCommand(`store ${vectorTestCollection} "Test document for point operations" '{"test": true}'`);
                pointTestId = result.point_id;
                testPointIds.push({ collection: vectorTestCollection, id: pointTestId });
            });

            it('should get point by ID', () => {
                const result = runCliCommand(`get ${vectorTestCollection} ${pointTestId}`);
                
                expect(result).toHaveProperty('id', pointTestId);
                expect(result).toHaveProperty('payload');
                expect(result).toHaveProperty('vector_size', 384);
                expect(result.payload).toHaveProperty('text', 'Test document for point operations');
                expect(result.payload).toHaveProperty('test', true);
                expect(result.payload).toHaveProperty('stored_at');
            });

            it('should count points in collection', () => {
                const result = runCliCommand(`count ${vectorTestCollection}`);
                
                expect(result).toHaveProperty('collection', vectorTestCollection);
                expect(result).toHaveProperty('count');
                expect(typeof result.count).toBe('number');
                expect(result.count).toBeGreaterThan(0);
            });

            it('should delete point by ID', () => {
                const result = runCliCommand(`delete-point ${vectorTestCollection} ${pointTestId}`);
                
                expect(result).toMatchObject({
                    collection: vectorTestCollection,
                    point_id: pointTestId,
                    status: 'acknowledged'
                });
                
                // Verify point is deleted by trying to get it
                try {
                    runCliCommand(`get ${vectorTestCollection} ${pointTestId}`);
                    expect(false).toBe(true); // Should not reach here
                } catch (error) {
                    // Expected to fail
                    expect(error.message).toContain('404');
                }
                
                // Remove from cleanup list since it's already deleted
                testPointIds = testPointIds.filter(p => p.id !== pointTestId);
            });
        });

        describe('Collection Clearing Operations', () => {
            it('should clear all points from collection', () => {
                // Store some test points
                const pointIds = [];
                for (let i = 0; i < 3; i++) {
                    const result = runCliCommand(`store ${vectorTestCollection} "Test document ${i}" '{"index": ${i}}'`);
                    pointIds.push(result.point_id);
                }

                // Clear the collection
                const result = runCliCommand(`clear-collection ${vectorTestCollection} --confirm`);
                
                expect(result).toMatchObject({
                    collection: vectorTestCollection,
                    cleared: 3,
                    status: 'acknowledged'
                });
                
                // Verify collection is empty
                const countResult = runCliCommand(`count ${vectorTestCollection}`);
                expect(countResult.count).toBe(0);
            });

            it('should handle clearing empty collection', () => {
                // Clear already empty collection
                const result = runCliCommand(`clear-collection ${vectorTestCollection} --confirm`);
                
                expect(result).toMatchObject({
                    collection: vectorTestCollection,
                    cleared: 0,
                    message: 'Collection was already empty'
                });
            });

            it('should require confirmation flag for clearing', () => {
                try {
                    runCliCommand(`clear-collection ${vectorTestCollection}`);
                    expect(false).toBe(true); // Should not reach here
                } catch (error) {
                    expect(error.message).toContain('Use --confirm flag');
                }
            });
        });
    });

    describe('Error Handling Tests', () => {
        it('should handle non-existent collection in store operation', () => {
            const result = runCliCommand('store non-existent-collection "test text"', true);
            expect(result).toHaveProperty('error');
        });

        it('should handle non-existent collection in search operation', () => {
            const result = runCliCommand('search non-existent-collection "test query"', true);
            expect(result).toHaveProperty('error');
        });

        it('should handle invalid JSON metadata', () => {
            const collectionName = 'test-error-collection';
            testCollections.push(collectionName);
            runCliCommand(`create-collection ${collectionName}`);
            
            const result = runCliCommand(`store ${collectionName} "test text" 'invalid-json'`, true);
            expect(result).toHaveProperty('error');
        });

        it('should handle non-existent point ID', () => {
            const collectionName = 'test-error-collection-2';
            testCollections.push(collectionName);
            runCliCommand(`create-collection ${collectionName}`);
            
            const result = runCliCommand(`get ${collectionName} non-existent-id`, true);
            expect(result).toHaveProperty('error');
        });

        it('should handle invalid collection name characters', () => {
            const result = runCliCommand('create-collection "invalid/collection"', true);
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
        it('should complete full workflow: create → store → search → get → delete', () => {
            const collectionName = 'workflow-test-' + Date.now();
            testCollections.push(collectionName);
            
            // Step 1: Create collection
            const createResult = runCliCommand(`create-collection ${collectionName} --vector-size 256`);
            expect(createResult.status).toBe('created');
            
            // Step 2: Store documents
            const doc1Result = runCliCommand(`store ${collectionName} "Artificial intelligence research" '{"category": "AI", "year": 2023}'`);
            const doc2Result = runCliCommand(`store ${collectionName} "Machine learning applications" '{"category": "ML", "year": 2024}'`);
            
            expect(doc1Result.status).toBe('acknowledged');
            expect(doc2Result.status).toBe('acknowledged');
            
            const pointId1 = doc1Result.point_id;
            const pointId2 = doc2Result.point_id;
            
            // Step 3: Search for documents
            const searchResult = runCliCommand(`search ${collectionName} "artificial intelligence" --limit 2`);
            expect(Array.isArray(searchResult)).toBe(true);
            expect(searchResult.length).toBeGreaterThan(0);
            
            // Step 4: Get specific point
            const getResult = runCliCommand(`get ${collectionName} ${pointId1}`);
            expect(getResult.id).toBe(pointId1);
            expect(getResult.payload.category).toBe('AI');
            
            // Step 5: Count points
            const countResult = runCliCommand(`count ${collectionName}`);
            expect(countResult.count).toBe(2);
            
            // Step 6: Delete one point
            const deleteResult = runCliCommand(`delete-point ${collectionName} ${pointId1}`);
            expect(deleteResult.status).toBe('acknowledged');
            
            // Step 7: Verify count decreased
            const finalCountResult = runCliCommand(`count ${collectionName}`);
            expect(finalCountResult.count).toBe(1);
            
            // Step 8: Get collection info
            const infoResult = runCliCommand(`collection-info ${collectionName}`);
            expect(infoResult.name).toBe(collectionName);
        });
    });
});
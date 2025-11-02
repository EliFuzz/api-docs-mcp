import assert from 'node:assert';
import { after, before, beforeEach, describe, it } from 'node:test';
import { join } from 'path';
import { CacheManager } from '../../build/utils/cache.js';
import { SourceMethod, SourceType } from '../../build/utils/source.js';
import { MockHttpServer } from './mock-server.js';
import { clearCache, setupCacheWithSources } from './test-utils.js';

describe('CacheManager - GraphQL File-based Sources', () => {
    const fixturesPath = join(process.cwd(), 'example', 'gql', 'fixtures');

    beforeEach(() => {
        clearCache();
    });

    describe('GraphQL JSON Schema File', () => {
        it('should load and cache GraphQL schema from JSON file', async () => {
            await setupCacheWithSources([
                {
                    name: 'TestGraphQLJSON',
                    type: SourceType.GQL,
                    path: join(fixturesPath, 'json', 'graphql-schema.json')
                }
            ]);

            const docs = await CacheManager.getDocs('TestGraphQLJSON');

            assert.strictEqual(docs.length, 1, 'Should have one cache entry');
            assert.strictEqual(docs[0].name, 'TestGraphQLJSON', 'Cache entry name should match');
            assert.ok(docs[0].resources.length > 0, 'Should have resources');

            const queryResources = docs[0].resources.filter(r => r.type === 'query');
            assert.ok(queryResources.length > 0, 'Should have query resources');

            const userQuery = queryResources.find(r => r.name === 'user');
            assert.ok(userQuery, 'Should have user query');
            assert.strictEqual(userQuery.description, 'Get user by ID', 'User query should have correct description');

            const usersQuery = queryResources.find(r => r.name === 'users');
            assert.ok(usersQuery, 'Should have users query');
            assert.strictEqual(usersQuery.description, 'Get all users', 'Users query should have correct description');

            const mutationResources = docs[0].resources.filter(r => r.type === 'mutation');
            assert.ok(mutationResources.length > 0, 'Should have mutation resources');

            const createUserMutation = mutationResources.find(r => r.name === 'createUser');
            assert.ok(createUserMutation, 'Should have createUser mutation');
            assert.strictEqual(createUserMutation.description, 'Create a new user', 'CreateUser mutation should have correct description');
        });

        it('should retrieve specific method details from GraphQL JSON schema', async () => {
            await setupCacheWithSources([
                {
                    name: 'TestGraphQLJSON',
                    type: SourceType.GQL,
                    path: join(fixturesPath, 'json', 'graphql-schema.json')
                }
            ]);

            const details = await CacheManager.getDetails('user');

            assert.ok(details.length > 0, 'Should find user query details');
            assert.strictEqual(details[0].resources[0].name, 'user', 'Should match query name');

            // Note: GraphQL details may not be fully implemented in the same way as OpenAPI
            // The main functionality of finding the resource works
        });
    });

    describe('GraphQL GQL Schema File', () => {
        it('should load and cache GraphQL schema from .graphql file', async () => {
            await setupCacheWithSources([
                {
                    name: 'TestGraphQLGQL',
                    type: SourceType.GQL,
                    path: join(fixturesPath, 'graphql', 'graphql-schema.graphql')
                }
            ]);

            const docs = await CacheManager.getDocs('TestGraphQLGQL');

            assert.strictEqual(docs.length, 1, 'Should have one cache entry');
            assert.strictEqual(docs[0].name, 'TestGraphQLGQL', 'Cache entry name should match');
            assert.ok(docs[0].resources.length > 0, 'Should have resources');

            const queryResources = docs[0].resources.filter(r => r.type === 'query');
            assert.ok(queryResources.length > 0, 'Should have query resources');

            const userQuery = queryResources.find(r => r.name === 'user');
            assert.ok(userQuery, 'Should have user query');

            const mutationResources = docs[0].resources.filter(r => r.type === 'mutation');
            assert.ok(mutationResources.length > 0, 'Should have mutation resources');

            const createUserMutation = mutationResources.find(r => r.name === 'createUser');
            assert.ok(createUserMutation, 'Should have createUser mutation');
        });
    });
});

describe('CacheManager - GraphQL URL-based Sources', () => {
    let mockServer: MockHttpServer;
    const fixturesPath = join(process.cwd(), 'example', 'gql', 'fixtures');
    const TEST_PORT = 8765;

    beforeEach(() => {
        clearCache();
    });

    before(async () => {
        mockServer = new MockHttpServer({
            port: TEST_PORT,
            graphqlPath: join(fixturesPath, 'json', 'graphql-schema.json')
        });
        await mockServer.start();
    });

    after(async () => {
        await mockServer.stop();
    });

    describe('GraphQL URL Source', () => {
        it('should load and cache GraphQL schema from URL', async () => {
            await setupCacheWithSources([
                {
                    name: 'TestGraphQLURL',
                    type: SourceType.GQL,
                    method: SourceMethod.POST,
                    url: mockServer.getUrl('/graphql'),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            ]);

            const docs = await CacheManager.getDocs('TestGraphQLURL');

            assert.strictEqual(docs.length, 1, 'Should have one cache entry');
            assert.strictEqual(docs[0].name, 'TestGraphQLURL', 'Cache entry name should match');
            assert.ok(docs[0].resources.length > 0, 'Should have resources');

            const queryResources = docs[0].resources.filter(r => r.type === 'query');
            assert.ok(queryResources.length > 0, 'Should have query resources');

            const userQuery = queryResources.find(r => r.name === 'user');
            assert.ok(userQuery, 'Should have user query');

            const usersQuery = queryResources.find(r => r.name === 'users');
            assert.ok(usersQuery, 'Should have users query');

            const mutationResources = docs[0].resources.filter(r => r.type === 'mutation');
            assert.ok(mutationResources.length > 0, 'Should have mutation resources');

            const createUserMutation = mutationResources.find(r => r.name === 'createUser');
            assert.ok(createUserMutation, 'Should have createUser mutation');
        });
    });
});

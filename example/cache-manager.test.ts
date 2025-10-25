import assert from 'node:assert';
import { after, before, beforeEach, describe, it } from 'node:test';
import { join } from 'path';
import { CacheManager } from '../build/utils/cache.js';
import { SourceMethod, SourceType } from '../build/utils/source.js';
import { MockHttpServer } from './helpers/mock-server.js';
import { clearCache, setupCacheWithSources } from './helpers/test-utils.js';

describe('CacheManager - File-based Sources', () => {
    const fixturesPath = join(process.cwd(), 'example', 'fixtures');

    beforeEach(() => {
        clearCache();
    });

    describe('GraphQL JSON Schema File', () => {
        it('should load and cache GraphQL schema from JSON file', async () => {
            await setupCacheWithSources([
                {
                    name: 'TestGraphQLJSON',
                    type: SourceType.GQL,
                    path: join(fixturesPath, 'graphql/graphql-schema.json')
                }
            ]);

            const docs = await CacheManager.getDocs('TestGraphQLJSON');

            assert.strictEqual(docs.length, 1, 'Should have one cache entry');
            assert.strictEqual(docs[0].name, 'TestGraphQLJSON', 'Cache entry name should match');
            assert.ok(docs[0].resources.length > 0, 'Should have resources');

            const queryResources = docs[0].resources.filter(r => r.resourceType === 'query');
            assert.ok(queryResources.length > 0, 'Should have query resources');

            const userQuery = queryResources.find(r => r.name === 'user');
            assert.ok(userQuery, 'Should have user query');
            assert.strictEqual(userQuery.context, 'Get user by ID', 'User query should have correct description');

            const usersQuery = queryResources.find(r => r.name === 'users');
            assert.ok(usersQuery, 'Should have users query');
            assert.strictEqual(usersQuery.context, 'Get all users', 'Users query should have correct description');

            const mutationResources = docs[0].resources.filter(r => r.resourceType === 'mutation');
            assert.ok(mutationResources.length > 0, 'Should have mutation resources');

            const createUserMutation = mutationResources.find(r => r.name === 'createUser');
            assert.ok(createUserMutation, 'Should have createUser mutation');
            assert.strictEqual(createUserMutation.context, 'Create a new user', 'CreateUser mutation should have correct description');
        });

        it('should retrieve specific method details from GraphQL JSON schema', async () => {
            await setupCacheWithSources([
                {
                    name: 'TestGraphQLJSON',
                    type: SourceType.GQL,
                    path: join(fixturesPath, 'graphql/graphql-schema.json')
                }
            ]);

            const details = await CacheManager.getDetails('user');

            assert.ok(details.length > 0, 'Should find user query details');
            assert.strictEqual(details[0].resources[0].name, 'user', 'Should match query name');

            const userResource = details[0].resources[0];
            assert.ok(userResource.details.request, 'Should have request details');
            assert.ok(userResource.details.response, 'Should have response details');

            const request = JSON.parse(userResource.details.request);
            assert.ok(Array.isArray(request), 'Request should be an array of parameters');
            assert.ok(request.some(param => param.name === 'id'), 'Should have id parameter');

            const response = JSON.parse(userResource.details.response);
            assert.strictEqual(response.type, 'User', 'Response type should be User');
        });
    });

    describe('GraphQL GQL Schema File', () => {
        it('should load and cache GraphQL schema from .graphql file', async () => {
            await setupCacheWithSources([
                {
                    name: 'TestGraphQLGQL',
                    type: SourceType.GQL,
                    path: join(fixturesPath, 'graphql/graphql-schema.graphql')
                }
            ]);

            const docs = await CacheManager.getDocs('TestGraphQLGQL');

            assert.strictEqual(docs.length, 1, 'Should have one cache entry');
            assert.strictEqual(docs[0].name, 'TestGraphQLGQL', 'Cache entry name should match');
            assert.ok(docs[0].resources.length > 0, 'Should have resources');

            const queryResources = docs[0].resources.filter(r => r.resourceType === 'query');
            assert.ok(queryResources.length > 0, 'Should have query resources');

            const userQuery = queryResources.find(r => r.name === 'user');
            assert.ok(userQuery, 'Should have user query');

            const mutationResources = docs[0].resources.filter(r => r.resourceType === 'mutation');
            assert.ok(mutationResources.length > 0, 'Should have mutation resources');

            const createUserMutation = mutationResources.find(r => r.name === 'createUser');
            assert.ok(createUserMutation, 'Should have createUser mutation');
        });
    });

    describe('OpenAPI JSON Schema File', () => {
        it('should load and cache OpenAPI schema from JSON file', async () => {
            await setupCacheWithSources([
                {
                    name: 'TestOpenAPIJSON',
                    type: SourceType.API,
                    path: join(fixturesPath, 'openapi-json', 'openapi-schema.json')
                }
            ]);

            const docs = await CacheManager.getDocs('TestOpenAPIJSON');

            assert.strictEqual(docs.length, 1, 'Should have one cache entry');
            assert.strictEqual(docs[0].name, 'TestOpenAPIJSON', 'Cache entry name should match');
            assert.ok(docs[0].resources.length > 0, 'Should have resources');

            const getUsersEndpoint = docs[0].resources.find(r => r.name === 'GET /users');
            assert.ok(getUsersEndpoint, 'Should have GET /users endpoint');
            assert.strictEqual(getUsersEndpoint.resourceType, 'GET', 'Should have correct resource type');
            assert.strictEqual(getUsersEndpoint.context, 'Get all users', 'Should have correct summary');

            const postUsersEndpoint = docs[0].resources.find(r => r.name === 'POST /users');
            assert.ok(postUsersEndpoint, 'Should have POST /users endpoint');
            assert.strictEqual(postUsersEndpoint.resourceType, 'POST', 'Should have correct resource type');

            const getUserByIdEndpoint = docs[0].resources.find(r => r.name === 'GET /users/{id}');
            assert.ok(getUserByIdEndpoint, 'Should have GET /users/{id} endpoint');

            const putUserEndpoint = docs[0].resources.find(r => r.name === 'PUT /users/{id}');
            assert.ok(putUserEndpoint, 'Should have PUT /users/{id} endpoint');

            const deleteUserEndpoint = docs[0].resources.find(r => r.name === 'DELETE /users/{id}');
            assert.ok(deleteUserEndpoint, 'Should have DELETE /users/{id} endpoint');
        });

        it('should retrieve specific endpoint details from OpenAPI JSON schema', async () => {
            await setupCacheWithSources([
                {
                    name: 'TestOpenAPIJSON',
                    type: SourceType.API,
                    path: join(fixturesPath, 'openapi-json', 'openapi-schema.json')
                }
            ]);

            const details = await CacheManager.getDetails('POST /users');

            assert.ok(details.length > 0, 'Should find POST /users endpoint details');
            assert.strictEqual(details[0].resources[0].name, 'POST /users', 'Should match endpoint name');

            const postResource = details[0].resources[0];
            assert.ok(postResource.details.request, 'Should have request details');
            assert.ok(postResource.details.response, 'Should have response details');

            const request = JSON.parse(postResource.details.request);
            assert.ok(Array.isArray(request), 'Request should be an array');
            assert.ok(request.some(r => r.name === 'body'), 'Should have body in request');

            const response = JSON.parse(postResource.details.response);
            assert.ok(Array.isArray(response), 'Response should be an array');
            assert.ok(response.some(r => r.name === '201'), 'Should have 201 response');
        });
    });

    describe('OpenAPI YAML Schema File', () => {
        it('should load and cache OpenAPI schema from YAML file', async () => {
            await setupCacheWithSources([
                {
                    name: 'TestOpenAPIYAML',
                    type: SourceType.API,
                    path: join(fixturesPath, 'openapi-yaml', 'openapi-schema.yaml')
                }
            ]);

            const docs = await CacheManager.getDocs('TestOpenAPIYAML');

            assert.strictEqual(docs.length, 1, 'Should have one cache entry');
            assert.strictEqual(docs[0].name, 'TestOpenAPIYAML', 'Cache entry name should match');
            assert.ok(docs[0].resources.length > 0, 'Should have resources');

            const getUsersEndpoint = docs[0].resources.find(r => r.name === 'GET /users');
            assert.ok(getUsersEndpoint, 'Should have GET /users endpoint');

            const postUsersEndpoint = docs[0].resources.find(r => r.name === 'POST /users');
            assert.ok(postUsersEndpoint, 'Should have POST /users endpoint');

            const getUserByIdEndpoint = docs[0].resources.find(r => r.name === 'GET /users/{id}');
            assert.ok(getUserByIdEndpoint, 'Should have GET /users/{id} endpoint');
        });
    });

    describe('Multiple Sources', () => {
        it('should handle multiple schema sources simultaneously', async () => {
            await setupCacheWithSources([
                {
                    name: 'GraphQLSource',
                    type: SourceType.GQL,
                    path: join(fixturesPath, 'graphql/graphql-schema.json')
                },
                {
                    name: 'OpenAPISource',
                    type: SourceType.API,
                    path: join(fixturesPath, 'openapi-json', 'openapi-schema.json')
                }
            ]);

            const allDocs = await CacheManager.getDocs();

            assert.ok(allDocs.length >= 2, 'Should have at least two cache entries');

            const gqlDocs = allDocs.filter(d => d.name === 'GraphQLSource');
            assert.strictEqual(gqlDocs.length, 1, 'Should have GraphQL cache entry');

            const apiDocs = allDocs.filter(d => d.name === 'OpenAPISource');
            assert.strictEqual(apiDocs.length, 1, 'Should have OpenAPI cache entry');
        });
    });
});

describe('CacheManager - URL-based Sources', () => {
    let mockServer: MockHttpServer;
    const fixturesPath = join(process.cwd(), 'example', 'fixtures');
    const TEST_PORT = 8765;

    beforeEach(() => {
        clearCache();
    });

    before(async () => {
        mockServer = new MockHttpServer({
            port: TEST_PORT,
            graphqlPath: join(fixturesPath, 'graphql/graphql-schema.json'),
            openApiJsonPath: join(fixturesPath, 'openapi-json', 'openapi-schema.json'),
            openApiYamlPath: join(fixturesPath, 'openapi-yaml', 'openapi-schema.yaml')
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

            const queryResources = docs[0].resources.filter(r => r.resourceType === 'query');
            assert.ok(queryResources.length > 0, 'Should have query resources');

            const userQuery = queryResources.find(r => r.name === 'user');
            assert.ok(userQuery, 'Should have user query');

            const usersQuery = queryResources.find(r => r.name === 'users');
            assert.ok(usersQuery, 'Should have users query');

            const mutationResources = docs[0].resources.filter(r => r.resourceType === 'mutation');
            assert.ok(mutationResources.length > 0, 'Should have mutation resources');

            const createUserMutation = mutationResources.find(r => r.name === 'createUser');
            assert.ok(createUserMutation, 'Should have createUser mutation');
        });
    });

    describe('OpenAPI URL Source - JSON', () => {
        it('should load and cache OpenAPI schema from JSON URL', async () => {
            await setupCacheWithSources([
                {
                    name: 'TestOpenAPIURLJSON',
                    type: SourceType.API,
                    method: SourceMethod.GET,
                    url: mockServer.getUrl('/openapi.json')
                }
            ]);

            const docs = await CacheManager.getDocs('TestOpenAPIURLJSON');

            assert.strictEqual(docs.length, 1, 'Should have one cache entry');
            assert.strictEqual(docs[0].name, 'TestOpenAPIURLJSON', 'Cache entry name should match');
            assert.ok(docs[0].resources.length > 0, 'Should have resources');

            const getUsersEndpoint = docs[0].resources.find(r => r.name === 'GET /users');
            assert.ok(getUsersEndpoint, 'Should have GET /users endpoint');

            const postUsersEndpoint = docs[0].resources.find(r => r.name === 'POST /users');
            assert.ok(postUsersEndpoint, 'Should have POST /users endpoint');
        });
    });

    describe('OpenAPI URL Source - YAML', () => {
        it('should load and cache OpenAPI schema from YAML URL', async () => {
            await setupCacheWithSources([
                {
                    name: 'TestOpenAPIURLYAML',
                    type: SourceType.API,
                    method: SourceMethod.GET,
                    url: mockServer.getUrl('/openapi.yaml')
                }
            ]);

            const docs = await CacheManager.getDocs('TestOpenAPIURLYAML');

            assert.strictEqual(docs.length, 1, 'Should have one cache entry');
            assert.strictEqual(docs[0].name, 'TestOpenAPIURLYAML', 'Cache entry name should match');
            assert.ok(docs[0].resources.length > 0, 'Should have resources');

            const getUsersEndpoint = docs[0].resources.find(r => r.name === 'GET /users');
            assert.ok(getUsersEndpoint, 'Should have GET /users endpoint');

            const postUsersEndpoint = docs[0].resources.find(r => r.name === 'POST /users');
            assert.ok(postUsersEndpoint, 'Should have POST /users endpoint');
        });
    });

    describe('Mixed File and URL Sources', () => {
        it('should handle both file and URL sources together', async () => {
            await setupCacheWithSources([
                {
                    name: 'GraphQLFile',
                    type: SourceType.GQL,
                    path: join(fixturesPath, 'graphql/graphql-schema.json')
                },
                {
                    name: 'GraphQLURL',
                    type: SourceType.GQL,
                    method: SourceMethod.POST,
                    url: mockServer.getUrl('/graphql')
                },
                {
                    name: 'OpenAPIFile',
                    type: SourceType.API,
                    path: join(fixturesPath, 'openapi-json', 'openapi-schema.json')
                },
                {
                    name: 'OpenAPIURL',
                    type: SourceType.API,
                    method: SourceMethod.GET,
                    url: mockServer.getUrl('/openapi.json')
                }
            ]);

            const allDocs = await CacheManager.getDocs();

            assert.ok(allDocs.length >= 4, 'Should have at least four cache entries');

            const graphqlFileDocs = allDocs.filter(d => d.name === 'GraphQLFile');
            assert.strictEqual(graphqlFileDocs.length, 1, 'Should have GraphQL file cache entry');

            const graphqlUrlDocs = allDocs.filter(d => d.name === 'GraphQLURL');
            assert.strictEqual(graphqlUrlDocs.length, 1, 'Should have GraphQL URL cache entry');

            const openapiFileDocs = allDocs.filter(d => d.name === 'OpenAPIFile');
            assert.strictEqual(openapiFileDocs.length, 1, 'Should have OpenAPI file cache entry');

            const openapiUrlDocs = allDocs.filter(d => d.name === 'OpenAPIURL');
            assert.strictEqual(openapiUrlDocs.length, 1, 'Should have OpenAPI URL cache entry');
        });
    });
});

describe('CacheManager - Cache Features', () => {
    const fixturesPath = join(process.cwd(), 'example', 'fixtures');

    beforeEach(() => {
        clearCache();
    });

    it('should cache entries with timestamp', async () => {
        const beforeTime = Date.now();

        await setupCacheWithSources([
            {
                name: 'TimestampTest',
                type: SourceType.GQL,
                path: join(fixturesPath, 'graphql/graphql-schema.json')
            }
        ]);

        const docs = await CacheManager.getDocs('TimestampTest');
        const afterTime = Date.now();

        assert.strictEqual(docs.length, 1, 'Should have one cache entry');
        assert.ok(docs[0].timestamp >= beforeTime, 'Timestamp should be after start time');
        assert.ok(docs[0].timestamp <= afterTime, 'Timestamp should be before end time');
    });

    it('should retrieve all docs without source name filter', async () => {
        await setupCacheWithSources([
            {
                name: 'Source1',
                type: SourceType.GQL,
                path: join(fixturesPath, 'graphql/graphql-schema.json')
            },
            {
                name: 'Source2',
                type: SourceType.API,
                path: join(fixturesPath, 'openapi-json', 'openapi-schema.json')
            }
        ]);

        const allDocs = await CacheManager.getDocs();

        assert.ok(allDocs.length >= 2, 'Should have at least two cache entries');
    });

    it('should filter docs by source name', async () => {
        await setupCacheWithSources([
            {
                name: 'FilterTest1',
                type: SourceType.GQL,
                path: join(fixturesPath, 'graphql/graphql-schema.json')
            },
            {
                name: 'FilterTest2',
                type: SourceType.API,
                path: join(fixturesPath, 'openapi-json', 'openapi-schema.json')
            }
        ]);

        const filteredDocs = await CacheManager.getDocs('FilterTest1');

        assert.strictEqual(filteredDocs.length, 1, 'Should have one cache entry');
        assert.strictEqual(filteredDocs[0].name, 'FilterTest1', 'Should match filtered source name');
    });

    it('should retrieve details for specific methods across all sources', async () => {
        await setupCacheWithSources([
            {
                name: 'DetailsSource',
                type: SourceType.GQL,
                path: join(fixturesPath, 'graphql/graphql-schema.json')
            }
        ]);

        const userDetails = await CacheManager.getDetails('user');

        assert.ok(userDetails.length > 0, 'Should find details for user query');
        assert.ok(userDetails[0].resources.length > 0, 'Should have resources in details');
        assert.strictEqual(userDetails[0].resources[0].name, 'user', 'Should match query name');
    });
});

import assert from 'node:assert';
import { after, before, beforeEach, describe, it } from 'node:test';
import { join } from 'path';
import { CacheManager } from '../../build/utils/cache.js';
import { SourceMethod, SourceType } from '../../build/utils/source.js';
import { MockHttpServer } from './mock-server.js';
import { clearCache, setupCacheWithSources } from './test-utils.js';

describe('CacheManager - OpenAPI File-based Sources', () => {
    const fixturesPath = join(process.cwd(), 'example', 'api', 'fixtures');

    beforeEach(() => {
        clearCache();
    });

    describe('OpenAPI JSON Schema File', () => {
        it('should load and cache OpenAPI schema from JSON file', async () => {
            await setupCacheWithSources([
                {
                    name: 'TestOpenAPIJSON',
                    type: SourceType.API,
                    path: join(fixturesPath, 'json', 'openapi-schema.json')
                }
            ]);

            const docs = await CacheManager.getDocs('TestOpenAPIJSON');

            assert.strictEqual(docs.length, 1, 'Should have one cache entry');
            assert.strictEqual(docs[0].name, 'TestOpenAPIJSON', 'Cache entry name should match');
            assert.ok(docs[0].resources.length > 0, 'Should have resources');

            const getUsersEndpoint = docs[0].resources.find(r => r.name === 'GET /users');
            assert.ok(getUsersEndpoint, 'Should have GET /users endpoint');
            assert.strictEqual(getUsersEndpoint.type, 'GET', 'Should have correct resource type');
            assert.strictEqual(getUsersEndpoint.description, 'Get all users', 'Should have correct summary');

            const postUsersEndpoint = docs[0].resources.find(r => r.name === 'POST /users');
            assert.ok(postUsersEndpoint, 'Should have POST /users endpoint');
            assert.strictEqual(postUsersEndpoint.type, 'POST', 'Should have correct resource type');

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
                    path: join(fixturesPath, 'json', 'openapi-schema.json')
                }
            ]);

            const details = await CacheManager.getDetails('POST /users');

            assert.ok(details.length > 0, 'Should find POST /users endpoint details');
            assert.strictEqual(details[0].resources[0].name, 'POST /users', 'Should match endpoint name');

            const postResource = details[0].resources[0];
            assert.ok(postResource.schema, 'Should have schema');
            assert.strictEqual(typeof postResource.schema, 'string', 'Schema should be a string');

            const schema = JSON.parse(postResource.schema);
            assert.ok(schema.openapi, 'Should have OpenAPI version');
            assert.ok(schema.paths['/users'].post, 'Should have POST /users endpoint in schema');
        });
    });

    describe('OpenAPI YAML Schema File', () => {
        it('should load and cache OpenAPI schema from YAML file', async () => {
            await setupCacheWithSources([
                {
                    name: 'TestOpenAPIYAML',
                    type: SourceType.API,
                    path: join(fixturesPath, 'yaml', 'openapi-schema.yaml')
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
});

describe('CacheManager - OpenAPI URL-based Sources', () => {
    let mockServer: MockHttpServer;
    const fixturesPath = join(process.cwd(), 'example', 'api', 'fixtures');
    const TEST_PORT = 8765;

    beforeEach(() => {
        clearCache();
    });

    before(async () => {
        mockServer = new MockHttpServer({
            port: TEST_PORT,
            openApiJsonPath: join(fixturesPath, 'json', 'openapi-schema.json'),
            openApiYamlPath: join(fixturesPath, 'yaml', 'openapi-schema.yaml')
        });
        await mockServer.start();
    });

    after(async () => {
        await mockServer.stop();
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
});

import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';
import { join } from 'path';
import { CacheManager } from '../../build/utils/cache.js';
import { SourceType } from '../../build/utils/source.js';
import { clearCache, setupCacheWithSources } from '../helpers/test-utils.js';

describe('CacheManager - gRPC File-based Sources', () => {
    const fixturesPath = join(process.cwd(), 'example', 'grpc', 'fixtures');

    beforeEach(() => {
        clearCache();
    });

    describe('gRPC Proto File', () => {
        it('should load and cache gRPC schema from proto file', async () => {
            await setupCacheWithSources([
                {
                    name: 'TestGrpcProto',
                    type: SourceType.GRPC,
                    path: join(fixturesPath, 'main.proto')
                }
            ]);

            const docs = await CacheManager.getDocs('TestGrpcProto');

            assert.strictEqual(docs.length, 1, 'Should have one cache entry');
            assert.strictEqual(docs[0].name, 'TestGrpcProto', 'Cache entry name should match');
            assert.ok(docs[0].resources.length > 0, 'Should have resources');

            const grpcResources = docs[0].resources.filter(r => r.type === 'gRPC');
            assert.ok(grpcResources.length > 0, 'Should have gRPC resources');

            const getUserProfileMethod = grpcResources.find(r => r.name === 'UserManagementService.GetUserProfile');
            assert.ok(getUserProfileMethod, 'Should have GetUserProfile method');

            const createUserMethod = grpcResources.find(r => r.name === 'UserManagementService.CreateUser');
            assert.ok(createUserMethod, 'Should have CreateUser method');

            const listUsersMethod = grpcResources.find(r => r.name === 'UserManagementService.ListUsers');
            assert.ok(listUsersMethod, 'Should have ListUsers method');
        });

        it('should retrieve specific method details from gRPC proto schema', async () => {
            await setupCacheWithSources([
                {
                    name: 'TestGrpcProto',
                    type: SourceType.GRPC,
                    path: join(fixturesPath, 'main.proto')
                }
            ]);

            const details = await CacheManager.getDetails('UserManagementService.CreateUser');

            assert.ok(details.length > 0, 'Should find CreateUser method details');
            assert.strictEqual(details[0].resources[0].name, 'UserManagementService.CreateUser', 'Should match method name');

            const createUserResource = details[0].resources[0];
            assert.ok(createUserResource.schema, 'Should have schema');
            assert.strictEqual(typeof createUserResource.schema, 'string', 'Schema should be a string');
            assert.ok(createUserResource.schema.includes('service UserManagementService'), 'Schema should contain service definition');
            assert.ok(createUserResource.schema.includes('rpc CreateUser'), 'Schema should contain method definition');
        });

        it('should handle multiple proto files with imports', async () => {
            await setupCacheWithSources([
                {
                    name: 'TestGrpcMultipleProto',
                    type: SourceType.GRPC,
                    path: join(fixturesPath, 'main.proto')
                }
            ]);

            const docs = await CacheManager.getDocs('TestGrpcMultipleProto');

            assert.strictEqual(docs.length, 1, 'Should have one cache entry');
            assert.ok(docs[0].resources.length > 0, 'Should have resources');

            // Should include methods from imported services
            const grpcResources = docs[0].resources.filter(r => r.type === 'gRPC');
            const methodNames = grpcResources.map(r => r.name);

            assert.ok(methodNames.includes('UserManagementService.GetUserProfile'), 'Should include imported service methods');
            assert.ok(methodNames.includes('UserManagementService.CreateUser'), 'Should include main service methods');
        });
    });
});

// TODO: Implement URL-based testing once mock server is available
// describe('CacheManager - gRPC URL-based Sources', () => {
//     // URL-based tests will be added when mock server dependencies are resolved
// });

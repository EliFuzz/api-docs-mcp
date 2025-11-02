// import assert from 'node:assert';
// import { after, before, beforeEach, describe, it } from 'node:test';
// import { join } from 'path';
// import { CacheManager } from '../build/utils/cache.js';
// import { SourceMethod, SourceType } from '../build/utils/source.js';
// import { MockGrpcServer } from './helpers/mock-grpc-server.js';
// import { MockHttpServer } from './helpers/mock-server.js';
// import { clearCache, setupCacheWithSources } from './helpers/test-utils.js';

// describe('CacheManager - File-based Sources', () => {
//     const fixturesPath = join(process.cwd(), 'example', 'fixtures');

//     beforeEach(() => {
//         clearCache();
//     });

//     describe('GraphQL JSON Schema File', () => {
//         it('should load and cache GraphQL schema from JSON file', async () => {
//             await setupCacheWithSources([
//                 {
//                     name: 'TestGraphQLJSON',
//                     type: SourceType.GQL,
//                     path: join(fixturesPath, 'graphql/graphql-schema.json')
//                 }
//             ]);

//             const docs = await CacheManager.getDocs('TestGraphQLJSON');

//             assert.strictEqual(docs.length, 1, 'Should have one cache entry');
//             assert.strictEqual(docs[0].name, 'TestGraphQLJSON', 'Cache entry name should match');
//             assert.ok(docs[0].resources.length > 0, 'Should have resources');

//             const queryResources = docs[0].resources.filter(r => r.resourceType === 'query');
//             assert.ok(queryResources.length > 0, 'Should have query resources');

//             const userQuery = queryResources.find(r => r.name === 'user');
//             assert.ok(userQuery, 'Should have user query');
//             assert.strictEqual(userQuery.context, 'Get user by ID', 'User query should have correct description');

//             const usersQuery = queryResources.find(r => r.name === 'users');
//             assert.ok(usersQuery, 'Should have users query');
//             assert.strictEqual(usersQuery.context, 'Get all users', 'Users query should have correct description');

//             const mutationResources = docs[0].resources.filter(r => r.resourceType === 'mutation');
//             assert.ok(mutationResources.length > 0, 'Should have mutation resources');

//             const createUserMutation = mutationResources.find(r => r.name === 'createUser');
//             assert.ok(createUserMutation, 'Should have createUser mutation');
//             assert.strictEqual(createUserMutation.context, 'Create a new user', 'CreateUser mutation should have correct description');
//         });

//         it('should retrieve specific method details from GraphQL JSON schema', async () => {
//             await setupCacheWithSources([
//                 {
//                     name: 'TestGraphQLJSON',
//                     type: SourceType.GQL,
//                     path: join(fixturesPath, 'graphql/graphql-schema.json')
//                 }
//             ]);

//             const details = await CacheManager.getDetails('user');

//             assert.ok(details.length > 0, 'Should find user query details');
//             assert.strictEqual(details[0].resources[0].name, 'user', 'Should match query name');

//             const userResource = details[0].resources[0];
//             assert.ok(userResource.details.request, 'Should have request details');
//             assert.ok(userResource.details.response, 'Should have response details');

//             const request = JSON.parse(userResource.details.request);
//             assert.ok(Array.isArray(request), 'Request should be an array of parameters');
//             assert.ok(request.some(param => param.name === 'id'), 'Should have id parameter');

//             const response = JSON.parse(userResource.details.response);
//             assert.strictEqual(response.type, 'User', 'Response type should be User');
//         });
//     });

//     describe('GraphQL GQL Schema File', () => {
//         it('should load and cache GraphQL schema from .graphql file', async () => {
//             await setupCacheWithSources([
//                 {
//                     name: 'TestGraphQLGQL',
//                     type: SourceType.GQL,
//                     path: join(fixturesPath, 'graphql/graphql-schema.graphql')
//                 }
//             ]);

//             const docs = await CacheManager.getDocs('TestGraphQLGQL');

//             assert.strictEqual(docs.length, 1, 'Should have one cache entry');
//             assert.strictEqual(docs[0].name, 'TestGraphQLGQL', 'Cache entry name should match');
//             assert.ok(docs[0].resources.length > 0, 'Should have resources');

//             const queryResources = docs[0].resources.filter(r => r.resourceType === 'query');
//             assert.ok(queryResources.length > 0, 'Should have query resources');

//             const userQuery = queryResources.find(r => r.name === 'user');
//             assert.ok(userQuery, 'Should have user query');

//             const mutationResources = docs[0].resources.filter(r => r.resourceType === 'mutation');
//             assert.ok(mutationResources.length > 0, 'Should have mutation resources');

//             const createUserMutation = mutationResources.find(r => r.name === 'createUser');
//             assert.ok(createUserMutation, 'Should have createUser mutation');
//         });
//     });

//     describe('OpenAPI JSON Schema File', () => {
//         it('should load and cache OpenAPI schema from JSON file', async () => {
//             await setupCacheWithSources([
//                 {
//                     name: 'TestOpenAPIJSON',
//                     type: SourceType.API,
//                     path: join(fixturesPath, 'openapi-json', 'openapi-schema.json')
//                 }
//             ]);

//             const docs = await CacheManager.getDocs('TestOpenAPIJSON');

//             assert.strictEqual(docs.length, 1, 'Should have one cache entry');
//             assert.strictEqual(docs[0].name, 'TestOpenAPIJSON', 'Cache entry name should match');
//             assert.ok(docs[0].resources.length > 0, 'Should have resources');

//             const getUsersEndpoint = docs[0].resources.find(r => r.name === 'GET /users');
//             assert.ok(getUsersEndpoint, 'Should have GET /users endpoint');
//             assert.strictEqual(getUsersEndpoint.resourceType, 'GET', 'Should have correct resource type');
//             assert.strictEqual(getUsersEndpoint.context, 'Get all users', 'Should have correct summary');

//             const postUsersEndpoint = docs[0].resources.find(r => r.name === 'POST /users');
//             assert.ok(postUsersEndpoint, 'Should have POST /users endpoint');
//             assert.strictEqual(postUsersEndpoint.resourceType, 'POST', 'Should have correct resource type');

//             const getUserByIdEndpoint = docs[0].resources.find(r => r.name === 'GET /users/{id}');
//             assert.ok(getUserByIdEndpoint, 'Should have GET /users/{id} endpoint');

//             const putUserEndpoint = docs[0].resources.find(r => r.name === 'PUT /users/{id}');
//             assert.ok(putUserEndpoint, 'Should have PUT /users/{id} endpoint');

//             const deleteUserEndpoint = docs[0].resources.find(r => r.name === 'DELETE /users/{id}');
//             assert.ok(deleteUserEndpoint, 'Should have DELETE /users/{id} endpoint');
//         });

//         it('should retrieve specific endpoint details from OpenAPI JSON schema', async () => {
//             await setupCacheWithSources([
//                 {
//                     name: 'TestOpenAPIJSON',
//                     type: SourceType.API,
//                     path: join(fixturesPath, 'openapi-json', 'openapi-schema.json')
//                 }
//             ]);

//             const details = await CacheManager.getDetails('POST /users');

//             assert.ok(details.length > 0, 'Should find POST /users endpoint details');
//             assert.strictEqual(details[0].resources[0].name, 'POST /users', 'Should match endpoint name');

//             const postResource = details[0].resources[0];
//             assert.ok(postResource.details.request, 'Should have request details');
//             assert.ok(postResource.details.response, 'Should have response details');

//             const request = JSON.parse(postResource.details.request);
//             assert.ok(Array.isArray(request), 'Request should be an array');
//             assert.ok(request.some(r => r.name === 'body'), 'Should have body in request');

//             const response = JSON.parse(postResource.details.response);
//             assert.ok(Array.isArray(response), 'Response should be an array');
//             assert.ok(response.some(r => r.name === '201'), 'Should have 201 response');
//         });
//     });

//     describe('OpenAPI YAML Schema File', () => {
//         it('should load and cache OpenAPI schema from YAML file', async () => {
//             await setupCacheWithSources([
//                 {
//                     name: 'TestOpenAPIYAML',
//                     type: SourceType.API,
//                     path: join(fixturesPath, 'openapi-yaml', 'openapi-schema.yaml')
//                 }
//             ]);

//             const docs = await CacheManager.getDocs('TestOpenAPIYAML');

//             assert.strictEqual(docs.length, 1, 'Should have one cache entry');
//             assert.strictEqual(docs[0].name, 'TestOpenAPIYAML', 'Cache entry name should match');
//             assert.ok(docs[0].resources.length > 0, 'Should have resources');

//             const getUsersEndpoint = docs[0].resources.find(r => r.name === 'GET /users');
//             assert.ok(getUsersEndpoint, 'Should have GET /users endpoint');

//             const postUsersEndpoint = docs[0].resources.find(r => r.name === 'POST /users');
//             assert.ok(postUsersEndpoint, 'Should have POST /users endpoint');

//             const getUserByIdEndpoint = docs[0].resources.find(r => r.name === 'GET /users/{id}');
//             assert.ok(getUserByIdEndpoint, 'Should have GET /users/{id} endpoint');
//         });
//     });

//     describe('gRPC Proto File', () => {
//         it('should load and cache gRPC schema from single proto file', async () => {
//             await setupCacheWithSources([
//                 {
//                     name: 'TestGRPCProto',
//                     type: SourceType.GRPC,
//                     path: join(fixturesPath, 'grpc/service.proto')
//                 }
//             ]);

//             const docs = await CacheManager.getDocs('TestGRPCProto');

//             assert.strictEqual(docs.length, 1, 'Should have one cache entry');
//             assert.strictEqual(docs[0].name, 'TestGRPCProto', 'Cache entry name should match');
//             assert.ok(docs[0].resources.length > 0, 'Should have resources');

//             const getUserMethod = docs[0].resources.find(r => r.name === 'example.UserService.GetUser');
//             assert.ok(getUserMethod, 'Should have GetUser method');
//             assert.strictEqual(getUserMethod.context, 'gRPC Unary method', 'GetUser should be unary method');

//             const listUsersMethod = docs[0].resources.find(r => r.name === 'example.UserService.ListUsers');
//             assert.ok(listUsersMethod, 'Should have ListUsers method');

//             const createUserMethod = docs[0].resources.find(r => r.name === 'example.UserService.CreateUser');
//             assert.ok(createUserMethod, 'Should have CreateUser method');

//             const streamUsersMethod = docs[0].resources.find(r => r.name === 'example.UserService.StreamUsers');
//             assert.ok(streamUsersMethod, 'Should have StreamUsers method');
//             assert.strictEqual(streamUsersMethod.context, 'gRPC Server Streaming method', 'StreamUsers should be server streaming method');
//         });

//         it('should retrieve specific method details from gRPC proto schema', async () => {
//             await setupCacheWithSources([
//                 {
//                     name: 'TestGRPCProto',
//                     type: SourceType.GRPC,
//                     path: join(fixturesPath, 'grpc/service.proto')
//                 }
//             ]);

//             const details = await CacheManager.getDetails('example.UserService.GetUser');

//             assert.ok(details.length > 0, 'Should find GetUser method details');
//             assert.strictEqual(details[0].resources[0].name, 'example.UserService.GetUser', 'Should match method name');

//             const getUserResource = details[0].resources[0];
//             assert.ok(getUserResource.details.request, 'Should have request details');
//             assert.ok(getUserResource.details.response, 'Should have response details');

//             const request = JSON.parse(getUserResource.details.request);
//             assert.strictEqual(request.type, 'GetUserRequest', 'Request type should be GetUserRequest');
//             assert.strictEqual(request.stream, false, 'Request should not be streaming');
//             assert.ok(Array.isArray(request.fields), 'Request should have fields array');

//             const response = JSON.parse(getUserResource.details.response);
//             assert.strictEqual(response.type, 'User', 'Response type should be User');
//             assert.strictEqual(response.stream, false, 'Response should not be streaming');
//         });
//     });

//     describe('gRPC Multiple Proto Files', () => {
//         it('should load and cache gRPC schema from multiple proto files', async () => {
//             await setupCacheWithSources([
//                 {
//                     name: 'TestGRPCMultiProto',
//                     type: SourceType.GRPC,
//                     path: join(fixturesPath, 'grpc/main.proto')
//                 }
//             ]);

//             const docs = await CacheManager.getDocs('TestGRPCMultiProto');

//             assert.strictEqual(docs.length, 1, 'Should have one cache entry');
//             assert.strictEqual(docs[0].name, 'TestGRPCMultiProto', 'Cache entry name should match');
//             assert.ok(docs[0].resources.length > 0, 'Should have resources');

//             const getUserProfileMethod = docs[0].resources.find(r => r.name === 'example.main.UserManagementService.GetUserProfile');
//             assert.ok(getUserProfileMethod, 'Should have GetUserProfile method');

//             const listUsersMethod = docs[0].resources.find(r => r.name === 'example.main.UserManagementService.ListUsers');
//             assert.ok(listUsersMethod, 'Should have ListUsers method');

//             const createUserMethod = docs[0].resources.find(r => r.name === 'example.main.UserManagementService.CreateUser');
//             assert.ok(createUserMethod, 'Should have CreateUser method');

//             const updateUserProfileMethod = docs[0].resources.find(r => r.name === 'example.main.UserManagementService.UpdateUserProfile');
//             assert.ok(updateUserProfileMethod, 'Should have UpdateUserProfile method');

//             const deleteUserMethod = docs[0].resources.find(r => r.name === 'example.main.UserManagementService.DeleteUser');
//             assert.ok(deleteUserMethod, 'Should have DeleteUser method');
//         });

//         it('should retrieve specific method details from multi-file gRPC schema', async () => {
//             await setupCacheWithSources([
//                 {
//                     name: 'TestGRPCMultiProto',
//                     type: SourceType.GRPC,
//                     path: join(fixturesPath, 'grpc/main.proto')
//                 }
//             ]);

//             const details = await CacheManager.getDetails('example.main.UserManagementService.CreateUser');

//             assert.ok(details.length > 0, 'Should find CreateUser method details');
//             assert.strictEqual(details[0].resources[0].name, 'example.main.UserManagementService.CreateUser', 'Should match method name');

//             const createUserResource = details[0].resources[0];
//             assert.ok(createUserResource.details.request, 'Should have request details');
//             assert.ok(createUserResource.details.response, 'Should have response details');

//             const request = JSON.parse(createUserResource.details.request);
//             assert.strictEqual(request.type, 'CreateUserRequest', 'Request type should be CreateUserRequest');
//             assert.ok(Array.isArray(request.fields), 'Request should have fields array');
//             assert.ok(request.fields.some((f: any) => f.name === 'name'), 'Request should have name field');
//             assert.ok(request.fields.some((f: any) => f.name === 'email'), 'Request should have email field');

//             const response = JSON.parse(createUserResource.details.response);
//             assert.ok(response.type === 'User' || response.type === 'example.user.User', 'Response type should be User type');
//         });
//     });

//     describe('Multiple Sources', () => {
//         it('should handle multiple schema sources simultaneously', async () => {
//             await setupCacheWithSources([
//                 {
//                     name: 'GraphQLSource',
//                     type: SourceType.GQL,
//                     path: join(fixturesPath, 'graphql/graphql-schema.json')
//                 },
//                 {
//                     name: 'OpenAPISource',
//                     type: SourceType.API,
//                     path: join(fixturesPath, 'openapi-json', 'openapi-schema.json')
//                 }
//             ]);

//             const allDocs = await CacheManager.getDocs();

//             assert.ok(allDocs.length >= 2, 'Should have at least two cache entries');

//             const gqlDocs = allDocs.filter(d => d.name === 'GraphQLSource');
//             assert.strictEqual(gqlDocs.length, 1, 'Should have GraphQL cache entry');

//             const apiDocs = allDocs.filter(d => d.name === 'OpenAPISource');
//             assert.strictEqual(apiDocs.length, 1, 'Should have OpenAPI cache entry');
//         });
//     });
// });

// describe('CacheManager - URL-based Sources', () => {
//     let mockServer: MockHttpServer;
//     let mockGrpcServer: MockGrpcServer;
//     const fixturesPath = join(process.cwd(), 'example', 'fixtures');
//     const TEST_PORT = 8765;
//     const GRPC_TEST_PORT = 9090;

//     beforeEach(() => {
//         clearCache();
//     });

//     before(async () => {
//         mockServer = new MockHttpServer({
//             port: TEST_PORT,
//             graphqlPath: join(fixturesPath, 'graphql/graphql-schema.json'),
//             openApiJsonPath: join(fixturesPath, 'openapi-json', 'openapi-schema.json'),
//             openApiYamlPath: join(fixturesPath, 'openapi-yaml', 'openapi-schema.yaml')
//         });
//         await mockServer.start();

//         mockGrpcServer = new MockGrpcServer({
//             port: GRPC_TEST_PORT,
//             protoFiles: [join(fixturesPath, 'grpc/service.proto')]
//         });
//         await mockGrpcServer.start();
//     });

//     after(async () => {
//         await mockServer.stop();
//         await mockGrpcServer.stop();
//     });

//     describe('GraphQL URL Source', () => {
//         it('should load and cache GraphQL schema from URL', async () => {
//             await setupCacheWithSources([
//                 {
//                     name: 'TestGraphQLURL',
//                     type: SourceType.GQL,
//                     method: SourceMethod.POST,
//                     url: mockServer.getUrl('/graphql'),
//                     headers: {
//                         'Content-Type': 'application/json'
//                     }
//                 }
//             ]);

//             const docs = await CacheManager.getDocs('TestGraphQLURL');

//             assert.strictEqual(docs.length, 1, 'Should have one cache entry');
//             assert.strictEqual(docs[0].name, 'TestGraphQLURL', 'Cache entry name should match');
//             assert.ok(docs[0].resources.length > 0, 'Should have resources');

//             const queryResources = docs[0].resources.filter(r => r.resourceType === 'query');
//             assert.ok(queryResources.length > 0, 'Should have query resources');

//             const userQuery = queryResources.find(r => r.name === 'user');
//             assert.ok(userQuery, 'Should have user query');

//             const usersQuery = queryResources.find(r => r.name === 'users');
//             assert.ok(usersQuery, 'Should have users query');

//             const mutationResources = docs[0].resources.filter(r => r.resourceType === 'mutation');
//             assert.ok(mutationResources.length > 0, 'Should have mutation resources');

//             const createUserMutation = mutationResources.find(r => r.name === 'createUser');
//             assert.ok(createUserMutation, 'Should have createUser mutation');
//         });
//     });

//     describe('OpenAPI URL Source - JSON', () => {
//         it('should load and cache OpenAPI schema from JSON URL', async () => {
//             await setupCacheWithSources([
//                 {
//                     name: 'TestOpenAPIURLJSON',
//                     type: SourceType.API,
//                     method: SourceMethod.GET,
//                     url: mockServer.getUrl('/openapi.json')
//                 }
//             ]);

//             const docs = await CacheManager.getDocs('TestOpenAPIURLJSON');

//             assert.strictEqual(docs.length, 1, 'Should have one cache entry');
//             assert.strictEqual(docs[0].name, 'TestOpenAPIURLJSON', 'Cache entry name should match');
//             assert.ok(docs[0].resources.length > 0, 'Should have resources');

//             const getUsersEndpoint = docs[0].resources.find(r => r.name === 'GET /users');
//             assert.ok(getUsersEndpoint, 'Should have GET /users endpoint');

//             const postUsersEndpoint = docs[0].resources.find(r => r.name === 'POST /users');
//             assert.ok(postUsersEndpoint, 'Should have POST /users endpoint');
//         });
//     });

//     describe('OpenAPI URL Source - YAML', () => {
//         it('should load and cache OpenAPI schema from YAML URL', async () => {
//             await setupCacheWithSources([
//                 {
//                     name: 'TestOpenAPIURLYAML',
//                     type: SourceType.API,
//                     method: SourceMethod.GET,
//                     url: mockServer.getUrl('/openapi.yaml')
//                 }
//             ]);

//             const docs = await CacheManager.getDocs('TestOpenAPIURLYAML');

//             assert.strictEqual(docs.length, 1, 'Should have one cache entry');
//             assert.strictEqual(docs[0].name, 'TestOpenAPIURLYAML', 'Cache entry name should match');
//             assert.ok(docs[0].resources.length > 0, 'Should have resources');

//             const getUsersEndpoint = docs[0].resources.find(r => r.name === 'GET /users');
//             assert.ok(getUsersEndpoint, 'Should have GET /users endpoint');

//             const postUsersEndpoint = docs[0].resources.find(r => r.name === 'POST /users');
//             assert.ok(postUsersEndpoint, 'Should have POST /users endpoint');
//         });
//     });

//     describe('Mixed File and URL Sources', () => {
//         it('should handle both file and URL sources together', async () => {
//             await setupCacheWithSources([
//                 {
//                     name: 'GraphQLFile',
//                     type: SourceType.GQL,
//                     path: join(fixturesPath, 'graphql/graphql-schema.json')
//                 },
//                 {
//                     name: 'GraphQLURL',
//                     type: SourceType.GQL,
//                     method: SourceMethod.POST,
//                     url: mockServer.getUrl('/graphql')
//                 },
//                 {
//                     name: 'OpenAPIFile',
//                     type: SourceType.API,
//                     path: join(fixturesPath, 'openapi-json', 'openapi-schema.json')
//                 },
//                 {
//                     name: 'OpenAPIURL',
//                     type: SourceType.API,
//                     method: SourceMethod.GET,
//                     url: mockServer.getUrl('/openapi.json')
//                 }
//             ]);

//             const allDocs = await CacheManager.getDocs();

//             assert.ok(allDocs.length >= 4, 'Should have at least four cache entries');

//             const graphqlFileDocs = allDocs.filter(d => d.name === 'GraphQLFile');
//             assert.strictEqual(graphqlFileDocs.length, 1, 'Should have GraphQL file cache entry');

//             const graphqlUrlDocs = allDocs.filter(d => d.name === 'GraphQLURL');
//             assert.strictEqual(graphqlUrlDocs.length, 1, 'Should have GraphQL URL cache entry');

//             const openapiFileDocs = allDocs.filter(d => d.name === 'OpenAPIFile');
//             assert.strictEqual(openapiFileDocs.length, 1, 'Should have OpenAPI file cache entry');

//             const openapiUrlDocs = allDocs.filter(d => d.name === 'OpenAPIURL');
//             assert.strictEqual(openapiUrlDocs.length, 1, 'Should have OpenAPI URL cache entry');
//         });
//     });

//     describe('gRPC URL Source', () => {
//         it('should load and cache gRPC schema from URL via reflection', async () => {
//             await setupCacheWithSources([
//                 {
//                     name: 'TestGRPCURL',
//                     type: SourceType.GRPC,
//                     url: mockGrpcServer.getUrl()
//                 }
//             ]);

//             const docs = await CacheManager.getDocs('TestGRPCURL');

//             assert.strictEqual(docs.length, 1, 'Should have one cache entry');
//             assert.strictEqual(docs[0].name, 'TestGRPCURL', 'Cache entry name should match');
//             assert.ok(docs[0].resources.length > 0, 'Should have resources');

//             const getUserMethod = docs[0].resources.find(r => r.name === 'example.UserService.GetUser');
//             assert.ok(getUserMethod, 'Should have GetUser method');
//             assert.strictEqual(getUserMethod.context, 'gRPC Unary method', 'GetUser should be unary method');

//             const listUsersMethod = docs[0].resources.find(r => r.name === 'example.UserService.ListUsers');
//             assert.ok(listUsersMethod, 'Should have ListUsers method');

//             const streamUsersMethod = docs[0].resources.find(r => r.name === 'example.UserService.StreamUsers');
//             assert.ok(streamUsersMethod, 'Should have StreamUsers method');
//             assert.strictEqual(streamUsersMethod.context, 'gRPC Server Streaming method', 'StreamUsers should be server streaming method');
//         });

//         it('should retrieve specific method details from gRPC URL source', async () => {
//             await setupCacheWithSources([
//                 {
//                     name: 'TestGRPCURL',
//                     type: SourceType.GRPC,
//                     url: mockGrpcServer.getUrl()
//                 }
//             ]);

//             const details = await CacheManager.getDetails('example.UserService.GetUser');

//             assert.ok(details.length > 0, 'Should find GetUser method details');
//             assert.strictEqual(details[0].resources[0].name, 'example.UserService.GetUser', 'Should match method name');

//             const getUserResource = details[0].resources[0];
//             assert.ok(getUserResource.details.request, 'Should have request details');
//             assert.ok(getUserResource.details.response, 'Should have response details');

//             const request = JSON.parse(getUserResource.details.request);
//             assert.strictEqual(request.type, 'GetUserRequest', 'Request type should be GetUserRequest');
//             assert.strictEqual(request.stream, false, 'Request should not be streaming');
//             assert.ok(Array.isArray(request.fields), 'Request should have fields array');

//             const response = JSON.parse(getUserResource.details.response);
//             assert.strictEqual(response.type, 'User', 'Response type should be User');
//             assert.strictEqual(response.stream, false, 'Response should not be streaming');

//             // Verify no unknown types
//             let unknownCount = 0;
//             const checkUnknown = (obj: any) => {
//                 if (obj.type === 'unknown') unknownCount++;
//                 if (obj.fields) {
//                     obj.fields.forEach((f: any) => {
//                         if (f.type === 'unknown' || f.type?.includes('unknown')) unknownCount++;
//                         if (f.fields) checkUnknown(f);
//                     });
//                 }
//             };
//             checkUnknown(request);
//             checkUnknown(response);
//             assert.strictEqual(unknownCount, 0, 'Should have no unknown types');
//         });
//     });

//     describe('gRPC Multiple Proto Files URL Source', () => {
//         before(async () => {
//             // Stop existing server and start new one with multi-file proto
//             await mockGrpcServer.stop();
//             mockGrpcServer = new MockGrpcServer({
//                 port: GRPC_TEST_PORT,
//                 protoFiles: [join(fixturesPath, 'grpc/main.proto')]
//             });
//             await mockGrpcServer.start();
//         });

//         it('should load and cache gRPC schema from URL for multiple proto files', async () => {
//             await setupCacheWithSources([
//                 {
//                     name: 'TestGRPCMultiURL',
//                     type: SourceType.GRPC,
//                     url: mockGrpcServer.getUrl()
//                 }
//             ]);

//             const docs = await CacheManager.getDocs('TestGRPCMultiURL');

//             assert.strictEqual(docs.length, 1, 'Should have one cache entry');
//             assert.strictEqual(docs[0].name, 'TestGRPCMultiURL', 'Cache entry name should match');
//             assert.ok(docs[0].resources.length > 0, 'Should have resources');

//             const getUserProfileMethod = docs[0].resources.find(r => r.name === 'example.main.UserManagementService.GetUserProfile');
//             assert.ok(getUserProfileMethod, 'Should have GetUserProfile method');

//             const createUserMethod = docs[0].resources.find(r => r.name === 'example.main.UserManagementService.CreateUser');
//             assert.ok(createUserMethod, 'Should have CreateUser method');

//             const deleteUserMethod = docs[0].resources.find(r => r.name === 'example.main.UserManagementService.DeleteUser');
//             assert.ok(deleteUserMethod, 'Should have DeleteUser method');
//         });

//         it('should retrieve specific method details from multi-file gRPC URL source', async () => {
//             await setupCacheWithSources([
//                 {
//                     name: 'TestGRPCMultiURL',
//                     type: SourceType.GRPC,
//                     url: mockGrpcServer.getUrl()
//                 }
//             ]);

//             const details = await CacheManager.getDetails('example.main.UserManagementService.CreateUser');

//             assert.ok(details.length > 0, 'Should find CreateUser method details');
//             assert.strictEqual(details[0].resources[0].name, 'example.main.UserManagementService.CreateUser', 'Should match method name');

//             const createUserResource = details[0].resources[0];
//             assert.ok(createUserResource.details.request, 'Should have request details');
//             assert.ok(createUserResource.details.response, 'Should have response details');

//             const request = JSON.parse(createUserResource.details.request);
//             assert.strictEqual(request.type, 'CreateUserRequest', 'Request type should be CreateUserRequest');
//             assert.ok(Array.isArray(request.fields), 'Request should have fields array');
//             assert.ok(request.fields.some((f: any) => f.name === 'name'), 'Request should have name field');
//             assert.ok(request.fields.some((f: any) => f.name === 'email'), 'Request should have email field');

//             const response = JSON.parse(createUserResource.details.response);
//             assert.ok(response.type === 'User' || response.type === 'example.user.User', 'Response type should be User type');

//             // Verify no unknown types
//             let unknownCount = 0;
//             const checkUnknown = (obj: any) => {
//                 if (obj.type === 'unknown') unknownCount++;
//                 if (obj.fields) {
//                     obj.fields.forEach((f: any) => {
//                         if (f.type === 'unknown' || f.type?.includes('unknown')) unknownCount++;
//                         if (f.fields) checkUnknown(f);
//                     });
//                 }
//             };
//             checkUnknown(request);
//             checkUnknown(response);
//             assert.strictEqual(unknownCount, 0, 'Should have no unknown types');
//         });
//     });
// });

// describe('CacheManager - Cache Features', () => {
//     const fixturesPath = join(process.cwd(), 'example', 'fixtures');

//     beforeEach(() => {
//         clearCache();
//     });

//     it('should cache entries with timestamp', async () => {
//         const beforeTime = Date.now();

//         await setupCacheWithSources([
//             {
//                 name: 'TimestampTest',
//                 type: SourceType.GQL,
//                 path: join(fixturesPath, 'graphql/graphql-schema.json')
//             }
//         ]);

//         const docs = await CacheManager.getDocs('TimestampTest');
//         const afterTime = Date.now();

//         assert.strictEqual(docs.length, 1, 'Should have one cache entry');
//         assert.ok(docs[0].timestamp >= beforeTime, 'Timestamp should be after start time');
//         assert.ok(docs[0].timestamp <= afterTime, 'Timestamp should be before end time');
//     });

//     it('should retrieve all docs without source name filter', async () => {
//         await setupCacheWithSources([
//             {
//                 name: 'Source1',
//                 type: SourceType.GQL,
//                 path: join(fixturesPath, 'graphql/graphql-schema.json')
//             },
//             {
//                 name: 'Source2',
//                 type: SourceType.API,
//                 path: join(fixturesPath, 'openapi-json', 'openapi-schema.json')
//             }
//         ]);

//         const allDocs = await CacheManager.getDocs();

//         assert.ok(allDocs.length >= 2, 'Should have at least two cache entries');
//     });

//     it('should filter docs by source name', async () => {
//         await setupCacheWithSources([
//             {
//                 name: 'FilterTest1',
//                 type: SourceType.GQL,
//                 path: join(fixturesPath, 'graphql/graphql-schema.json')
//             },
//             {
//                 name: 'FilterTest2',
//                 type: SourceType.API,
//                 path: join(fixturesPath, 'openapi-json', 'openapi-schema.json')
//             }
//         ]);

//         const filteredDocs = await CacheManager.getDocs('FilterTest1');

//         assert.strictEqual(filteredDocs.length, 1, 'Should have one cache entry');
//         assert.strictEqual(filteredDocs[0].name, 'FilterTest1', 'Should match filtered source name');
//     });

//     it('should retrieve details for specific methods across all sources', async () => {
//         await setupCacheWithSources([
//             {
//                 name: 'DetailsSource',
//                 type: SourceType.GQL,
//                 path: join(fixturesPath, 'graphql/graphql-schema.json')
//             }
//         ]);

//         const userDetails = await CacheManager.getDetails('user');

//         assert.ok(userDetails.length > 0, 'Should find details for user query');
//         assert.ok(userDetails[0].resources.length > 0, 'Should have resources in details');
//         assert.strictEqual(userDetails[0].resources[0].name, 'user', 'Should match query name');
//     });
// });

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { ReflectionService } from '@grpc/reflection';
import * as path from 'path';

export interface MockGrpcServerConfig {
    port: number;
    protoFiles: string[];
}

export class MockGrpcServer {
    private server: grpc.Server | null = null;
    private port: number;
    private protoFiles: string[];
    private packageDefinitions: protoLoader.PackageDefinition[] = [];

    constructor(config: MockGrpcServerConfig) {
        this.port = config.port;
        this.protoFiles = config.protoFiles;
    }

    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server = new grpc.Server();

            try {
                for (const protoFile of this.protoFiles) {
                    const packageDefinition = protoLoader.loadSync(protoFile, {
                        keepCase: true,
                        longs: String,
                        enums: String,
                        defaults: true,
                        oneofs: true,
                        includeDirs: [path.dirname(protoFile)]
                    });

                    this.packageDefinitions.push(packageDefinition);

                    const grpcObject = grpc.loadPackageDefinition(packageDefinition);
                    this.registerServicesFromPackageDefinition(grpcObject);
                }

                const combinedPackageDefinition: protoLoader.PackageDefinition = {};
                for (const pd of this.packageDefinitions) {
                    Object.assign(combinedPackageDefinition, pd);
                }

                const reflection = new ReflectionService(combinedPackageDefinition);
                reflection.addToServer(this.server);

                this.server.bindAsync(
                    `0.0.0.0:${this.port}`,
                    grpc.ServerCredentials.createInsecure(),
                    (err, port) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve();
                    }
                );
            } catch (err) {
                reject(err);
            }
        });
    }

    async stop(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.server) {
                resolve();
                return;
            }

            this.server.tryShutdown(() => {
                this.server = null;
                resolve();
            });
        });
    }

    getUrl(): string {
        return `localhost:${this.port}`;
    }

    private registerServicesFromPackageDefinition(grpcObject: any): void {
        const traverse = (obj: any): void => {
            for (const key in obj) {
                const value = obj[key];
                if (value && typeof value === 'object') {
                    if (value.service) {
                        const serviceImpl: any = {};
                        const serviceDefinition = value.service;

                        for (const methodName in serviceDefinition) {
                            serviceImpl[methodName] = this.createMockMethod(methodName);
                        }

                        this.server?.addService(value.service, serviceImpl);
                    } else {
                        traverse(value);
                    }
                }
            }
        };

        traverse(grpcObject);
    }

    private createMockMethod(methodName: string): grpc.handleUnaryCall<any, any> {
        return (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) => {
            const response = {
                id: 'mock-id',
                name: `Mock ${methodName} response`,
                success: true,
                message: `Mock response for ${methodName}`
            };
            callback(null, response);
        };
    }
}

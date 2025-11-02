import SwaggerParser from '@apidevtools/swagger-parser';
import { createServer, IncomingMessage, Server, ServerResponse } from 'http';

export interface MockServerConfig {
    port: number;
    openApiJsonPath?: string;
    openApiYamlPath?: string;
}

export class MockHttpServer {
    private server: Server | null = null;
    private port: number;
    private openApiJsonPath?: string;
    private openApiYamlPath?: string;

    constructor(config: MockServerConfig) {
        this.port = config.port;
        this.openApiJsonPath = config.openApiJsonPath;
        this.openApiYamlPath = config.openApiYamlPath;
    }

    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
                this.handleRequest(req, res);
            });

            this.server.on('error', reject);
            this.server.listen(this.port, () => {
                resolve();
            });
        });
    }

    async stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.server) {
                resolve();
                return;
            }

            this.server.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    this.server = null;
                    resolve();
                }
            });
        });
    }

    getUrl(path: string): string {
        return `http://localhost:${this.port}${path}`;
    }

    private handleRequest(req: IncomingMessage, res: ServerResponse): void {
        if (req.method === 'GET' && req.url === '/openapi.json') {
            this.handleOpenApiJson(res).catch(() => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error' }));
            });
            return;
        }

        if (req.method === 'GET' && req.url === '/openapi.yaml') {
            this.handleOpenApiYaml(res).catch(() => {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal server error');
            });
            return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }

    private async handleOpenApiJson(res: ServerResponse): Promise<void> {
        if (!this.openApiJsonPath) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'OpenAPI JSON schema not configured' }));
            return;
        }

        try {
            const bundled = await SwaggerParser.bundle(this.openApiJsonPath);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(bundled));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to bundle OpenAPI schema' }));
        }
    }

    private async handleOpenApiYaml(res: ServerResponse): Promise<void> {
        if (!this.openApiYamlPath) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('OpenAPI YAML schema not configured');
            return;
        }

        try {
            const bundled = await SwaggerParser.bundle(this.openApiYamlPath);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(bundled));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Failed to bundle OpenAPI schema');
        }
    }
}

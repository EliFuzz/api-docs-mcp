import SwaggerParser from '@apidevtools/swagger-parser';
import { readFileSync } from 'fs';
import { createServer, IncomingMessage, Server, ServerResponse } from 'http';
import { join } from 'path';

export interface MockServerConfig {
    port: number;
    graphqlPath?: string;
    openApiJsonPath?: string;
    openApiYamlPath?: string;
}

export class MockHttpServer {
    private server: Server | null = null;
    private port: number;
    private graphqlPath?: string;
    private openApiJsonPath?: string;
    private openApiYamlPath?: string;

    constructor(config: MockServerConfig) {
        this.port = config.port;
        this.graphqlPath = config.graphqlPath;
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
        if (req.method === 'POST' && req.url === '/graphql') {
            this.handleGraphQL(req, res);
            return;
        }

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

        if (req.method === 'GET' && req.url?.startsWith('/components/')) {
            const format = req.url.endsWith('.yaml') ? 'yaml' : 'json';
            const baseFolder = format === 'json' ? 'openapi-json' : 'openapi-yaml';
            this.handleComponentFile(req.url, res, format, baseFolder);
            return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }

    private handleGraphQL(req: IncomingMessage, res: ServerResponse): void {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const parsedBody = JSON.parse(body);
                if (parsedBody.query && parsedBody.query.includes('__schema')) {
                    if (!this.graphqlPath) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ errors: [{ message: 'GraphQL schema not configured' }] }));
                        return;
                    }

                    const schemaContent = readFileSync(this.graphqlPath, 'utf-8');
                    const schemaData = JSON.parse(schemaContent);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(schemaData));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ data: { message: 'Query executed' } }));
                }
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ errors: [{ message: 'Invalid request body' }] }));
            }
        });
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

    private handleComponentFile(url: string, res: ServerResponse, format: 'json' | 'yaml', baseFolder: string): void {
        try {
            const basePath = join(process.cwd(), 'e2e', 'fixtures', baseFolder);
            const filePath = join(basePath, url);

            const content = readFileSync(filePath, 'utf-8');

            if (format === 'json') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
            } else {
                res.writeHead(200, { 'Content-Type': 'text/yaml' });
            }

            res.end(content);
        } catch (error) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Component file not found' }));
        }
    }
}

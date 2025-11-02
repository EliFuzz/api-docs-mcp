import { readFileSync } from 'fs';
import { createServer, IncomingMessage, Server, ServerResponse } from 'http';

export interface MockServerConfig {
    port: number;
    graphqlPath?: string;
}

export class MockHttpServer {
    private server: Server | null = null;
    private port: number;
    private graphqlPath?: string;

    constructor(config: MockServerConfig) {
        this.port = config.port;
        this.graphqlPath = config.graphqlPath;
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
}

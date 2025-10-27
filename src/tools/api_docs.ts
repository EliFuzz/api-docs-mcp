import { server } from "src/server";
import { CacheManager } from "src/utils/cache";
import { z } from "zod";

server.registerTool('api_docs', {
    title: 'API Documentation',
    description: 'Get a list of all available API methods',
    inputSchema: {
        source: z.string().describe('The name of the API source (e.g., "GitHub") from MCP configuration environment variables. If not provided, docs from all sources will be returned.').optional()
    },
    outputSchema: {
        sources: z.array(z.object({
            name: z.string().describe('The name of the source API'),
            resources: z.array(z.object({
                name: z.string().describe('The name of the API resource'),
                description: z.string().describe('A brief description of the API resource'),
                resourceType: z.string().describe('The type of the API resource (e.g., "POST", "GET", "mutation", "query")')
            }))
        }))
    }
}, async ({ source }: { source?: string }) => {
    return {
        content: [],
        structuredContent: {
            sources: (await CacheManager.getDocs(source)).map(doc => ({
                name: doc.name,
                resources: doc.resources.map(res => ({
                    name: res.name,
                    description: res.context,
                    resourceType: res.resourceType
                }))
            }))
        }
    };
});

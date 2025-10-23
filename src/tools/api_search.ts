import { server } from "src/server";
import { CacheManager } from "src/utils/cache";
import { z } from "zod";

server.registerTool('api_search', {
    title: 'API detailed documentation search',
    description: 'Search for a specific API method by name and get its full definition',
    inputSchema: {
        detailName: z.string().describe('The exact resource name of the API method to search for that was provided in `api_docs` tool\'s output'),
    },
    outputSchema: {
        details: z.array(z.object({
            name: z.string().describe('The name of the cache entry'),
            resources: z.array(z.object({
                name: z.string().describe('The name of the resource'),
                resourceType: z.enum(['query', 'mutation', 'subscription']).describe('The type of GraphQL resource'),
                description: z.string().describe('Context or description of the resource'),
                details: z.object({
                    request: z.string().describe('The request structure or input parameters for the API method').optional(),
                    response: z.string().describe('The response structure or output format for the API method').optional(),
                    error: z.string().describe('Error information or error handling details for the API method').optional()
                }).describe('Detailed information about the resource')
            })).describe('Array of matched resources'),
        }))
    }
}, async ({ detailName }: { detailName: string }) => {
    return {
        content: [],
        structuredContent: {
            details: (await CacheManager.getDetails(detailName)).map(detail => ({
                name: detail.name,
                resources: detail.resources.map(res => ({
                    name: res.name,
                    resourceType: res.resourceType,
                    description: res.context,
                    details: {
                        request: res.details.request,
                        response: res.details.response,
                        error: res.details.error
                    }
                })),
            }))
        }
    };
});

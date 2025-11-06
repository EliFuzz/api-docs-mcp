import { server } from "src/server";
import { CacheManager, ResourceType } from "src/utils/cache";
import { z } from "zod";

server.registerTool('api_docs', {
    title: 'API Documentation',
    description: 'Get a list of all available API methods',
    inputSchema: {
        sourceName: z.string().describe('The name of the API source (e.g., "GitHub") from MCP configuration environment variables. If not provided, docs from all sources will be returned.').optional(),
        resourceType: z.nativeEnum(ResourceType).describe('The type of the API resource. If provided, only resources of this type will be returned.').optional()
    },
    outputSchema: {
        sources: z.array(z.object({
            sourceName: z.string().describe('The name of the source API'),
            resources: z.array(z.object({
                resourceType: z.nativeEnum(ResourceType).describe('The type of the API resource'),
                resourceName: z.string().describe('The name of the API resource'),
                resourceDescription: z.string().describe('A brief description of the API resource'),
            }))
        }))
    }
}, async ({ sourceName, resourceType }: { sourceName?: string, resourceType?: string }) => {
    return {
        content: [],
        structuredContent: {
            sources: (await CacheManager.getDocs(sourceName))
                .map(doc => ({
                    sourceName: doc.name,
                    resources: doc.resources
                        .filter(res => !resourceType || res.type === resourceType)
                        .map(res => ({
                            resourceType: res.type,
                            resourceName: res.name,
                            resourceDescription: res.description,
                        }))
                }))
                .filter(doc => doc.resources.length > 0)
        }
    };
});

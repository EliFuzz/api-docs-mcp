import { server } from "src/server";
import { CacheManager, ResourceType } from "src/utils/cache";
import { z } from "zod";

server.registerTool('api_docs', {
    title: 'API Documentation',
    description: 'Get a list of all available API methods',
    inputSchema: {
        source: z.string().describe('The name of the API source (e.g., "GitHub") from MCP configuration environment variables. If not provided, docs from all sources will be returned.').optional(),
        resourceType: z.nativeEnum(ResourceType).describe('The type of the API resource. If provided, only resources of this type will be returned.').optional()
    },
    outputSchema: {
        sources: z.array(z.object({
            name: z.string().describe('The name of the source API'),
            resources: z.array(z.object({
                resourceType: z.nativeEnum(ResourceType).describe('The type of the API resource'),
                name: z.string().describe('The name of the API resource'),
                description: z.string().describe('A brief description of the API resource'),
            }))
        }))
    }
}, async ({ source, resourceType }: { source?: string, resourceType?: string }) => {
    return {
        content: [],
        structuredContent: {
            sources: (await CacheManager.getDocs(source))
                .map(doc => ({
                    name: doc.name,
                    resources: doc.resources
                        .filter(res => !resourceType || res.type === resourceType)
                        .map(res => ({
                            resourceType: res.type,
                            name: res.name,
                            description: res.description,
                        }))
                }))
                .filter(doc => doc.resources.length > 0)
        }
    };
});

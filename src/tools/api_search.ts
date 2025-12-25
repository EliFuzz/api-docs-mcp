import { server } from 'src/server';
import { CacheManager } from 'src/utils/cache';
import { z } from 'zod';

server.registerTool(
  'api_search',
  {
    title: 'API detailed documentation search',
    description:
      'Search for a specific API method by name and get its full definition',
    inputSchema: {
      resourceName: z
        .string()
        .describe(
          "The exact resource name of the API method to search for that was provided in `api_docs` tool's output"
        ),
      sourceName: z
        .string()
        .describe(
          "The name of the source where the API method is defined that was provided in `api_docs` tool's output"
        )
        .optional(),
    },
    outputSchema: {
      details: z.array(
        z.object({
          sourceName: z.string().describe('The name of the source API'),
          resources: z
            .array(
              z.object({
                resourceName: z.string().describe('The name of the resource'),
                resourceType: z.string().describe('The type of API resource'),
                resourceDescription: z
                  .string()
                  .describe('Context or description of the resource'),
                resourceSchema: z
                  .string()
                  .describe(
                    'The complete schema information for the API method'
                  ),
              })
            )
            .describe('Array of matched resources'),
        })
      ),
    },
  },
  async ({
    resourceName,
    sourceName,
  }: {
    resourceName: string;
    sourceName?: string;
  }) => {
    return {
      content: [],
      structuredContent: {
        details: (await CacheManager.getDetails(resourceName, sourceName)).map(
          (detail) => ({
            sourceName: detail.name,
            resources: detail.resources.map((res) => ({
              resourceName: res.name,
              resourceType: res.type,
              resourceDescription: res.description,
              resourceSchema: res.schema,
            })),
          })
        ),
      },
    };
  }
);

import { getIntrospectionQuery } from "graphql";
import { UrlSource } from "src/utils/source";

export const fetchGqlSchema = async (source: UrlSource): Promise<unknown> => {
    const response = await fetchSchema(
        source.url,
        'POST',
        {
            'Content-Type': 'application/json',
            ...(source.headers || {}),
        },
        JSON.stringify({ query: getIntrospectionQuery() })
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch schema from ${source.url}: ${response.statusText}`);
    }

    const result = await response.json() as { data?: unknown; errors?: unknown[] };

    if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data;
};

const fetchSchema = (url: string, method: string, headers?: Record<string, string>, body?: string): Promise<Response> => {
    return fetch(url, { method, ...(headers && { headers }), ...(body && { body }) });
}

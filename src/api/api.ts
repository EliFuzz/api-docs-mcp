import SwaggerParser from '@apidevtools/swagger-parser';
import { ResourceType, SchemaDetail } from 'src/utils/cache';

type OpenAPIDocument = Record<string, unknown> & {
    openapi?: string;
    swagger?: string;
    paths?: Record<string, PathItemObject>;
    info?: {
        title?: string;
        version?: string;
    };
};

type SchemaObject = Record<string, unknown> & {
    type?: string;
    properties?: Record<string, SchemaObject>;
    items?: SchemaObject;
    required?: string[];
    enum?: unknown[];
    format?: string;
    description?: string;
    example?: unknown;
    oneOf?: SchemaObject[];
    anyOf?: SchemaObject[];
    allOf?: SchemaObject[];
};

type ParameterObject = {
    name: string;
    in: string;
    description?: string;
    required?: boolean;
    schema?: SchemaObject;
};

type RequestBodyObject = {
    description?: string;
    required?: boolean;
    content?: Record<string, { schema?: SchemaObject }>;
};

type ResponseObject = {
    description?: string;
    content?: Record<string, { schema?: SchemaObject }>;
};

type OperationObject = {
    summary?: string;
    description?: string;
    parameters?: ParameterObject[];
    requestBody?: RequestBodyObject;
    responses?: Record<string, ResponseObject>;
};

type PathItemObject = Record<string, OperationObject | unknown>;

export const processApiSchema = async (input: string): Promise<SchemaDetail[]> => {
    try {
        const api = await SwaggerParser.dereference(input as never) as OpenAPIDocument;

        if (!api.paths) {
            return [];
        }

        const methods: SchemaDetail[] = [];
        for (const [path, pathItem] of Object.entries(api.paths)) {
            if (!pathItem) continue;

            for (const [method, operation] of Object.entries(pathItem)) {
                if (!['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
                    continue;
                }

                const op = operation as OperationObject;
                if (!op) continue;

                try {
                    methods.push(buildEndpointDetail(path, method.toUpperCase(), op, api));
                } catch {
                    continue;
                }
            }
        }

        return methods;
    } catch {
        return [];
    }
};

const buildEndpointDetail = (path: string, method: string, operation: OperationObject, api: OpenAPIDocument): SchemaDetail => {
    const versionField = api.openapi ? { openapi: api.openapi } : api.swagger ? { swagger: api.swagger } : {};

    return {
        name: `${method} ${path}`,
        description: operation.summary || operation.description || '',
        type: method as ResourceType,
        schema: JSON.stringify({
            ...versionField,
            info: {
                title: api.info?.title || '',
                version: api.info?.version || ''
            },
            paths: {
                [path]: {
                    [method.toLowerCase()]: operation
                }
            }
        })
    };
};

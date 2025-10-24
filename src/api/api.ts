import SwaggerParser from '@apidevtools/swagger-parser';
import { ResourceType, SchemaDetail } from 'src/utils/cache';

type OpenAPIDocument = Record<string, unknown> & {
    paths?: Record<string, PathItemObject>;
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

interface FieldDetail {
    name: string;
    type: string;
    description?: string;
    required?: boolean;
    fields?: FieldDetail[];
    enum?: string[];
    format?: string;
    example?: unknown;
}

export const processApiSchema = async (input: string | Record<string, unknown>): Promise<SchemaDetail[]> => {
    try {
        const api = await SwaggerParser.dereference(input as never) as OpenAPIDocument;
        const methods: SchemaDetail[] = [];

        const paths = (api as Record<string, unknown>).paths as Record<string, PathItemObject> | undefined;
        if (!paths) {
            return methods;
        }

        for (const [path, pathItem] of Object.entries(paths)) {
            if (!pathItem) continue;

            for (const [method, operation] of Object.entries(pathItem)) {
                if (!['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
                    continue;
                }

                const op = operation as OperationObject;
                if (!op) continue;

                try {
                    methods.push(buildEndpointDetail(path, method.toUpperCase(), op));
                } catch (error) {
                    methods.push({
                        name: `${method.toUpperCase()} ${path}`,
                        context: op.summary || op.description || '',
                        resourceType: method.toUpperCase() as ResourceType,
                        details: {
                            error: error instanceof Error ? error.message : String(error)
                        }
                    });
                }
            }
        }

        return methods;
    } catch (error) {
        return [];
    }
};

const buildEndpointDetail = (path: string, method: string, operation: OperationObject): SchemaDetail => {
    const headers = extractHeaders(operation);
    const request = extractRequestBody(operation);
    const response = extractResponses(operation);

    return {
        name: `${method} ${path}`,
        context: operation.summary || operation.description || '',
        resourceType: method as ResourceType,
        details: {
            headers: headers.length > 0 ? JSON.stringify(headers) : undefined,
            request: request.length > 0 ? JSON.stringify(request) : undefined,
            response: response.length > 0 ? JSON.stringify(response) : undefined
        }
    };
};

const extractHeaders = (operation: OperationObject): FieldDetail[] => {
    const headers: FieldDetail[] = [];

    if (operation.parameters) {
        for (const param of operation.parameters) {
            const parameter = param as ParameterObject;
            if (parameter.in === 'header') {
                headers.push({
                    name: parameter.name,
                    type: extractSchemaType(parameter.schema as SchemaObject),
                    description: parameter.description,
                    required: parameter.required
                });
            }
        }
    }

    return headers;
};

const extractRequestBody = (operation: OperationObject): FieldDetail[] => {
    const requestFields: FieldDetail[] = [];

    if (operation.parameters) {
        for (const param of operation.parameters) {
            const parameter = param as ParameterObject;
            if (parameter.in !== 'header') {
                const field: FieldDetail = {
                    name: parameter.name,
                    type: extractSchemaType(parameter.schema as SchemaObject),
                    description: parameter.description,
                    required: parameter.required
                };

                if (parameter.schema) {
                    const schema = parameter.schema as SchemaObject;
                    if (schema.enum) {
                        field.enum = schema.enum as string[];
                    }
                    if (schema.format) {
                        field.format = schema.format;
                    }
                    const nestedFields = extractSchemaFields(schema, new Set());
                    if (nestedFields.length > 0) {
                        field.fields = nestedFields;
                    }
                }

                requestFields.push(field);
            }
        }
    }

    if (operation.requestBody) {
        const requestBody = operation.requestBody as RequestBodyObject;
        if (requestBody.content) {
            for (const [contentType, mediaType] of Object.entries(requestBody.content)) {
                if (mediaType && mediaType.schema) {
                    const schema = mediaType.schema as SchemaObject;
                    const fields = extractSchemaFields(schema, new Set());
                    requestFields.push({
                        name: 'body',
                        type: contentType,
                        description: requestBody.description,
                        required: requestBody.required,
                        fields
                    });
                }
            }
        }
    }

    return requestFields;
};

const extractResponses = (operation: OperationObject): FieldDetail[] => {
    const responses: FieldDetail[] = [];

    if (operation.responses) {
        for (const [statusCode, response] of Object.entries(operation.responses)) {
            const responseObj = response as ResponseObject;
            if (responseObj.content) {
                for (const [contentType, mediaType] of Object.entries(responseObj.content)) {
                    if (mediaType && mediaType.schema) {
                        responses.push({
                            name: statusCode,
                            type: contentType,
                            description: responseObj.description,
                            fields: extractSchemaFields(mediaType.schema, new Set())
                        });
                    }
                }
            } else {
                responses.push({
                    name: statusCode,
                    type: 'empty',
                    description: responseObj.description
                });
            }
        }
    }

    return responses;
};

const extractSchemaFields = (schema: SchemaObject, visitedTypes: Set<string>): FieldDetail[] => {
    const fields: FieldDetail[] = [];

    if (!schema) {
        return fields;
    }

    const schemaKey = JSON.stringify(schema);
    if (visitedTypes.has(schemaKey)) {
        return fields;
    }

    const newVisitedTypes = new Set(visitedTypes);
    newVisitedTypes.add(schemaKey);

    if (schema.properties) {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
            const prop = propSchema as SchemaObject;
            const field: FieldDetail = {
                name: propName,
                type: extractSchemaType(prop),
                description: prop.description,
                required: schema.required?.includes(propName)
            };

            if (prop.enum) {
                field.enum = prop.enum as string[];
            }

            if (prop.format) {
                field.format = prop.format;
            }

            if (prop.example !== undefined) {
                field.example = prop.example;
            }

            const nestedFields = extractSchemaFields(prop, newVisitedTypes);
            if (nestedFields.length > 0) {
                field.fields = nestedFields;
            }

            fields.push(field);
        }
    }

    if (schema.items) {
        const items = schema.items as SchemaObject;
        const nestedFields = extractSchemaFields(items, newVisitedTypes);
        if (nestedFields.length > 0) {
            return nestedFields;
        }
    }

    if (schema.oneOf || schema.anyOf || schema.allOf) {
        const schemas = (schema.oneOf || schema.anyOf || schema.allOf) as SchemaObject[];
        for (const subSchema of schemas) {
            fields.push(...extractSchemaFields(subSchema, newVisitedTypes));
        }
    }

    return fields;
};

const extractSchemaType = (schema: SchemaObject | undefined): string => {
    if (!schema) {
        return 'unknown';
    }

    if (schema.type === 'array') {
        const items = schema.items as SchemaObject;
        return `[${extractSchemaType(items)}]`;
    }

    if (schema.oneOf) {
        return `oneOf<${(schema.oneOf as SchemaObject[]).map(s => extractSchemaType(s)).join(' | ')}>`;
    }

    if (schema.anyOf) {
        return `anyOf<${(schema.anyOf as SchemaObject[]).map(s => extractSchemaType(s)).join(' | ')}>`;
    }

    if (schema.allOf) {
        return `allOf<${(schema.allOf as SchemaObject[]).map(s => extractSchemaType(s)).join(' & ')}>`;
    }

    if (schema.format) {
        return `${schema.type || 'unknown'}(${schema.format})`;
    }

    return schema.type || 'unknown';
};

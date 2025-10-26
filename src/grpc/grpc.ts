import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { GrpcReflection } from 'grpc-js-reflection-client';
import * as path from 'path';
import { ResourceType, SchemaDetail } from 'src/utils/cache';
import { UrlSource } from 'src/utils/source';

interface FieldDetail {
    name: string;
    type: string;
    description?: string;
    required?: boolean;
    repeated?: boolean;
    fields?: FieldDetail[];
    enumValues?: string[];
}

interface MethodDescriptor {
    name: string;
    inputType: string;
    outputType: string;
    requestStream: boolean;
    responseStream: boolean;
}

interface ServiceDescriptor {
    name: string;
    methods: MethodDescriptor[];
}

export const processGrpcSchema = async (input: string | UrlSource): Promise<SchemaDetail[]> => {
    const methods: SchemaDetail[] = [];

    try {
        let packageDefinition: protoLoader.PackageDefinition;
        let services: ServiceDescriptor[];

        if (typeof input === 'string') {
            packageDefinition = await loadProtoFile(input);
            const grpcObject = grpc.loadPackageDefinition(packageDefinition);
            services = extractServicesFromGrpcObject(grpcObject);
        } else {
            const result = await fetchGrpcReflection(input);
            packageDefinition = result.packageDefinition;
            services = result.services;
        }

        for (const service of services) {
            for (const method of service.methods) {
                methods.push(buildMethodDetail(service.name, method, packageDefinition));
            }
        }
    } catch (error) { }

    return methods;
};

const loadProtoFile = async (filePath: string): Promise<protoLoader.PackageDefinition> => {
    const options: protoLoader.Options = {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
        includeDirs: [path.dirname(filePath)]
    };

    return protoLoader.loadSync(path.resolve(filePath), options);
};

const fetchGrpcReflection = async (source: UrlSource): Promise<{ packageDefinition: protoLoader.PackageDefinition; services: ServiceDescriptor[] }> => {
    const credentials = source.url.startsWith('https://') || source.headers?.['authorization']
        ? grpc.ChannelCredentials.createSsl()
        : grpc.ChannelCredentials.createInsecure();

    const client = new GrpcReflection(source.url, credentials);

    try {
        const serviceNames = await client.listServices();
        const allServices: ServiceDescriptor[] = [];
        const combinedPackageDefinition: Record<string, protoLoader.AnyDefinition> = {};

        for (const serviceName of serviceNames) {
            if (serviceName.startsWith('grpc.reflection')) {
                continue;
            }

            try {
                const methods = await client.listMethods(serviceName);
                const descriptor = await client.getDescriptorBySymbol(serviceName);

                const packageObject = descriptor.getPackageObject({
                    keepCase: true,
                    longs: String,
                    enums: String,
                    defaults: true,
                    oneofs: true
                }) as Record<string, protoLoader.AnyDefinition>;

                Object.assign(combinedPackageDefinition, packageObject);

                allServices.push({
                    name: serviceName,
                    methods: methods.map(m => {
                        const definition = (m as any).definition;
                        return {
                            name: m.name,
                            inputType: definition?.requestType?.type?.name || 'unknown',
                            outputType: definition?.responseType?.type?.name || 'unknown',
                            requestStream: definition?.requestStream || false,
                            responseStream: definition?.responseStream || false
                        };
                    })
                });
            } catch (methodError) {
                console.error(`Error processing service ${serviceName}:`, methodError);
            }
        }

        return {
            packageDefinition: combinedPackageDefinition as protoLoader.PackageDefinition,
            services: allServices
        };
    } catch (error) {
        throw error;
    }
};

const extractServicesFromGrpcObject = (grpcObject: any): ServiceDescriptor[] => {
    const services: ServiceDescriptor[] = [];

    const traverse = (obj: any, prefix = ''): void => {
        for (const key in obj) {
            const value = obj[key];

            if (value && typeof value === 'function' && value.service && typeof value.service === 'object') {
                const serviceName = prefix ? `${prefix}.${key}` : key;
                const methodDescriptors: MethodDescriptor[] = [];

                for (const methodName in value.service) {
                    const methodDef = value.service[methodName];
                    if (methodDef && methodDef.requestType && methodDef.responseType) {
                        methodDescriptors.push({
                            name: methodName,
                            inputType: methodDef.requestType.type?.name || methodDef.requestType.format || 'unknown',
                            outputType: methodDef.responseType.type?.name || methodDef.responseType.format || 'unknown',
                            requestStream: methodDef.requestStream || false,
                            responseStream: methodDef.responseStream || false
                        });
                    }
                }

                if (methodDescriptors.length > 0) {
                    services.push({ name: serviceName, methods: methodDescriptors });
                }
            } else if (value && typeof value === 'object' && !value.service) {
                const newPrefix = prefix ? `${prefix}.${key}` : key;
                traverse(value, newPrefix);
            }
        }
    };

    traverse(grpcObject);
    return services;
};

const buildMethodDetail = (serviceName: string, method: MethodDescriptor, packageDefinition: protoLoader.PackageDefinition): SchemaDetail => {
    const methodType = getMethodType(method.requestStream, method.responseStream);
    const requestFields = extractMessageFields(method.inputType, packageDefinition);
    const responseFields = extractMessageFields(method.outputType, packageDefinition);

    return {
        name: `${serviceName}.${method.name}`,
        context: methodType,
        resourceType: ResourceType.GRPC,
        details: {
            request: JSON.stringify({ type: method.inputType, stream: method.requestStream, fields: requestFields }),
            response: JSON.stringify({ type: method.outputType, stream: method.responseStream, fields: responseFields })
        }
    };
};

const getMethodType = (requestStream: boolean, responseStream: boolean): string => {
    if (requestStream && responseStream) {
        return 'Bidirectional Streaming';
    }

    if (requestStream) {
        return 'Client Streaming';
    }

    if (responseStream) {
        return 'Server Streaming';
    }

    return 'Unary';
};

const extractMessageFields = (typeName: string, packageDefinition: protoLoader.PackageDefinition, visitedTypes: Set<string> = new Set()): FieldDetail[] => {
    if (visitedTypes.has(typeName)) {
        return [];
    }

    visitedTypes.add(typeName);

    const messageType = findMessageType(typeName, packageDefinition);
    if (!messageType || !messageType.type || !messageType.type.field) {
        return [];
    }

    const fields: FieldDetail[] = [];

    for (const field of messageType.type.field) {
        const fieldDetail: FieldDetail = {
            name: field.name || '',
            type: getFieldType(field),
            required: field.label === 2 || field.label === 'LABEL_REQUIRED',
            repeated: field.label === 3 || field.label === 'LABEL_REPEATED'
        };

        if (field.typeName) {
            const cleanTypeName = field.typeName.startsWith('.') ? field.typeName.substring(1) : field.typeName;

            const isEnum = field.type === 14 || field.type === 'TYPE_ENUM';
            const isMessage = field.type === 11 || field.type === 'TYPE_MESSAGE';

            if (isEnum) {
                const enumType = findEnumType(cleanTypeName, packageDefinition);
                if (enumType && enumType.value) {
                    fieldDetail.enumValues = enumType.value.map((v: any) => v.name).filter(Boolean);
                }
            } else if (isMessage) {
                if (!visitedTypes.has(cleanTypeName)) {
                    const nestedFields = extractMessageFields(cleanTypeName, packageDefinition, new Set(visitedTypes));
                    if (nestedFields.length > 0) {
                        fieldDetail.fields = nestedFields;
                    }
                }
            }
        }

        fields.push(fieldDetail);
    }

    return fields;
};

const findMessageType = (typeName: string, packageDefinition: protoLoader.PackageDefinition): any => {
    const cleanName = typeName.startsWith('.') ? typeName.substring(1) : typeName;

    const traverse = (obj: any): any => {
        for (const key in obj) {
            const value = obj[key];
            if (value && typeof value === 'object') {
                if (value.format === 'Protocol Buffer 3 DescriptorProto' || value.type?.field) {
                    const fullName = value.name || key;
                    if (fullName === cleanName || fullName.endsWith(`.${cleanName}`)) {
                        return value;
                    }
                }
                const result = traverse(value);
                if (result) return result;
            }
        }
        return null;
    };

    return traverse(packageDefinition);
};

const findEnumType = (typeName: string, packageDefinition: protoLoader.PackageDefinition): any => {
    const cleanName = typeName.startsWith('.') ? typeName.substring(1) : typeName;

    const traverse = (obj: any): any => {
        for (const key in obj) {
            const value = obj[key];
            if (value && typeof value === 'object') {
                if (value.format === 'Protocol Buffer 3 EnumDescriptorProto' || value.value) {
                    const fullName = value.name || key;
                    if (fullName === cleanName || fullName.endsWith(`.${cleanName}`)) {
                        return value;
                    }
                }
                const result = traverse(value);
                if (result) return result;
            }
        }
        return null;
    };

    return traverse(packageDefinition);
};

const getFieldType = (field: any): string => {
    const numericTypeMap: Record<number, string> = {
        1: 'double',
        2: 'float',
        3: 'int64',
        4: 'uint64',
        5: 'int32',
        6: 'fixed64',
        7: 'fixed32',
        8: 'bool',
        9: 'string',
        10: 'group',
        11: 'message',
        12: 'bytes',
        13: 'uint32',
        14: 'enum',
        15: 'sfixed32',
        16: 'sfixed64',
        17: 'sint32',
        18: 'sint64'
    };

    const stringTypeMap: Record<string, string> = {
        'TYPE_DOUBLE': 'double',
        'TYPE_FLOAT': 'float',
        'TYPE_INT64': 'int64',
        'TYPE_UINT64': 'uint64',
        'TYPE_INT32': 'int32',
        'TYPE_FIXED64': 'fixed64',
        'TYPE_FIXED32': 'fixed32',
        'TYPE_BOOL': 'bool',
        'TYPE_STRING': 'string',
        'TYPE_GROUP': 'group',
        'TYPE_MESSAGE': 'message',
        'TYPE_BYTES': 'bytes',
        'TYPE_UINT32': 'uint32',
        'TYPE_ENUM': 'enum',
        'TYPE_SFIXED32': 'sfixed32',
        'TYPE_SFIXED64': 'sfixed64',
        'TYPE_SINT32': 'sint32',
        'TYPE_SINT64': 'sint64'
    };

    let baseType: string;
    if (typeof field.type === 'number') {
        baseType = numericTypeMap[field.type] || 'unknown';
    } else if (typeof field.type === 'string') {
        baseType = stringTypeMap[field.type] || 'unknown';
    } else {
        baseType = 'unknown';
    }

    if (field.typeName) {
        const cleanTypeName = field.typeName.startsWith('.') ? field.typeName.substring(1) : field.typeName;
        baseType = cleanTypeName;
    }

    if (field.label === 'LABEL_REPEATED' || field.label === 3) {
        return `repeated ${baseType}`;
    }

    return baseType;
};

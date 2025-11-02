import protobuf from 'protobufjs';
import { ResourceType, SchemaDetail } from 'src/utils/cache';

export const processGrpcSchema = async (input: string[]): Promise<SchemaDetail[]> => {
    const methods: SchemaDetail[] = [];

    try {
        const root = new protobuf.Root();
        for (const content of input) {
            protobuf.parse(content, root, { keepCase: true });
        }
        const jsonDescriptor = root.toJSON({ keepComments: true });
        const services = extractServices(jsonDescriptor);

        for (const serviceName in services) {
            const service = services[serviceName];
            for (const method of service.methods) {
                const schema = generateMethodProto(serviceName, method, jsonDescriptor);
                methods.push({
                    name: `${serviceName.split('.').pop()}.${method.name}`,
                    description: method.comment || '',
                    type: ResourceType.GRPC,
                    schema
                });
            }
        }
    } catch {
        return [];
    }

    return methods;
};

const extractServices = (jsonDescriptor: any): Record<string, { methods: any[] }> => {
    const services: Record<string, { methods: any[] }> = {};

    const extractFromNamespace = (namespace: any, path: string[] = []) => {
        if (namespace.nested) {
            for (const key in namespace.nested) {
                const item = namespace.nested[key];
                const currentPath = [...path, key];

                if (item.methods) {
                    const serviceName = key;
                    services[serviceName] = { methods: [] };

                    for (const methodName in item.methods) {
                        const method = item.methods[methodName];
                        services[serviceName].methods.push({
                            name: methodName,
                            requestType: method.requestType,
                            responseType: method.responseType,
                            comment: method.comment || '',
                            options: method.options || {}
                        });
                    }
                } else if (item.nested) {
                    extractFromNamespace(item, currentPath);
                }
            }
        }
    };

    extractFromNamespace(jsonDescriptor);
    return services;
};

const generateMethodProto = (serviceName: string, method: any, jsonDescriptor: any): string => {
    const lines: string[] = ['syntax = "proto3";', ''];

    const collectedMessages: Record<string, any> = {};
    const collectedEnums: Record<string, any> = {};

    collectTypeDependencies(method.requestType, jsonDescriptor, collectedMessages, collectedEnums);
    collectTypeDependencies(method.responseType, jsonDescriptor, collectedMessages, collectedEnums);

    for (const enumName in collectedEnums) {
        const enumData = collectedEnums[enumName];
        if (enumData.comment) {
            lines.push(`// ${enumData.comment}`);
        }
        lines.push(`enum ${enumName.split('.').pop()} {`);
        for (const valueName in enumData.values) {
            lines.push(`  ${valueName} = ${enumData.values[valueName]};`);
        }
        lines.push('}');
        lines.push('');
    }

    const addMessage = (msgName: string, msgData: any, indent = '') => {
        if (msgData.comment) {
            lines.push(`${indent}// ${msgData.comment}`);
        }
        lines.push(`${indent}message ${msgName.split('.').pop()} {`);
        if (msgData.fields) {
            for (const fieldName in msgData.fields) {
                const field = msgData.fields[fieldName];
                const label = field.rule === 'repeated' ? 'repeated ' : '';
                lines.push(`${indent}  ${label}${field.type} ${fieldName} = ${field.id};`);
            }
        }
        if (msgData.nested) {
            for (const nestedName in msgData.nested) {
                const nested = msgData.nested[nestedName];
                if (nested.fields) {
                    addMessage(`${msgName}.${nestedName}`, nested, indent + '  ');
                }
            }
        }
        lines.push(`${indent}}`);
        lines.push('');
    };

    for (const msgName in collectedMessages) {
        addMessage(msgName, collectedMessages[msgName]);
    }

    lines.push(`service ${serviceName.split('.').pop()} {`);
    if (method.comment) {
        lines.push(`  // ${method.comment}`);
    }
    const reqStream = method.options?.requestStream ? 'stream ' : '';
    const resStream = method.options?.responseStream ? 'stream ' : '';
    lines.push(`  rpc ${method.name} (${reqStream}${method.requestType}) returns (${resStream}${method.responseType}) {};`);
    lines.push('}');

    return lines.join('\n');
};

const collectTypeDependencies = (
    typeName: string,
    jsonDescriptor: any,
    collectedMessages: Record<string, any>,
    collectedEnums: Record<string, any>
): void => {
    if (!typeName || collectedMessages[typeName]) return;

    let typeDef;
    if (typeName.includes('.')) {
        const parts = typeName.split('.');
        let current = jsonDescriptor.nested;
        for (const part of parts) {
            current = current?.[part]?.nested || current?.[part];
        }
        typeDef = current;
    } else {
        typeDef = findTypeDefinition(typeName, jsonDescriptor);
    }

    if (!typeDef) return;

    collectedMessages[typeName] = typeDef;

    if (typeDef.fields) {
        for (const fieldName in typeDef.fields) {
            const field = typeDef.fields[fieldName];
            if (field.type && !field.type.includes('.') && !['string', 'int32', 'int64', 'uint32', 'uint64', 'sint32', 'sint64', 'fixed32', 'fixed64', 'sfixed32', 'sfixed64', 'float', 'double', 'bool', 'bytes'].includes(field.type)) {
                const enumType = findEnumType(field.type, jsonDescriptor);
                if (enumType) {
                    collectedEnums[enumType.name] = enumType.data;
                }
            } else if (field.type && field.type.includes('.') && !field.type.startsWith('google.protobuf.')) {
                collectTypeDependencies(field.type, jsonDescriptor, collectedMessages, collectedEnums);
            }
        }
    }

    if (typeDef.nested) {
        for (const nestedName in typeDef.nested) {
            const nested = typeDef.nested[nestedName];
            if (nested.fields) {
                collectTypeDependencies(`${typeName}.${nestedName}`, jsonDescriptor, collectedMessages, collectedEnums);
            } else if (nested.values) {
                collectedEnums[`${typeName}.${nestedName}`] = nested;
            }
        }
    }
};

const findTypeDefinition = (typeName: string, jsonDescriptor: any): any => {
    const findInNamespace = (namespace: any): any => {
        if (namespace.nested) {
            for (const key in namespace.nested) {
                const item = namespace.nested[key];

                if ((item.fields || item.methods) && key === typeName) {
                    return item;
                } else if (item.nested) {
                    const found = findInNamespace(item);
                    if (found) return found;
                }
            }
        }
        return null;
    };

    return findInNamespace(jsonDescriptor);
};

const findEnumType = (typeName: string, jsonDescriptor: any): { name: string; data: any } | null => {
    const findInNamespace = (namespace: any, path: string[] = []): { name: string; data: any } | null => {
        if (namespace.nested) {
            for (const key in namespace.nested) {
                const item = namespace.nested[key];
                const currentPath = [...path, key];

                if (item.values && key === typeName) {
                    return { name: currentPath.join('.'), data: item };
                } else if (item.nested) {
                    const found = findInNamespace(item, currentPath);
                    if (found) return found;
                }
            }
        }
        return null;
    };

    return findInNamespace(jsonDescriptor);
};

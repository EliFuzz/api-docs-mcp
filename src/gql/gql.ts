import {
    GraphQLField,
    GraphQLInputType,
    GraphQLOutputType,
    GraphQLSchema,
    isInputObjectType,
    isListType,
    isNonNullType,
    isObjectType,
    printType
} from "graphql";
import { ResourceType, SchemaDetail } from "src/utils/cache";

export const processGqlSchema = async (schema: GraphQLSchema): Promise<SchemaDetail[]> => {
    const methods: SchemaDetail[] = [];

    for (const field of Object.values(schema.getQueryType()?.getFields() || {})) {
        methods.push(buildMethodDetail(field, ResourceType.QUERY, schema));
    }

    for (const field of Object.values(schema.getMutationType()?.getFields() || {})) {
        methods.push(buildMethodDetail(field, ResourceType.MUTATION, schema));
    }

    for (const field of Object.values(schema.getSubscriptionType()?.getFields() || {})) {
        methods.push(buildMethodDetail(field, ResourceType.SUBSCRIPTION, schema));
    }

    return methods;
}

const buildMethodDetail = (field: GraphQLField<any, any>, resourceType: ResourceType, schema: GraphQLSchema): SchemaDetail => {
    const typeMap = schema.getTypeMap();
    const collectedTypes = new Set<string>();
    const schemaTypeDefinitions: string[] = [];

    collectTypeDefinitions(field.type, typeMap, collectedTypes, schemaTypeDefinitions);
    field.args.forEach(arg => collectTypeDefinitions(arg.type, typeMap, collectedTypes, schemaTypeDefinitions));

    return {
        name: field.name,
        description: field.description || '',
        type: resourceType,
        schema: buildWrappedDefinition(field, resourceType) + schemaTypeDefinitions.join(''),
    };
}

const collectTypeDefinitions = (type: GraphQLInputType | GraphQLOutputType, typeMap: any, collectedTypes: Set<string>, schemaTypeDefinitions: string[]): void => {
    const collectTypes = (type: GraphQLInputType | GraphQLOutputType) => {
        let unwrappedType = type;
        while (isNonNullType(unwrappedType) || isListType(unwrappedType)) {
            unwrappedType = unwrappedType.ofType as GraphQLInputType | GraphQLOutputType;
        }

        const typeName = (unwrappedType as any).name;
        if (!typeName || collectedTypes.has(typeName)) {
            return;
        }
        collectedTypes.add(typeName);

        const gqlType = typeMap[typeName];
        if (gqlType) {
            schemaTypeDefinitions.push('\n' + printType(gqlType) + '\n');
            if (isObjectType(gqlType) || isInputObjectType(gqlType)) {
                for (const f of Object.values(gqlType.getFields())) {
                    collectTypes(f.type);
                    if (f.args && Array.isArray(f.args)) {
                        for (const arg of f.args) {
                            collectTypes(arg.type);
                        }
                    }
                }
            }
        }
    };

    collectTypes(type);
};

const buildWrappedDefinition = (field: GraphQLField<any, any>, resourceType: ResourceType): string => {
    const descriptionString = field.description ? `  """\n  ${field.description}\n  """\n` : '';

    return `${resourceType.toLowerCase()} {\n${descriptionString}${buildFieldDefinition(field)}}\n`;
};

const buildFieldDefinition = (field: GraphQLField<any, any>): string => {
    let definition = [`  ${field.name}`];

    if (field.args.length > 0) {
        definition.push(`(${field.args.map(arg => `${arg.name}: ${arg.type.toString()}`).join(', ')})`);
    }

    return `${definition.join(' ')}: ${field.type.toString()}\n`;
};

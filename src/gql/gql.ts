import {
    GraphQLField,
    GraphQLInputType,
    GraphQLOutputType,
    GraphQLSchema,
    isEnumType,
    isInputObjectType,
    isListType,
    isNonNullType,
    isObjectType
} from "graphql";
import { ResourceType, SchemaDetail } from "src/utils/cache";

interface FieldDetail {
    name: string;
    type: string;
    description: string | null;
    fields?: FieldDetail[];
    enumValues?: string[];
}

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
    const request = field.args.map((arg) => buildFieldDetail(arg.name, arg.type, arg.description || null, schema));
    const response: any = { type: extractGqlType(field.type), description: getTypeDescription(field.type, schema) };

    const responseFields = extractTypeFields(field.type, schema);
    if (responseFields.length > 0) {
        response.fields = responseFields;
    }

    return {
        name: field.name,
        context: field.description || '',
        resourceType,
        details: {
            request: JSON.stringify(request),
            response: JSON.stringify(response)
        }
    };
}

const buildFieldDetail = (name: string, type: GraphQLInputType | GraphQLOutputType, description: string | null, schema: GraphQLSchema): FieldDetail => {
    const fieldDetail: FieldDetail = { name, type: extractGqlType(type), description };

    const enumValues = extractEnumValues(type);
    if (enumValues.length > 0) {
        fieldDetail.enumValues = enumValues;
    }

    const fields = extractTypeFields(type, schema);
    if (fields.length > 0) {
        fieldDetail.fields = fields;
    }

    return fieldDetail;
}

const extractTypeFields = (type: GraphQLInputType | GraphQLOutputType, schema: GraphQLSchema, visitedTypes: Set<string> = new Set()): FieldDetail[] => {
    let unwrappedType = type;
    while (isNonNullType(unwrappedType) || isListType(unwrappedType)) {
        unwrappedType = unwrappedType.ofType as GraphQLInputType | GraphQLOutputType;
    }

    const typeName = (unwrappedType as any).name;

    if (visitedTypes.has(typeName)) {
        return [];
    }

    const newVisitedTypes = new Set(visitedTypes);
    newVisitedTypes.add(typeName);

    if (isObjectType(unwrappedType)) {
        const fields = unwrappedType.getFields();
        return Object.values(fields).map((field) => {
            const fieldDetail: FieldDetail = { name: field.name, type: extractGqlType(field.type), description: field.description || null };

            const enumValues = extractEnumValues(field.type);
            if (enumValues.length > 0) {
                fieldDetail.enumValues = enumValues;
            }

            let fieldUnwrapped: any = field.type;
            while (isNonNullType(fieldUnwrapped) || isListType(fieldUnwrapped)) {
                fieldUnwrapped = fieldUnwrapped.ofType;
            }

            if (!newVisitedTypes.has(fieldUnwrapped.name)) {
                const nestedFields = extractTypeFields(field.type, schema, newVisitedTypes);
                if (nestedFields.length > 0) {
                    fieldDetail.fields = nestedFields;
                }
            }

            return fieldDetail;
        });
    }

    if (isInputObjectType(unwrappedType)) {
        const fields = unwrappedType.getFields();
        return Object.values(fields).map((field) => {
            const fieldDetail: FieldDetail = { name: field.name, type: extractGqlType(field.type), description: field.description || null };

            const enumValues = extractEnumValues(field.type);
            if (enumValues.length > 0) {
                fieldDetail.enumValues = enumValues;
            }

            let fieldUnwrapped: any = field.type;
            while (isNonNullType(fieldUnwrapped) || isListType(fieldUnwrapped)) {
                fieldUnwrapped = fieldUnwrapped.ofType;
            }

            if (!newVisitedTypes.has(fieldUnwrapped.name)) {
                const nestedFields = extractTypeFields(field.type, schema, newVisitedTypes);
                if (nestedFields.length > 0) {
                    fieldDetail.fields = nestedFields;
                }
            }

            return fieldDetail;
        });
    }

    return [];
}

const getTypeDescription = (type: GraphQLInputType | GraphQLOutputType, schema: GraphQLSchema): string | null => {
    if (isNonNullType(type) || isListType(type)) {
        return getTypeDescription(type.ofType as GraphQLInputType | GraphQLOutputType, schema);
    }

    return schema.getType(type.name)?.description || null;
}

const extractEnumValues = (type: GraphQLInputType | GraphQLOutputType): string[] => {
    let unwrappedType = type;
    while (isNonNullType(unwrappedType) || isListType(unwrappedType)) {
        unwrappedType = unwrappedType.ofType as GraphQLInputType | GraphQLOutputType;
    }

    if (isEnumType(unwrappedType)) {
        return unwrappedType.getValues().map((value) => value.name);
    }

    return [];
}

const extractGqlType = (type: GraphQLInputType | GraphQLOutputType): string => {
    if (isNonNullType(type)) {
        return `${extractGqlType(type.ofType as GraphQLInputType | GraphQLOutputType)}!`;
    }
    if (isListType(type)) {
        return `[${extractGqlType(type.ofType as GraphQLInputType | GraphQLOutputType)}]`;
    }
    return (type as any).name;
}

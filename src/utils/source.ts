export enum SourceType {
    GQL = 'gql',
    API = 'api',
    GRPC = 'grpc',
}

export enum SourceMethod {
    GET = 'GET',
    POST = 'POST',
}

export interface FileSource {
    name: string;
    path: string;
    type: SourceType.GQL | SourceType.API | SourceType.GRPC;
}

export interface UrlSource {
    name: string;
    method: SourceMethod;
    url: string;
    headers?: Record<string, string>;
    type: SourceType.GQL | SourceType.API | SourceType.GRPC;
}

export type SchemaSource = FileSource | UrlSource;

export const isFileSource = (source: SchemaSource): source is FileSource => {
    return 'path' in source;
}

export const isGqlType = (source: SchemaSource): boolean => {
    return source.type === SourceType.GQL;
}

export const isApiType = (source: SchemaSource): boolean => {
    return source.type === SourceType.API;
}

export const isGrpcType = (source: SchemaSource): boolean => {
    return source.type === SourceType.GRPC;
}

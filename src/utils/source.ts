export enum SourceType {
    GQL = 'gql',
}

export enum SourceMethod {
    GET = 'GET',
    POST = 'POST',
}

export interface FileSource {
    name: string;
    path: string;
    type: SourceType.GQL;
}

export interface UrlSource {
    name: string;
    method: SourceMethod;
    url: string;
    headers?: Record<string, string>;
    type: SourceType.GQL;
}

export type SchemaSource = FileSource | UrlSource;

export const isFileSource = (source: SchemaSource): source is FileSource => {
    return 'path' in source;
}

export const isGqlType = (source: SchemaSource): boolean => {
    return source.type === SourceType.GQL;
}

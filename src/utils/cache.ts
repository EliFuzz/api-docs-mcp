import { GraphQLFileLoader } from "@graphql-tools/graphql-file-loader";
import { loadSchema } from '@graphql-tools/load';
import { buildClientSchema } from "graphql";
import { processApiSchema } from "src/api/api";
import { processGqlSchema } from "src/gql/gql";
import { loadConfig } from "src/utils/config";
import { fetchGqlSchema } from "src/utils/fetch";
import { isFileGql, isFileJSON, readFile } from "src/utils/file";
import { FileSource, isApiType, isFileSource, isGqlType, SchemaSource, UrlSource } from "src/utils/source";

export interface DetailEntry {
    headers?: string;
    request?: string;
    response?: string;
    error?: string;
}

export enum ResourceType {
    QUERY = 'query',
    MUTATION = 'mutation',
    SUBSCRIPTION = 'subscription',
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE',
    PATCH = 'PATCH'
}

export interface SchemaDetail {
    name: string;
    resourceType: ResourceType;
    context: string;
    details: DetailEntry;
}

export interface CacheEntry {
    name: string;
    source: SchemaSource;
    resources: SchemaDetail[];
    timestamp: number;
}

class Cache {
    private static readonly ttl: number = 12 * 60 * 60 * 1000; // 12h
    private static docs: CacheEntry[] = [];

    public static getAllDocs(): CacheEntry[] {
        return this.docs;
    }

    public static getDetails(detailName: string, sourceName?: string): CacheEntry[] {
        const docs = sourceName ? this.docs.filter(doc => doc.source.name === sourceName) : this.docs;

        const details: CacheEntry[] = [];
        for (const doc of docs) {
            const matchedResources = doc.resources.filter(resource => resource.name === detailName);
            if (matchedResources.length > 0) {
                details.push({
                    name: doc.name,
                    source: doc.source,
                    resources: matchedResources,
                    timestamp: doc.timestamp
                });
            }
        }

        return details;
    }

    public static set(entry: CacheEntry): void {
        this.docs.push(entry);
    }

    public static hasExpired(entry: CacheEntry): boolean {
        return (Date.now() - entry.timestamp) > this.ttl;
    }

    public static getBySourceName(sourceName: string): CacheEntry | null {
        return this.docs.find(doc => doc.source.name === sourceName) || null;
    }
}

export class CacheManager {
    public static async refresh(): Promise<void> {
        const config = loadConfig();
        await Promise.all(config.sources.map(source => this.fetchAndCache(source)));
    }

    public static async getDocs(sourceName?: string): Promise<CacheEntry[]> {
        if (!sourceName) {
            const docs = Cache.getAllDocs();
            await Promise.all(docs.map(async doc => Cache.hasExpired(doc) ? this.fetchAndCache(doc.source) : Promise.resolve()));
            return Cache.getAllDocs();
        }

        const cacheEntry = Cache.getBySourceName(sourceName) as CacheEntry | null;
        if (cacheEntry && Cache.hasExpired(cacheEntry)) {
            await this.fetchAndCache(cacheEntry.source);
        }

        return cacheEntry ? [cacheEntry] : Cache.getAllDocs();
    }

    public static async getDetails(detailName: string): Promise<CacheEntry[]> {
        return Cache.getDetails(detailName);
    }

    private static async fetchAndCache(source: SchemaSource): Promise<void> {
        isFileSource(source) ? this.processFileSource(source) : this.processUrlSource(source);
    }

    private static async processFileSource(source: FileSource): Promise<void> {
        const file = await readFile(source);

        if (isGqlType(source)) {
            if (isFileJSON(source)) {
                const introspection = JSON.parse(file);
                const schema = buildClientSchema(introspection.data || introspection);
                Cache.set({ name: source.name, source, resources: await processGqlSchema(schema), timestamp: Date.now() });
                return;
            }

            if (isFileGql(source)) {
                const schema = await loadSchema(source.path, { loaders: [new GraphQLFileLoader()] });
                Cache.set({ name: source.name, source, resources: await processGqlSchema(schema), timestamp: Date.now() });
                return;
            }
        }

        if (isApiType(source)) {
            Cache.set({ name: source.name, source, resources: await processApiSchema(source.path), timestamp: Date.now() });
            return;
        }
    }

    private static async processUrlSource(source: UrlSource): Promise<void> {
        if (isGqlType(source)) {
            const response = await fetchGqlSchema(source) as never;
            const schema = buildClientSchema(response);
            Cache.set({ name: source.name, source, resources: await processGqlSchema(schema), timestamp: Date.now() });
            return;
        }

        if (isApiType(source)) {
            Cache.set({ name: source.name, source, resources: await processApiSchema(source.url), timestamp: Date.now() });
            return;
        }
    }
}

import { CacheManager } from '../../build/utils/cache.js';

export function clearCache() {
    CacheManager.clear();
}

export async function setupCacheWithSources(sources: any[]) {
    clearCache();
    process.env.API_SOURCES = JSON.stringify(sources);
    await CacheManager.refresh();
}

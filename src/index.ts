#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools, server } from "src/server";
import { CacheManager } from "src/utils/cache";
import { setTimeout } from "timers";

(async () => {
    await registerTools();
    await CacheManager.refresh();
    await server.connect(new StdioServerTransport());

    setTimeout(() => CacheManager.refresh(), 60 * 60 * 1000);
})();

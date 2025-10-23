import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readdir } from 'fs/promises';
import path from "path";
import { fileURLToPath } from "url";

export const server = new McpServer({ name: 'api-docs-mcp', version: '1.0.0' });

export const registerTools = async (): Promise<void> => {
    try {
        const toolsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), './tools');
        const toolFiles = (await readdir(toolsDir)).filter(file => (file.endsWith('.ts') || file.endsWith('.js')) && !file.endsWith('.d.ts'));
        for (const file of toolFiles) {
            await import(path.join(toolsDir, file));
        }
    } catch (error) {
        console.error('Error registering tools:', error);
        throw error;
    }
}

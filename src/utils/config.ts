import { SchemaSource } from "src/utils/source";

export const loadConfig = (): { sources: SchemaSource[] } => {
    try {
        return { sources: JSON.parse(process.env.MCP_API_SOURCES as string) };
    } catch (error) {
        throw new Error(`Failed to parse MCP_API_SOURCES: ${error}`);
    }
}

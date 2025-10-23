import { SchemaSource } from "src/utils/source";

export const loadConfig = (): { sources: SchemaSource[] } => {
    try {
        return { sources: JSON.parse(process.env.API_SOURCES as string) };
    } catch (error) {
        throw new Error(`Failed to parse API_SOURCES: ${error}`);
    }
}

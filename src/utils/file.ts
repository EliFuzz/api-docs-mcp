import * as fs from 'fs/promises';
import path from 'path';
import { FileSource } from 'src/utils/source';

export const readFile = async (source: FileSource): Promise<string> => {
    return fs.readFile(path.resolve(source.path), 'utf-8');
}

export const isFileJSON = (source: FileSource): boolean => {
    return path.extname(source.path).toLowerCase() === '.json';
}

export const isFileGql = (source: FileSource): boolean => {
    return ['.graphql', '.gql'].includes(path.extname(source.path).toLowerCase());
}

export const isFileGrpc = (source: FileSource): boolean => {
    return path.extname(source.path).toLowerCase() === '.proto';
}

export async function readGrpcFiles(protoFilePath: string): Promise<string[]> {
    const dir = path.dirname(protoFilePath);
    const protoFiles = await fs.readdir(dir, { recursive: true, withFileTypes: true });

    const contents: string[] = [];
    for (const item of protoFiles) {
        if (item.isFile() && path.extname(item.name) === '.proto') {
            contents.push(await fs.readFile(path.join(dir, item.name), 'utf-8'));
        }
    }

    return contents;
}

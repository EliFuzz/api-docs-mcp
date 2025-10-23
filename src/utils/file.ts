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

import { promises as fs } from 'node:fs';
import { locateCli, runCliVersion, type CliLocation } from './cliLocator';

export interface NodeLocateOptions {
    settingPath(): string;
    environment: Readonly<Record<string, string | undefined>>;
    platform: string;
}

async function isFile(file: string): Promise<boolean> {
    try {
        return (await fs.stat(file)).isFile();
    } catch {
        return false;
    }
}

export function createNodeLocate(options: NodeLocateOptions): () => Promise<CliLocation> {
    return () =>
        locateCli({
            settingPath: options.settingPath(),
            pathVariable: options.environment.PATH ?? options.environment.Path ?? '',
            platform: options.platform,
            isFile,
            runVersion: runCliVersion,
        });
}

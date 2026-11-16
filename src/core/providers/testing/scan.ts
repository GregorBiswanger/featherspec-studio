import { promises as fs } from 'fs';
import * as path from 'path';

export const PROVIDER_SDKS = ['@github/copilot-sdk', '@anthropic-ai/claude-agent-sdk', '@openai/codex-sdk'] as const;

export const PROVIDER_IDS = ['fake', 'copilot'] as const;

export async function productionFiles(directory: string, skipDirectories: readonly string[] = ['testing']): Promise<string[]> {
    const files: string[] = [];
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            if (!skipDirectories.includes(entry.name)) {
                files.push(...(await productionFiles(full, skipDirectories)));
            }
        } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
            files.push(full);
        }
    }
    return files;
}

export function importSpecifiers(source: string): string[] {
    const pattern = /(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;
    return [...source.matchAll(pattern)].map((match) => match[1] ?? '');
}

export function isProviderImport(specifier: string, file: string, adaptersDirectory: string): boolean {
    if (PROVIDER_SDKS.some((name) => specifier === name || specifier.startsWith(`${name}/`))) {
        return true;
    }
    if (!specifier.startsWith('.')) {
        return false;
    }
    const resolved = path.resolve(path.dirname(file), specifier);
    return resolved === adaptersDirectory || resolved.startsWith(adaptersDirectory + path.sep);
}

export function providerImports(source: string, file: string, adaptersDirectory: string): string[] {
    return importSpecifiers(source).filter((specifier) => isProviderImport(specifier, file, adaptersDirectory));
}

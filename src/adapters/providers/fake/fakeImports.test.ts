import { promises as fs } from 'fs';
import { builtinModules } from 'node:module';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

const FAKE_DIRECTORY = path.resolve(process.cwd(), 'src/adapters/providers/fake');

export function externalImports(source: string): string[] {
    const pattern = /(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;
    return [...source.matchAll(pattern)]
        .map((match) => match[1] ?? '')
        .filter((specifier) => {
            const bare = specifier.replace(/^node:/, '');
            return specifier === 'vscode' || specifier.startsWith('vscode/') || specifier.startsWith('node:') || builtinModules.includes(bare.split('/')[0] ?? bare);
        });
}

async function productionFiles(directory: string): Promise<string[]> {
    const files: string[] = [];
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== 'testing') {
                files.push(...(await productionFiles(full)));
            }
        } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
            files.push(full);
        }
    }
    return files;
}

describe('fake provider imports', () => {
    it('AC-013: no production file of the fake imports vscode, a Node.js built-in or a network or file module', async () => {
        const files = await productionFiles(FAKE_DIRECTORY);
        expect(files.length).toBeGreaterThanOrEqual(3);
        const offenders: string[] = [];
        for (const file of files) {
            const found = externalImports(await fs.readFile(file, 'utf8'));
            if (found.length > 0) {
                offenders.push(`${path.basename(file)}: ${found.join(', ')}`);
            }
        }
        expect(offenders).toEqual([]);
    });

    it('AC-013: negative control, the scan recognises built-ins in both spellings and vscode', () => {
        for (const name of ['fs', 'node:fs', 'fs/promises', 'node:fs/promises', 'net', 'http', 'https', 'child_process', 'vscode']) {
            expect(externalImports(`import x from '${name}';`)).toEqual([name]);
        }
        expect(externalImports(`import { a } from '../../../core/ports/host';`)).toEqual([]);
    });
});

import { promises as fs } from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

const FORBIDDEN = ['vscode', 'fs', 'node:fs', 'fs/promises', 'node:fs/promises', 'sqlite', 'node:sqlite'];

async function productionCoreFiles(directory: string): Promise<string[]> {
    const files: string[] = [];
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== 'testing') {
                files.push(...(await productionCoreFiles(full)));
            }
        } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
            files.push(full);
        }
    }
    return files;
}

export function forbiddenImports(source: string): string[] {
    const found: string[] = [];
    const pattern = /(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;
    for (const match of source.matchAll(pattern)) {
        const specifier = match[1] ?? '';
        if (FORBIDDEN.includes(specifier) || specifier.startsWith('vscode/')) {
            found.push(specifier);
        }
    }
    return found;
}

describe('core import scan', () => {
    it('AC-001: no production core file imports vscode, fs, fs/promises or sqlite modules', async () => {
        const files = await productionCoreFiles(path.resolve(process.cwd(), 'src/core'));
        expect(files.length).toBeGreaterThan(10);
        const offenders: string[] = [];
        for (const file of files) {
            const found = forbiddenImports(await fs.readFile(file, 'utf8'));
            if (found.length > 0) {
                offenders.push(`${path.relative(process.cwd(), file)}: ${found.join(', ')}`);
            }
        }
        expect(offenders).toEqual([]);
    });

    it('AC-001: negative control, the scan recognises each forbidden module in every import form', () => {
        for (const module of FORBIDDEN) {
            expect(forbiddenImports(`import { x } from '${module}';`)).toEqual([module]);
            expect(forbiddenImports(`const y = await import('${module}');`)).toEqual([module]);
            expect(forbiddenImports(`import * as z from "${module}";`)).toEqual([module]);
        }
        expect(forbiddenImports(`import { a } from './ports/host';`)).toEqual([]);
    });
});

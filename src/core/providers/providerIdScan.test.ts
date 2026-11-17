import { promises as fs } from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { PROVIDER_IDS, productionFiles } from './testing/scan';

const ROOT = process.cwd();
const ALLOWED = [path.resolve(ROOT, 'src/adapters/providers'), path.resolve(ROOT, 'src/extension.ts')];

export function idLiterals(source: string): string[] {
    const pattern = new RegExp(`(['"\`])(${PROVIDER_IDS.join('|')})\\1`, 'g');
    return [...source.matchAll(pattern)].map((match) => match[2] ?? '');
}

describe('provider ID literal scan', () => {
    it('AC-021: no production module outside src/adapters/providers and src/extension.ts holds a provider ID as a string literal', async () => {
        const files = (await productionFiles(path.resolve(ROOT, 'src'), ['testing', 'test'])).filter(
            (file) => !ALLOWED.some((allowed) => file === allowed || file.startsWith(allowed + path.sep)),
        );
        expect(files.length).toBeGreaterThan(50);
        const offenders: string[] = [];
        for (const file of files) {
            const found = idLiterals(await fs.readFile(file, 'utf8'));
            if (found.length > 0) {
                offenders.push(`${path.relative(ROOT, file)}: ${found.join(', ')}`);
            }
        }
        expect(offenders).toEqual([]);
    });

    it('AC-021: negative control, the scan recognises every ID in each quote form and ignores longer words', () => {
        for (const id of PROVIDER_IDS) {
            expect(idLiterals(`const a = '${id}';`)).toEqual([id]);
            expect(idLiterals(`const a = "${id}";`)).toEqual([id]);
            expect(idLiterals(`const a = \`${id}\`;`)).toEqual([id]);
        }
        expect(idLiterals(`const a = 'fakery'; const b = 'copilot-sdk'; // fake`)).toEqual([]);
    });
});

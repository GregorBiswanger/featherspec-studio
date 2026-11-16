import { promises as fs } from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { PROVIDER_SDKS, productionFiles, providerImports } from './testing/scan';

const ROOT = process.cwd();
const ADAPTERS = path.resolve(ROOT, 'src/adapters/providers');

async function offendersIn(directory: string): Promise<string[]> {
    const offenders: string[] = [];
    for (const file of await productionFiles(path.resolve(ROOT, directory))) {
        const found = providerImports(await fs.readFile(file, 'utf8'), file, ADAPTERS);
        if (found.length > 0) {
            offenders.push(`${path.relative(ROOT, file)}: ${found.join(', ')}`);
        }
    }
    return offenders;
}

describe('provider import scan', () => {
    it('AC-002: no production file under src/core imports an adapter module or a provider SDK', async () => {
        expect((await productionFiles(path.resolve(ROOT, 'src/core'))).length).toBeGreaterThan(10);
        expect(await offendersIn('src/core')).toEqual([]);
    });

    it('AC-002: no production file under src/webview imports an adapter module or a provider SDK', async () => {
        expect((await productionFiles(path.resolve(ROOT, 'src/webview'))).length).toBeGreaterThan(10);
        expect(await offendersIn('src/webview')).toEqual([]);
    });

    it('AC-002: negative control, the scan recognises every SDK, subpaths and adapter paths in each import form', () => {
        const file = path.resolve(ROOT, 'src/core/providers/example.ts');
        for (const sdk of PROVIDER_SDKS) {
            expect(providerImports(`import { x } from '${sdk}';`, file, ADAPTERS)).toEqual([sdk]);
            expect(providerImports(`import { x } from '${sdk}/sub';`, file, ADAPTERS)).toEqual([`${sdk}/sub`]);
            expect(providerImports(`const y = await import("${sdk}");`, file, ADAPTERS)).toEqual([sdk]);
        }
        expect(providerImports(`import { f } from '../../adapters/providers/fake/fakeProvider';`, file, ADAPTERS)).toEqual([
            '../../adapters/providers/fake/fakeProvider',
        ]);
        expect(providerImports(`import { f } from '../../adapters/providers';`, file, ADAPTERS)).toEqual(['../../adapters/providers']);
        expect(providerImports(`import { f } from '../ports/host';`, file, ADAPTERS)).toEqual([]);
        expect(providerImports(`import { f } from '../../adapters/node/randomIds';`, file, ADAPTERS)).toEqual([]);
        expect(providerImports(`import * as v from 'vitest';`, file, ADAPTERS)).toEqual([]);
    });
});

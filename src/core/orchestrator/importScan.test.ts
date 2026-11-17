import { promises as fs } from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { PROVIDER_SDKS, importSpecifiers, productionFiles, providerImports } from '../providers/testing/scan';

const ROOT = process.cwd();
const ADAPTERS = path.resolve(ROOT, 'src/adapters');
const ORCHESTRATOR = path.resolve(ROOT, 'src/core/orchestrator');

function offences(source: string, file: string): string[] {
    const forbidden = providerImports(source, file, ADAPTERS);
    return [...forbidden, ...importSpecifiers(source).filter((specifier) => specifier === 'vscode' || specifier.startsWith('vscode/'))];
}

describe('orchestrator import scan', () => {
    it('AC-023: no production file of src/core/orchestrator imports vscode, an adapter module or a provider SDK', async () => {
        const files = await productionFiles(ORCHESTRATOR);
        expect(files.length).toBeGreaterThanOrEqual(2);
        const found: string[] = [];
        for (const file of files) {
            const bad = offences(await fs.readFile(file, 'utf8'), file);
            if (bad.length > 0) {
                found.push(`${path.relative(ROOT, file)}: ${bad.join(', ')}`);
            }
        }
        expect(found).toEqual([]);
    });

    it('AC-023: negative control, the scan recognises vscode, an adapter path and every SDK', () => {
        const file = path.join(ORCHESTRATOR, 'example.ts');
        expect(offences(`import * as vscode from 'vscode';`, file)).toEqual(['vscode']);
        expect(offences(`import { f } from '../../adapters/providers/fake/fakeProvider';`, file)).toEqual(['../../adapters/providers/fake/fakeProvider']);
        expect(offences(`import { f } from '../../adapters/node/randomIds';`, file)).toEqual(['../../adapters/node/randomIds']);
        for (const sdk of PROVIDER_SDKS) {
            expect(offences(`import { x } from '${sdk}';`, file)).toEqual([sdk]);
        }
        expect(offences(`import { x } from '../ports/host';`, file)).toEqual([]);
    });
});

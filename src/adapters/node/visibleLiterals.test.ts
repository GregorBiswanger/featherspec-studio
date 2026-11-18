import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..', '..', '..');

async function read(relativePath: string): Promise<string> {
    return fs.readFile(path.join(root, ...relativePath.split('/')), 'utf8');
}

async function productionFiles(directory: string): Promise<string[]> {
    const found: string[] = [];
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            found.push(...(await productionFiles(full)));
        } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) && !full.includes(`${path.sep}testing${path.sep}`)) {
            found.push(full);
        }
    }
    return found;
}

describe('final check 7 (ux-guidelines 10, 6): visible literals live in the text modules', () => {
    it('the filter bar, the project quick pick and the panel tab take their texts from the module', async () => {
        expect(await read('src/webview/board/FilterBar.tsx')).not.toContain('aria-label="Filters"');
        expect(await read('src/adapters/vscode/ui.ts')).not.toContain("'Select the FeatherSpec project'");
        expect(await read('src/adapters/vscode/studioPanel.ts')).not.toContain("'FeatherSpec Studio',");
    });

    it('the status history sentence is written only in the history text module', async () => {
        const offenders: string[] = [];
        for (const file of await productionFiles(path.join(root, 'src'))) {
            const name = path.relative(root, file).split(path.sep).join('/');
            if (name === 'src/core/lifecycle/historyTexts.ts') {
                continue;
            }
            if ((await fs.readFile(file, 'utf8')).includes('Status history not available')) {
                offenders.push(name);
            }
        }
        expect(offenders).toEqual([]);
    });

    it('no reason a user can read says store', async () => {
        const offenders: string[] = [];
        for (const file of await productionFiles(path.join(root, 'src'))) {
            if (/'no store'|"no store"/.test(await fs.readFile(file, 'utf8'))) {
                offenders.push(path.relative(root, file));
            }
        }
        expect(offenders).toEqual([]);
    });
});

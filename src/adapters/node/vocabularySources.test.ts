import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { TERM_PAIRS } from '../../shared/protocol/vocabulary';

const root = path.resolve(__dirname, '..', '..', '..');
const sources = ['src/shared/protocol/texts.ts', 'src/core/setup/setupTexts.ts', 'src/core/runtime/notices.ts'];

describe('AC-039 and PD-099: the VS Code strings of the host vocabulary are the real ones (drift guard)', () => {
    it('finds every VS Code string of TERM_PAIRS verbatim in the text modules of the VS Code host', async () => {
        const texts = await Promise.all(sources.map((source) => fs.readFile(path.join(root, ...source.split('/')), 'utf8')));
        const missing = TERM_PAIRS.map(([vscode]) => vscode).filter((vscode) => !texts.some((text) => text.includes(vscode)));
        expect(missing).toEqual([]);
    });
});

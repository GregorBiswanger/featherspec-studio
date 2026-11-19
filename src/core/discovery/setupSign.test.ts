import { readFileSync } from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { createNodeFileSystem } from '../../adapters/node/nodeFileSystem';
import { classifyFolder } from './classifyFolder';
import { readSetupSign } from './setupSign';
import { createMemoryFileSystem } from './testing/memoryFileSystem';
import { fixturePath } from './testing/fixtures';

const nodeFileSystem = createNodeFileSystem();

function read(name: string, relativePath: string): string {
    return readFileSync(path.join(fixturePath(name), relativePath), 'utf8');
}

const AGENTS = read('fs-setup-not-run', 'AGENTS.md');
const BRIEF = read('fs-setup-not-run', '.memory-bank/projectbrief.md');
const DONE_AGENTS = read('fs-setup-done-no-specs', 'AGENTS.md');
const DONE_BRIEF = read('fs-setup-done-no-specs', '.memory-bank/projectbrief.md');

function crlf(text: string): string {
    return text.replace(/\r?\n/g, '\r\n');
}

describe('0029 AC-001: the sign of the two fixtures', () => {
    it('0029 AC-001 reads setup not run for the template as installed', () => {
        expect(readSetupSign(AGENTS, BRIEF)).toBe('not run');
    });

    it('0029 AC-001 reads setup run for the fixture after a setup, brief filled and snapshot reconciled', () => {
        expect(readSetupSign(DONE_AGENTS, DONE_BRIEF)).toBe('run or unknown');
    });

    it('0029 AC-001 the fixture files are the template as installed and the setup result, one fact each', () => {
        expect(AGENTS).toContain('# last reconciled: never');
        expect(BRIEF.match(/^TBD$/gm)).toHaveLength(3);
        expect(DONE_AGENTS).toContain('# last reconciled: 2026-11-19');
        expect(DONE_BRIEF).not.toContain('TBD');
        expect(DONE_AGENTS).toContain('DocLanguage: English');
    });

    it('0029 AC-001 negative control, both files filled in one way each still read setup run, and no files read run or unknown', () => {
        expect(readSetupSign(DONE_AGENTS, BRIEF)).toBe('run or unknown');
        expect(readSetupSign(AGENTS, DONE_BRIEF)).toBe('run or unknown');
        expect(readSetupSign(undefined, undefined)).toBe('run or unknown');
    });
});

describe('0029 AC-002: one change away from the template reads setup run or unknown', () => {
    const briefVariants: ReadonlyArray<readonly [string, string]> = [
        ['a section with TBD.', BRIEF.replace('## Mission\nTBD', '## Mission\nTBD.')],
        ['a section with tbd', BRIEF.replace('## Mission\nTBD', '## Mission\ntbd')],
        ['a section with TBD and more text', BRIEF.replace('## Primary users\nTBD', '## Primary users\nTBD - later')],
        ['a section with a second line', BRIEF.replace('## Success criteria\nTBD', '## Success criteria\nTBD\nand more')],
        ['a section filled', BRIEF.replace('## Mission\nTBD', '## Mission\nA tip splitter')],
        ['the Mission heading missing', BRIEF.replace('## Mission\nTBD\n\n', '')],
        ['the Primary users heading renamed', BRIEF.replace('## Primary users', '## Users')],
        ['the Success criteria heading missing', BRIEF.replace('\n## Success criteria\nTBD\n', '')],
    ];

    it.each(briefVariants)('0029 AC-002 brief with %s', (_name, brief) => {
        expect(brief).not.toBe(BRIEF);
        expect(readSetupSign(AGENTS, brief)).toBe('run or unknown');
    });

    it('0029 AC-002 the brief deleted or a folder (no text)', () => {
        expect(readSetupSign(AGENTS, undefined)).toBe('run or unknown');
    });

    it('0029 AC-002 the brief a folder, read through the file system', async () => {
        const fileSystem = createMemoryFileSystem();
        fileSystem.setFile('r', 'AGENTS.md', AGENTS);
        fileSystem.setDirectory('r', '.specs');
        fileSystem.setDirectory('r', '.memory-bank/projectbrief.md');
        const classification = await classifyFolder(fileSystem, 'r');
        expect(readSetupSign(classification.agentsText, classification.briefText)).toBe('run or unknown');
    });

    const agentsVariants: ReadonlyArray<readonly [string, string]> = [
        ['a date after the colon', AGENTS.replace('# last reconciled: never', '# last reconciled: 2026-11-19')],
        ['the line deleted', AGENTS.replace(/^# last reconciled:.*\n/m, '')],
        ['an empty value', AGENTS.replace('# last reconciled: never', '# last reconciled:')],
        ['the word never as a prefix', AGENTS.replace('# last reconciled: never', '# last reconciled: neverland')],
    ];

    it.each(agentsVariants)('0029 AC-002 AGENTS.md with %s', (_name, agents) => {
        expect(agents).not.toBe(AGENTS);
        expect(readSetupSign(agents, BRIEF)).toBe('run or unknown');
    });

    it('0029 AC-002 the first such line decides, a later one does not', () => {
        const second = AGENTS.replace('# last reconciled: never', '# last reconciled: 2026-11-19') + '\n# last reconciled: never\n';
        expect(readSetupSign(second, BRIEF)).toBe('run or unknown');
        const neverFirst = AGENTS + '\n# last reconciled: 2026-11-19\n';
        expect(readSetupSign(neverFirst, BRIEF)).toBe('not run');
    });

    it('0029 AC-002 with DocLanguage: German, nothing else changed, it still reads setup not run', () => {
        const german = AGENTS.replace('DocLanguage: English', 'DocLanguage: German');
        expect(german).not.toBe(AGENTS);
        expect(readSetupSign(german, BRIEF)).toBe('not run');
    });

    it('0029 AC-002 with CRLF line endings in both files it still reads setup not run', () => {
        expect(readSetupSign(crlf(AGENTS), crlf(BRIEF))).toBe('not run');
        expect(readSetupSign(crlf(AGENTS), BRIEF)).toBe('not run');
    });

    it('0029 AC-002 with a BOM in either file it still reads setup not run', () => {
        expect(readSetupSign('﻿' + AGENTS, '﻿' + BRIEF)).toBe('not run');
        expect(readSetupSign(AGENTS, '﻿' + crlf(BRIEF))).toBe('not run');
    });

    it('0029 AC-002 the value ends at the first middle dot, with or without further text', () => {
        expect(readSetupSign(AGENTS.replace('never · last deep scan: never', 'never'), BRIEF)).toBe('not run');
        expect(readSetupSign(AGENTS.replace('# last reconciled: never ·', '# last reconciled:   never   ·'), BRIEF)).toBe('not run');
    });

    it('0029 AC-002 a heading with leading spaces in AGENTS.md line still counts, a section body ends at the next # line', () => {
        const indented = AGENTS.replace('# last reconciled: never', '   # last reconciled: never');
        expect(readSetupSign(indented, BRIEF)).toBe('not run');
        const withNote = BRIEF.replace('## Mission\nTBD', '## Mission\nTBD\n# Note\nsomething');
        expect(readSetupSign(AGENTS, withNote)).toBe('not run');
    });

    it('0029 AC-002 a brief read from disk with a missing file or a read failure is unknown without a message', async () => {
        const fileSystem = createMemoryFileSystem();
        fileSystem.setFile('r', 'AGENTS.md', AGENTS);
        fileSystem.setDirectory('r', '.specs');
        const classification = await classifyFolder(fileSystem, 'r');
        expect(classification.briefText).toBeUndefined();
        expect(readSetupSign(classification.agentsText, classification.briefText)).toBe('run or unknown');
    });

    it('0029 AC-002 the fixture on disk reads setup not run through classifyFolder, the done fixture does not', async () => {
        const open = await classifyFolder(nodeFileSystem, fixturePath('fs-setup-not-run'));
        expect(readSetupSign(open.agentsText, open.briefText)).toBe('not run');
        const done = await classifyFolder(nodeFileSystem, fixturePath('fs-setup-done-no-specs'));
        expect(readSetupSign(done.agentsText, done.briefText)).toBe('run or unknown');
    });
});

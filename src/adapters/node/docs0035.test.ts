import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..', '..', '..');

async function read(file: string): Promise<string> {
    return fs.readFile(path.join(root, file), 'utf8');
}

function jetbrainsSection(readme: string): string {
    const start = readme.indexOf('## JetBrains IDEs');
    const rest = readme.slice(start);
    const end = rest.slice(3).search(/^## /m);
    return end < 0 ? rest : rest.slice(0, end + 3);
}

describe('0035 T-013: parity, amendments and docs', () => {
    it('AC-025: every parity row that names PD-105 names PD-108 or a criterion of 0035', async () => {
        const rows = (await read('docs/jetbrains/parity.md')).split('\n').filter((line) => line.includes('PD-105'));
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
            expect(row, row).toMatch(/PD-108|0035 AC-\d{3}/);
        }
    });

    it('AC-025: every criterion of 0035 has a row', async () => {
        const rows = (await read('docs/jetbrains/parity.md')).split('\n').filter((line) => line.startsWith('| 0035 |'));
        const ids = rows.map((row) => row.split('|')[2]?.trim());
        const expected = Array.from({ length: 36 }, (_, index) => `AC-${String(index + 1).padStart(3, '0')}`);
        expect(ids).toEqual(expected);
    });

    it('AC-025: negative control, a PD-105 row without PD-108 or a 0035 criterion is found', () => {
        const row = '| 0024 | AC-001 | deliberately different | PD-105 (0034 AC-031, H-17) |  |';
        expect(/PD-108|0035 AC-\d{3}/.test(row)).toBe(false);
    });

    it('AC-029: the statements of section 5 carry their notes', async () => {
        const [spec24, spec29, spec34] = await Promise.all([
            read('.specs/active/0024-send-next-step-to-assistant.md'),
            read('.specs/done/0029-onboarding-before-setup.md'),
            read('.specs/active/0034-studio-for-jetbrains-ides.md'),
        ]);
        expect(spec24).toContain('*Amended by 0035 (PD-108): except the empty state');
        expect(spec29).toContain('*Amended by 0035 (PD-108): with an offered assistant the empty state');
        for (const part of ['the step actions hold while *Assistant* is `none`', 'optional dependency `org.jetbrains.plugins.terminal`', 'handover per 0035 §6.1']) {
            expect(spec34, part).toContain(part);
        }
        expect(spec34.match(/\*Amended by 0035 \(PD-108\)/g)?.length).toBeGreaterThanOrEqual(5);
    });

    it('AC-029: jetbrains/AGENTS.md carries the rule for src/core', async () => {
        const agents = await read('jetbrains/AGENTS.md');
        expect(agents).toContain('`src/core` changes only through a spec that names the change (0035 §6.8)');
        expect(agents).not.toContain('Never edit `src/core`');
    });

    it('AC-029: the README section JetBrains IDEs names the three handovers and stays honest', async () => {
        const section = jetbrainsSection(await read('README.md'));
        for (const sentence of [
            '**Send to Claude Code**',
            '**Copy for Copilot**',
            '**Copy for Junie**',
            'FeatherSpec Studio | Assistant**',
            'never presses Enter',
            'send nothing and fill no input',
            'neither assistant offers an API',
            'waits for you to trust the folder or to log in',
            '`Starting Claude Code…`',
        ]) {
            expect(section, sentence).toContain(sentence);
        }
        expect(section).not.toContain('There is no Send button');
        expect(section).not.toContain('a later spec (0035)');
    });

    it('AC-029: the CHANGELOG and the release checklist name the handovers and the manual checks', async () => {
        const [changelog, checklist] = await Promise.all([read('CHANGELOG.md'), read('docs/release-checklist.md')]);
        expect(changelog).toContain('**Send to Claude Code**');
        expect(changelog).toContain('**Copy for Junie**');
        const start = checklist.indexOf('## Send and Copy for in JetBrains (manual) (0035)');
        expect(start).toBeGreaterThan(0);
        const section = checklist.slice(start, checklist.indexOf('## Go', start));
        expect(section).toContain('AC-027');
        expect(section).toContain('AC-028');
        expect(section).toContain('NS-7-start');
    });

    it('AC-029: AGENTS.md has at most 15000 bytes and activeContext.md fewer than 7000', async () => {
        expect(Buffer.byteLength(await read('AGENTS.md'))).toBeLessThanOrEqual(15000);
        expect(Buffer.byteLength(await read('.memory-bank/activeContext.md'))).toBeLessThan(7000);
    });

    it('AC-029: negative control, the byte count sees a text over the limit', () => {
        expect(Buffer.byteLength('x'.repeat(7000))).not.toBeLessThan(7000);
    });
});

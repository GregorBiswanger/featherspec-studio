import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..', '..', '..');

async function read(file: string): Promise<string> {
    return fs.readFile(path.join(root, file), 'utf8');
}

const PD_110_SENTENCE = 'Studio starts no agent on its own and sends nothing. In JetBrains IDEs, Send to Claude Code may start claude in a terminal tab when you click it.';

describe('0035 review 20 B-3 / PD-110 / AC-033: the README keeps its promise honest', () => {
    it('AC-033 the intro, the Local and read-only bullet and the Privacy bullet carry the sentence of PD-110, literally', async () => {
        const lines = (await read('README.md')).split('\n');
        const introduction = lines.find((line) => line.startsWith('Studio reads your project'));
        const bullet = lines.find((line) => line.startsWith('- **Local and read-only.**'));
        const privacy = lines.find((line) => line.startsWith('- Studio starts no agent on its own'));
        for (const line of [introduction, bullet, privacy]) {
            expect(line).toBeDefined();
            expect(line).toContain(PD_110_SENTENCE);
        }
    });

    it('AC-033 no README line still says that Studio starts no process or no agent without the JetBrains exception', async () => {
        const lines = (await read('README.md')).split('\n');
        expect(lines.filter((line) => line.includes('starts no process'))).toEqual([]);
        expect(lines.filter((line) => /starts no agent(?! on its own)/.test(line) && line.includes('Studio reads your project')).map((line) => line.slice(0, 60))).toEqual([]);
        expect(lines.filter((line) => line.includes('Send to Claude Code opens a terminal tab and runs `claude` there when none is running'))).toEqual([]);
    });

    it('AC-033 the CHANGELOG names PD-110 and the decision of Gregor', async () => {
        const changelog = await read('CHANGELOG.md');
        expect(changelog).toContain('PD-110');
        expect(changelog).toContain(PD_110_SENTENCE.replace('Studio starts', 'Studio itself starts'));
    });

    it('AC-033 negative control, the old promise is found by the same check', () => {
        expect(/starts no agent(?! on its own)/.test('Studio reads your project and starts no agent; the work')).toBe(true);
        expect('Studio starts no process and no agent.'.includes('starts no process')).toBe(true);
    });
});

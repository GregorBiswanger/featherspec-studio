import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..', '..', '..');

const SCANNED = ['README.md', 'docs/release-checklist.md', 'docs/runtime-data.md'];
const FORBIDDEN = ['agent center', 'provider', 'copilot', 'clear run history', 'stop run', 'resume run'];
const ALLOWED = ['GitHub Copilot, Claude Code or any other', 'copilot-home'];

export function findForbidden(text: string): string[] {
    let rest = text;
    for (const allowed of ALLOWED) {
        rest = rest.split(allowed).join('');
    }
    const lower = rest.toLowerCase();
    return FORBIDDEN.filter((word) => lower.includes(word));
}

export function itemOf(text: string, number: number): string {
    const start = text.search(new RegExp(`^${number}\\. `, 'm'));
    if (start < 0) {
        return '';
    }
    const rest = text.slice(start);
    const end = rest.search(new RegExp(`^(${number + 1}\\. |#)`, 'm'));
    return (end < 0 ? rest : rest.slice(0, end)).trimEnd();
}

async function read(file: string): Promise<string> {
    return fs.readFile(path.join(root, file), 'utf8');
}

async function exists(file: string): Promise<boolean> {
    try {
        await fs.access(path.join(root, file));
        return true;
    } catch {
        return false;
    }
}

describe('product docs after 0015 (AC-025)', () => {
    it('finds a forbidden word in a negative control', () => {
        expect(findForbidden('Open the Agent Center')).toEqual(['agent center']);
        expect(findForbidden('a Copilot provider')).toEqual(['provider', 'copilot']);
        expect(findForbidden('GitHub Copilot, Claude Code or any other')).toEqual([]);
    });

    for (const file of SCANNED) {
        it(`${file} names no agent feature`, async () => {
            expect(findForbidden(await read(file))).toEqual([]);
        });
    }

    it('keeps the three screenshot links and drops the Agent Center one', async () => {
        const readme = await read('README.md');
        expect(readme).not.toContain('agent-center-dark.png');
        expect((readme.match(/media\/screenshots\/[\w-]+\.png/g) ?? []).length).toBeGreaterThanOrEqual(3);
    });

    it('has deleted the agent documents', async () => {
        for (const file of [
            'docs/agent-provider-port.md',
            'docs/security/secret-patterns.md',
            'media/screenshots/agent-center-dark.png',
        ]) {
            expect(await exists(file), file).toBe(false);
        }
    });

    it('marks the decisions as superseded', async () => {
        expect(await read('docs/decisions/ADR-003-first-agent-provider.md')).toContain('Status: Superseded (PD-055)');
        expect(await read('docs/decisions/ADR-002-runtime-storage.md')).toContain('superseded in part by 0015 (PD-055)');
    });

    it('ADR-001 carries the note at its §14, the item that hid the agent start', async () => {
        expect(itemOf(await read('docs/decisions/ADR-001-extension-architecture.md'), 14)).toContain('superseded in part by 0015 (PD-055)');
    });

    it('negative control: a note outside §14 is not found in §14', () => {
        const text = '- Note: superseded in part by 0015 (PD-055)\n\n13. **Packaging.**\n14. **Trust.**\n    - hidden\n\n## Options';
        expect(itemOf(text, 14)).toBe('14. **Trust.**\n    - hidden');
    });
});

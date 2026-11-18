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

const MOVE_TERMS = ['move to…', 'move spec', 'drag', 'move request', 'move pick', 'move result', 'transition check', 'featherspec: <name> (<version>)'];
const MOVE_SCANNED = ['README.md', 'docs/release-checklist.md', 'docs/product/design-brief.md'];

export function findMoveTerms(text: string): string[] {
    const lower = text.toLowerCase();
    return MOVE_TERMS.filter((term) => lower.includes(term));
}

async function specFile(number: string): Promise<string> {
    for (const folder of ['done', 'active', 'backlog']) {
        const dir = path.join(root, '.specs', folder);
        const names = await fs.readdir(dir).catch(() => [] as string[]);
        const hit = names.find((name) => name.startsWith(`${number}-`) && name.endsWith('.md') && !name.includes('.plan'));
        if (hit) {
            return `.specs/${folder}/${hit}`;
        }
    }
    return '';
}

describe('product docs after 0017 (AC-025)', () => {
    it('finds a move term in a negative control', () => {
        expect(findMoveTerms('Drag a card or use "Move to…"')).toEqual(['move to…', 'drag']);
        expect(findMoveTerms('status bar `FeatherSpec: <name> (<version>)`')).toEqual(['featherspec: <name> (<version>)']);
        expect(findMoveTerms('Copy the next step of a card')).toEqual([]);
    });

    it('.architecture/*.md name no move path', async () => {
        const names = (await fs.readdir(path.join(root, '.architecture'))).filter((name) => name.endsWith('.md'));
        expect(names.length).toBeGreaterThan(0);
        for (const name of names) {
            expect(findMoveTerms(await read(`.architecture/${name}`)), name).toEqual([]);
        }
    });

    for (const file of MOVE_SCANNED) {
        it(`${file} names no move path`, async () => {
            expect(findMoveTerms(await read(file))).toEqual([]);
        });
    }

    for (const number of ['0001', '0003', '0006', '0007', '0013', '0015', '0016']) {
        it(`spec ${number} carries a note of 0017`, async () => {
            const file = await specFile(number);
            expect(file, number).not.toBe('');
            expect(await read(file)).toContain('Amended by 0017 (PD-060/PD-061)');
        });
    }

    for (const number of ['0003', '0007', '0013', '0015']) {
        it(`spec ${number} carries the catch-all note in its head`, async () => {
            const head = (await read(await specFile(number))).split('\n').slice(0, 14).join('\n');
            expect(head).toContain('Amended by 0017 (PD-060/PD-061): every other statement');
        });
    }

    it('ADR-001 carries the note on drag and drop', async () => {
        expect(await read('docs/decisions/ADR-001-extension-architecture.md')).toContain(
            'superseded by 0017 (PD-060): no drag, no Move to…, no move command',
        );
    });

    it('README names the card Copy, the status bar and Copy Next Step', async () => {
        const readme = await read('README.md');
        expect(readme).toContain('Copy Next Step');
        expect(readme).toContain('status bar');
        expect(readme).toContain('· <state> ·');
        expect(readme).toMatch(/card[^.]*\*\*Copy\*\*|\*\*Copy\*\*[^.]*card/);
    });

    it('the release checklist carries AC-026', async () => {
        const text = await read('docs/release-checklist.md');
        expect(text).toContain('0017');
        expect(text).toContain('AC-026');
    });

    it('CHANGELOG names the removal and the new places under Unreleased', async () => {
        const text = await read('CHANGELOG.md');
        const unreleased = text.slice(text.indexOf('## [Unreleased]'), text.indexOf('## [0.1.0]'));
        expect(unreleased).toContain('0017');
        expect(unreleased.toLowerCase()).toContain('drag');
        expect(unreleased).toContain('Move to…');
        expect(unreleased).toContain('Copy Next Step');
        expect(unreleased.toLowerCase()).toContain('status bar');
    });
});

const OLD_AREA_NAMES = ['mission control', 'spec board'];
const OLD_AREA_SCANNED = ['README.md', 'docs/release-checklist.md', 'docs/product/design-brief.md', 'package.json'];

export function findOldAreaNames(text: string): string[] {
    const lower = text.toLowerCase();
    return OLD_AREA_NAMES.filter((term) => lower.includes(term));
}

describe('product docs after 0018 (AC-001, AC-029)', () => {
    it('finds an old area name in a negative control, in any letter case', () => {
        expect(findOldAreaNames('Open MISSION CONTROL and the Spec Board')).toEqual(['mission control', 'spec board']);
        expect(findOldAreaNames('the Overview and the Board')).toEqual([]);
    });

    for (const file of OLD_AREA_SCANNED) {
        it(`${file} names neither old area`, async () => {
            expect(findOldAreaNames(await read(file))).toEqual([]);
        });
    }

    it('the CHANGELOG names the new areas and commands under Unreleased', async () => {
        const changelog = await read('CHANGELOG.md');
        const unreleased = changelog.slice(changelog.indexOf('## [Unreleased]'), changelog.indexOf('\n## [', changelog.indexOf('## [Unreleased]') + 1));
        for (const term of ['Open Overview', 'Open Board', 'FeatherSpec Studio: Refresh', 'Overview', 'Board']) {
            expect(unreleased, term).toContain(term);
        }
    });

    for (const number of ['0001', '0003', '0005', '0006', '0007', '0013', '0015', '0016', '0017']) {
        it(`spec ${number} carries a note of 0018`, async () => {
            const file = await specFile(number);
            expect(file, number).not.toBe('');
            expect(await read(file)).toContain('Amended by 0018 (PD-062)');
        });
    }

    for (const number of ['0003', '0005', '0006', '0007', '0013', '0015', '0016']) {
        it(`spec ${number} carries the catch-all note in its head`, async () => {
            const head = (await read(await specFile(number))).split('\n').slice(0, 24).join('\n');
            expect(head).toContain('Amended by 0018 (PD-062): wherever this spec names Mission Control or the Spec Board as a place, read Overview or Board');
        });
    }

    it('the decisions register records the proxies as PD-064', async () => {
        const decisions = await read('docs/product/product-decisions.md');
        expect(decisions).toContain('| PD-064 |');
        expect(decisions).toContain('A-013');
        expect(decisions).toContain('P-17');
    });

    it('negative control: a spec head without the note does not carry it', () => {
        expect('# Spec\n\n**Status:** Implemented\n'.includes('Amended by 0018 (PD-062)')).toBe(false);
    });
});

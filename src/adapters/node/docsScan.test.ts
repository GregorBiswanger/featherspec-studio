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

export function firstRelease(changelog: string): string {
    const start = changelog.indexOf('## [');
    const next = changelog.indexOf('\n## [', start + 1);
    return changelog.slice(start, next === -1 ? undefined : next + 1).replace(/\n+$/, '\n');
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

    it('CHANGELOG describes the status bar entry and Copy Next Step in the 0.1.0 entry', async () => {
        const entry = firstRelease(await read('CHANGELOG.md'));
        expect(entry).toContain('Copy Next Step');
        expect(entry.toLowerCase()).toContain('status bar');
        expect(entry).toContain('<number> · <state> · <short form>');
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

    it('.architecture/*.md name neither old area', async () => {
        const names = (await fs.readdir(path.join(root, '.architecture'))).filter((name) => name.endsWith('.md'));
        expect(names.length).toBeGreaterThan(0);
        for (const name of names) {
            expect(findOldAreaNames(await read(`.architecture/${name}`)), name).toEqual([]);
        }
    });

    it('the CHANGELOG names the two tabs and the Refresh command in the 0.1.0 entry', async () => {
        const entry = firstRelease(await read('CHANGELOG.md'));
        for (const term of ['Open Overview', 'Open Board', 'FeatherSpec Studio: Refresh', 'Overview', 'Board']) {
            expect(entry, term).toContain(term);
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

const GONE_TERMS = ['spec explorer', 'spec-explorer', 'specexplorer'];
const GONE_SCANNED = ['README.md', 'docs/release-checklist.md', 'docs/product/design-brief.md', 'AGENTS.md'];

export function findGoneTerms(text: string): string[] {
    const lower = text.toLowerCase();
    return GONE_TERMS.filter((term) => lower.includes(term));
}

describe('product docs after 0020 (AC-018, AC-020)', () => {
    it('finds a gone term in a negative control, in any letter case', () => {
        expect(findGoneTerms('Open the SPEC EXPLORER')).toEqual(['spec explorer']);
        expect(findGoneTerms('spec-explorer-detail-light.png')).toEqual(['spec-explorer']);
        expect(findGoneTerms('the Specs view')).toEqual([]);
    });

    for (const file of GONE_SCANNED) {
        it(`${file} names no Spec Explorer`, async () => {
            expect(findGoneTerms(await read(file))).toEqual([]);
        });
    }

    it('.architecture/*.md name no Spec Explorer', async () => {
        const names = (await fs.readdir(path.join(root, '.architecture'))).filter((name) => name.endsWith('.md'));
        expect(names.length).toBeGreaterThan(0);
        for (const name of names) {
            expect(findGoneTerms(await read(`.architecture/${name}`)), name).toEqual([]);
        }
    });

    it('README names the Specs view, its tabs and commands, and links a screenshot that exists', async () => {
        const readme = await read('README.md');
        expect(readme).toContain('### The Specs view');
        expect(readme).toContain('Focus on Specs View');
        expect(readme).toContain('Open Overview');
        expect(readme).toContain('Shift+F10');
        expect(readme).toContain('media/screenshots/spec-detail-light.png');
        const links = readme.match(/media\/screenshots\/[\w-]+\.png/g) ?? [];
        expect(links.length).toBeGreaterThanOrEqual(3);
        for (const link of links) {
            expect(await exists(link), link).toBe(true);
        }
    });

    async function specsViewSection(): Promise<string> {
        const readme = await read('README.md');
        const start = readme.indexOf('### The Specs view');
        expect(start).toBeGreaterThanOrEqual(0);
        const end = readme.indexOf('\n### ', start + 1);
        return readme.slice(start, end);
    }

    it('the README section names the four groups, the inline Copy, the menu entry Copy Next Step and the badge', async () => {
        const section = await specsViewSection();
        for (const group of ['**In progress**', '**Up next**', '**Backlog**', '**Done**']) {
            expect(section, group).toContain(group);
        }
        expect(section).toContain('inline **Copy** button');
        expect(section).toContain('**Open Spec**, **Open Plan** and **Copy Next Step**');
        expect(section).toContain('The badge on the Activity Bar icon counts the specs that wait for you (Review and Blocked).');
    });

    it('the README names the two tabs, and says Focus on Specs View reaches the view while Shift+F10 opens a row\'s context menu', async () => {
        const readme = await read('README.md');
        expect(readme).toContain('has two tabs, Overview and Board.');
        expect(await specsViewSection()).toContain('`FeatherSpec Studio: Focus on Specs View` reaches the view from the keyboard; Shift+F10 on a row opens its context menu.');
        expect(readme).not.toContain('(or Shift+F10 on a row) reaches the view');
    });

    it('the release checklist carries AC-022 of 0020 and calls the menu entry Copy Next Step', async () => {
        const text = await read('docs/release-checklist.md');
        expect(text).toContain('(0020)');
        expect(text).toContain('**AC-022**');
        expect(text).toContain('Open Spec, Open Plan and Copy Next Step');
        expect(text).toContain('`FeatherSpec Studio: Focus on Specs View` reaches the view');
    });

    it('CHANGELOG names the tree and its menu in the 0.1.0 entry, and nothing that never shipped', async () => {
        const text = await read('CHANGELOG.md');
        const entry = firstRelease(text);
        expect(entry).toContain('native tree');
        expect(entry).toContain('Open Spec, Open Plan and Copy Next Step');
        expect(text).not.toContain('(0020)');
    });

    it('CHANGELOG is one first release, undated until the release, and describes the product as it ships', async () => {
        const text = await read('CHANGELOG.md');
        expect(text.match(/^## \[/gm)).toEqual(['## [']);
        expect(text).toContain('\n## [0.1.0] - Unreleased\n');
        expect(text).not.toContain('## [Unreleased]');
        const lower = text.toLowerCase();
        for (const gone of ['drag', 'move to', 'mission control', 'spec explorer', 'spec board', 'rescan', 'needs attention', 'featherspec-studio.']) {
            expect(lower, gone).not.toContain(gone);
        }
        for (const term of ['Set up FeatherSpec', 'Restricted Mode', 'side panel', 'Problems']) {
            expect(text, term).toContain(term);
        }
    });

    it('the release checklist asks for the date of the 0.1.0 entry before the publish', async () => {
        const text = await read('docs/release-checklist.md');
        const go = text.slice(text.indexOf('\n## Go\n'));
        expect(go).toContain('set the date of the 0.1.0 entry in CHANGELOG.md');
    });

    it('finds the first release section of a changelog and stops at the next one', () => {
        expect(firstRelease('# C\n\n## [1.0.0] - x\nA\n\n## [0.9.0] - y\nB\n')).toBe('## [1.0.0] - x\nA\n');
    });

    for (const [file, note] of [
        ['.specs/done/0005-studio-shell-navigation.md', 28],
        ['.specs/done/0007-spec-board-spec-detail.md', 6],
        ['.specs/done/0013-studio-visual-design.md', 4],
        ['.specs/active/0015-focus-on-visibility.md', 3],
        ['.specs/active/0016-honest-signals.md', 4],
        ['.specs/active/0017-next-step-everywhere.md', 2],
        ['.specs/active/0018-overview-and-compact-board.md', 5],
        ['.specs/active/0019-detail-situation-picture.md', 8],
        ['docs/decisions/ADR-001-extension-architecture.md', 1],
    ] as const) {
        it(`${file} carries its ${note} notes of 0020 (the §5 rows, none fewer)`, async () => {
            const count = (await read(file)).split('Amended by 0020 (PD-058)').length - 1;
            expect(count).toBeGreaterThanOrEqual(note);
        });
    }
});

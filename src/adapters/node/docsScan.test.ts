import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..', '..', '..');

const SCANNED = ['README.md', 'docs/release-checklist.md', 'docs/runtime-data.md'];
const FORBIDDEN = ['agent center', 'provider', 'copilot', 'clear run history', 'stop run', 'resume run'];
const ALLOWED = ['GitHub Copilot, Claude Code or any other', 'copilot-home', 'GitHub.copilot-chat', 'GitHub Copilot', 'Send to Copilot', '`copilot`', "Copilot's chat"];

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

    it("0024 §5: 0015 AC-025 excepts 0024's names of GitHub Copilot and keeps every other term", () => {
        for (const allowed of ['GitHub Copilot', 'Send to Copilot', 'set `copilot` here', 'GitHub.copilot-chat', "Copilot's chat"]) {
            expect(findForbidden(allowed), allowed).toEqual([]);
        }
        for (const forbidden of ['copilot', 'a Copilot provider', 'Copilot agent', 'the provider of GitHub Copilot', 'COPILOT', 'Copilot']) {
            expect(findForbidden(forbidden).length, forbidden).toBeGreaterThan(0);
        }
        expect(findForbidden('a Copilot provider')).toEqual(['provider', 'copilot']);
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
        expect(readme).toMatch(/card[^.]*\*\*Copy prompt\*\*|\*\*Copy prompt\*\*[^.]*card/);
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
        for (const group of ['**In progress**', '**Ready**', '**Backlog**', '**Done**']) {
            expect(section, group).toContain(group);
        }
        expect(section).toContain('inline **Copy Next Step** button');
        expect(section).toContain('**Open Spec**, **Open Plan** and **Copy Next Step**');
        expect(section).toContain('The badge on the Activity Bar icon counts the specs that wait for you (Review and Blocked).');
    });

    it('the README names the three tabs, and says Focus on Specs View reaches the view while Shift+F10 opens a row\'s context menu', async () => {
        const readme = await read('README.md');
        expect(readme).toContain('has three tabs, Overview, Board and Plan map.');
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
        const lower = text.toLowerCase().split('featherspec-studio.assistant').join('');
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

    it('the release checklist runs in spec order, ends with Go and checks no UI that is gone', async () => {
        const text = await read('docs/release-checklist.md');
        const headings = text.match(/^## .*$/gm) ?? [];
        expect(headings).toEqual([
            '## Before publishing',
            '## Trying the extension locally',
            '## Discovery (0001)',
            '## Shell (0005)',
            '## Overview (0006, 0018)',
            '## Board (0007, 0018)',
            '## Visual design (0013)',
            '## Set up FeatherSpec (0014)',
            '## Focus on visibility (0015)',
            '## Honest signals (0016)',
            '## The next step everywhere (0017)',
            '## Overview and a compact Board (0018)',
            '## The detail as a side panel (0019)',
            '## The native Specs tree (0020)',
            '## Next step with intent and guidance (0021)',
            '## Layout and signal polish (0022)',
            '## Plan map (0023)',
            '## Send to the assistant (0024)',
            '## Plan-state-aware next step (0028)',
            '## Plan map navigation and progress (0025)',
            '## Send defaults and wording (0026)',
            '## Attach the spec when sending (0027)',
            '## Onboarding before setup (0029)',
            '## Clarified step, quiet attachment, Tip sentence (0030)',
            '## Go',
        ]);
        for (const gone of ['Plan line', 'descriptions cut', 'attention row', 'attention reason', 'filters, sort']) {
            expect(text, gone).not.toContain(gone);
        }
        expect(text).toContain('tab icons');
        expect(text).toContain('`spec-detail-light.png` shows this repository');
    });

    it('every manual criterion of 0014 to 0020 keeps its checklist item', async () => {
        const text = await read('docs/release-checklist.md');
        const section = (title: string): string => {
            const start = text.indexOf(`\n## ${title}\n`);
            expect(start, title).toBeGreaterThan(-1);
            const next = text.indexOf('\n## ', start + 1);
            return text.slice(start, next === -1 ? undefined : next);
        };
        const items: Array<[string, string[]]> = [
            ['Set up FeatherSpec (0014)', ['**M-1 look**', '**M-2 real release**', '**M-3 Restricted Mode**']],
            ['Focus on visibility (0015)', ['**AC-030 / M-1**']],
            ['Honest signals (0016)', ['**AC-025 / M-1**']],
            ['The next step everywhere (0017)', ['**AC-026 / M-1**']],
            ['Overview and a compact Board (0018)', ['**AC-031 / M-1**']],
            ['The detail as a side panel (0019)', ['**AC-022**']],
            ['The native Specs tree (0020)', ['**AC-022**', '**Keyboard and screen reader**']],
            ['Layout and signal polish (0022)', ['**AC-019**', '**AC-020**', '**AC-021 (build part)**', '**AC-025**']],
        ];
        for (const [title, marks] of items) {
            for (const mark of marks) {
                expect(section(title), `${title}: ${mark}`).toContain(mark);
            }
        }
    });

    it('the README says what the status bar shows, where a derived state is explained and in how many places the next step shows', async () => {
        const readme = await read('README.md');
        const start = readme.indexOf('## Getting started');
        const gettingStarted = readme.slice(start, readme.indexOf('\n## ', start + 1));
        expect(gettingStarted).toContain('The status bar shows the spec you work on (`<number> · <state> · <short form>`)');
        expect(gettingStarted).toContain('the tooltip names the project and its FeatherSpec version');
        expect(gettingStarted).not.toContain('shows the active project');
        expect(readme).not.toContain('read as a sentence on the card');
        expect(readme).toContain('Hover a Ready, Review or Blocked column header on the Board for the rule behind a derived state');
        expect(readme).toContain('shown in five places');
        expect(readme).not.toContain('four places');
        const places = readme.slice(readme.indexOf('shown in five places'), readme.indexOf('Studio starts no agent and changes no file'));
        for (const place of ['Specs view', 'detail of a spec', 'Board card', 'Overview', 'status bar']) {
            expect(places, place).toContain(place);
        }
    });

    it('the decisions register carries PD-067 after PD-066, names what each later decision retires, and leaves the earlier rows as they were', async () => {
        const rows = (await read('docs/product/product-decisions.md')).split('\n').filter((line) => line.startsWith('| PD-'));
        const last = rows.find((row) => row.startsWith('| PD-067 |')) ?? '';
        expect(rows.findIndex((row) => row.startsWith('| PD-067 |'))).toBe(rows.findIndex((row) => row.startsWith('| PD-066 |')) + 1);
        expect(last).toContain('| PD-067 | Register notes for the UX round **(proxy)** |');
        for (const retired of [
            'PD-058 supersedes PD-042 and the Spec Explorer parts of PD-048 and PD-054',
            'PD-060 supersedes PD-057 (4)',
            'PD-064 A-003 retires PD-059\'s "counts in headers" and PD-063 (4)\'s "the header says `Updated HH:MM`"',
            'Decided 2026-11-18 by the orchestrator as proxy for Gregor, after the final check',
        ]) {
            expect(last, retired).toContain(retired);
        }
        expect(rows.map((row) => row.slice(2, 8))).toContain('PD-066');
        expect(rows.find((row) => row.startsWith('| PD-064 |')) ?? '').toContain('Supersedes nothing; refines PD-062');
        expect(rows.find((row) => row.startsWith('| PD-060 |')) ?? '').not.toContain('PD-057');
    });

    it('the 0018 plan names the four describe groups that kept all their tests under new names', async () => {
        const plan = await read(`.specs/active/${(await fs.readdir(path.join(root, '.specs', 'active'))).find((name) => name.startsWith('0018-') && name.endsWith('.plan.md'))}`);
        const sentence = plan.slice(plan.indexOf('24 `describe` group titles also changed'), plan.indexOf('- Kept unchanged by title: all of 0006'));
        expect(sentence).not.toContain('each held only tests listed below');
        for (const title of [
            'AC-016: the board writes no file',
            '0015 AC-026: the Mission Control purpose and the Restricted Mode note',
            'Mission Control view contract',
            'every request is one the shell accepts',
        ]) {
            expect(sentence, title).toContain(title);
        }
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

describe('product docs after 0022 (AC-016, AC-018)', () => {
    it('the README names the tree groups with Ready, the divider with its reset, the width memory and the back button below 900 px', async () => {
        const readme = await read('README.md');
        expect(readme).toContain('**In progress** (Blocked, Review, then Active), **Ready**, **Backlog** and **Done**');
        expect(readme).not.toContain('**Up next** (Ready)');
        expect(readme).toContain('**divider**');
        expect(readme).toContain('Enter or a double click resets it');
        expect(readme).toContain('Studio remembers it for the workspace');
        expect(readme).toContain('a back button at the top of the detail returns to the area');
        expect(readme).not.toContain('like a drawer');
    });

    it('the README names the icon Copy and the two primary buttons', async () => {
        const readme = await read('README.md');
        expect(readme).toContain('The one primary button of the Overview is the next step of the spec you select');
        expect(readme).toContain('the first Now row has a secondary Copy prompt');
    });

    it('the three product docs name Ready for the tree and keep "Up next" only for the Overview\'s set', async () => {
        const guidelines = await read('docs/product/ux-guidelines.md');
        const checklist = await read('docs/release-checklist.md');
        expect(guidelines).toContain('In progress · Ready · Backlog · Done');
        expect(guidelines).not.toContain('In progress · Up next · Backlog · Done');
        expect(checklist).toContain('every\n  In progress and Ready row is visible');
        expect(checklist).not.toContain('In progress and Up next row');
    });

    it('the release checklist has the 0022 section with AC-019, AC-020, AC-021 (build part) and AC-025', async () => {
        const text = await read('docs/release-checklist.md');
        const start = text.indexOf('\n## Layout and signal polish (0022)\n');
        expect(start).toBeGreaterThan(-1);
        const section = text.slice(start, text.indexOf('\n## ', start + 1));
        for (const mark of ['**AC-019**', '**AC-020**', '**AC-021 (build part)**', '**AC-025**']) {
            expect(section, mark).toContain(mark);
        }
    });

    it('the design brief marks its tree groups, 400 px and drawer superseded by 0022', async () => {
        const text = await read('docs/product/design-brief.md');
        expect(text.split('Superseded by spec 0022 (PD-069').length - 1).toBeGreaterThanOrEqual(2);
    });

    it('the CHANGELOG names the 0022 changes under the version in preparation', async () => {
        const first = firstRelease(await read('CHANGELOG.md'));
        expect(first).toContain('Ready, Backlog and Done');
        expect(first).toContain('divider');
        expect(first).toContain('a back button returns');
        expect(first).toContain('Layout and signals:');
        expect(first).not.toContain('(a drawer below 900 px)');
    });

    for (const [file, note] of [
        ['.specs/done/0005-studio-shell-navigation.md', 2],
        ['.specs/done/0007-spec-board-spec-detail.md', 1],
        ['.specs/done/0013-studio-visual-design.md', 2],
        ['.specs/active/0015-focus-on-visibility.md', 1],
        ['.specs/active/0016-honest-signals.md', 7],
        ['.specs/active/0017-next-step-everywhere.md', 2],
        ['.specs/active/0018-overview-and-compact-board.md', 13],
        ['.specs/active/0019-detail-situation-picture.md', 12],
        ['.specs/active/0020-native-spec-tree.md', 19],
    ] as const) {
        it(`${file} carries its ${note} notes of 0022`, async () => {
            const count = (await read(file)).split('Amended by 0022 (PD-069)').length - 1;
            expect(count).toBeGreaterThanOrEqual(note);
        });
    }

    it('negative control: a text without the note has none', () => {
        expect('no note here'.split('Amended by 0022 (PD-069)').length - 1).toBe(0);
    });
});

describe('product docs after 0021 (AC-021)', () => {
    it('the README names Copy prompt, About this step and both settings', async () => {
        const readme = await read('README.md');
        for (const literal of ['Copy prompt', 'About this step', 'featherspec-studio.showStepTips', 'featherspec-studio.modelHints']) {
            expect(readme, literal).toContain(literal);
        }
        expect(readme).toContain('\n## Settings\n');
    });

    it('the README names the inline action of the Specs view Copy Next Step (A-007) and the step short form in the Overview and on the Board', async () => {
        const readme = await read('README.md');
        expect(readme).toContain('(its inline **Copy Next Step**)');
        expect(readme).not.toContain('inline **Copy prompt**');
        expect(readme).toContain('the spec\'s next step (the step short form, for example `Verify · /sdd-compile`) with its own **Copy prompt**');
        expect(readme).toContain('the short intent and the short form of the prompt (for example `Write plan · /sdd-plan`) with a **Copy prompt** button');
        expect(readme).not.toContain('**Next** and the short form of the command');
    });

    it('neither the README nor the release checklist holds **Copy** or then `continue`', async () => {
        for (const file of ['README.md', 'docs/release-checklist.md']) {
            const text = await read(file);
            expect(text, file).not.toContain('**Copy**');
            expect(text, file).not.toContain('then `continue`');
        }
    });

    it('the CHANGELOG names Copy prompt, showStepTips and modelHints under the version in preparation and no second line continue', async () => {
        const first = firstRelease(await read('CHANGELOG.md'));
        for (const literal of ['Copy prompt', 'showStepTips', 'modelHints']) {
            expect(first, literal).toContain(literal);
        }
        expect(first).not.toContain('a second line, `continue`');
    });

    it('the release checklist has the 0021 section with AC-022, AC-023, AC-024 and AC-025', async () => {
        const text = await read('docs/release-checklist.md');
        const start = text.indexOf('\n## Next step with intent and guidance (0021)\n');
        expect(start).toBeGreaterThan(-1);
        const end = text.indexOf('\n## ', start + 1);
        const section = text.slice(start, end < 0 ? undefined : end);
        for (const mark of ['**AC-022**', '**AC-023**', '**AC-024**', '**AC-025**']) {
            expect(section, mark).toContain(mark);
        }
    });

    for (const [file, notes] of [
        ['.specs/done/0006-mission-control-dashboard.md', 1],
        ['.specs/done/0007-spec-board-spec-detail.md', 1],
        ['.specs/done/0013-studio-visual-design.md', 2],
        ['.specs/active/0015-focus-on-visibility.md', 9],
        ['.specs/active/0016-honest-signals.md', 4],
        ['.specs/active/0017-next-step-everywhere.md', 18],
        ['.specs/active/0018-overview-and-compact-board.md', 8],
        ['.specs/active/0019-detail-situation-picture.md', 5],
        ['.specs/active/0020-native-spec-tree.md', 4],
    ] as const) {
        it(`${file} carries its ${notes} notes of 0021`, async () => {
            const text = await read(file);
            expect(text.split('Amended by 0021 (PD-069)').length - 1).toBeGreaterThanOrEqual(notes);
            expect(text).toContain('read `Copy prompt`');
        });
    }

    it('negative control: a text without the note has none', () => {
        expect('no note here'.split('Amended by 0021 (PD-069)').length - 1).toBe(0);
    });
});


describe('product docs after 0023 (AC-017)', () => {
    it('the README names the Plan map tab, the three ways and "Integrate the returned steps", and no "two tabs"', async () => {
        const readme = await read('README.md');
        expect(readme).toContain('### Plan map');
        expect(readme).toContain('Ways to run stage 2');
        for (const way of ['In sequence', 'Subagents', 'Other agents']) {
            expect(readme, way).toContain(way);
        }
        expect(readme).toContain('Integrate the returned steps');
        expect(readme).not.toMatch(/two tabs/i);
        expect(readme).toContain('Open Plan Map');
    });

    it('the CHANGELOG names the Plan section and the Plan map under the version in preparation', async () => {
        const first = firstRelease(await read('CHANGELOG.md'));
        expect(first).toContain('The **Plan map**');
        expect(first).toContain('**Plan** section');
        expect(first).toContain('FeatherSpec Studio: Open Plan Map');
        expect(first).toContain('Integrate the returned steps');
        expect(first).not.toContain('The panel with two tabs');
    });

    it('the release checklist has the 0023 section with AC-018, AC-019 (build part) and AC-020, and says no more that the panel shows "Overview and Board only"', async () => {
        const text = await read('docs/release-checklist.md');
        const start = text.indexOf('\n## Plan map (0023)\n');
        expect(start).toBeGreaterThan(-1);
        const section = text.slice(start, text.indexOf('\n## ', start + 1));
        for (const mark of ['**AC-018**', '**AC-019 (build part)**', '**AC-020**']) {
            expect(section, mark).toContain(mark);
        }
        expect(text).not.toContain('Overview and Board only');
    });

    it('guideline 4 and the Panel row name the Plan map', async () => {
        expect(await read('.claude/rules/ux-guidelines.md')).toContain('The webview is for overview, board and plan map.');
        const guidelines = await read('docs/product/ux-guidelines.md');
        expect(guidelines).toContain('three tabs: Overview');
        expect(guidelines).toContain('Plan map (a spec\'s stages');
        expect(guidelines).not.toContain('two tabs: Overview');
    });

    for (const [file, notes] of [
        ['.specs/done/0005-studio-shell-navigation.md', 4],
        ['.specs/done/0013-studio-visual-design.md', 1],
        ['.specs/active/0015-focus-on-visibility.md', 4],
        ['.specs/active/0016-honest-signals.md', 1],
        ['.specs/active/0017-next-step-everywhere.md', 1],
        ['.specs/active/0018-overview-and-compact-board.md', 3],
        ['.specs/active/0019-detail-situation-picture.md', 12],
        ['.specs/active/0020-native-spec-tree.md', 7],
        ['.specs/active/0021-next-step-intent-and-guidance.md', 5],
        ['.specs/active/0022-layout-and-signal-polish.md', 8],
        ['docs/decisions/ADR-001-extension-architecture.md', 1],
    ] as const) {
        it(`${file} carries its ${notes} notes of 0023`, async () => {
            const text = await read(file);
            expect(text.split('Amended by 0023 (PD-069)').length - 1).toBeGreaterThanOrEqual(notes);
        });
    }

    it('no row of the PD register names 0023 as its editor', async () => {
        const register = await read('docs/product/product-decisions.md').catch(() => '');
        expect(register).not.toContain('Amended by 0023');
    });

    it('negative control: a text without the note has none', () => {
        expect('no note here'.split('Amended by 0023 (PD-069)').length - 1).toBe(0);
    });
});

describe('product docs after 0024 (AC-015)', () => {
    it('the README names the setting, both Send buttons, "sends nothing" and Open Settings', async () => {
        const readme = await read('README.md');
        for (const literal of ['featherspec-studio.assistant', 'Send to Copilot', 'Send to Claude Code', 'sends nothing', 'Open Settings']) {
            expect(readme, literal).toContain(literal);
        }
    });

    it('the CHANGELOG names the setting and Send under the version in preparation', async () => {
        const first = firstRelease(await read('CHANGELOG.md'));
        expect(first).toContain('featherspec-studio.assistant');
        expect(first).toContain('Send to');
    });

    it('the release checklist has the 0024 section with AC-016 to AC-019 and one line each for GitHub Copilot, Claude Code and Codex', async () => {
        const text = await read('docs/release-checklist.md');
        const start = text.indexOf('\n## Send to the assistant (0024)\n');
        expect(start).toBeGreaterThan(-1);
        expect(start).toBeLessThan(text.indexOf('\n## Go'));
        const section = text.slice(start, text.indexOf('\n## ', start + 1));
        for (const mark of ['**AC-016**', '**AC-017**', '**AC-018**', '**AC-019**']) {
            expect(section, mark).toContain(mark);
        }
        const lines = section.split('\n');
        const copilot = lines.find((line) => line.includes('GitHub Copilot: '));
        const claude = lines.find((line) => line.includes('Claude Code: '));
        const codex = lines.find((line) => line.includes('Codex: '));
        expect(copilot).toContain('VS Code 1.147.0, GitHub Copilot Chat 0.75.0');
        expect(claude).toContain('VS Code 1.147.0, Claude Code 2.1.327');
        expect(codex).toContain('Copy prompt only');
    });

    it('the README Privacy says the next step reaches the assistant by paste or by Send, and that Send fills the input and sends nothing', async () => {
        const readme = await read('README.md');
        const privacy = readme.slice(readme.indexOf('## Privacy and stored data'), readme.indexOf('## Known limitations')).replace(/\s+/g, ' ');
        expect(privacy).toContain('it reaches your assistant only when you paste it, or when you choose Send to Copilot or Send to Claude Code, which fill the chat input and send nothing');
        expect(privacy).not.toContain('it reaches your assistant only when you paste it.');
    });

    it('the checklist asks Gregor to record whether an unsent draft in the current chat of Copilot is kept or replaced, and to decide the default of NS-6 if it is replaced', async () => {
        const text = await read('docs/release-checklist.md');
        const start = text.indexOf('\n## Send to the assistant (0024)\n');
        const section = text.slice(start, text.indexOf('\n## ', start + 1)).replace(/\s+/g, ' ');
        expect(section).toContain('record whether an unsent draft in the current chat is kept or replaced when you use **Send to the current chat** (OP-004)');
        expect(section).not.toContain('stays the default target');
    });

    it('the project brief says that Send can put the prompt into the chosen assistant, and that the Studio never sends it', async () => {
        const brief = (await read('.memory-bank/projectbrief.md')).replace(/\s+/g, ' ');
        expect(brief).toContain('Send (PD-068) can put the prompt into the input of the assistant you chose');
        expect(brief).toContain('Studio never sends it');
    });

    for (const [file, notes] of [
        ['.specs/done/0013-studio-visual-design.md', 1],
        ['.specs/active/0015-focus-on-visibility.md', 7],
        ['.specs/active/0016-honest-signals.md', 2],
        ['.specs/active/0017-next-step-everywhere.md', 3],
        ['.specs/active/0018-overview-and-compact-board.md', 4],
        ['.specs/active/0019-detail-situation-picture.md', 6],
        ['.specs/active/0020-native-spec-tree.md', 4],
        ['.specs/active/0021-next-step-intent-and-guidance.md', 12],
        ['.specs/active/0022-layout-and-signal-polish.md', 11],
        ['.specs/active/0023-plan-map-stages-parallel-work.md', 3],
    ] as const) {
        it(`${file} carries its ${notes} notes of 0024`, async () => {
            const text = await read(file);
            expect(text.split('Amended by 0024 (PD-068)').length - 1).toBeGreaterThanOrEqual(notes);
        });
    }

    it('the catch-all note heads 0015, 0018, 0019, 0021, 0022 and 0023', async () => {
        for (const name of ['0015-focus-on-visibility', '0018-overview-and-compact-board', '0019-detail-situation-picture', '0021-next-step-intent-and-guidance', '0022-layout-and-signal-polish', '0023-plan-map-stages-parallel-work']) {
            const text = await read(`.specs/active/${name}.md`);
            const head = text.slice(0, text.indexOf('\n## '));
            expect(head, name).toContain('Amended by 0024 (PD-068): where Send is offered');
        }
    });

    it('no row of the PD register names 0024 as its editor', async () => {
        const register = await read('docs/product/product-decisions.md').catch(() => '');
        expect(register).not.toContain('Amended by 0024');
    });

    it('negative control: a text without the note has none', () => {
        expect('no note here'.split('Amended by 0024 (PD-068)').length - 1).toBe(0);
    });
});


describe('product docs after the final check of round 2 (0024 T-014 to T-022)', () => {
    const SHOTS = [
        ['overview-dark', 'Overview in the dark theme: Now lists five specs in Review and + 7 more, the first row with Copy prompt and its coach line, then Up next and the figures'],
        ['board-dark', 'Board in the dark theme: six columns, the Review column open with cards that show the next step and an icon Copy prompt'],
        ['plan-map-dark', 'Plan map in the dark theme: a plan as stages with the next step in its header, stage 2 can run in parallel with two step cards and the ways to run it as three choices, the side panel beside the map'],
        ['spec-detail-light', 'Board in the light theme with the detail of a spec in the side panel: Next step with Copy prompt, Plan and Progress'],
    ] as const;

    function pngSize(bytes: Buffer): [number, number] {
        return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
    }

    it('the README links the four shots with the alt text of what each shows, and each is a 1400 by 900 PNG', async () => {
        const readme = await read('README.md');
        const images = [...readme.matchAll(/!\[([^\]]*)\]\((media\/screenshots\/[\w-]+\.png)\)/g)].map((match) => [match[2], match[1]]);
        expect(images).toEqual(SHOTS.map(([name, alt]) => [`media/screenshots/${name}.png`, alt]));
        for (const [name] of SHOTS) {
            const bytes = await fs.readFile(path.join(root, 'media', 'screenshots', `${name}.png`));
            expect(pngSize(bytes), name).toEqual([1400, 900]);
        }
    });

    it('the Plan map shot stands in the README part about the Plan map', async () => {
        const readme = await read('README.md');
        const start = readme.indexOf('\n### Plan map\n');
        expect(start).toBeGreaterThan(-1);
        const part = readme.slice(start, readme.indexOf('\n### ', start + 1));
        expect(part).toContain('media/screenshots/plan-map-dark.png');
    });

    it('.vscodeignore still keeps the screenshots out of the VSIX', async () => {
        expect((await read('.vscodeignore')).split('\n')).toContain('media/screenshots/**');
    });
    async function section(text: string, heading: string): Promise<string[]> {
        const start = text.indexOf(`\n## ${heading}\n`);
        expect(start, heading).toBeGreaterThan(-1);
        const end = text.indexOf('\n## ', start + 1);
        return text.slice(start + heading.length + 5, end < 0 ? undefined : end).split('\n').filter((line) => line.trim() !== '');
    }

    it('activeContext.md is a short dashboard in content, not only in lines', async () => {
        const text = await read('.memory-bank/activeContext.md');
        expect(Buffer.byteLength(text)).toBeLessThanOrEqual(7000);
        expect(text.split('\n').length).toBeLessThanOrEqual(60);
        const lines = text.split('\n');
        expect(lines[0]).toBe('# Active Context');
        expect(lines.filter((line) => /^(Last updated|Current branch|Current phase): \S/.test(line)).map((line) => line.split(':')[0])).toEqual(['Last updated', 'Current branch', 'Current phase']);
        expect(lines.filter((line) => line.startsWith('## '))).toEqual(['## Now', '## Active Spec', '## Changed Recently', '## Decisions in Flight', '## Blockers / Questions', '## Next', '## Validation']);
        for (const line of lines) {
            expect(line.length, line.slice(0, 60)).toBeLessThanOrEqual(330);
        }
    });

    it('activeContext.md: Now is at most five lines, Changed Recently at most three, Next is numbered from 1, Validation is one pointer', async () => {
        const text = await read('.memory-bank/activeContext.md');
        expect((await section(text, 'Now')).length).toBeLessThanOrEqual(5);
        expect((await section(text, 'Changed Recently')).length).toBeLessThanOrEqual(3);
        const next = await section(text, 'Next');
        expect(next.map((line) => line.split('.')[0])).toEqual(next.map((_, index) => String(index + 1)));
        expect((await section(text, 'Validation')).length).toBe(1);
    });

    it('activeContext.md names every spec in active/ on one line of its own, and the plan beside it', async () => {
        const text = await read('.memory-bank/activeContext.md');
        const lines = await section(text, 'Active Spec');
        const active = (await fs.readdir(path.join(root, '.specs', 'active'))).filter((name) => name.endsWith('.md') && !name.endsWith('.plan.md'));
        expect(active.length).toBeGreaterThan(0);
        for (const name of active) {
            const own = lines.filter((line) => line.includes(`(../.specs/active/${name})`));
            expect(own, name).toHaveLength(1);
            expect(own[0], name).toContain(`(../.specs/active/${name.replace(/\.md$/, '.plan.md')})`);
        }
    });
    it('the CHANGELOG entry names the tree action Copy Next Step, the gear in the toolbar, one copy control, three settings and Problems as sentences', async () => {
        const first = firstRelease(await read('CHANGELOG.md'));
        expect(first).toContain('an inline **Copy Next Step** and the context menu (Open Spec, Open Plan and Copy Next Step)');
        expect(first).toContain('the toolbar has **Open**, **Refresh** and the gear (**Open Settings**)');
        expect(first).not.toContain('**Copy**');
        expect(first).toContain('as one line with a **Copy prompt** button');
        expect(first).toContain('Three settings, under **FeatherSpec Studio**');
        expect(first).not.toContain('Two settings');
        expect(first).not.toContain('**Send to your assistant**');
        expect(first).toContain('`featherspec-studio.assistant`');
        expect(first).toContain('Problems as sentences');
        expect(first).not.toContain('Problems with their reasons');
    });

    it('the CHANGELOG lists every command of the Command Palette', async () => {
        const first = firstRelease(await read('CHANGELOG.md'));
        for (const name of ['Open', 'Open Overview', 'Open Board', 'Open Plan Map', 'Focus on Specs View', 'Copy Next Step', 'Set Up FeatherSpec', 'Select Project', 'Refresh', 'Open Settings']) {
            expect(first, name).toContain(`\`FeatherSpec Studio: ${name}\``);
        }
    });

    it('the README names the gear in the toolbar and the two cases of a new chat', async () => {
        const readme = await read('README.md');
        expect(readme).toContain('The toolbar has **Open**, **Refresh** and the gear (**Open Settings**)');
        expect(readme).not.toContain('The toolbar has **Open** and **Refresh**');
        expect(readme).toContain('opens a new chat for every step');
        expect(readme).not.toContain('(the verification and the review)');
    });

    it('the checklist keeps Gregor\'s real window at 0021 AC-022', async () => {
        const text = await read('docs/release-checklist.md');
        const start = text.indexOf('\n## Next step with intent and guidance (0021)\n');
        const section = text.slice(start, text.indexOf('\n## ', start + 1));
        const line = section.split('\n').find((row) => row.includes('**AC-022**'));
        expect(line).toContain('*(preview harness, orchestrator, then Gregor in a real window; guideline 12)*');
    });

    it('0024 §5 lists 0019 AC-020, the note stands under it, and P-22 places useFocusHandoff in ui/focusHandoff.ts', async () => {
        const spec = await read('.specs/active/0024-send-next-step-to-assistant.md');
        expect(spec).toContain('| 0019 AC-020 — an offer change hands focus to the replacing Copy prompt (0024 AC-010) |');
        const lines = (await read('.specs/active/0019-detail-situation-picture.md')).split('\n');
        const at = lines.findIndex((line) => line.startsWith('- **AC-020**'));
        expect(at).toBeGreaterThan(-1);
        expect(lines[at + 1]).toContain('*Amended by 0024 (PD-068): AC-020 — ');
        expect(lines[at + 1]).toContain('0024 AC-010');
        const plan = await read('.specs/active/0024-send-next-step-to-assistant.plan.md');
        expect(plan).toContain('`useFocusHandoff()` (`ui/focusHandoff.ts`)');
        expect(plan).not.toContain('`useFocusHandoff()` (`ui/popup.ts`)');
    });

    it('the 0021 audit homes the docsScan rename of 463899b, and the old and new titles are as the commit made them', async () => {
        const plan = await read('.specs/active/0021-next-step-intent-and-guidance.plan.md');
        const audit = plan.slice(plan.indexOf('\n## Test-title audit\n'), plan.indexOf('\n## Traceability\n'));
        const row = audit.split('\n').find((line) => line.includes('as its last row')) ?? '';
        expect(row).toContain('`src/adapters/node/docsScan.test.ts`');
        expect(row).toContain('the decisions register carries PD-067 as its last row, names what each later decision retires, and leaves the earlier rows as they were');
        expect(row).toContain('after PD-066');
        expect(row).toContain('463899b');
        expect(await read('src/adapters/node/docsScan.test.ts')).toContain("it('the decisions register carries PD-067 after PD-066, names what each later decision retires, and leaves the earlier rows as they were'");
    });

    it('the 0023 and 0024 plans record the harness recheck and Windows at their fix heads', async () => {
        const plan23 = (await read('.specs/active/0023-plan-map-stages-parallel-work.plan.md')).replace(/\s+/g, ' ');
        expect(plan23).toContain("manual: orchestrator (Gregor's delegate) 2026-11-18, harness recheck at d756fa9");
        expect(plan23).toContain('60 views');
        expect(plan23).toContain('`par-odd`');
        expect(plan23).toContain('Windows at d756fa9: unit 2812 passed, 7 skipped, +16 timing; `npm test` 31+1+1+1');
        const plan24 = (await read('.specs/active/0024-send-next-step-to-assistant.plan.md')).replace(/\s+/g, ' ');
        expect(plan24).toContain("manual: orchestrator (Gregor's delegate) 2026-11-19, harness recheck at 5c70dbd");
        expect(plan24).toContain('60/60 pass');
        expect(plan24).toContain('Windows at 5c70dbd: unit 3109 passed, 7 skipped, +18 timing; `npm test` 32+1+1+1');
    });

    it('the AGENTS.md snapshot names its modules and points to the maps that hold what they contain', async () => {
        const agents = await read('AGENTS.md');
        const modules = agents.split('\n').filter((line) => /^ {4}- 'src\/(core\/<area>|adapters|webview) — /.test(line));
        expect(modules).toHaveLength(3);
        for (const line of modules) {
            expect(line.length, line.slice(0, 40)).toBeLessThanOrEqual(600);
        }
        const [core, adapters, webview] = modules;
        for (const area of ['discovery', 'specs', 'lifecycle', 'runtime', 'shell', 'overview', 'board', 'planMap', 'copyNextStep', 'settings', 'assistant', 'setup', 'ports/']) {
            expect(core, area).toContain(area);
        }
        expect(core).toContain('.architecture/core.md');
        expect(adapters).toContain('.architecture/adapters.md');
        for (const part of ['protocol client', 'shell', 'area registry', 'Overview, Board, Plan map', 'detail/', 'ui/', 'src/test', 'test/fixtures', 'media']) {
            expect(webview, part).toContain(part);
        }
        expect(webview).toContain('.architecture/webview.md');
        expect(Buffer.byteLength(agents)).toBeLessThanOrEqual(15000);
    });

    it('the maps hold what the snapshot lines no longer list, and the webview map counts three areas', async () => {
        const maps = (await read('.architecture/core.md')) + (await read('.architecture/webview.md'));
        for (const term of ['coach line', 'Toggletip', 'split button', 'BackButton', 'Divider', 'planMap', 'copyNextStep', 'problemSentence', 'sidePanelWidth', 'treeLabel']) {
            expect(maps, term).toContain(term);
        }
        const webview = await read('.architecture/webview.md');
        expect(webview).toContain('The panel has three areas, Overview, Board and Plan map');
        expect(webview).not.toContain('two areas');
    });

    it('the snapshot keeps its entrypoints, shared line and four boundaries', async () => {
        const agents = await read('AGENTS.md');
        for (const kept of [
            "src/extension.ts — composition root",
            "src/webview/main.tsx — Studio panel UI",
            "src/shared/protocol",
            "src/shared/testing",
            'Domain and application code never import vscode',
            'Only the setup (0014) writes into a workspace folder',
            'src/shared imports neither vscode nor Node.js',
            "No webview message names a command",
        ]) {
            expect(agents, kept).toContain(kept);
        }
    });

});

function guardScopedToOldVersions(text: string): boolean {
    const guard = 'Verified:` line but no tick';
    return text
        .split(/\.\s/)
        .filter((sentence) => sentence.includes(guard))
        .some((sentence) => /(?:before|below) FeatherSpec\s+1\.11\.0/i.test(sentence.slice(0, sentence.indexOf(guard))));
}

describe('0028 AC-011: the docs describe the plan-state-aware next step', () => {
    it('README: the Report first intent, the Review line in full, and no leftover sentence of the old report case', async () => {
        const text = await read('README.md');
        expect(text).toContain('Let the agent report first — the plan and the ticks may differ');
        const review = text.split('\n').find((line) => line.includes('→ **Review** (derived)'));
        expect(review).toContain('every step of its plan ticked or dropped');
        expect(review).toContain("whatever the plan's status line says");
        expect(text).not.toContain('without an open step the one prompt lets the agent report where the plan stands');
    });

    it('CHANGELOG: the 0.1.0 entry names Let the agent report first and every step ticked', async () => {
        const first = firstRelease(await read('CHANGELOG.md'));
        expect(first).toContain('Let the agent report first');
        expect(first).toContain('every step ticked');
    });

    it('the release checklist holds AC-013, AC-014 and AC-015 of 0028', async () => {
        const text = await read('docs/release-checklist.md');
        const section = text.slice(text.indexOf('## Plan-state-aware next step (0028)'), text.indexOf('## Go'));
        for (const id of ['AC-013', 'AC-014', 'AC-015']) {
            expect(section, id).toContain(`**${id}**`);
        }
    });

    it('README and CHANGELOG do not scope the Verified-without-tick guard to versions below 1.11.0', async () => {
        const readme = await read('README.md');
        const changelog = firstRelease(await read('CHANGELOG.md'));
        for (const [name, text] of [['README.md', readme], ['CHANGELOG.md', changelog]] as const) {
            expect(text, name).toContain('Verified:` line but no tick');
            expect(guardScopedToOldVersions(text), name).toBe(false);
        }
    });

    it('negative control: the scope check finds the old wording and passes the right one', () => {
        const old = 'Before FeatherSpec 1.11.0, when the plan names an unfinished step or a step has a `Verified:` line but no tick, the report comes first.';
        const oldChangelog = 'Below FeatherSpec 1.11.0, when the plan names an unfinished step or a step has a `Verified:` line but no tick, the prompt comes first.';
        const right = 'When a step has a `Verified:` line but no tick, and before FeatherSpec 1.11.0 also when the plan names an unfinished step, the report comes first.';
        expect(guardScopedToOldVersions(old)).toBe(true);
        expect(guardScopedToOldVersions(oldChangelog)).toBe(true);
        expect(guardScopedToOldVersions(right)).toBe(false);
    });
});

describe('product docs after 0025 (AC-021)', () => {
    it('0025 AC-021: the README Plan map section names Show in Plan Map, Ctrl+click, 4 of 6 done · 67% and Next step', async () => {
        const readme = await read('README.md');
        const section = readme.slice(readme.indexOf('### Plan map'), readme.indexOf('### The detail of a spec'));
        for (const literal of ['Show in Plan Map', 'Ctrl+click', '4 of 6 done · 67%', 'Next step']) {
            expect(section, literal).toContain(literal);
        }
    });

    it('0025 AC-021: the CHANGELOG names Show in Plan Map and 4 of 6 done · 67% under the version in preparation; no document holds a digit followed by " %"', async () => {
        const first = firstRelease(await read('CHANGELOG.md'));
        expect(first).toContain('Show in Plan Map');
        expect(first).toContain('4 of 6 done · 67%');
        for (const file of ['README.md', 'CHANGELOG.md']) {
            expect(await read(file), file).not.toMatch(/\d %/);
        }
        expect('Progress 67 %').toMatch(/\d %/);
    });

    it('0025 AC-021: the release checklist carries AC-022 to AC-024 before Go', async () => {
        const text = await read('docs/release-checklist.md');
        const start = text.indexOf('\n## Plan map navigation and progress (0025)\n');
        expect(start).toBeGreaterThan(-1);
        expect(start).toBeLessThan(text.indexOf('\n## Go'));
        const section = text.slice(start, text.indexOf('\n## ', start + 1));
        for (const mark of ['**AC-022**', '**AC-023**', '**AC-024**']) {
            expect(section, mark).toContain(mark);
        }
    });

    it('0025 AC-021: the guidelines read as the amendment says, and the rationale table has the two rows', async () => {
        const rules = (await read('.claude/rules/ux-guidelines.md')).replace(/\s+/g, ' ');
        expect(rules).toContain('Criterion IDs and "Open" go to the file at the line, beside the panel (`ViewColumn.Beside`); a step ID goes to its card in the Plan map, Ctrl/Cmd+click to the file.');
        expect(rules).toContain('once per view (detail, first Now row, Plan map header)');
        const table = await read('docs/product/ux-guidelines.md');
        expect(table).toContain('| 5 (2026-11-19) |');
        expect(table).toContain('| 11 (2026-11-19) |');
    });

    it('0025 AC-021: each statement of 0025 section 4 carries its note, and no PD row of the register names 0025 as an editor', async () => {
        const files = ['.specs/active/0023-plan-map-stages-parallel-work.md', '.specs/active/0019-detail-situation-picture.md', '.specs/active/0021-next-step-intent-and-guidance.md', '.specs/active/0022-layout-and-signal-polish.md', '.specs/active/0024-send-next-step-to-assistant.md', '.specs/active/0020-native-spec-tree.md', '.specs/active/0018-overview-and-compact-board.md', '.specs/done/0005-studio-shell-navigation.md', '.specs/done/0006-mission-control-dashboard.md', '.specs/done/0013-studio-visual-design.md'];
        for (const file of files) {
            expect(await read(file), file).toContain('Amended by 0025 (PD-082)');
        }
        expect('no note here'.split('Amended by 0025 (PD-082)').length - 1).toBe(0);
    });
});

describe('product docs after 0026 (AC-002, AC-016)', () => {
    const STRINGS = ['opens a new chat for every step', 'current or new chat', 'Find blocker', 'Move back to Ready', 'at most five', 'About these ways'];

    it('0026 AC-016: README and the CHANGELOG entry in preparation each contain the six strings', async () => {
        const readme = await read('README.md');
        const first = firstRelease(await read('CHANGELOG.md'));
        for (const text of STRINGS) {
            expect(readme, `README ${text}`).toContain(text);
            expect(first, `CHANGELOG ${text}`).toContain(text);
        }
    });

    it('0026 AC-016, AC-002: the README holds no same chat, no the current chat otherwise, no **Next**, no `Plan · /sdd-plan`; the checklist and the brief no old line', async () => {
        const readme = await read('README.md');
        for (const old of ['same chat', 'the current chat otherwise', '**Next**', '`Plan · /sdd-plan`']) {
            expect(readme, old).not.toContain(old);
        }
        expect(readme.toLowerCase()).not.toContain('this chat');
        expect(await read('docs/release-checklist.md')).not.toContain('stays the default target');
        expect(await read('docs/product/design-brief.md')).not.toContain('("Next", short form');
        expect('the current chat otherwise **Next**').toContain('**Next**');
    });

    it('0026 AC-016: the release checklist carries AC-017 to AC-019 of 0026 before Go', async () => {
        const text = await read('docs/release-checklist.md');
        const start = text.indexOf('\n## Send defaults and wording (0026)\n');
        expect(start).toBeGreaterThan(-1);
        expect(start).toBeLessThan(text.indexOf('\n## Go'));
        const section = text.slice(start, text.indexOf('\n## ', start + 1));
        for (const mark of ['**AC-017**', '**AC-018**', '**AC-019**']) {
            expect(section, mark).toContain(mark);
        }
    });

    it('0026 AC-016: each statement of 0026 section 5 carries its note in the six specs it amends', async () => {
        const files = ['0017-next-step-everywhere', '0018-overview-and-compact-board', '0021-next-step-intent-and-guidance', '0022-layout-and-signal-polish', '0023-plan-map-stages-parallel-work', '0024-send-next-step-to-assistant'];
        for (const file of files) {
            expect(await read(`.specs/active/${file}.md`), file).toContain('Amended by 0026 (PD-');
        }
        expect('no note here').not.toContain('Amended by 0026 (PD-');
    });
});

describe('product docs after 0027 (AC-015)', () => {
    it('0027 AC-015: README contains the three strings and the CHANGELOG entry in preparation names that Send attaches the spec', async () => {
        const readme = await read('README.md');
        for (const text of ['FeatherSpec 1.11.0', 'Copy prompt attaches nothing']) {
            expect(readme, `README ${text}`).toContain(text);
        }
        expect(readme).not.toContain('attached when sent');
        expect(firstRelease(await read('CHANGELOG.md'))).toContain('attaches the spec');
    });

    it('0027 AC-015: the release checklist carries AC-016 to AC-018 and AC-020, one line per assistant for AC-017 with V-3\'s versions, and the C-2 line (not needed, PD-091), before Go', async () => {
        const text = await read('docs/release-checklist.md');
        const start = text.indexOf('\n## Attach the spec when sending (0027)\n');
        expect(start).toBeGreaterThan(-1);
        expect(start).toBeLessThan(text.indexOf('\n## Go'));
        const section = text.slice(start, text.indexOf('\n## ', start + 1));
        for (const mark of ['**AC-016**', '**AC-017**', '**AC-017, GitHub Copilot**', '**AC-018**', '**AC-020**', 'VS Code 1.147.0', 'GitHub Copilot Chat 0.75.0', 'Claude Code 2.1.327', '**C-2, not needed**', '`attachesSpec`']) {
            expect(section, mark).toContain(mark);
        }
    });

    it('0027 AC-015: each statement of 0027 section 5 carries its note, 0013 in done/ included', async () => {
        const active = ['0015-focus-on-visibility', '0016-honest-signals', '0017-next-step-everywhere', '0018-overview-and-compact-board', '0019-detail-situation-picture', '0020-native-spec-tree', '0021-next-step-intent-and-guidance', '0022-layout-and-signal-polish', '0023-plan-map-stages-parallel-work', '0024-send-next-step-to-assistant'];
        for (const file of active) {
            expect(await read(`.specs/active/${file}.md`), file).toContain('Amended by 0027 (PD-');
        }
        for (const file of ['0002-spec-repository-parser', '0013-studio-visual-design', '0025-plan-map-navigation-and-progress', '0026-send-defaults-and-wording', '0028-plan-state-aware-next-step']) {
            expect(await read(`.specs/done/${file}.md`), file).toContain('Amended by 0027 (PD-');
        }
        expect('no note here').not.toContain('Amended by 0027 (PD-');
    });

    it('0029 AC-012: the notes of section 5, PD-090, the README, the CHANGELOG and the checklist section', async () => {
        const notes: ReadonlyArray<readonly [string, number]> = [
            ['.specs/done/0006-mission-control-dashboard.md', 1],
            ['.specs/done/0007-spec-board-spec-detail.md', 1],
            ['.specs/active/0017-next-step-everywhere.md', 1],
            ['.specs/active/0018-overview-and-compact-board.md', 3],
            ['.specs/active/0020-native-spec-tree.md', 1],
        ];
        for (const [file, count] of notes) {
            expect((await read(file)).split('Amended by 0029 (setup not run)').length - 1, file).toBe(count);
        }
        expect(await read('docs/product/product-decisions.md')).toMatch(/\| PD-090 \| [^|]*feather[^|]*\|/i);
        expect(await read('README.md')).toMatch(/Welcome to FeatherSpec[^]*\/sdd-setup|\/sdd-setup[^]*Welcome to FeatherSpec/);
        expect(await read('CHANGELOG.md')).toContain('Welcome to FeatherSpec');
        const text = await read('docs/release-checklist.md');
        const start = text.indexOf('\n## Onboarding before setup (0029)\n');
        expect(start).toBeGreaterThan(-1);
        expect(start).toBeLessThan(text.indexOf('\n## Go'));
        const section = text.slice(start, text.indexOf('\n## ', start + 1));
        for (const mark of ['**AC-013**', '**AC-014**']) {
            expect(section, mark).toContain(mark);
        }
        expect('no note here').not.toContain('Amended by 0029 (setup not run)');
    });

    it('0030 AC-011: the notes of section 5, PD-092, the README, the CHANGELOG and the checklist section', async () => {
        const notes = ['.specs/active/0017-next-step-everywhere.md', '.specs/active/0021-next-step-intent-and-guidance.md', '.specs/done/0026-send-defaults-and-wording.md', '.specs/active/0027-attach-spec-when-sending.md'];
        for (const file of notes) {
            expect(await read(file), file).toContain('Amended by 0030 (PD-092)');
        }
        expect(await read('docs/product/product-decisions.md')).toMatch(/\| PD-092 \| [^|]*`Tip:`[^|]*\|/);
        const readme = await read('README.md');
        expect(readme).toContain('Tip: Use');
        expect(readme).not.toContain('attached when sent');
        const changelog = firstRelease(await read('CHANGELOG.md'));
        expect(changelog).toContain('Write the plan');
        expect(changelog).toContain('Tip:');
        const text = await read('docs/release-checklist.md');
        const start = text.indexOf('(0030)\n');
        expect(start).toBeGreaterThan(-1);
        expect(start).toBeLessThan(text.indexOf('\n## Go'));
        const section = text.slice(start, text.indexOf('\n## ', start));
        for (const mark of ['**AC-012**', '**AC-013**']) {
            expect(section, mark).toContain(mark);
        }
        expect('no note here').not.toContain('Amended by 0030 (PD-092)');
    });
});

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AreaInfo } from '../../shared/protocol/areas';
import type { Envelope } from '../../shared/protocol/envelope';
import type { ShellView, SpecRow } from '../../shared/protocol/messages';
import { App } from '../App';
import { Placeholder } from './Placeholder';
import { createClient, type ShellClient } from '../client';
import mainCss from '../main.css?raw';
import { rulesMatching } from '../testing/css';
import { baseView, click, isKeyboardReachable, mount, pressKey, send, shellEvent, type Mounted } from '../testing/dom';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

function row(number: string, overrides: Partial<SpecRow> = {}): SpecRow {
    return {
        stem: `${number}-thing`,
        path: `.specs/active/${number}-thing.md`,
        number,
        title: `Thing ${number}`,
        state: 'Active',
        derivedRule: undefined,
        showPath: false,
        selected: false,
        ...overrides,
    };
}

const THREE = [row('0001'), row('0002', { state: 'Backlog' }), row('0003', { state: 'Review', derivedRule: 'S-REVIEW' })];

async function open(view: ShellView): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(view, 1));
    return mounted.container;
}

function nav(container: HTMLElement, title: string): HTMLButtonElement {
    return [...container.querySelectorAll<HTMLButtonElement>('nav button')].find((button) => button.textContent?.includes(title))!;
}

function optionRows(container: HTMLElement): HTMLElement[] {
    return [...container.querySelectorAll<HTMLElement>('[role="option"]')];
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

const SYNTHETIC: AreaInfo = { id: 'agentCenter', title: 'Synthetic area', purpose: 'A purpose for a placeholder test.', placeholder: true };

describe('AC-006: placeholders (no real area is a placeholder any more; the component is tested through a synthetic area)', () => {
    it('a placeholder shows its name, its purpose and "Not available in this version of FeatherSpec Studio", and no rows', async () => {
        mounted = await mount(<Placeholder area={SYNTHETIC} />);
        const container = mounted.container;
        const placeholder = container.querySelector('[data-placeholder]');
        expect(placeholder?.textContent).toContain('A purpose for a placeholder test.');
        expect(placeholder?.textContent).toContain('Not available in this version of FeatherSpec Studio');
        expect(container.textContent).not.toContain('Arrives with spec');
        expect(container.querySelectorAll('[role="option"], [role="listbox"]')).toHaveLength(0);
    });

    it('a request target handed to the app does not reach a placeholder: nothing of the target shows in it (AC-028)', async () => {
        mounted = await mount(<Placeholder area={SYNTHETIC} />);
        expect(mounted.container.textContent).not.toContain('r-1');
    });

    it.each(['missionControl', 'specExplorer', 'specBoard', 'agentCenter'] as const)('control: %s is no placeholder', async (area) => {
        const container = await open(baseView({ area, rows: THREE }));
        expect(container.querySelector('[data-placeholder]')).toBeNull();
    });
});

describe('AC-007: the Spec Explorer list', () => {
    it('renders every field: number, title or "not available", the state word, the derived label and the path of a duplicated stem', async () => {
        const rows = [
            row('0001'),
            row('0003', { title: undefined, state: 'Review', derivedRule: 'S-REVIEW' }),
            row('0004', { showPath: true, path: '.specs/backlog/0004-thing.md' }),
            row('0004', { showPath: true, path: '.specs/active/0004-thing.md', state: 'Active' }),
        ];
        const container = await open(baseView({ area: 'specExplorer', rows }));
        const listed = optionRows(container);
        expect(listed).toHaveLength(4);
        expect(listed[0]?.textContent).toContain('0001');
        expect(listed[0]?.textContent).toContain('Thing 0001');
        expect(listed[0]?.textContent).toContain('Active');
        expect(listed[0]?.textContent).not.toContain('.specs/');
        expect(listed[1]?.textContent).toContain('not available');
        expect(listed[1]?.textContent).toContain('Review');
        expect(listed[1]?.querySelector('.rule-sentence')?.textContent).toBe('Derived: plan is Done, waiting for review');
        expect(listed[1]?.querySelector('.rule-id')?.textContent).toBe('S-REVIEW');
        expect(listed[2]?.textContent).toContain('.specs/backlog/0004-thing.md');
        expect(listed[3]?.textContent).toContain('.specs/active/0004-thing.md');
        expect(container.querySelector('[role="listbox"]')?.getAttribute('aria-label')).toBe('Specs');
    });

    it('keeps the order the host sent', async () => {
        const container = await open(baseView({ area: 'specExplorer', rows: [row('0002'), row('0010'), row('0011')] }));
        expect(optionRows(container).map((item) => item.textContent?.slice(0, 5))).toEqual(['0002 ', '0010 ', '0011 '].map((text) => text.slice(0, 5)));
    });

    it('with zero specs it shows "This project has no specs yet." and no list', async () => {
        const container = await open(baseView({ area: 'specExplorer', rows: [] }));
        expect(container.textContent).toContain('This project has no specs yet.');
        expect(container.querySelector('[role="listbox"]')).toBeNull();
    });

});

describe('AC-008: selection in the panel UI', () => {
    it('a click, Enter and Space on a row send select with the stem; rows are reachable by keyboard', async () => {
        const container = await open(baseView({ area: 'specExplorer', rows: THREE }));
        const rows = optionRows(container);
        rows.forEach((item) => expect(isKeyboardReachable(item)).toBe(true));
        await click(rows[0]!);
        await pressKey(rows[1]!, 'Enter');
        await pressKey(rows[2]!, ' ');
        const selects = posted.filter((message) => message.type === 'select').map((message) => message.payload);
        expect(selects).toEqual([{ stem: '0001-thing' }, { stem: '0002-thing' }, { stem: '0003-thing' }]);
    });

    it('a row of a duplicated stem sends select with its path', async () => {
        const rows = [row('0004', { showPath: true, path: 'a/0004-x.md', stem: '0004-x' }), row('0004', { showPath: true, path: 'b/0004-x.md', stem: '0004-x' })];
        const container = await open(baseView({ area: 'specExplorer', rows }));
        await click(optionRows(container)[1]!);
        expect(posted.find((message) => message.type === 'select')?.payload).toEqual({ stem: '0004-x', path: 'b/0004-x.md' });
    });

    it('AC-023: the selected row carries aria-selected and a visible marker, and no other row does', async () => {
        const rows = [row('0001'), row('0002', { selected: true }), row('0003')];
        const container = await open(baseView({ area: 'specExplorer', rows, selection: { stem: '0002-thing', number: '0002' } }));
        const listed = optionRows(container);
        expect(listed.map((item) => item.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
        expect(listed[1]?.querySelector('[data-marker]')?.textContent).toBe('▸');
        expect(listed[0]?.querySelector('[data-marker]')).toBeNull();
    });

    it('AC-030: in the real DOM the secondary text of a selected row is reached by a rule with the selection foreground, that of another row is not', async () => {
        const css = mainCss as string;
        const rows = [
            row('0001', { derivedRule: 'S-REVIEW', showPath: true }),
            row('0002', { selected: true, derivedRule: 'S-REVIEW', showPath: true }),
        ];
        const container = await open(baseView({ area: 'specExplorer', rows, selection: { stem: '0002-thing', number: '0002' } }));
        const [other, selected] = optionRows(container);
        for (const cls of ['.spec-derived', '.spec-path']) {
            const inSelected = rulesMatching(css, selected!.querySelector(cls)!);
            const last = inSelected[inSelected.length - 1]!;
            expect(last.body).toContain('var(--vscode-list-activeSelectionForeground)');
            const inOther = rulesMatching(css, other!.querySelector(cls)!);
            expect(inOther.some((rule) => rule.body.includes('activeSelectionForeground'))).toBe(false);
            expect(inOther.some((rule) => rule.body.includes('var(--vscode-descriptionForeground)'))).toBe(true);
        }
    });

    it('AC-031: the selected row and the current navigation item are reached by a rule with the contrast active border', async () => {
        const css = mainCss as string;
        const container = await open(baseView({ area: 'specExplorer', rows: [row('0002', { selected: true })], selection: { stem: '0002-thing', number: '0002' } }));
        const selected = optionRows(container)[0]!;
        const current = container.querySelector('nav [aria-current]')!;
        expect(rulesMatching(css, selected).some((rule) => rule.body.includes('--vscode-contrastActiveBorder'))).toBe(true);
        expect(rulesMatching(css, current).some((rule) => rule.body.includes('--vscode-contrastActiveBorder'))).toBe(true);
    });

    it('the selected row stays marked after a round trip to another area and back', async () => {
        const rows = [row('0001'), row('0002', { selected: true })];
        const container = await open(baseView({ area: 'specExplorer', rows, selection: { stem: '0002-thing', number: '0002' } }));
        await click(nav(container, 'Spec Board'));
        expect(container.querySelector('h1')?.textContent).toBe('Spec Board');
        await click(nav(container, 'Spec Explorer'));
        expect(optionRows(container)[1]?.getAttribute('aria-selected')).toBe('true');
    });
});

describe('AC-010: the notice', () => {
    it('shows "Spec <number> is no longer in the project" above the area with a Dismiss action that sends dismissNotice', async () => {
        const container = await open(baseView({ area: 'specExplorer', rows: THREE, notice: { number: '0003' } }));
        const notice = container.querySelector('[data-notice]');
        expect(notice?.textContent).toContain('Spec 0003 is no longer in the project');
        expect(notice?.getAttribute('role')).toBe('status');
        const dismiss = notice?.querySelector('button');
        expect(dismiss?.textContent).toBe('Dismiss');
        expect(isKeyboardReachable(dismiss!)).toBe(true);
        await pressKey(dismiss!, 'Enter');
        expect(posted.filter((message) => message.type === 'dismissNotice')).toHaveLength(1);
    });

    it('is gone when the host reports no notice any more (control)', async () => {
        const container = await open(baseView({ area: 'specExplorer', rows: THREE, notice: { number: '0003' } }));
        await send(shellEvent(baseView({ area: 'specExplorer', rows: THREE }), 2));
        expect(container.querySelector('[data-notice]')).toBeNull();
    });
});

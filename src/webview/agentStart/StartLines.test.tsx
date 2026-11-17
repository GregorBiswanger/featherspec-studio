import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AgentStartView, RefusalItem } from '../../shared/protocol/agentStart';
import type { Envelope } from '../../shared/protocol/envelope';
import { App } from '../App';
import { createClient, type ShellClient } from '../client';
import { baseView, click, isKeyboardReachable, mount, pressKey, send, shellEvent, type Mounted } from '../testing/dom';
import { checkingText, noticeText, refusalLines, OPEN_RUN_LABEL } from './texts';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

function agentStartEvent(payload: unknown): Envelope {
    return { v: 1, kind: 'evt', type: 'agentStart', payload };
}

async function open(): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area: 'specExplorer' }), 1));
    return mounted.container;
}

async function show(view: AgentStartView): Promise<void> {
    await send(agentStartEvent({ view }));
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

const ITEMS: RefusalItem[] = [
    { id: 'P-1', kind: 'transition', refusal: 'not-ready', ids: ['R-4'], text: 'The spec is not Ready: R-4.' },
    { id: 'P-2', missing: ['.claude/commands/sdd-plan.md', '.claude/rules/plans.md'] },
    { id: 'P-5', runId: 'r-7', stem: '0002-b' },
];

describe('start lines above the area (AC-001, AC-008, AC-010, AC-013)', () => {
    it('shows nothing for an empty view', async () => {
        const container = await open();
        await show({});
        expect(container.querySelector('[data-start-line]')).toBeNull();
    });

    it('shows the checking line as a status', async () => {
        const container = await open();
        await show({ checking: { number: '0001' } });
        const line = container.querySelector('[data-start-checking]');
        expect(line?.textContent).toBe(checkingText('0001'));
        expect(line?.getAttribute('role')).toBe('status');
    });

    it('AC-001: a refusal shows one line per item with its ID visible and a Dismiss button', async () => {
        const container = await open();
        await show({ refusal: { number: '0001', items: ITEMS } });
        const lines = [...container.querySelectorAll('[data-start-refusal] li')].map((line) => line.textContent);
        expect(lines).toEqual([...refusalLines(ITEMS[0]!), ...refusalLines(ITEMS[1]!), ...refusalLines(ITEMS[2]!)]);
        expect(lines).toHaveLength(4);
        expect(lines[0]).toContain('P-1');
        expect(lines[0]).toContain('R-4');
        expect(lines[1]).toContain('.claude/commands/sdd-plan.md');
        expect(lines[2]).toContain('.claude/rules/plans.md');
        expect(lines[3]).toContain('r-7');
        expect(lines[3]).toContain('0002-b');
        expect(container.querySelector('[data-start-refusal]')?.getAttribute('role')).toBe('alert');
        const dismiss = [...container.querySelectorAll('[data-start-refusal] button')].find((button) => button.textContent === 'Dismiss');
        expect(dismiss).toBeDefined();
        await click(dismiss!);
        expect(posted.at(-1)).toMatchObject({ type: 'agentStartDismiss', payload: { which: 'refusal' } });
    });

    it('AC-013: the store reason reaches the line', async () => {
        const container = await open();
        await show({ refusal: { items: [{ id: 'P-6', state: 'read-only', reason: 'Another window writes.' }] } });
        expect(container.querySelector('[data-start-refusal]')?.textContent).toContain('Another window writes.');
        expect(container.querySelector('[data-start-refusal]')?.textContent).toContain('P-6');
    });

    it('AC-008: 0011\'s own refusal text is shown', async () => {
        const container = await open();
        await show({ refusal: { items: [{ id: 'orchestrator', text: 'Run r-7 of spec 0002-b is still open.', run: { runId: 'r-7', stem: '0002-b' } }] } });
        expect(container.querySelector('[data-start-refusal]')?.textContent).toContain('Run r-7 of spec 0002-b is still open.');
    });

    it('AC-010: the notice names run ID and error class; Open run sends the navigation request and Dismiss the dismissal', async () => {
        const container = await open();
        await show({ notice: { runId: 'run-9', errorClass: 'runtime_missing' } });
        const notice = container.querySelector('[data-start-notice]');
        expect(notice?.textContent).toContain(noticeText('run-9', 'runtime_missing'));
        expect(notice?.getAttribute('role')).toBe('alert');
        const buttons = [...notice!.querySelectorAll('button')];
        expect(buttons.map((button) => button.textContent)).toEqual([OPEN_RUN_LABEL, 'Dismiss']);
        await click(buttons[0]!);
        expect(posted.at(-1)).toMatchObject({ type: 'navigate', payload: { area: 'agentCenter', target: { kind: 'run', id: 'run-9' } } });
        await click(buttons[1]!);
        expect(posted.at(-1)).toMatchObject({ type: 'agentStartDismiss', payload: { which: 'notice' } });
    });

    it('M-2: refusal and notice are announced as alerts and operable by keyboard alone', async () => {
        const container = await open();
        await show({ refusal: { number: '0001', items: ITEMS }, notice: { runId: 'run-9', errorClass: 'runtime_missing' } });
        for (const selector of ['[data-start-refusal]', '[data-start-notice]']) {
            const line = container.querySelector(selector);
            expect(line?.getAttribute('role'), selector).toBe('alert');
            expect(line?.textContent?.trim().length, selector).toBeGreaterThan(0);
            const controls = [...line!.querySelectorAll('button, a, [tabindex]')];
            expect(controls.length, selector).toBeGreaterThan(0);
            for (const control of controls) {
                expect(control.tagName, `${selector} ${control.textContent}`).toBe('BUTTON');
                expect(isKeyboardReachable(control), `${selector} ${control.textContent}`).toBe(true);
            }
        }
        const notice = container.querySelector('[data-start-notice]')!;
        const [openRun, dismissNotice] = [...notice.querySelectorAll('button')];
        posted = [];
        await pressKey(openRun!, 'Enter');
        expect(posted.at(-1)).toMatchObject({ type: 'navigate', payload: { area: 'agentCenter', target: { kind: 'run', id: 'run-9' } } });
        await pressKey(dismissNotice!, ' ');
        expect(posted.at(-1)).toMatchObject({ type: 'agentStartDismiss', payload: { which: 'notice' } });
        await pressKey(container.querySelector('[data-start-refusal] button')!, 'Enter');
        expect(posted.at(-1)).toMatchObject({ type: 'agentStartDismiss', payload: { which: 'refusal' } });
    });

    it('an invalid view is ignored and the last valid view stays', async () => {
        const container = await open();
        await show({ checking: { number: '0001' } });
        await send(agentStartEvent({ view: { checking: { number: 1 } } }));
        expect(container.querySelector('[data-start-checking]')).not.toBeNull();
    });

    it('a later empty view removes the lines', async () => {
        const container = await open();
        await show({ refusal: { items: [{ id: 'P-7' }] } });
        expect(container.querySelector('[data-start-refusal]')).not.toBeNull();
        await show({});
        expect(container.querySelector('[data-start-refusal]')).toBeNull();
    });
});

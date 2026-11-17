import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AgentStartView, StartConfirmation } from '../../shared/protocol/agentStart';
import type { Envelope } from '../../shared/protocol/envelope';
import { App } from '../App';
import { createClient, type ShellClient } from '../client';
import { baseView, click, mount, send, shellEvent, type Mounted } from '../testing/dom';
import { MODEL_FALLBACK, capabilityLine, dialogTitle, previousRunText } from './texts';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

const PROMPT = 'Read `AGENTS.md` first.\n1. Step one.\n2. Step two.';

function confirmation(overrides: Partial<StartConfirmation> = {}): StartConfirmation {
    return {
        token: 'c-1',
        spec: { number: '0001', title: 'Ready feature', stem: '0001-ready-feature' },
        provider: { id: 'fake', displayName: 'Fake provider' },
        model: 'fake-model',
        permissionMode: 'Asks before every tool action',
        missing: [],
        previousRun: { kind: 'none' },
        prompt: PROMPT,
        starting: false,
        ...overrides,
    };
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
    await send({ v: 1, kind: 'evt', type: 'agentStart', payload: { view } });
}

async function key(target: Element, name: string, shift = false): Promise<void> {
    await act(async () => {
        target.dispatchEvent(new KeyboardEvent('keydown', { key: name, shiftKey: shift, bubbles: true, cancelable: true }));
    });
}

function dialog(container: HTMLElement): HTMLElement | null {
    return container.querySelector('[role="dialog"]');
}

function button(root: ParentNode, label: string): HTMLButtonElement {
    const found = [...root.querySelectorAll('button')].find((candidate) => candidate.textContent === label);
    if (found === undefined) {
        throw new Error(`no button ${label}`);
    }
    return found;
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

describe('confirmation dialog (AC-002, AC-003, AC-006)', () => {
    it('is not there without a confirmation', async () => {
        const container = await open();
        await show({});
        expect(dialog(container)).toBeNull();
    });

    it('AC-002: is a modal dialog labelled by its title, with every item of the confirmation', async () => {
        const container = await open();
        await show({ confirmation: confirmation({ previousRun: { kind: 'run', runId: 'r-3', status: 'Failed', errorClass: 'auth', errorText: 'Rejected.' } }) });
        const root = dialog(container)!;
        expect(root.getAttribute('aria-modal')).toBe('true');
        const title = container.querySelector(`#${root.getAttribute('aria-labelledby')}`);
        expect(title?.textContent).toBe(dialogTitle('0001'));
        const text = root.textContent ?? '';
        for (const part of ['0001', 'Ready feature', '0001-ready-feature', 'Fake provider', 'fake-model', 'Asks before every tool action', 'r-3', 'Failed', 'auth']) {
            expect(text).toContain(part);
        }
        expect(previousRunText({ kind: 'none' })).toBe('No run');
    });

    it('AC-002: shows the model fallback, the disclosure and one line per missing capability', async () => {
        const container = await open();
        await show({ confirmation: confirmation({ model: undefined, disclosure: 'Sends the prompt to a service.', missing: ['approvals', 'userInput'] }) });
        const text = dialog(container)!.textContent ?? '';
        expect(text).toContain(MODEL_FALLBACK);
        expect(text).toContain('Sends the prompt to a service.');
        expect(text).toContain(capabilityLine('approvals'));
        expect(text).toContain(capabilityLine('userInput'));
        expect(capabilityLine('approvals')).not.toBe(capabilityLine('userInput'));
    });

    it('AC-002: omits disclosure and capability lines when there are none (negative control)', async () => {
        const container = await open();
        await show({ confirmation: confirmation() });
        const text = dialog(container)!.textContent ?? '';
        expect(text).not.toContain(capabilityLine('approvals'));
        expect(text).not.toContain(capabilityLine('userInput'));
        expect(container.querySelector('[data-start-disclosure]')).toBeNull();
    });

    it('AC-002, AC-006: the prompt is collapsed until expanded, then equals the text of the view and is not editable', async () => {
        const container = await open();
        await show({ confirmation: confirmation() });
        const root = dialog(container)!;
        const toggle = button(root, 'Show start prompt');
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        const prompt = root.querySelector(`#${toggle.getAttribute('aria-controls')}`) as HTMLElement;
        expect(prompt.tagName).toBe('PRE');
        expect(prompt.hidden).toBe(true);
        await click(toggle);
        expect(toggle.textContent).toBe('Hide start prompt');
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(prompt.hidden).toBe(false);
        expect(prompt.textContent).toBe(PROMPT);
        expect(root.querySelector('input, textarea, [contenteditable]')).toBeNull();
        await click(toggle);
        expect(prompt.hidden).toBe(true);
    });

    it('moves focus to Cancel on open and back to the opener when the dialog closes', async () => {
        const container = await open();
        const opener = document.createElement('button');
        opener.textContent = 'Opener';
        document.body.appendChild(opener);
        opener.focus();
        await show({ confirmation: confirmation() });
        expect(document.activeElement).toBe(button(dialog(container)!, 'Cancel'));
        await show({});
        expect(dialog(container)).toBeNull();
        expect(document.activeElement).toBe(opener);
        opener.remove();
    });

    it('Tab wraps from the last control to the first and Shift+Tab from the first to the last', async () => {
        const container = await open();
        await show({ confirmation: confirmation() });
        const root = dialog(container)!;
        const controls = [...root.querySelectorAll('button')];
        expect(controls.map((control) => control.textContent)).toEqual(['Show start prompt', 'Start', 'Cancel']);
        controls.at(-1)!.focus();
        await key(controls.at(-1)!, 'Tab');
        expect(document.activeElement).toBe(controls[0]);
        await key(controls[0]!, 'Tab', true);
        expect(document.activeElement).toBe(controls.at(-1));
    });

    it('AC-003: Escape and Cancel send Cancel with the token', async () => {
        const container = await open();
        await show({ confirmation: confirmation() });
        await key(button(dialog(container)!, 'Cancel'), 'Escape');
        expect(posted.at(-1)).toMatchObject({ type: 'agentStartCancel', payload: { token: 'c-1' } });
        posted = [];
        await click(button(dialog(container)!, 'Cancel'));
        expect(posted.at(-1)).toMatchObject({ type: 'agentStartCancel', payload: { token: 'c-1' } });
    });

    it('Start sends the confirmation with the token', async () => {
        const container = await open();
        await show({ confirmation: confirmation() });
        await click(button(dialog(container)!, 'Start'));
        expect(posted.at(-1)).toMatchObject({ type: 'agentStartConfirm', payload: { token: 'c-1' } });
    });

    it('Start is disabled while the start runs and Escape then sends nothing', async () => {
        const container = await open();
        await show({ confirmation: confirmation({ starting: true }) });
        const start = button(dialog(container)!, 'Start');
        expect(start.disabled).toBe(true);
        posted = [];
        await key(start, 'Escape');
        await click(start);
        expect(posted.filter((message) => message.type.startsWith('agentStart'))).toEqual([]);
    });

    it('a new confirmation after a closed one opens a fresh collapsed dialog', async () => {
        const container = await open();
        await show({ confirmation: confirmation() });
        await click(button(dialog(container)!, 'Show start prompt'));
        await show({});
        await show({ confirmation: confirmation({ token: 'c-2' }) });
        expect(button(dialog(container)!, 'Show start prompt').getAttribute('aria-expanded')).toBe('false');
    });
});

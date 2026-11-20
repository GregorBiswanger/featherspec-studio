import { describe, expect, it } from 'vitest';
import type { AssistantId, AssistantTarget, SendRequest } from '../../shared/protocol/assistant';
import type { ClipboardPort } from '../ports/board';
import { createSetupClock } from '../setup/testing/setupClock';
import { createSend, SEND_TIMEOUT_MS } from './send';
import { createFakeAssistantHost, type FakeAssistantHost } from './testing/fakeAssistantHost';

const EXTENSION_A = 'GitHub.copilot-chat';
const EXTENSION_B = 'anthropic.claude-code';
const LINE = 'Implement T-003 of .specs/active/0001-tip-splitter.plan.md';
const NEW_CHAT = 'workbench.action.chat.newChat';
const OPEN = 'workbench.action.chat.open';
const CLAUDE_OPEN = 'claude-vscode.editor.open';
const ALL_COMMANDS = [NEW_CHAT, OPEN, CLAUDE_OPEN];

interface World {
    host: FakeAssistantHost;
    written: string[];
    warned: string[];
    blocks: string[][];
    clock: ReturnType<typeof createSetupClock>;
    chosen: { assistant: AssistantId | undefined };
    clipboardFails: { value: boolean };
    send(request: SendRequest): ReturnType<ReturnType<typeof createSend>['send']>;
}

function world(platform = 'win32', options: { commands?: readonly string[]; installed?: boolean; chosen?: AssistantId | undefined } = {}): World {
    const host = createFakeAssistantHost(options.commands ?? ALL_COMMANDS);
    if (options.installed !== false) {
        host.install(EXTENSION_A);
        host.install(EXTENSION_B);
    }
    const written: string[] = [];
    const warned: string[] = [];
    const blocks: string[][] = [];
    const clock = createSetupClock();
    const chosen = { assistant: 'chosen' in options ? options.chosen : undefined } as { assistant: AssistantId | undefined };
    const clipboardFails = { value: false };
    const clipboard: ClipboardPort = {
        async writeText(text) {
            if (clipboardFails.value) {
                throw new Error('no clipboard');
            }
            written.push(text);
        },
    };
    const sender = createSend({
        host,
        clipboard,
        ui: { warn: (text) => void warned.push(text) },
        output: { appendBlock: (lines) => void blocks.push([...lines]) },
        clock,
        platform,
        chosen: { read: () => chosen.assistant },
    });
    return { host, written, warned, blocks, clock, chosen, clipboardFails, send: (request) => sender.send(request) };
}

function request(assistant: AssistantId, target: AssistantTarget, line = LINE): SendRequest {
    return { assistant, target, line };
}

function offered(assistant: AssistantId, platform = 'win32', options: { commands?: readonly string[]; installed?: boolean } = {}): World {
    return world(platform, { ...options, chosen: assistant });
}

const NAME: Record<AssistantId, string> = { 'copilot': 'Copilot', claudeCode: 'Claude Code' };

describe('0024 AC-005: Send makes exactly the calls of §6.4, in order, and leaves the clipboard alone', () => {
    it('Copilot, new chat: newChat without an argument, then open with the line and isPartialQuery true', async () => {
        const w = offered('copilot');
        const result = await w.send(request('copilot', 'new'));
        expect(w.host.calls).toEqual([
            { command: 'workbench.action.chat.newChat', args: [] },
            { command: 'workbench.action.chat.open', args: [{ query: LINE, isPartialQuery: true }] },
        ]);
        expect(result).toEqual({ outcome: 'opened', text: "The prompt is in Copilot's chat. Check it, then send it there." });
        expect(w.written).toEqual([]);
        expect(w.warned).toEqual([]);
        expect(w.blocks).toEqual([]);
    });

    it('Copilot, current chat: the one open call with the line and isPartialQuery true', async () => {
        const w = offered('copilot');
        const result = await w.send(request('copilot', 'current'));
        expect(w.host.calls).toEqual([{ command: 'workbench.action.chat.open', args: [{ query: LINE, isPartialQuery: true }] }]);
        expect(result.outcome).toBe('opened');
        expect(w.written).toEqual([]);
    });

    it('0026 AC-001 Given: Copilot, Active 0001-tip-splitter with T-003 open, the main part records newChat, then open', async () => {
        const w = offered('copilot');
        await w.send(request('copilot', 'new', 'Implement T-003 of .specs/active/0001-tip-splitter.plan.md'));
        expect(w.host.calls).toEqual([
            { command: 'workbench.action.chat.newChat', args: [] },
            { command: 'workbench.action.chat.open', args: [{ query: 'Implement T-003 of .specs/active/0001-tip-splitter.plan.md', isPartialQuery: true }] },
        ]);
        expect(w.host.calls.some((call) => /submit|accept/i.test(call.command))).toBe(false);
    });

    it('Claude Code, new chat: claude-vscode.editor.open with undefined and the line', async () => {
        const w = offered('claudeCode');
        const result = await w.send(request('claudeCode', 'new'));
        expect(w.host.calls).toEqual([{ command: 'claude-vscode.editor.open', args: [undefined, LINE] }]);
        expect(w.host.calls[0]?.args).toHaveLength(2);
        expect(result).toEqual({ outcome: 'opened', text: "The prompt is in Claude Code's chat. Check it, then send it there." });
        expect(w.written).toEqual([]);
    });

    it('AC-005 Given: Copilot, Active 0001-tip-splitter with T-003 open, the main part records exactly one executed command', async () => {
        const w = offered('copilot');
        await w.send(request('copilot', 'current', 'Implement T-003 of .specs/active/0001-tip-splitter.plan.md'));
        expect(w.host.calls).toEqual([{ command: 'workbench.action.chat.open', args: [{ query: 'Implement T-003 of .specs/active/0001-tip-splitter.plan.md', isPartialQuery: true }] }]);
    });

    it('the line is passed as it is: spaces, quotes and new lines stay', async () => {
        const w = offered('copilot');
        const line = '/sdd-clarify  ".specs/a b.md"\n  next';
        await w.send(request('copilot', 'current', line));
        expect(w.host.calls[0]?.args).toEqual([{ query: line, isPartialQuery: true }]);
    });

    it('the extension is active already, so it is not activated; an inactive one is activated before any command', async () => {
        const active = offered('copilot');
        await active.send(request('copilot', 'current'));
        expect(active.host.activated).toEqual([]);
        const idle = offered('copilot');
        idle.host.install(EXTENSION_A, { active: false });
        await idle.send(request('copilot', 'current'));
        expect(idle.host.activated).toEqual([EXTENSION_A]);
        expect(idle.host.calls).toHaveLength(1);
    });

    it('the timer is cancelled when the Send settles', async () => {
        const w = offered('claudeCode');
        await w.send(request('claudeCode', 'new'));
        expect(w.clock.pendingTimers()).toBe(0);
    });
});

describe('0024 AC-006: a failed Send copies the line, warns once and writes one Output line with the cause', () => {
    const OTHER_THAN: Record<AssistantId, string> = { 'copilot': EXTENSION_A, claudeCode: EXTENSION_B };

    interface Cause {
        name: string;
        assistant: AssistantId;
        target: AssistantTarget;
        prepare(w: World): void;
        cause: string;
        calls: string[];
    }

    const causes: Cause[] = [];
    for (const assistant of ['copilot', 'claudeCode'] as const) {
        const target: AssistantTarget = 'new';
        const first = assistant === 'copilot' ? NEW_CHAT : CLAUDE_OPEN;
        causes.push({ name: `${assistant}: the extension is missing`, assistant, target, prepare: (w) => w.host.uninstall(OTHER_THAN[assistant]), cause: `extension ${OTHER_THAN[assistant]} not found`, calls: [] });
        causes.push({
            name: `${assistant}: activating it rejects`,
            assistant,
            target,
            prepare: (w) => w.host.install(OTHER_THAN[assistant], { active: false, activateRejects: 'boom' }),
            cause: `activating ${OTHER_THAN[assistant]} failed: boom`,
            calls: [],
        });
        causes.push({
            name: `${assistant}: a command of the row is missing from getCommands`,
            assistant,
            target,
            prepare: (w) => {
                w.host.available = w.host.available.filter((command) => command !== (assistant === 'copilot' ? OPEN : CLAUDE_OPEN));
            },
            cause: `command ${assistant === 'copilot' ? OPEN : CLAUDE_OPEN} not found`,
            calls: [],
        });
        causes.push({
            name: `${assistant}: the first call rejects`,
            assistant,
            target,
            prepare: (w) => w.host.rejects.set(first, 'denied'),
            cause: `${first} failed: denied`,
            calls: [first],
        });
    }
    causes.push({ name: 'Copilot: newChat resolves and open rejects after it', assistant: 'copilot', target: 'new', prepare: (w) => w.host.rejects.set(OPEN, 'no input'), cause: `${OPEN} failed: no input`, calls: [NEW_CHAT, OPEN] });
    causes.push({ name: 'Copilot: current chat, open rejects', assistant: 'copilot', target: 'current', prepare: (w) => w.host.rejects.set(OPEN, 'no input'), cause: `${OPEN} failed: no input`, calls: [OPEN] });
    causes.push({ name: 'Copilot: current chat, only newChat is missing: the row needs no newChat, so it sends', assistant: 'copilot', target: 'current', prepare: (w) => (w.host.available = [OPEN]), cause: '', calls: [OPEN] });

    for (const entry of causes) {
        if (entry.cause === '') {
            it(entry.name, async () => {
                const w = offered(entry.assistant);
                entry.prepare(w);
                expect((await w.send(request(entry.assistant, entry.target))).outcome).toBe('opened');
                expect(w.warned).toEqual([]);
            });
            continue;
        }
        it(`${entry.name}: no call after the failure point, the clipboard holds exactly the line, one warning, one Output line`, async () => {
            const w = offered(entry.assistant);
            entry.prepare(w);
            const result = await w.send(request(entry.assistant, entry.target));
            expect(w.host.calls.map((call) => call.command)).toEqual(entry.calls);
            expect(w.written).toEqual([LINE]);
            expect(result).toEqual({ outcome: 'copied', text: 'Copied to the clipboard.' });
            expect(w.warned).toEqual([`Could not open ${NAME[entry.assistant]}'s chat. The prompt is copied: paste it there with Ctrl+V.`]);
            expect(w.blocks).toEqual([[`Send to ${NAME[entry.assistant]} failed (${entry.cause}); the prompt was copied instead.`]]);
            expect(w.blocks.flat().join('\n')).not.toContain(LINE);
            expect(w.warned.join('\n')).not.toContain(LINE);
            expect(w.clock.pendingTimers()).toBe(0);
        });
    }

    it('a rejection without an Error object gives its string as the message', async () => {
        const w = offered('claudeCode');
        w.host.execute = async (command, args) => {
            w.host.calls.push({ command, args });
            return Promise.reject('plain text');
        };
        await w.send(request('claudeCode', 'new'));
        expect(w.blocks).toEqual([['Send to Claude Code failed (claude-vscode.editor.open failed: plain text); the prompt was copied instead.']]);
    });

    it('macOS names Cmd+V, every other platform Ctrl+V', async () => {
        const mac = offered('copilot', 'darwin');
        mac.host.uninstall(EXTENSION_A);
        await mac.send(request('copilot', 'new'));
        expect(mac.warned).toEqual(["Could not open Copilot's chat. The prompt is copied: paste it there with Cmd+V."]);
        for (const platform of ['win32', 'linux']) {
            const other = offered('claudeCode', platform);
            other.host.uninstall(EXTENSION_B);
            await other.send(request('claudeCode', 'new'));
            expect(other.warned).toEqual(["Could not open Claude Code's chat. The prompt is copied: paste it there with Ctrl+V."]);
        }
    });

    it('a hanging activation or call fails after 5000 ms, not before, and a later result changes nothing', async () => {
        expect(SEND_TIMEOUT_MS).toBe(5000);
        const hanging = offered('claudeCode');
        hanging.host.never.add(CLAUDE_OPEN);
        let outcome: unknown;
        void hanging.send(request('claudeCode', 'new')).then((result) => (outcome = result));
        await Promise.resolve();
        hanging.clock.advance(4999);
        await new Promise((resolve) => setImmediate(resolve));
        expect(outcome).toBeUndefined();
        expect(hanging.warned).toEqual([]);
        hanging.clock.advance(1);
        await new Promise((resolve) => setImmediate(resolve));
        expect(outcome).toEqual({ outcome: 'copied', text: 'Copied to the clipboard.' });
        expect(hanging.written).toEqual([LINE]);
        expect(hanging.warned).toEqual(["Could not open Claude Code's chat. The prompt is copied: paste it there with Ctrl+V."]);
        expect(hanging.blocks).toEqual([['Send to Claude Code failed (no result within 5000 ms); the prompt was copied instead.']]);

        const idle = offered('copilot');
        idle.host.install(EXTENSION_A, { active: false, activateNever: true });
        let second: unknown;
        void idle.send(request('copilot', 'new')).then((result) => (second = result));
        await new Promise((resolve) => setImmediate(resolve));
        idle.clock.advance(5000);
        await new Promise((resolve) => setImmediate(resolve));
        expect(second).toEqual({ outcome: 'copied', text: 'Copied to the clipboard.' });
        expect(idle.host.calls).toEqual([]);
    });

    it('after the 5000 ms a call that resolves late makes no further call and writes nothing more', async () => {
        const w = offered('copilot');
        let release: (() => void) | undefined;
        w.host.execute = (command, args) => {
            w.host.calls.push({ command, args });
            return new Promise<void>((resolve) => {
                release = resolve;
            });
        };
        let outcome: unknown;
        void w.send(request('copilot', 'new')).then((result) => (outcome = result));
        await new Promise((resolve) => setImmediate(resolve));
        w.clock.advance(5000);
        await new Promise((resolve) => setImmediate(resolve));
        expect(outcome).toEqual({ outcome: 'copied', text: 'Copied to the clipboard.' });
        release?.();
        await new Promise((resolve) => setImmediate(resolve));
        expect(w.host.calls.map((call) => call.command)).toEqual([NEW_CHAT]);
        expect(w.written).toEqual([LINE]);
        expect(w.warned).toHaveLength(1);
        expect(w.blocks).toHaveLength(1);
    });

    it('a failing clipboard gives the second warning and the second Output text and the outcome copyFailed', async () => {
        const w = offered('copilot');
        w.host.uninstall(EXTENSION_A);
        w.clipboardFails.value = true;
        const result = await w.send(request('copilot', 'new'));
        expect(result).toEqual({ outcome: 'copyFailed', text: 'Could not copy to the clipboard.' });
        expect(w.warned).toEqual(["Could not open Copilot's chat, and the prompt could not be copied."]);
        expect(w.blocks).toEqual([["Send to Copilot failed (extension GitHub.copilot-chat not found); the prompt could not be copied either."]]);
        expect(w.written).toEqual([]);
    });

    it('an offer that names the other assistant, or none, copies as Copy prompt does: no call, no warning, no Output line', async () => {
        for (const chosen of [undefined, 'claudeCode', 'copilot'] as const) {
            const w = world('win32', { chosen });
            const asked: AssistantId = chosen === 'copilot' ? 'claudeCode' : 'copilot';
            const result = await w.send(request(asked, 'new'));
            expect(result, String(chosen)).toEqual({ outcome: 'copied', text: 'Copied to the clipboard.' });
            expect(w.written).toEqual([LINE]);
            expect(w.host.calls).toEqual([]);
            expect(w.host.activated).toEqual([]);
            expect(w.warned).toEqual([]);
            expect(w.blocks).toEqual([]);
        }
    });

    it('an offer that names another assistant with a failing clipboard gives copyFailed and still no warning', async () => {
        const w = world('win32', { chosen: undefined });
        w.clipboardFails.value = true;
        expect(await w.send(request('copilot', 'new'))).toEqual({ outcome: 'copyFailed', text: 'Could not copy to the clipboard.' });
        expect(w.warned).toEqual([]);
        expect(w.blocks).toEqual([]);
    });

    it('two activations make two Sends, also while the first is pending', async () => {
        const w = offered('copilot');
        w.host.never.add(NEW_CHAT);
        void w.send(request('copilot', 'new'));
        await new Promise((resolve) => setImmediate(resolve));
        w.host.never.delete(NEW_CHAT);
        const pending = w.send(request('copilot', 'new'));
        await new Promise((resolve) => setImmediate(resolve));
        expect(w.host.calls.map((call) => call.command)).toEqual([NEW_CHAT]);
        w.clock.advance(SEND_TIMEOUT_MS);
        const second = await pending;
        expect(second.outcome).toBe('opened');
        expect(w.host.calls.map((call) => call.command)).toEqual([NEW_CHAT, NEW_CHAT, OPEN]);
    });
});

describe('0024 AC-005: whole Send sequences never interleave (PR #1 comment 1)', () => {
    const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
    const OTHER_LINE = 'Implement T-004 of .specs/active/0001-tip-splitter.plan.md';

    it('two Copilot Sends of new chat started together make newChat, open, newChat, open, each open with its own line', async () => {
        const w = offered('copilot');
        const first = w.send(request('copilot', 'new'));
        const second = w.send(request('copilot', 'new', OTHER_LINE));
        expect((await first).outcome).toBe('opened');
        expect((await second).outcome).toBe('opened');
        expect(w.host.calls).toEqual([
            { command: NEW_CHAT, args: [] },
            { command: OPEN, args: [{ query: LINE, isPartialQuery: true }] },
            { command: NEW_CHAT, args: [] },
            { command: OPEN, args: [{ query: OTHER_LINE, isPartialQuery: true }] },
        ]);
        expect(w.written).toEqual([]);
        expect(w.warned).toEqual([]);
    });

    it('a current-chat Send started while a new-chat Send runs waits for its open', async () => {
        const w = offered('copilot');
        const first = w.send(request('copilot', 'new'));
        const second = w.send(request('copilot', 'current', OTHER_LINE));
        await Promise.all([first, second]);
        expect(w.host.calls.map((call) => call.command)).toEqual([NEW_CHAT, OPEN, OPEN]);
        expect((w.host.calls[1]?.args[0] as { query: string }).query).toBe(LINE);
        expect((w.host.calls[2]?.args[0] as { query: string }).query).toBe(OTHER_LINE);
    });

    it('two Claude Code Sends: the second call is made only after the first Send has settled', async () => {
        const w = offered('claudeCode');
        let release: (() => void) | undefined;
        let first = true;
        w.host.execute = (command, args) => {
            w.host.calls.push({ command, args });
            if (first) {
                first = false;
                return new Promise<void>((resolve) => {
                    release = resolve;
                });
            }
            return Promise.resolve();
        };
        const one = w.send(request('claudeCode', 'new'));
        const two = w.send(request('claudeCode', 'new', OTHER_LINE));
        await settle();
        expect(w.host.calls).toHaveLength(1);
        release?.();
        expect((await one).outcome).toBe('opened');
        expect((await two).outcome).toBe('opened');
        expect(w.host.calls.map((call) => call.args[1])).toEqual([LINE, OTHER_LINE]);
    });

    it('a Send waiting in the queue does not count its own 5000 ms before it starts: it gets a full 5000 ms after the Send before it settled', async () => {
        const w = offered('copilot');
        w.host.execute = (command, args) => {
            w.host.calls.push({ command, args });
            return new Promise<void>(() => undefined);
        };
        const outcomes: string[] = [];
        void w.send(request('copilot', 'new')).then((result) => outcomes.push(`first ${result.outcome}`));
        void w.send(request('copilot', 'new', OTHER_LINE)).then((result) => outcomes.push(`second ${result.outcome}`));
        await settle();
        w.clock.advance(SEND_TIMEOUT_MS);
        await settle();
        expect(outcomes).toEqual(['first copied']);
        expect(w.written).toEqual([LINE]);
        w.clock.advance(SEND_TIMEOUT_MS - 1);
        await settle();
        expect(outcomes).toEqual(['first copied']);
        w.clock.advance(1);
        await settle();
        expect(outcomes).toEqual(['first copied', 'second copied']);
        expect(w.written).toEqual([LINE, OTHER_LINE]);
        expect(w.warned).toHaveLength(2);
        expect(w.clock.pendingTimers()).toBe(0);
    });

    it('a queued Send starts after the fallback of the Send before it and then opens normally', async () => {
        const w = offered('copilot');
        let first = true;
        w.host.execute = (command, args) => {
            w.host.calls.push({ command, args });
            if (first) {
                first = false;
                return new Promise<void>(() => undefined);
            }
            return Promise.resolve();
        };
        const one = w.send(request('copilot', 'new'));
        const two = w.send(request('copilot', 'new', OTHER_LINE));
        await settle();
        expect(w.host.calls).toHaveLength(1);
        w.clock.advance(SEND_TIMEOUT_MS);
        expect((await one).outcome).toBe('copied');
        expect((await two).outcome).toBe('opened');
        expect(w.host.calls.map((call) => call.command)).toEqual([NEW_CHAT, NEW_CHAT, OPEN]);
        expect(w.written).toEqual([LINE]);
        expect(w.clock.pendingTimers()).toBe(0);
    });

    it('a failing Send does not block the queue: the Send behind it runs and opens', async () => {
        const w = offered('copilot');
        w.host.rejects.set(OPEN, 'no input');
        const one = w.send(request('copilot', 'current'));
        const two = w.send(request('copilot', 'current', OTHER_LINE));
        expect((await one).outcome).toBe('copied');
        w.host.rejects.delete(OPEN);
        expect((await two).outcome).toBe('opened');
    });

    it('negative control: a Send alone starts at once, and a Send that only copies is not queued behind a pending Send', async () => {
        const w = offered('copilot');
        w.host.never.add(NEW_CHAT);
        void w.send(request('copilot', 'new'));
        await settle();
        const other = await w.send(request('claudeCode', 'new', OTHER_LINE));
        expect(other).toEqual({ outcome: 'copied', text: 'Copied to the clipboard.' });
        expect(w.written).toEqual([OTHER_LINE]);
    });
});

describe('0024 AC-006: nothing runs once the 5000 ms fallback has settled, and unexpected errors map to a §7 cause', () => {
    const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

    it('an activation that resolves after the 5000 ms: no command list is used and no call is made', async () => {
        const w = offered('copilot');
        w.host.install(EXTENSION_A, { active: false });
        let release: (() => void) | undefined;
        let listed = 0;
        w.host.activate = () =>
            new Promise<void>((resolve) => {
                release = resolve;
            });
        w.host.commands = async () => {
            listed += 1;
            return [...ALL_COMMANDS];
        };
        let outcome: unknown;
        void w.send(request('copilot', 'new')).then((result) => (outcome = result));
        await settle();
        w.clock.advance(SEND_TIMEOUT_MS);
        await settle();
        expect(outcome).toEqual({ outcome: 'copied', text: 'Copied to the clipboard.' });
        release?.();
        await settle();
        expect(listed).toBe(0);
        expect(w.host.calls).toEqual([]);
        expect(w.written).toEqual([LINE]);
        expect(w.warned).toHaveLength(1);
        expect(w.blocks).toHaveLength(1);
    });

    it('negative control: the same activation resolving before the 5000 ms lists the commands and makes the calls', async () => {
        const w = offered('copilot');
        w.host.install(EXTENSION_A, { active: false });
        let release: (() => void) | undefined;
        w.host.activate = () =>
            new Promise<void>((resolve) => {
                release = resolve;
            });
        let outcome: unknown;
        void w.send(request('copilot', 'new')).then((result) => (outcome = result));
        await settle();
        w.clock.advance(SEND_TIMEOUT_MS - 1);
        release?.();
        await settle();
        expect((outcome as { outcome: string }).outcome).toBe('opened');
        expect(w.host.calls.map((call) => call.command)).toEqual([NEW_CHAT, OPEN]);
    });

    it('a command list that resolves after the 5000 ms: no call is made', async () => {
        const w = offered('claudeCode');
        let release: ((commands: readonly string[]) => void) | undefined;
        w.host.commands = () =>
            new Promise<readonly string[]>((resolve) => {
                release = resolve;
            });
        let outcome: unknown;
        void w.send(request('claudeCode', 'new')).then((result) => (outcome = result));
        await settle();
        w.clock.advance(SEND_TIMEOUT_MS);
        await settle();
        expect(outcome).toEqual({ outcome: 'copied', text: 'Copied to the clipboard.' });
        release?.([...ALL_COMMANDS]);
        await settle();
        expect(w.host.calls).toEqual([]);
        expect(w.written).toEqual([LINE]);
        expect(w.warned).toHaveLength(1);
        expect(w.blocks).toHaveLength(1);
    });

    it('negative control: the same command list resolving before the 5000 ms makes the call', async () => {
        const w = offered('claudeCode');
        let release: ((commands: readonly string[]) => void) | undefined;
        w.host.commands = () =>
            new Promise<readonly string[]>((resolve) => {
                release = resolve;
            });
        let outcome: unknown;
        void w.send(request('claudeCode', 'new')).then((result) => (outcome = result));
        await settle();
        w.clock.advance(SEND_TIMEOUT_MS - 1);
        release?.([...ALL_COMMANDS]);
        await settle();
        expect((outcome as { outcome: string }).outcome).toBe('opened');
        expect(w.host.calls.map((call) => call.command)).toEqual([CLAUDE_OPEN]);
    });

    it.each([
        { assistant: 'copilot', target: 'new', name: 'Copilot', first: NEW_CHAT },
        { assistant: 'copilot', target: 'current', name: 'Copilot', first: OPEN },
        { assistant: 'claudeCode', target: 'new', name: 'Claude Code', first: CLAUDE_OPEN },
    ] as const)('a rejecting command list ($assistant, $target): the cause is "command <first command> not found", one warning, one Output block, the line copied', async (entry) => {
        const w = offered(entry.assistant);
        w.host.commands = () => Promise.reject(new Error('list failed'));
        const result = await w.send(request(entry.assistant, entry.target));
        expect(result.outcome).toBe('copied');
        expect(w.host.calls).toEqual([]);
        expect(w.written).toEqual([LINE]);
        expect(w.warned).toHaveLength(1);
        expect(w.blocks).toEqual([[`Send to ${entry.name} failed (command ${entry.first} not found); the prompt was copied instead.`]]);
    });

    it('a command list that throws synchronously gives the same cause', async () => {
        const w = offered('claudeCode');
        w.host.commands = () => {
            throw new Error('list failed');
        };
        const result = await w.send(request('claudeCode', 'new'));
        expect(result.outcome).toBe('copied');
        expect(w.blocks).toEqual([[`Send to Claude Code failed (command ${CLAUDE_OPEN} not found); the prompt was copied instead.`]]);
    });

    it.each([
        { assistant: 'copilot', target: 'new', name: 'Copilot', id: EXTENSION_A },
        { assistant: 'claudeCode', target: 'new', name: 'Claude Code', id: EXTENSION_B },
    ] as const)('a synchronous throw from the host while looking for the extension ($assistant): the cause is "extension <ID> not found", never the raw message', async (entry) => {
        const w = offered(entry.assistant);
        w.host.extension = () => {
            throw new Error('raw host failure');
        };
        const result = await w.send(request(entry.assistant, entry.target));
        expect(result.outcome).toBe('copied');
        expect(w.host.calls).toEqual([]);
        expect(w.warned).toHaveLength(1);
        expect(w.blocks).toEqual([[`Send to ${entry.name} failed (extension ${entry.id} not found); the prompt was copied instead.`]]);
        expect(JSON.stringify(w.blocks)).not.toContain('raw host failure');
    });

    it('negative control: with a working host and a command list nothing is copied and nothing is warned', async () => {
        const w = offered('copilot');
        const result = await w.send(request('copilot', 'current'));
        expect(result.outcome).toBe('opened');
        expect(w.warned).toEqual([]);
        expect(w.blocks).toEqual([]);
    });
});

describe('0024 AC-007: only the three commands run, and every open is partial', () => {
    it('across every assistant, target and failure every executed command is one of the three, and every open carries isPartialQuery true', async () => {
        const executed: { command: string; args: readonly unknown[] }[] = [];
        for (const assistant of ['copilot', 'claudeCode'] as const) {
            for (const target of assistant === 'copilot' ? (['new', 'current'] as const) : (['new'] as const)) {
                for (const failing of [undefined, NEW_CHAT, OPEN, CLAUDE_OPEN]) {
                    const w = offered(assistant);
                    if (failing !== undefined) {
                        w.host.rejects.set(failing, 'x');
                    }
                    await w.send(request(assistant, target));
                    executed.push(...w.host.calls);
                }
            }
        }
        expect(executed.length).toBeGreaterThan(8);
        for (const call of executed) {
            expect(ALL_COMMANDS, call.command).toContain(call.command);
            if (call.command === OPEN) {
                expect(call.args).toHaveLength(1);
                expect((call.args[0] as { isPartialQuery?: unknown }).isPartialQuery).toBe(true);
                expect(Object.keys(call.args[0] as object).sort()).toEqual(['isPartialQuery', 'query']);
            }
            if (call.command === NEW_CHAT) {
                expect(call.args).toEqual([]);
            }
        }
    });

    it('negative control: a call set that missed isPartialQuery would be found', () => {
        const bad = { command: OPEN, args: [{ query: LINE }] };
        expect((bad.args[0] as { isPartialQuery?: unknown }).isPartialQuery).not.toBe(true);
    });
});

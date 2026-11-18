import { describe, expect, it } from 'vitest';
import type { AssistantId, AssistantTarget, SendPromptPayload } from '../../shared/protocol/assistant';
import type { ClipboardPort } from '../ports/board';
import { createSetupClock } from '../setup/testing/setupClock';
import { createSend, SEND_TIMEOUT_MS } from './send';
import { createFakeAssistantHost, type FakeAssistantHost } from './testing/fakeAssistantHost';

const COPILOT = 'GitHub.copilot-chat';
const CLAUDE = 'anthropic.claude-code';
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
    send(request: SendPromptPayload): ReturnType<ReturnType<typeof createSend>['send']>;
}

function world(platform = 'win32', options: { commands?: readonly string[]; installed?: boolean; chosen?: AssistantId | undefined } = {}): World {
    const host = createFakeAssistantHost(options.commands ?? ALL_COMMANDS);
    if (options.installed !== false) {
        host.install(COPILOT);
        host.install(CLAUDE);
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

function request(assistant: AssistantId, target: AssistantTarget, line = LINE): SendPromptPayload {
    return { assistant, target, line };
}

function offered(assistant: AssistantId, platform = 'win32', options: { commands?: readonly string[]; installed?: boolean } = {}): World {
    return world(platform, { ...options, chosen: assistant });
}

const NAME: Record<AssistantId, string> = { copilot: 'Copilot', claudeCode: 'Claude Code' };

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
        idle.host.install(COPILOT, { active: false });
        await idle.send(request('copilot', 'current'));
        expect(idle.host.activated).toEqual([COPILOT]);
        expect(idle.host.calls).toHaveLength(1);
    });

    it('the timer is cancelled when the Send settles', async () => {
        const w = offered('claudeCode');
        await w.send(request('claudeCode', 'new'));
        expect(w.clock.pendingTimers()).toBe(0);
    });
});

describe('0024 AC-006: a failed Send copies the line, warns once and writes one Output line with the cause', () => {
    const OTHER_THAN: Record<AssistantId, string> = { copilot: COPILOT, claudeCode: CLAUDE };

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
    causes.push({ name: 'copilot: newChat resolves and open rejects after it', assistant: 'copilot', target: 'new', prepare: (w) => w.host.rejects.set(OPEN, 'no input'), cause: `${OPEN} failed: no input`, calls: [NEW_CHAT, OPEN] });
    causes.push({ name: 'copilot: current chat, open rejects', assistant: 'copilot', target: 'current', prepare: (w) => w.host.rejects.set(OPEN, 'no input'), cause: `${OPEN} failed: no input`, calls: [OPEN] });
    causes.push({ name: 'copilot: current chat, only newChat is missing: the row needs no newChat, so it sends', assistant: 'copilot', target: 'current', prepare: (w) => (w.host.available = [OPEN]), cause: '', calls: [OPEN] });

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
        mac.host.uninstall(COPILOT);
        await mac.send(request('copilot', 'new'));
        expect(mac.warned).toEqual(["Could not open Copilot's chat. The prompt is copied: paste it there with Cmd+V."]);
        for (const platform of ['win32', 'linux']) {
            const other = offered('claudeCode', platform);
            other.host.uninstall(CLAUDE);
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
        idle.host.install(COPILOT, { active: false, activateNever: true });
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
        w.host.uninstall(COPILOT);
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
        const second = await w.send(request('copilot', 'new'));
        expect(second.outcome).toBe('opened');
        expect(w.host.calls.map((call) => call.command)).toEqual([NEW_CHAT, NEW_CHAT, OPEN]);
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

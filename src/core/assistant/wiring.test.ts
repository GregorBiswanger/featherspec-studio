import { describe, expect, it } from 'vitest';
import type { AssistantId, SendRequest } from '../../shared/protocol/assistant';
import type { SettingPort } from '../ports/host';
import { createFakeSource } from '../board/testing/boardWorld';
import { createMemorySpecSource } from '../specs/testing/memorySpecSource';
import { createSetupClock } from '../setup/testing/setupClock';
import { createFakeAssistantHost } from './testing/fakeAssistantHost';
import { createAssistantWiring } from './wiring';

const EXTENSION_A = 'GitHub.copilot-chat';
const EXTENSION_B = 'anthropic.claude-code';
const LINE = 'Implement T-003 of .specs/active/0001-tip-splitter.plan.md';
const COMMANDS = ['workbench.action.chat.newChat', 'workbench.action.chat.open', 'claude-vscode.editor.open'];

function world(value: unknown, installed: readonly string[]) {
    const host = createFakeAssistantHost(COMMANDS);
    installed.forEach((id) => host.install(id));
    const current = { value };
    const setting: SettingPort = { read: () => current.value, onDidChange: () => ({ dispose: () => undefined }) };
    const written: string[] = [];
    const warned: string[] = [];
    const blocks: string[][] = [];
    const wiring = createAssistantWiring({
        setting,
        host,
        clipboard: { writeText: async (text) => void written.push(text) },
        ui: { warn: (text) => void warned.push(text) },
        output: { appendBlock: (lines) => void blocks.push([...lines]) },
        clock: createSetupClock(),
        platform: 'win32',
        source: createFakeSource(),
        specs: createMemorySpecSource(),
    });
    return { host, current, wiring, written, warned, blocks };
}

function request(assistant: AssistantId): SendRequest {
    return assistant === 'copilot' ? { assistant, target: 'current', line: LINE } : { assistant, target: 'new', line: LINE };
}

describe('0024 AC-006 with the production wiring (setting port and the extension presence of the host)', () => {
    it.each([
        { assistant: 'copilot', name: 'Copilot', id: EXTENSION_A, others: [EXTENSION_B] },
        { assistant: 'claudeCode', name: 'Claude Code', id: EXTENSION_B, others: [] as string[] },
        { assistant: 'claudeCode', name: 'Claude Code', id: EXTENSION_B, others: [EXTENSION_A] },
    ] as const)('the value $assistant while its extension is missing: one warning, one Output line with the cause, the line copied, no call', async (entry) => {
        const w = world(entry.assistant, entry.others);
        expect(w.wiring.offer.read()).toBeUndefined();
        const result = await w.wiring.send.send(request(entry.assistant));
        expect(result.outcome).toBe('copied');
        expect(w.written).toEqual([LINE]);
        expect(w.warned).toHaveLength(1);
        expect(w.blocks).toEqual([[`Send to ${entry.name} failed (extension ${entry.id} not found); the prompt was copied instead.`]]);
        expect(w.host.calls).toEqual([]);
        expect(w.host.activated).toEqual([]);
    });

    it('the extension goes away after the offer was read and before the click: the warning path, not a silent copy', async () => {
        const w = world('copilot', [EXTENSION_A]);
        expect(w.wiring.offer.read()).toEqual({ assistant: 'copilot' });
        w.host.uninstall(EXTENSION_A);
        const result = await w.wiring.send.send(request('copilot'));
        expect(result.outcome).toBe('copied');
        expect(w.warned).toHaveLength(1);
        expect(w.blocks).toHaveLength(1);
    });

    it.each([['none'], ['claudeCode'], ['codex'], [''], [42], [undefined]])('the value %j does not name Copilot: a silent copy with no warning and no Output line', async (value) => {
        const w = world(value, [EXTENSION_A, EXTENSION_B]);
        const result = await w.wiring.send.send(request('copilot'));
        expect(result.outcome).toBe('copied');
        expect(w.written).toEqual([LINE]);
        expect(w.warned).toEqual([]);
        expect(w.blocks).toEqual([]);
        expect(w.host.calls).toEqual([]);
    });

    it('negative control: with the extension present the same wiring sends and copies nothing', async () => {
        const w = world('copilot', [EXTENSION_A]);
        const result = await w.wiring.send.send(request('copilot'));
        expect(result.outcome).toBe('opened');
        expect(w.written).toEqual([]);
        expect(w.warned).toEqual([]);
        expect(w.host.calls.map((call) => call.command)).toEqual(['workbench.action.chat.open']);
    });
});

import { describe, expect, it } from 'vitest';
import type { DeliveredEvent } from '../../../core/ports/agentProvider';
import { SECRET_PATTERNS } from '../../../core/runtime/masking';
import { openRuntimeStore } from '../../../core/runtime/runtimeStore';
import { createFakeCredentials, createFakeNotices, createSequentialIds } from '../../../core/runtime/testing/fakes';
import { createMemoryBacking, createMemoryMedium } from '../../../core/runtime/testing/memoryMedium';
import { sampleOf } from '../../../core/runtime/testing/secretSamples';
import type { JsonValue } from '../../../core/runtime/model';
import type { CopilotEvent } from './client';
import type { ScriptStep } from './testing/recorded';
import { createCopilotWorld, ROOT } from './testing/world';

const SAMPLES = SECRET_PATTERNS.map((pattern) => sampleOf(pattern.name));
const leak = (index: number): string => SAMPLES[index % SAMPLES.length] ?? '';

const event = (type: string, id: string, data: Record<string, unknown>): ScriptStep => ({
    kind: 'event',
    event: { type, id, timestamp: '2026-11-17T10:00:00.000Z', data } satisfies CopilotEvent,
    afterMs: 1,
});

const leakingRun: readonly ScriptStep[] = [
    event('assistant.turn_start', 'e1', { turnId: 't1' }),
    event('assistant.message_delta', 'e2', { messageId: 'm1', deltaContent: `GH_TOKEN=${leak(0)}` }),
    { kind: 'permission', request: { kind: 'shell', fullCommandText: `curl -H "Authorization: ${leak(4)}" https://example.test` }, afterMs: 1 },
    event('permission.requested', 'e3', { requestId: 'p1', permissionRequest: { kind: 'shell', fullCommandText: `curl -H "Authorization: ${leak(4)}" https://example.test` } }),
    event('tool.execution_start', 'e4', { toolName: 'bash', toolCallId: 'c1', arguments: { command: `echo ${leak(1)}` } }),
    event('tool.execution_progress', 'e5', { toolCallId: 'c1', progressMessage: `printing ${leak(2)}` }),
    event('tool.execution_complete', 'e6', { toolCallId: 'c1', success: false, error: { code: 'failed', message: `exit 1 ${leak(3)}` } }),
    event('assistant.message', 'e7', { messageId: 'm1', content: `the key is ${leak(5)}` }),
    event('session.error', 'e8', { errorType: 'query', message: `failed near ${leak(0)}` }),
];

describe('secrets never reach stored events (spec 0010 §8, §16)', () => {
    it('§16: tokens Copilot puts into messages, requests, tool output and errors are masked before the runtime store writes them', async () => {
        const world = createCopilotWorld({ client: { onSend: leakingRun } });
        const backing = createMemoryBacking();
        const store = await openRuntimeStore({
            medium: createMemoryMedium(backing),
            ids: createSequentialIds(),
            clock: world.clock,
            notices: createFakeNotices(),
            credentials: createFakeCredentials(...world.provider.credentialValues()),
            projectRoot: ROOT,
            maxAgeDays: () => 90,
        });
        const run = await store.createRun({ providerId: 'copilot', spec: { stem: '0001-x', path: '.specs/active/0001-x.md' } });
        const delivered: DeliveredEvent[] = [];
        const appended: Promise<unknown>[] = [];
        await world.provider.start(
            { runId: run.runId, workingDirectory: ROOT, prompt: 'go' },
            {
                emit: (next) => {
                    delivered.push(next);
                    const payload = { ...(next.payload as Record<string, JsonValue>), source: next.source };
                    appended.push(store.appendEvent(run.runId, { type: next.kind, payload, ...(next.providerEventId === undefined ? {} : { providerEventId: next.providerEventId }) }));
                },
                close: () => undefined,
                fail: () => undefined,
            },
        );
        await world.settle(100);
        await Promise.all(appended);
        await world.settle(5_000);

        const kinds = delivered.map((next) => next.kind);
        expect(kinds).toEqual(expect.arrayContaining(['message.delta', 'approval.requested', 'tool.progress', 'tool.completed', 'message.completed', 'run.failed']));
        expect(JSON.stringify(delivered)).toContain(leak(0));

        const page = await store.readEvents(run.runId, 1, 50);
        const returned = JSON.stringify(page);
        const raw = [...backing.files.values()].join('\n');
        for (const secret of SAMPLES.slice(0, 6)) {
            expect(returned).not.toContain(secret);
            expect(raw).not.toContain(secret);
        }
        expect(raw).toContain('[masked]');
        await store.dispose();
    });
});

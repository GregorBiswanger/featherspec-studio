import { describe, expect, it, vi } from 'vitest';

const MODULES = [
    'fs', 'node:fs', 'fs/promises', 'node:fs/promises', 'net', 'node:net', 'http', 'node:http', 'https', 'node:https',
    'http2', 'node:http2', 'tls', 'node:tls', 'dgram', 'node:dgram', 'child_process', 'node:child_process',
];

const hits = vi.hoisted(() => [] as string[]);

vi.mock('fs', () => recorder('fs'));
vi.mock('node:fs', () => recorder('node:fs'));
vi.mock('fs/promises', () => recorder('fs/promises'));
vi.mock('node:fs/promises', () => recorder('node:fs/promises'));
vi.mock('net', () => recorder('net'));
vi.mock('node:net', () => recorder('node:net'));
vi.mock('http', () => recorder('http'));
vi.mock('node:http', () => recorder('node:http'));
vi.mock('https', () => recorder('https'));
vi.mock('node:https', () => recorder('node:https'));
vi.mock('http2', () => recorder('http2'));
vi.mock('node:http2', () => recorder('node:http2'));
vi.mock('tls', () => recorder('tls'));
vi.mock('node:tls', () => recorder('node:tls'));
vi.mock('dgram', () => recorder('dgram'));
vi.mock('node:dgram', () => recorder('node:dgram'));
vi.mock('child_process', () => recorder('child_process'));
vi.mock('node:child_process', () => recorder('node:child_process'));

function recorder(name: string): object {
    return new Proxy(
        {},
        {
            get(_target, property) {
                if (typeof property === 'symbol' || property === 'then' || property === '__esModule') {
                    return undefined;
                }
                hits.push(`${name}.${property}`);
                throw new Error(`${name}.${property} used by the fake provider`);
            },
        },
    );
}

import { createFakeRuntimeClock } from '../../../core/runtime/testing/fakes';
import { createFakeProvider, type FakeProfile } from './fakeProvider';
import { FAKE_SCENARIOS } from './scenarios';
import { createRecordingSink } from './testing/recordingSink';

describe('fake provider without network or file system', () => {
    it('AC-013: negative control, the recorders fail on use for every module and spelling', async () => {
        for (const name of MODULES) {
            const loaded = (await import(/* @vite-ignore */ name)) as Record<string, unknown>;
            expect(() => loaded.anything).toThrow('used by the fake provider');
        }
        expect(hits).toHaveLength(MODULES.length);
        hits.length = 0;
    });

    it('AC-013: every scenario in both profiles runs to its end without touching a recorder', () => {
        for (const profile of ['full', 'minimal'] as FakeProfile[]) {
            for (const scenario of FAKE_SCENARIOS) {
                const clock = createFakeRuntimeClock();
                const provider = createFakeProvider({ clock, profile, scenario });
                const sink = createRecordingSink();
                void provider.start({ runId: 'r', workingDirectory: '/project', prompt: 'p' }, sink);
                clock.advance(10_000);
                if (scenario === 'approval') {
                    void provider.respondToApproval('r', 'fake-approval-1', { decision: 'approve-once' });
                } else if (scenario === 'input') {
                    void provider.respondToInput('r', 'fake-input-1', 'answer');
                } else if (scenario === 'long-run') {
                    void provider.cancel('r');
                }
                expect(sink.closed, `${profile} ${scenario}`).toBe(1);
            }
        }
        expect(hits).toEqual([]);
    });
});

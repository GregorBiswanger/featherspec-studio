import { describe, expect, it } from 'vitest';
import type { DeliveredEvent } from '../../../core/ports/agentProvider';
import { createFakeRuntimeClock } from '../../../core/runtime/testing/fakes';
import { CAPABILITIES, ERROR_CATEGORIES, KIND_CAPABILITY, type EventKind } from '../../../core/providers/vocabulary';
import { createFakeProvider, profileCapabilities, type FakeProfile, type FakeProviderOptions } from './fakeProvider';
import { createRecordingSink } from './testing/recordingSink';
import {
    FAILURE_CATEGORIES,
    FAKE_DISPLAY_NAME,
    FAKE_SAMPLE_CREDENTIAL,
    FAKE_SCENARIOS,
    fakeSessionRef,
    type FakeScenarioId,
} from './scenarios';

function run(options: Partial<FakeProviderOptions> = {}, runId = 'run-1', advanceMs = 10_000) {
    const clock = createFakeRuntimeClock();
    const provider = createFakeProvider({ clock, ...options });
    const credentialsAtEmit: boolean[] = [];
    const sink = createRecordingSink(() => credentialsAtEmit.push(provider.credentialValues().includes(FAKE_SAMPLE_CREDENTIAL)));
    void provider.start({ runId, workingDirectory: '/project', prompt: 'p' }, sink);
    clock.advance(advanceMs);
    return { provider, sink, clock, credentialsAtEmit };
}

const HAPPY: string[] = [
    'session.started', 'turn.started', 'message.delta', 'message.delta', 'message.delta', 'message.completed', 'reasoning', 'plan.updated',
    'tool.started', 'tool.progress', 'tool.completed', 'file.changed', 'usage', 'turn.completed', 'run.completed',
];

function normalised(events: DeliveredEvent[], runId: string): unknown {
    return JSON.parse(JSON.stringify(events).split(fakeSessionRef(runId)).join('<session>'));
}

describe('fake provider identity', () => {
    it('AC-014: the profiles declare what the spec fixes', () => {
        const full = profileCapabilities('full');
        const minimal = profileCapabilities('minimal');
        for (const capability of CAPABILITIES) {
            expect(full[capability].value).toBe(capability === 'mcp' || capability === 'customTools' ? 'none' : 'native');
            expect(minimal[capability].value).toBe(['start', 'cancel', 'toolEvents'].includes(capability) ? 'native' : 'none');
        }
    });

    it('AC-014: ID, display name, permission label per profile, model and sample credential are the fixed constants', async () => {
        const clock = createFakeRuntimeClock();
        const full = createFakeProvider({ clock });
        const minimal = createFakeProvider({ clock, profile: 'minimal' });
        expect(full.id).toBe('fake');
        expect(full.displayName).toBe(FAKE_DISPLAY_NAME);
        expect(full.permissionModeLabel).toBe('Asks before every tool action (fake approvals)');
        expect(minimal.permissionModeLabel).toBe('Never asks (no approval support)');
        expect(full.nextStartModel()).toBe('fake-model');
        expect(await full.listModels()).toEqual(['fake-model']);
        expect(full.credentialValues()).toEqual(['fake-sample-credential-7f3a']);
    });

    it('AC-010: availability is as set, available by default, and no answer when asked to give none', async () => {
        const clock = createFakeRuntimeClock();
        expect(await createFakeProvider({ clock }).checkAvailability()).toEqual({ result: 'available' });
        expect(await createFakeProvider({ clock, availability: { result: 'not-signed-in', hint: 'sign in' } }).checkAvailability()).toEqual({
            result: 'not-signed-in',
            hint: 'sign in',
        });
        let settled = false;
        void createFakeProvider({ clock, availability: 'no-answer' }).checkAvailability().then(() => (settled = true));
        clock.advance(24 * 3_600_000);
        await Promise.resolve();
        expect(settled).toBe(false);
    });

    it('AC-014: calls records every operation with its run ID', async () => {
        const { provider } = run();
        await provider.listModels();
        await provider.checkAvailability();
        provider.endSession('run-1');
        expect(provider.calls()).toEqual([
            { operation: 'start', runId: 'run-1' },
            { operation: 'listModels' },
            { operation: 'checkAvailability' },
            { operation: 'endSession', runId: 'run-1' },
        ]);
    });
});

describe('fake provider scenarios', () => {
    it('AC-014: happy path delivers the kinds of the spec in order, then closes, with source provider', () => {
        const { sink } = run();
        expect(sink.kinds()).toEqual(HAPPY);
        expect(sink.closed).toBe(1);
        expect(sink.events.every((event) => event.source === 'provider')).toBe(true);
        expect(sink.events[0]?.payload).toEqual({ sessionRef: 'fake-session-run-1', model: 'fake-model' });
        expect(sink.events.find((event) => event.kind === 'file.changed')?.payload).toEqual({
            path: 'README.md', operation: 'update', confidence: 'reported', outsideProject: false,
        });
        const text = sink.events.filter((event) => event.kind === 'message.delta').map((event) => (event.payload as { text: string }).text).join('');
        expect((sink.events.find((event) => event.kind === 'message.completed')?.payload as { text: string }).text).toBe(text);
    });

    it('AC-014: three message.delta arrive 50 ms apart on the injected clock', () => {
        const clock = createFakeRuntimeClock();
        const provider = createFakeProvider({ clock });
        const sink = createRecordingSink();
        void provider.start({ runId: 'r', workingDirectory: '/p', prompt: 'p' }, sink);
        const deltas = () => sink.kinds().filter((kind) => kind === 'message.delta').length;
        expect(deltas()).toBe(0);
        clock.advance(49);
        expect(deltas()).toBe(0);
        clock.advance(1);
        expect(deltas()).toBe(1);
        clock.advance(50);
        expect(deltas()).toBe(2);
        clock.advance(50);
        expect(deltas()).toBe(3);
        expect(sink.kinds().at(-1)).toBe('run.completed');
    });

    it('AC-014: the same scenario twice delivers the same kinds and payloads, run ID and session reference aside', () => {
        for (const scenario of ['happy-path', 'unknown-event', 'duplicates-and-late', 'no-end', 'failure:auth'] as FakeScenarioId[]) {
            for (const profile of ['full', 'minimal'] as FakeProfile[]) {
                const first = run({ scenario, profile }, 'run-a').sink;
                const second = run({ scenario, profile }, 'run-b').sink;
                expect(normalised(first.events, 'run-a')).toEqual(normalised(second.events, 'run-b'));
                expect(first.events.length).toBeGreaterThan(2);
            }
        }
    });

    it('AC-011: each failure scenario ends with run.failed of its category, adapter text omitted, in profile full', () => {
        expect(FAILURE_CATEGORIES).toHaveLength(8);
        expect(FAILURE_CATEGORIES).not.toContain('cancelled');
        for (const category of FAILURE_CATEGORIES) {
            const { sink } = run({ scenario: `failure:${category}` });
            expect(sink.kinds().slice(0, 2)).toEqual(['session.started', 'turn.started']);
            const last = sink.events.at(-1);
            expect(last?.kind).toBe('run.failed');
            expect(last?.payload).toMatchObject({ category });
            expect(last?.payload).not.toHaveProperty('text');
            expect(sink.kinds().filter((kind) => kind === 'run.failed')).toHaveLength(1);
            expect(sink.closed).toBe(1);
        }
        expect(ERROR_CATEGORIES.filter((category) => !FAILURE_CATEGORIES.includes(category as never))).toEqual(['cancelled']);
    });

    it('AC-022: failure:auth puts the sample credential into providerMessage and the credential port returns it when the event is emitted', () => {
        const { sink, provider, credentialsAtEmit } = run({ scenario: 'failure:auth' });
        const failed = sink.events.find((event) => event.kind === 'run.failed');
        expect((failed?.payload as { providerMessage: string }).providerMessage).toContain(FAKE_SAMPLE_CREDENTIAL);
        expect(provider.credentialValues()).toContain(FAKE_SAMPLE_CREDENTIAL);
        expect(credentialsAtEmit.every(Boolean)).toBe(true);
        expect(credentialsAtEmit.length).toBe(sink.events.length);
        const other = run({ scenario: 'failure:quota_or_rate_limit' }).sink.events.at(-1);
        expect(JSON.stringify(other)).not.toContain(FAKE_SAMPLE_CREDENTIAL);
    });

    it('AC-008: unknown event delivers one provider.unknown with type name fake.mystery and field names only, then run.completed', () => {
        const { sink } = run({ scenario: 'unknown-event' });
        const unknown = sink.events.filter((event) => event.kind === 'provider.unknown');
        expect(unknown).toHaveLength(1);
        expect(unknown[0]?.payload).toEqual({ typeName: 'fake.mystery', fieldNames: ['alpha', 'beta'] });
        const index = sink.kinds().indexOf('provider.unknown');
        expect(sink.kinds().slice(index + 1)).toContain('run.completed');
        expect(sink.kinds().at(-1)).toBe('run.completed');
    });

    it('AC-017: duplicates and late delivers one event twice under one identity and a warning after run.completed', () => {
        const { sink } = run({ scenario: 'duplicates-and-late' });
        const withId = sink.events.filter((event) => event.providerEventId !== undefined);
        expect(withId).toHaveLength(2);
        expect(withId[0]).toEqual(withId[1]);
        expect(sink.kinds().slice(-2)).toEqual(['run.completed', 'warning']);
        expect(sink.events.filter((event) => event.kind === 'warning')).toHaveLength(1);
        expect(sink.kinds().filter((kind) => kind === 'run.completed')).toHaveLength(1);
    });

    it('AC-009: no end delivers the turn and then closes without an end kind', () => {
        const { sink } = run({ scenario: 'no-end' });
        expect(sink.kinds().at(-1)).toBe('message.completed');
        expect(sink.kinds()).not.toContain('run.completed');
        expect(sink.kinds()).not.toContain('run.failed');
        expect(sink.closed).toBe(1);
    });

    it('AC-014: profile minimal delivers no kind whose capability is none, and failures carry unknown without typedErrors', () => {
        for (const scenario of FAKE_SCENARIOS.filter((id) => !['approval', 'input', 'long-run'].includes(id))) {
            const { sink, provider } = run({ scenario, profile: 'minimal' });
            expect(sink.events.length).toBeGreaterThan(0);
            for (const event of sink.events) {
                const needed = KIND_CAPABILITY[event.kind as EventKind];
                expect(needed === null || provider.capabilities[needed ?? 'start'].value !== 'none').toBe(true);
            }
            if (scenario.startsWith('failure:')) {
                expect(sink.events.at(-1)?.payload).toMatchObject({ category: 'unknown' });
            }
        }
        const happy = run({ profile: 'minimal' }).sink.kinds();
        expect(happy).toContain('tool.completed');
        expect(happy).not.toContain('message.delta');
        expect(happy).not.toContain('usage');
        expect(happy).not.toContain('plan.updated');
        expect(happy).not.toContain('file.changed');
    });

    it('AC-014: an unknown scenario value runs the happy path, a function is read at each start', () => {
        expect(run({ scenario: (() => 'nonsense') }).sink.kinds()).toEqual(HAPPY);
        let setting: unknown = 'no-end';
        const clock = createFakeRuntimeClock();
        const provider = createFakeProvider({ clock, scenario: () => setting });
        const first = createRecordingSink();
        void provider.start({ runId: 'a', workingDirectory: '/p', prompt: 'p' }, first);
        setting = 'happy-path';
        const second = createRecordingSink();
        void provider.start({ runId: 'b', workingDirectory: '/p', prompt: 'p' }, second);
        clock.advance(1_000);
        expect(first.kinds()).not.toContain('run.completed');
        expect(second.kinds()).toContain('run.completed');
    });

    it('AC-014: a script replaces the scenario and a capability declaration replaces the profile', () => {
        const { sink, provider } = run({
            script: [
                { type: 'emit', event: { kind: 'warning', payload: { text: 'x' }, source: 'derived' } },
                { type: 'wait', ms: 100 },
                { type: 'emit', event: { kind: 'retry', payload: { text: 'y' } } },
                { type: 'fail', reason: 'scripted' },
            ],
            capabilities: profileCapabilities('minimal'),
        });
        expect(sink.events.map((event) => [event.kind, event.source])).toEqual([['warning', 'derived'], ['retry', 'provider']]);
        expect(sink.failures).toEqual(['scripted']);
        expect(provider.capabilities).toEqual(profileCapabilities('minimal'));
    });

    it('AC-014: endSession stops a run that is waiting', () => {
        const clock = createFakeRuntimeClock();
        const provider = createFakeProvider({ clock });
        const sink = createRecordingSink();
        void provider.start({ runId: 'r', workingDirectory: '/p', prompt: 'p' }, sink);
        provider.endSession('r');
        clock.advance(10_000);
        expect(sink.kinds()).toEqual(['session.started', 'turn.started']);
        expect(clock.pendingTimers()).toBe(0);
    });
});

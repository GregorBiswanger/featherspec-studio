import { describe, expect, it } from 'vitest';
import type { AgentProviderPort, ProviderEvent } from '../../ports/agentProvider';
import { createFakeRuntimeClock, type FakeRuntimeClock } from '../../runtime/testing/fakes';
import { createProviderService, type ProviderService } from '../providerService';
import { createProviderRegistry } from '../registry';
import { ERROR_CATEGORIES, END_KINDS, EVENT_KINDS, KIND_CAPABILITY, type Capability, type EventKind } from '../vocabulary';

export type ContractCase =
    | 'happy'
    | 'approval'
    | 'input'
    | 'unknown-event'
    | 'no-end'
    | 'long-run'
    | 'failure-unknown'
    | 'credential-in-text'
    | 'failing-operation';

export interface ContractSubject {
    adapter: AgentProviderPort;
    arrange(contractCase: ContractCase): void;
    settle?(): Promise<void>;
}

export interface ContractHarness {
    create(clock: FakeRuntimeClock): ContractSubject;
}

interface Session {
    clock: FakeRuntimeClock;
    service: ProviderService;
    adapter: AgentProviderPort;
    events: ProviderEvent[];
    arrange(contractCase: ContractCase): void;
    run(runId?: string): Promise<void>;
    advance(milliseconds: number): Promise<void>;
    kinds(runId?: string): string[];
    credentialChecks: { event: ProviderEvent; present: boolean }[];
}

const DAY = 24 * 3_600_000;

function open(harness: ContractHarness): Session {
    const clock = createFakeRuntimeClock();
    const subject = harness.create(clock);
    const registry = createProviderRegistry();
    expect(registry.register(subject.adapter)).toEqual({ kind: 'ok' });
    const service = createProviderService({ registry, clock });
    const events: ProviderEvent[] = [];
    const credentialChecks: Session['credentialChecks'] = [];
    service.onEvent((event) => {
        events.push(event);
        const held = subject.adapter.credentialValues().filter((value) => JSON.stringify(event.payload).includes(value));
        if (held.length > 0) {
            const known = service.credentials.values();
            credentialChecks.push({ event, present: held.every((value) => known.includes(value)) });
        }
    });
    return {
        clock,
        service,
        adapter: subject.adapter,
        events,
        arrange: (contractCase) => subject.arrange(contractCase),
        async run(runId = 'run-1') {
            const result = await service.start(subject.adapter.id, { runId, workingDirectory: '/project', prompt: 'do it' });
            expect(result).toEqual({ kind: 'ok' });
            await subject.settle?.();
            clock.advance(5_000);
            await subject.settle?.();
        },
        async advance(milliseconds) {
            clock.advance(milliseconds);
            await subject.settle?.();
        },
        kinds: (runId = 'run-1') => events.filter((event) => event.runId === runId).map((event) => event.kind),
        credentialChecks,
    };
}

const none = (adapter: AgentProviderPort, capability: Capability): boolean => adapter.capabilities[capability].value === 'none';

export function runProviderContract(name: string, harness: ContractHarness): void {
    describe(`provider contract: ${name}`, () => {
        it('BR-002: the capability declaration is valid, the registry accepts and reports it as declared', () => {
            const session = open(harness);
            const registry = createProviderRegistry();
            expect(registry.register(session.adapter)).toEqual({ kind: 'ok' });
            expect(registry.list()[0]?.capabilities).toEqual(session.adapter.capabilities);
            expect(session.adapter.capabilities.start.value).not.toBe('none');
        });

        it('BR-002: a happy run delivers no kind whose capability is none', async () => {
            const session = open(harness);
            session.arrange('happy');
            await session.run();
            expect(session.events.length).toBeGreaterThan(0);
            for (const event of session.events) {
                if (event.kind === 'provider.unknown') {
                    continue;
                }
                expect(EVENT_KINDS).toContain(event.kind);
                const needed = KIND_CAPABILITY[event.kind as EventKind];
                expect(needed === null || !none(session.adapter, needed)).toBe(true);
            }
        });

        it('BR-002 BR-009: an error the adapter cannot map is run.failed unknown with the generic text, and every category is a listed one; typedErrors none means unknown always', async () => {
            const session = open(harness);
            session.arrange('failure-unknown');
            await session.run();
            const failed = session.events.filter((event) => event.kind === 'run.failed');
            expect(failed).toHaveLength(1);
            const payload = failed[0]?.payload as { category: string; text: string };
            expect(ERROR_CATEGORIES).toContain(payload.category);
            expect(payload.category).toBe('unknown');
            expect(payload.text).not.toBe('');
            expect(payload.category).not.toBe('cancelled');
        });

        it('BR-003: resume, cancel and listModels answer not supported where the capability is none, an unknown run is unknown run, a failing operation is failed', async () => {
            const session = open(harness);
            const id = session.adapter.id;
            expect(await session.service.cancel('no-such-run')).toEqual({ kind: 'unknown-run', runId: 'no-such-run' });
            if (none(session.adapter, 'resume')) {
                expect(await session.service.resume(id, { runId: 'r2', workingDirectory: '/p', sessionRef: 'x', continuationText: 'c' })).toEqual({ kind: 'not-supported', providerId: id });
            }
            if (none(session.adapter, 'modelList')) {
                expect(await session.service.listModels(id)).toEqual({ kind: 'not-supported', providerId: id });
            } else {
                expect((await session.service.listModels(id)).kind).toBe('ok');
            }
            session.arrange('long-run');
            await session.run();
            const before = session.events.length;
            session.arrange('failing-operation');
            if (none(session.adapter, 'cancel')) {
                expect(await session.service.cancel('run-1')).toEqual({ kind: 'not-supported', providerId: id });
            } else {
                expect((await session.service.cancel('run-1')).kind).toBe('failed');
            }
            if (!none(session.adapter, 'modelList')) {
                expect((await session.service.listModels(id)).kind).toBe('failed');
            }
            expect(session.events.length).toBe(before);
        });

        it('BR-003 BR-005: approval answers go through where declared, and answer not supported where approvals is none', async () => {
            const session = open(harness);
            if (none(session.adapter, 'approvals')) {
                session.arrange('happy');
                await session.run();
                expect(await session.service.respondToApproval('run-1', 'any', { decision: 'approve-once' })).toEqual({ kind: 'not-supported', providerId: session.adapter.id });
                return;
            }
            session.arrange('approval');
            await session.run();
            const requested = session.events.find((event) => event.kind === 'approval.requested');
            const requestId = (requested?.payload as { requestId: string }).requestId;
            const count = session.events.length;
            await session.advance(DAY);
            expect(session.events).toHaveLength(count);
            expect((await session.service.respondToApproval('run-1', requestId, { decision: 'approve-always' } as never)).kind).toBe('invalid-answer');
            expect(await session.service.respondToApproval('run-1', requestId, { decision: 'approve-once' })).toEqual({ kind: 'ok' });
            await session.advance(5_000);
            expect((await session.service.respondToApproval('run-1', requestId, { decision: 'approve-once' })).kind).toBe('request-not-open');
            const resolved = session.events.filter((event) => event.kind === 'approval.resolved');
            expect(resolved).toHaveLength(1);
            expect(resolved[0]?.payload).toMatchObject({ requestId, decision: 'approve-once' });
            expect(session.kinds().filter((kind) => (END_KINDS as readonly string[]).includes(kind))).toHaveLength(1);
        });

        it('BR-003 BR-005: input answers go through where declared and never appear in input.resolved, and answer not supported where userInput is none', async () => {
            const session = open(harness);
            if (none(session.adapter, 'userInput')) {
                session.arrange('happy');
                await session.run();
                expect(await session.service.respondToInput('run-1', 'any', 'text')).toEqual({ kind: 'not-supported', providerId: session.adapter.id });
                return;
            }
            session.arrange('input');
            await session.run();
            const requested = session.events.find((event) => event.kind === 'input.requested');
            const requestId = (requested?.payload as { requestId: string }).requestId;
            expect((await session.service.respondToInput('run-1', requestId, 5 as never)).kind).toBe('invalid-answer');
            expect(await session.service.respondToInput('run-1', requestId, 'distinctive-answer-text')).toEqual({ kind: 'ok' });
            await session.advance(5_000);
            expect(session.events.filter((event) => event.kind === 'input.resolved')).toHaveLength(1);
            expect(JSON.stringify(session.events)).not.toContain('distinctive-answer-text');
        });

        it('BR-007: session.started comes first unless run.failed ends the run, and every event has a source', async () => {
            for (const contractCase of ['happy', 'failure-unknown', 'no-end'] as const) {
                const session = open(harness);
                session.arrange(contractCase);
                await session.run();
                const first = session.events[0];
                expect(first?.kind === 'session.started' || first?.kind === 'run.failed').toBe(true);
                expect(session.events.every((event) => event.source === 'provider' || event.source === 'derived')).toBe(true);
                expect(session.events.every((event) => event.runId === 'run-1')).toBe(true);
            }
        });

        it('BR-007: an unmapped provider event is provider.unknown with type name and field names only, and the events after it keep coming', async () => {
            const session = open(harness);
            session.arrange('unknown-event');
            await session.run();
            const unknown = session.events.filter((event) => event.kind === 'provider.unknown');
            expect(unknown).toHaveLength(1);
            const payload = unknown[0]?.payload as Record<string, unknown>;
            expect(Object.keys(payload).sort()).toEqual(['fieldNames', 'typeName']);
            expect(typeof payload.typeName).toBe('string');
            expect((payload.fieldNames as unknown[]).every((field) => typeof field === 'string')).toBe(true);
            expect(session.kinds().slice(session.kinds().indexOf('provider.unknown') + 1).length).toBeGreaterThan(0);
        });

        it('BR-008: a happy run has exactly one end kind and it is the last event', async () => {
            const session = open(harness);
            session.arrange('happy');
            await session.run();
            const kinds = session.kinds();
            expect(kinds.filter((kind) => (END_KINDS as readonly string[]).includes(kind))).toHaveLength(1);
            expect(kinds.at(-1)).toBe('run.completed');
        });

        it('BR-008: a cancel ends a long run with run.cancelled as the end kind, a second cancel is already ended', async () => {
            const session = open(harness);
            session.arrange('long-run');
            await session.run();
            if (none(session.adapter, 'cancel')) {
                expect(await session.service.cancel('run-1')).toEqual({ kind: 'not-supported', providerId: session.adapter.id });
                return;
            }
            expect(await session.service.cancel('run-1')).toEqual({ kind: 'ok' });
            await session.advance(5_000);
            const kinds = session.kinds();
            expect(kinds.at(-1)).toBe('run.cancelled');
            expect(kinds.filter((kind) => (END_KINDS as readonly string[]).includes(kind))).toHaveLength(1);
            expect(await session.service.cancel('run-1')).toEqual({ kind: 'already-ended', runId: 'run-1' });
        });

        it('BR-008: a stream that closes without an end kind gets exactly one derived run.failed unknown', async () => {
            const session = open(harness);
            session.arrange('no-end');
            await session.run();
            const ends = session.events.filter((event) => (END_KINDS as readonly string[]).includes(event.kind));
            expect(ends).toHaveLength(1);
            expect(ends[0]?.kind).toBe('run.failed');
            expect(ends[0]?.source).toBe('derived');
            expect(ends[0]?.payload).toMatchObject({ category: 'unknown' });
        });

        it('BR-010: a credential the adapter holds in a delivered text is already returned by its credential port when the event is delivered', async () => {
            const session = open(harness);
            session.arrange('credential-in-text');
            await session.run();
            if (session.adapter.credentialValues().length === 0) {
                expect(session.credentialChecks).toEqual([]);
                return;
            }
            expect(session.credentialChecks.length).toBeGreaterThan(0);
            expect(session.credentialChecks.every((check) => check.present)).toBe(true);
        });
    });
}

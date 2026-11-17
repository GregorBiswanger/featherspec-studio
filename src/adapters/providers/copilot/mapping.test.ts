import { describe, expect, it } from 'vitest';
import type { DeliveredEvent } from '../../../core/ports/agentProvider';
import type { CopilotEvent, CopilotTodo } from './client';
import { createEventMapper, IGNORED_TYPES, isSingleTextField, type EventMapper, type MapperOptions } from './mapping';
import { approvedWriteRows, events, recordedRows, syntheticRows, toSteps, type Placeholders } from './testing/recorded';

const POSIX: Placeholders = { root: '/work/project', outside: '/work/other' };
const WINDOWS: Placeholders = { root: 'C:\\work\\project', outside: 'D:\\other' };

function arrange(overrides: Partial<MapperOptions> = {}, placeholders: Placeholders = POSIX): { mapper: EventMapper; options: MapperOptions } {
    const options: MapperOptions = {
        workingDirectory: placeholders.root,
        platform: placeholders === WINDOWS ? 'win32' : 'linux',
        readTodos: () => Promise.resolve<readonly CopilotTodo[]>([]),
        isAnswered: () => false,
        ...overrides,
    };
    return { mapper: createEventMapper(options), options };
}

async function run(mapper: EventMapper, stream: readonly CopilotEvent[]): Promise<DeliveredEvent[]> {
    const delivered: DeliveredEvent[] = [];
    for (const event of stream) {
        delivered.push(...(await mapper.map(event)));
    }
    return delivered;
}

const kinds = (delivered: readonly DeliveredEvent[]): string[] => delivered.map((event) => event.kind);

function synthetic(placeholders: Placeholders, ...checks: string[]): CopilotEvent[] {
    return events(toSteps(syntheticRows(...checks), placeholders));
}

describe('mapping of the recorded stream (AC-010, spec §7)', () => {
    it('AC-010: the text-only run (M-03) delivers the mapped kinds in the order received, with Copilot IDs, timestamps and source provider', async () => {
        const { mapper } = arrange();
        mapper.promptSent();
        const delivered = await run(mapper, events(toSteps(recordedRows('M-03'))));
        expect(kinds(delivered)).toEqual(['session.started', 'turn.started', 'message.delta', 'usage', 'message.completed', 'turn.completed', 'run.completed']);
        expect(delivered.every((event) => event.source === 'provider')).toBe(true);
        expect(delivered[0]).toMatchObject({
            kind: 'session.started',
            providerEventId: '8638c472-3eae-404b-92b6-a0130acc750b',
            occurredAt: '2026-11-16T23:59:32.105Z',
            payload: { sessionRef: '1488aad6-283c-422a-9763-3ca334e77457' },
        });
        expect(delivered[2]?.payload).toEqual({ text: 'ok' });
        expect(delivered[3]?.payload).toEqual({ totals: { inputTokens: 19656, outputTokens: 4 } });
        expect(delivered[4]?.payload).toEqual({ text: 'ok' });
        expect(delivered[6]?.payload).toEqual({ finalMessage: 'ok' });
        expect(delivered.every((event) => event.providerEventId !== undefined && event.occurredAt !== undefined)).toBe(true);
    });

    it('AC-010: the rejected write (M-02) maps request, resolution and the failed tool in order; the denied tool is tool.completed not ok, never a failure category', async () => {
        const { mapper } = arrange();
        mapper.promptSent();
        const delivered = await run(mapper, events(toSteps(recordedRows('M-02'))));
        expect(kinds(delivered)).toEqual([
            'turn.started',
            'usage',
            'message.completed',
            'tool.started',
            'approval.requested',
            'approval.resolved',
            'tool.completed',
            'turn.completed',
            'turn.started',
            ...Array<string>(8).fill('message.delta'),
            'usage',
            'message.completed',
            'turn.completed',
            'run.completed',
        ]);
        const byKind = (kind: string): DeliveredEvent | undefined => delivered.find((event) => event.kind === kind);
        expect(byKind('tool.started')?.payload).toEqual({ toolName: 'create', callId: 'toolu_013ViVzPrvCB21VQ4TvY9Gr3' });
        expect(byKind('approval.requested')?.payload).toEqual({
            requestId: 'b575e742-d868-4ed7-b349-479fa134276a',
            actionKind: 'write',
            summary: 'hello.txt',
            outsideProject: false,
        });
        expect(byKind('approval.resolved')?.payload).toEqual({ requestId: 'b575e742-d868-4ed7-b349-479fa134276a', decision: 'reject' });
        expect(byKind('tool.completed')?.payload).toEqual({
            toolName: 'create',
            callId: 'toolu_013ViVzPrvCB21VQ4TvY9Gr3',
            ok: false,
            errorText: 'The user rejected this tool call. User feedback: Denied by the FeatherSpec Studio PoC (deny-all handler).',
        });
        const usage = delivered.filter((event) => event.kind === 'usage');
        expect((usage[1]?.payload as { totals: Record<string, number> }).totals.inputTokens).toBeGreaterThan(19729);
    });

    it('AC-010 AC-017: an abort is run.cancelled; the idle that follows ends nothing and no run.completed appears', async () => {
        const { mapper } = arrange();
        mapper.promptSent();
        const delivered = await run(mapper, events(toSteps(recordedRows('M-04'))));
        expect(kinds(delivered)).toEqual(['turn.started', 'run.cancelled', 'turn.completed']);
        expect(delivered[1]?.payload).toEqual({});
        expect(mapper.ended()).toBe(true);
    });

    it('AC-010 AC-019: the resumed run (M-05) names the resumed session and the model Copilot reports, and maps the whole reasoning text', async () => {
        const { mapper } = arrange({ sessionId: 'resumed-session' });
        mapper.promptSent();
        const delivered = await run(mapper, events(toSteps(recordedRows('M-05'))));
        expect(kinds(delivered)).toEqual(['session.started', 'turn.started', 'message.delta', 'usage', 'message.completed', 'reasoning', 'turn.completed', 'run.completed']);
        expect(delivered[0]?.payload).toEqual({ sessionRef: 'resumed-session', model: 'claude-sonnet-5' });
        expect((delivered[5]?.payload as { text: string }).text).toHaveLength(570);
    });

    it('AC-010: every type of the ignored list delivers nothing, also a model.* type nobody listed', async () => {
        const { mapper } = arrange();
        mapper.promptSent();
        const stream: CopilotEvent[] = [...IGNORED_TYPES, 'model.something_new'].map((type) => ({ type, data: {} }));
        expect(await run(mapper, stream)).toEqual([]);
        expect(IGNORED_TYPES).toContain('assistant.streaming_delta');
        expect(IGNORED_TYPES).toContain('session.usage_info');
        expect(IGNORED_TYPES).toHaveLength(21);
    });

    it('AC-010: the ID path: started() delivers session.started once, a later session.start event delivers nothing, and the model is only what Copilot named', async () => {
        const { mapper } = arrange();
        expect(mapper.started('created-id')).toEqual([{ kind: 'session.started', source: 'provider', payload: { sessionRef: 'created-id' } }]);
        expect(mapper.started('created-id')).toEqual([]);
        expect(await mapper.map({ type: 'session.start', id: 'x', data: { sessionId: 'created-id' } })).toEqual([]);
    });

    it('AC-010: session.start carrying selectedModel names it; the event arriving first wins over the ID path', async () => {
        const { mapper } = arrange();
        const delivered = await mapper.map({ type: 'session.start', id: 's', data: { sessionId: 'abc', selectedModel: 'gpt-x' } });
        expect(delivered[0]?.payload).toEqual({ sessionRef: 'abc', model: 'gpt-x' });
        expect(mapper.started('abc')).toEqual([]);
    });
});

describe('mapping of the synthetic stream (AC-010, AC-012, spec §7)', () => {
    it('AC-012: fileEdits yield one file.changed per create, edit and delete with the path relative to the root, one warning naming another kind, and `<id>#<n>` identities', async () => {
        const { mapper } = arrange();
        const delivered = await run(mapper, synthetic(POSIX, 'S-tools'));
        expect(kinds(delivered)).toEqual([
            'tool.started',
            'tool.progress',
            'tool.completed',
            'file.changed',
            'file.changed',
            'file.changed',
            'warning',
            'file.changed',
            'tool.started',
            'tool.completed',
        ]);
        expect(delivered[1]?.payload).toEqual({ toolName: 'edit', callId: 'syn-tool-1' });
        expect(delivered[2]?.payload).toEqual({ toolName: 'edit', callId: 'syn-tool-1', ok: true });
        expect(delivered.slice(3, 7).map((event) => event.payload)).toEqual([
            { path: 'src/new.ts', operation: 'add', confidence: 'reported', outsideProject: false },
            { path: 'src/old.ts', operation: 'update', confidence: 'reported', outsideProject: false },
            { path: 'src/gone.ts', operation: 'delete', confidence: 'reported', outsideProject: false },
            { text: expect.stringContaining('rename') as string },
        ]);
        expect(delivered[7]?.payload).toEqual({ path: '/work/other/shared/elsewhere.ts', operation: 'update', confidence: 'reported', outsideProject: true });
        const base = delivered[2]?.providerEventId ?? '';
        expect(base).not.toBe('');
        expect(delivered.slice(3, 8).map((event) => event.providerEventId)).toEqual([`${base}#2`, `${base}#3`, `${base}#4`, `${base}#5`, `${base}#6`]);
    });

    it('AC-010: a failed tool is tool.completed not ok with the error message, nothing else', async () => {
        const { mapper } = arrange();
        const delivered = await run(mapper, synthetic(POSIX, 'S-tools'));
        expect(delivered.at(-1)).toMatchObject({ kind: 'tool.completed', payload: { toolName: 'bash', callId: 'syn-tool-2', ok: false, errorText: 'Command exited with code 1' } });
    });

    it('AC-012: on Windows the comparison ignores case, backslashes become forward slashes, another drive stays as delivered and outside', async () => {
        const { mapper } = arrange({}, WINDOWS);
        const delivered = await run(mapper, synthetic(WINDOWS, 'S-tools'));
        const files = delivered.filter((event) => event.kind === 'file.changed').map((event) => event.payload);
        expect(files[0]).toMatchObject({ path: 'src/new.ts', outsideProject: false });
        expect(files.at(-1)).toMatchObject({ path: 'D:\\other/shared/elsewhere.ts', outsideProject: true });
        const shouting = await mapper.map({
            type: 'tool.execution_complete',
            id: 'w',
            data: { toolCallId: 'syn-tool-1', success: true, fileEdits: [{ kind: 'edit', path: 'c:\\WORK\\Project\\src\\Mixed.ts' }] },
        });
        expect(shouting.find((event) => event.kind === 'file.changed')?.payload).toMatchObject({ path: 'src/Mixed.ts', outsideProject: false });
    });

    it('AC-012: a relative path from Copilot is resolved against the working directory; a sibling folder with the same prefix is outside', async () => {
        const { mapper } = arrange();
        const delivered = await mapper.map({
            type: 'tool.execution_complete',
            id: 'r',
            data: { toolCallId: 't', success: true, fileEdits: [{ kind: 'create', path: 'docs/a.md' }, { kind: 'create', path: '/work/project-other/a.md' }] },
        });
        const files = delivered.filter((event) => event.kind === 'file.changed').map((event) => event.payload);
        expect(files).toEqual([
            { path: 'docs/a.md', operation: 'add', confidence: 'reported', outsideProject: false },
            { path: '/work/project-other/a.md', operation: 'add', confidence: 'reported', outsideProject: true },
        ]);
    });

    it('AC-013: a permission request of any kind is approval.requested with the kind, the command, path or URL as delivered, and the outside marker only where a path or working directory is delivered', async () => {
        const { mapper } = arrange();
        const delivered = await run(mapper, synthetic(POSIX, 'S-approvals').filter((event) => event.type === 'permission.requested'));
        expect(delivered.map((event) => event.payload)).toEqual([
            { requestId: 'syn-req-shell', actionKind: 'shell', summary: 'npm test', outsideProject: false },
            { requestId: 'syn-req-read', actionKind: 'read', summary: '/work/other/secrets.txt', outsideProject: true },
            { requestId: 'syn-req-url', actionKind: 'url', summary: 'https://example.org/docs', outsideProject: false },
            { requestId: 'syn-req-new', actionKind: 'mystery-kind', summary: 'Do something new', outsideProject: false },
        ]);
    });

    it('AC-013: a shell request whose working directory lies outside the root carries the marker', async () => {
        const { mapper } = arrange();
        const delivered = await mapper.map({
            type: 'permission.requested',
            id: 'p',
            data: { requestId: 'q', permissionRequest: { kind: 'shell', fullCommandText: 'ls', resolvedWorkingDirectory: '/elsewhere' } },
        });
        expect(delivered[0]?.payload).toEqual({ requestId: 'q', actionKind: 'shell', summary: 'ls', outsideProject: true });
    });

    it('AC-014: permission.completed is approval.resolved only for a request Studio did not answer', async () => {
        const stream = synthetic(POSIX, 'S-approvals').filter((event) => event.type === 'permission.completed');
        const open = arrange();
        expect((await run(open.mapper, stream)).map((event) => event.payload)).toEqual([{ requestId: 'syn-req-shell', decision: 'approve-once' }]);
        const answered = arrange({ isAnswered: (requestId) => requestId === 'syn-req-shell' });
        expect(await run(answered.mapper, stream)).toEqual([]);
    });

    it('AC-016: user-input requests become input.requested with the choices appended; completions become input.resolved without the answer, only for unanswered requests', async () => {
        const stream = synthetic(POSIX, 'S-input');
        const { mapper } = arrange();
        const delivered = await run(mapper, stream);
        expect(delivered.map((event) => [event.kind, event.payload])).toEqual([
            ['input.requested', { requestId: 'syn-input-1', question: 'Which framework?\n\nChoices: React, Vue' }],
            ['input.resolved', { requestId: 'syn-input-1' }],
            ['input.requested', { requestId: 'syn-input-2', question: 'Project name?' }],
            ['input.requested', { requestId: 'syn-elic-1', question: 'Which branch?' }],
            ['warning', { text: expect.stringContaining('Configure the build') as string }],
            ['input.resolved', { requestId: 'syn-elic-1' }],
        ]);
        expect(JSON.stringify(delivered)).not.toContain('"answer"');
        const answered = arrange({ isAnswered: () => true });
        expect(kinds(await run(answered.mapper, stream))).toEqual(['input.requested', 'input.requested', 'input.requested', 'warning']);
    });

    it('AC-016: an elicitation is a question only when its form is one text field, in form mode', () => {
        const field = (type: string) => ({ type });
        expect(isSingleTextField({ message: 'm', mode: 'form', requestedSchema: { properties: { a: field('string') } } })).toBe(true);
        expect(isSingleTextField({ message: 'm', requestedSchema: { properties: { a: field('string') } } })).toBe(true);
        expect(isSingleTextField({ message: 'm', mode: 'form', requestedSchema: { properties: { a: field('string'), b: field('string') } } })).toBe(false);
        expect(isSingleTextField({ message: 'm', mode: 'form', requestedSchema: { properties: { a: field('boolean') } } })).toBe(false);
        expect(isSingleTextField({ message: 'm', mode: 'form', requestedSchema: { properties: { a: { type: 'string', enum: ['x', 'y'] } } } })).toBe(false);
        expect(isSingleTextField({ message: 'm', mode: 'url' })).toBe(false);
        expect(isSingleTextField({ message: 'm', mode: 'form', requestedSchema: { properties: {} } })).toBe(false);
    });

    it('AC-010: session.todos_changed is plan.updated from the todo list read at that moment; a list that cannot be read delivers nothing', async () => {
        const todos: CopilotTodo[] = [
            { title: 'Write test', status: 'done' },
            { title: 'Write code', status: 'in_progress' },
        ];
        const { mapper } = arrange({ readTodos: () => Promise.resolve(todos) });
        const delivered = await run(mapper, synthetic(POSIX, 'S-plan'));
        expect(delivered.map((event) => [event.kind, event.payload])).toEqual([
            ['plan.updated', { items: [{ text: 'Write test', done: true }, { text: 'Write code', done: false }] }],
            ['warning', { text: 'Context window is almost full' }],
        ]);
        const broken = arrange({ readTodos: () => Promise.reject(new Error('rpc failed')) });
        expect(kinds(await run(broken.mapper, synthetic(POSIX, 'S-plan')))).toEqual(['warning']);
    });

    it('AC-010: usage carries running totals of input and output tokens over the run', async () => {
        const { mapper } = arrange();
        const stream: CopilotEvent[] = [
            { type: 'assistant.usage', id: 'u1', data: { inputTokens: 100, outputTokens: 10 } },
            { type: 'assistant.usage', id: 'u2', data: { inputTokens: 50, outputTokens: 5, cacheReadTokens: 7 } },
        ];
        expect((await run(mapper, stream)).map((event) => event.payload)).toEqual([{ totals: { inputTokens: 100, outputTokens: 10 } }, { totals: { inputTokens: 150, outputTokens: 15 } }]);
    });

    it('AC-010: the first session.idle after the prompt completes the run with the last message; before the prompt, and after an end kind, it delivers nothing', async () => {
        const { mapper } = arrange();
        expect(await mapper.map({ type: 'session.idle', id: 'i0', data: {} })).toEqual([]);
        mapper.promptSent();
        await mapper.map({ type: 'assistant.message', id: 'm1', data: { content: 'first' } });
        await mapper.map({ type: 'assistant.message', id: 'm2', data: { content: 'second' } });
        const idle = await mapper.map({ type: 'session.idle', id: 'i1', timestamp: '2026-11-17T10:00:00.000Z', data: {} });
        expect(idle).toEqual([{ kind: 'run.completed', source: 'provider', providerEventId: 'i1', occurredAt: '2026-11-17T10:00:00.000Z', payload: { finalMessage: 'second' } }]);
        expect(await mapper.map({ type: 'session.idle', id: 'i2', data: {} })).toEqual([]);
    });

    it('AC-010: an idle that reports an abort completes nothing, and a run without a message completes without a final message', async () => {
        const aborted = arrange();
        aborted.mapper.promptSent();
        expect(await aborted.mapper.map({ type: 'session.idle', id: 'i', data: { aborted: true } })).toEqual([]);
        const empty = arrange();
        empty.mapper.promptSent();
        expect((await empty.mapper.map({ type: 'session.idle', id: 'i', data: {} }))[0]?.payload).toEqual({});
    });

    it('AC-018: session.error is run.failed with the category of spec §7 and the hint of §9, Copilot\'s message beside it, and never cancelled or tool_failure', async () => {
        const cases: [Record<string, unknown>, string, string | undefined][] = [
            [{ errorType: 'authentication', message: 'bad token' }, 'auth', 'Run `copilot` in a terminal and sign in, then retry.'],
            [{ errorType: 'rate_limit', message: 'slow down', statusCode: 429 }, 'quota_or_rate_limit', 'Your Copilot allowance or rate limit is reached; retry later.'],
            [{ errorType: 'quota', message: 'no allowance' }, 'quota_or_rate_limit', 'Your Copilot allowance or rate limit is reached; retry later.'],
            [{ errorType: 'query', message: 'upstream', statusCode: 503 }, 'network_or_server', undefined],
            [{ errorType: 'authorization', message: 'forbidden' }, 'policy_denied', undefined],
            [{ errorType: 'policy', message: 'blocked' }, 'policy_denied', undefined],
            [{ errorType: 'context_limit', message: 'too long' }, 'unknown', undefined],
            [{ errorType: 'mystery', message: 'who knows' }, 'unknown', undefined],
        ];
        for (const [data, category, hint] of cases) {
            const { mapper } = arrange();
            const delivered = await mapper.map({ type: 'session.error', id: 'err', data });
            expect(delivered).toHaveLength(1);
            expect(delivered[0]?.kind).toBe('run.failed');
            const payload = delivered[0]?.payload as Record<string, unknown>;
            expect(payload).toMatchObject({ category, providerMessage: data.message });
            expect(payload.hint).toBe(hint);
            expect(payload).not.toHaveProperty('text');
            expect(['cancelled', 'tool_failure']).not.toContain(payload.category);
        }
    });

    it('AC-011: an unlisted type is provider.unknown with its type name and top-level field names, no values, and the stream goes on', async () => {
        const { mapper } = arrange();
        const stream = [...synthetic(POSIX, 'S-unknown'), { type: 'assistant.turn_start', id: 'after', data: {} }];
        const delivered = await run(mapper, stream);
        expect(delivered.map((event) => [event.kind, event.payload])).toEqual([
            ['provider.unknown', { typeName: 'future.thing', fieldNames: ['alpha', 'beta'] }],
            ['turn.started', {}],
        ]);
        expect(JSON.stringify(delivered[0])).not.toContain('nested');
    });

    it('AC-010: only the first end kind of the stream is delivered by the mapper', async () => {
        const { mapper } = arrange();
        mapper.promptSent();
        const delivered = await run(mapper, [
            { type: 'session.error', id: 'e', data: { errorType: 'x', message: 'm' } },
            { type: 'abort', id: 'a', data: { reason: 'user_initiated' } },
            { type: 'session.idle', id: 'i', data: {} },
        ]);
        expect(kinds(delivered)).toEqual(['run.failed']);
    });
});

const WRITE_CALL = 'toolu_01Uz7ndXpB5xqkbo14jQAUmg';
const WRITE_COMPLETE_ID = 'f5f1eeb4-774c-4987-bf76-27691f04dfa1';

function writeRequest(requestId: string, callId: string, request: Record<string, unknown>): CopilotEvent {
    return { type: 'permission.requested', id: `req-${requestId}`, data: { requestId, permissionRequest: { kind: 'write', toolCallId: callId, intention: 'Edit file', ...request } } };
}
const completed = (requestId: string, callId: string, result: string): CopilotEvent => ({ type: 'permission.completed', id: `done-${requestId}`, data: { requestId, toolCallId: callId, result: { kind: result } } });
const toolDone = (callId: string, success: boolean, extra: Record<string, unknown> = {}): CopilotEvent => ({ type: 'tool.execution_complete', id: `tool-${callId}`, data: { toolCallId: callId, success, ...extra } });
const filesOf = (delivered: readonly DeliveredEvent[]): DeliveredEvent[] => delivered.filter((event) => event.kind === 'file.changed');

describe('mapping of the recorded approved write (M-02, M-03; capture 2026-11-17, CLI 1.0.87)', () => {
    it('AC-010 AC-012: the approved write maps in order, the file change is derived from the approved write and the successful tool, nothing is provider.unknown', async () => {
        const { mapper } = arrange({}, WINDOWS);
        mapper.promptSent();
        const delivered = await run(mapper, events(toSteps(approvedWriteRows(), WINDOWS)));
        expect(kinds(delivered)).toEqual([
            'session.started',
            'turn.started',
            'usage',
            'message.completed',
            'tool.started',
            'approval.requested',
            'approval.resolved',
            'tool.completed',
            'file.changed',
            'turn.completed',
            'turn.started',
            'message.delta',
            'usage',
            'message.completed',
            'turn.completed',
            'run.completed',
        ]);
        const [file] = filesOf(delivered);
        expect(file).toEqual({
            kind: 'file.changed',
            source: 'derived',
            providerEventId: `${WRITE_COMPLETE_ID}#2`,
            occurredAt: '2026-11-17T08:40:24.906Z',
            payload: { path: 'hello.txt', operation: 'add', confidence: 'derived', outsideProject: false },
        });
        expect(delivered.filter((event) => event.kind !== 'file.changed').every((event) => event.source === 'provider')).toBe(true);
        expect(delivered.find((event) => event.kind === 'tool.completed')?.payload).toEqual({ toolName: 'create', callId: WRITE_CALL, ok: true });
        expect(delivered.at(-1)?.payload).toEqual({ finalMessage: 'done' });
    });

    it('AC-012: the recording carries no fileEdits, so the derived file change is the only one; Studio answering the request itself changes nothing about it', async () => {
        const rows = approvedWriteRows();
        expect(rows.some((row) => row.data?.fileEdits !== undefined)).toBe(false);
        const { mapper } = arrange({ isAnswered: () => true }, WINDOWS);
        mapper.promptSent();
        const delivered = await run(mapper, events(toSteps(rows, WINDOWS)));
        expect(kinds(delivered)).not.toContain('approval.resolved');
        expect(filesOf(delivered).map((event) => event.payload)).toEqual([{ path: 'hello.txt', operation: 'add', confidence: 'derived', outsideProject: false }]);
    });

    it('AC-012 negative control: the recorded rejected write (M-02) yields no file change', async () => {
        const { mapper } = arrange();
        mapper.promptSent();
        expect(filesOf(await run(mapper, events(toSteps(recordedRows('M-02')))))).toEqual([]);
    });

    it('AC-011: session.info, whose file_created text repeats the derived change, is ignored; another unlisted type stays provider.unknown', async () => {
        expect(IGNORED_TYPES).toContain('session.info');
        const { mapper } = arrange();
        const delivered = await run(mapper, [
            { type: 'session.info', id: 'i', data: { infoType: 'file_created', message: '/work/project/hello.txt' } },
            { type: 'session.workspace_file_changed', id: 'w', data: { path: 'plan.md', operation: 'create' } },
        ]);
        expect(delivered.map((event) => [event.kind, event.payload])).toEqual([['provider.unknown', { typeName: 'session.workspace_file_changed', fieldNames: ['path', 'operation'] }]]);
    });
});

describe('derived file changes from write requests (AC-012, spec §7; operations beyond create follow the SDK types, synthetic)', () => {
    it('AC-012: the operation comes from the write request: new contents or no before side add, no after side delete, otherwise update', async () => {
        const { mapper } = arrange();
        const delivered = await run(mapper, [
            writeRequest('r1', 'c1', { fileName: '/work/project/src/new.ts', newFileContents: 'x' }),
            writeRequest('r2', 'c2', { fileName: '/work/project/src/old.ts', fileEdits: [{ before: { path: '/work/project/src/old.ts', content: 'a' }, after: { path: '/work/project/src/old.ts', content: 'b' } }] }),
            writeRequest('r3', 'c3', { fileName: '/work/project/src/gone.ts', fileEdits: [{ before: { path: '/work/project/src/gone.ts', content: 'a' } }] }),
            writeRequest('r4', 'c4', { fileName: '/work/project/src/plain.ts' }),
            writeRequest('r5', 'c5', { fileName: '/work/project/src/fresh.ts', fileEdits: [{ after: { path: '/work/project/src/fresh.ts', content: 'n' } }] }),
            ...['r1', 'r2', 'r3', 'r4', 'r5'].map((id, index) => completed(id, `c${index + 1}`, 'approved')),
            ...['c1', 'c2', 'c3', 'c4', 'c5'].map((id) => toolDone(id, true)),
        ]);
        expect(filesOf(delivered).map((event) => [event.source, event.payload])).toEqual([
            ['derived', { path: 'src/new.ts', operation: 'add', confidence: 'derived', outsideProject: false }],
            ['derived', { path: 'src/old.ts', operation: 'update', confidence: 'derived', outsideProject: false }],
            ['derived', { path: 'src/gone.ts', operation: 'delete', confidence: 'derived', outsideProject: false }],
            ['derived', { path: 'src/plain.ts', operation: 'update', confidence: 'derived', outsideProject: false }],
            ['derived', { path: 'src/fresh.ts', operation: 'add', confidence: 'derived', outsideProject: false }],
        ]);
    });

    it('AC-012: no file change for a rejected request, a failed tool, a tool without a write request, or a second completion of the same call', async () => {
        const { mapper } = arrange();
        const delivered = await run(mapper, [
            writeRequest('r1', 'c1', { fileName: '/work/project/a.ts', newFileContents: 'x' }),
            completed('r1', 'c1', 'denied-interactively-by-user'),
            toolDone('c1', true),
            writeRequest('r2', 'c2', { fileName: '/work/project/b.ts', newFileContents: 'x' }),
            completed('r2', 'c2', 'approved'),
            toolDone('c2', false, { error: { message: 'disk full' } }),
            toolDone('c3', true),
            writeRequest('r4', 'c4', { fileName: '/work/project/d.ts', newFileContents: 'x' }),
            toolDone('c4', true),
            toolDone('c4', true),
        ]);
        expect(filesOf(delivered).map((event) => event.payload)).toEqual([{ path: 'd.ts', operation: 'add', confidence: 'derived', outsideProject: false }]);
    });

    it('AC-012: fileEdits on the completion win: reported changes only, no derived duplicate for that call', async () => {
        const { mapper } = arrange();
        const delivered = await run(mapper, [
            writeRequest('r1', 'c1', { fileName: '/work/project/a.ts', newFileContents: 'x' }),
            toolDone('c1', true, { fileEdits: [{ kind: 'create', path: '/work/project/a.ts' }] }),
        ]);
        expect(filesOf(delivered).map((event) => [event.source, event.payload])).toEqual([['provider', { path: 'a.ts', operation: 'add', confidence: 'reported', outsideProject: false }]]);
    });

    it('AC-012: a derived path outside the root stays as delivered and carries the marker; the resolved path is preferred to the file name', async () => {
        const { mapper } = arrange();
        const delivered = await run(mapper, [
            writeRequest('r1', 'c1', { fileName: '/work/other/x.ts', newFileContents: 'x' }),
            writeRequest('r2', 'c2', { fileName: 'link/y.ts', resolvedPath: '/work/project/real/y.ts', newFileContents: 'x' }),
            toolDone('c1', true),
            toolDone('c2', true),
        ]);
        expect(filesOf(delivered).map((event) => event.payload)).toEqual([
            { path: '/work/other/x.ts', operation: 'add', confidence: 'derived', outsideProject: true },
            { path: 'real/y.ts', operation: 'add', confidence: 'derived', outsideProject: false },
        ]);
    });
});

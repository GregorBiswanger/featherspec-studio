import { describe, expect, it } from 'vitest';
import { createFakeRuntimeClock } from '../../../core/runtime/testing/fakes';
import type { CopilotEvent, CopilotSessionConfig } from './client';
import { events, recordedRows, syntheticRows, toSteps } from './testing/recorded';
import { createScriptedClient } from './testing/scriptedClient';

const flush = async (): Promise<void> => {
    for (let index = 0; index < 5; index++) {
        await new Promise<void>((resolve) => setImmediate(resolve));
    }
};

function config(received: string[], overrides: Partial<CopilotSessionConfig> = {}): CopilotSessionConfig {
    return {
        workingDirectory: '/work/project',
        trustWorkingDirectory: true,
        onEvent: (event: CopilotEvent) => void received.push(`event:${event.type}`),
        onPermission: (request) => {
            received.push(`permission:${request.kind}`);
            return Promise.resolve({ kind: 'reject', feedback: 'no' });
        },
        onUserInput: () => Promise.resolve({ answer: 'a', wasFreeform: true }),
        onElicitation: () => Promise.resolve({ action: 'decline' }),
        ...overrides,
    };
}

describe('scripted client (test double of the Copilot SDK client)', () => {
    it('AC-010: replays the recorded steps on the clock after send, never before, and calls a handler before the event it belongs to', async () => {
        const clock = createFakeRuntimeClock();
        const scripted = createScriptedClient({ clock, onSend: toSteps(recordedRows('M-02')) });
        const received: string[] = [];
        const client = scripted.factory({ cliPath: '/c', workingDirectory: '/work/project' });
        await client.start();
        const session = await client.createSession(config(received));
        clock.advance(10_000);
        expect(received).toEqual([]);
        await session.send('prompt');
        clock.advance(0);
        await flush();
        const handler = received.indexOf('permission:write');
        const requested = received.indexOf('event:permission.requested');
        expect(handler).toBeGreaterThan(-1);
        expect(handler).toBeLessThan(requested);
        expect(received.filter((entry) => entry === 'event:assistant.message_delta')).toHaveLength(8);
        expect(scripted.answers()).toEqual([{ call: 'answer.permission', answer: { kind: 'reject', feedback: 'no' } }]);
    });

    it('AC-010: step delays are cumulative on the clock', async () => {
        const clock = createFakeRuntimeClock();
        const stream: CopilotEvent[] = [
            { type: 'a', data: {} },
            { type: 'b', data: {} },
        ];
        const scripted = createScriptedClient({
            clock,
            onSend: [
                { kind: 'event', event: stream[0] as CopilotEvent, afterMs: 100 },
                { kind: 'event', event: stream[1] as CopilotEvent, afterMs: 200 },
            ],
        });
        const received: string[] = [];
        const client = scripted.factory({ cliPath: '/c', workingDirectory: '/w' });
        const session = await client.createSession(config(received));
        await session.send('x');
        clock.advance(99);
        expect(received).toEqual([]);
        clock.advance(1);
        expect(received).toEqual(['event:a']);
        clock.advance(199);
        expect(received).toEqual(['event:a']);
        clock.advance(1);
        expect(received).toEqual(['event:a', 'event:b']);
    });

    it('AC-017: abort replays the abort script; a silent abort replays nothing', async () => {
        for (const silent of [false, true]) {
            const clock = createFakeRuntimeClock();
            const scripted = createScriptedClient({
                clock,
                onAbort: silent ? 'silent' : [{ kind: 'event', event: { type: 'abort', data: {} } }],
            });
            const received: string[] = [];
            const session = await scripted.factory({ cliPath: '/c', workingDirectory: '/w' }).createSession(config(received));
            await session.abort();
            clock.advance(0);
            expect(received).toEqual(silent ? [] : ['event:abort']);
            expect(scripted.count('abort')).toBe(1);
        }
    });

    it('AC-015: logs every call and every answer a handler settles with, user input and elicitation included', async () => {
        const clock = createFakeRuntimeClock();
        const scripted = createScriptedClient({ clock, onSend: toSteps(syntheticRows('S-input')) });
        const client = scripted.factory({ cliPath: '/c', workingDirectory: '/w', baseDirectory: '/base' });
        await client.start();
        const session = await client.createSession(config([], { model: 'm' }));
        await session.send('p');
        clock.advance(0);
        await flush();
        await session.disconnect();
        await client.stop();
        expect(scripted.log.map((entry) => entry.call)).toEqual([
            'factory',
            'start',
            'createSession',
            'send',
            'answer.userInput',
            'answer.userInput',
            'answer.elicitation',
            'answer.elicitation',
            'disconnect',
            'stop',
        ]);
        expect(scripted.log[0]).toEqual({ call: 'factory', options: { cliPath: '/c', workingDirectory: '/w', baseDirectory: '/base' } });
        expect(scripted.log[2]).toEqual({ call: 'createSession', workingDirectory: '/work/project', model: 'm', trustWorkingDirectory: true });
    });

    it('AC-020: exit() reaches the listeners of the client; errors and answers of status calls follow the options', async () => {
        const clock = createFakeRuntimeClock();
        const scripted = createScriptedClient({
            clock,
            status: { version: '1.0.99', protocolVersion: 4 },
            auth: { isAuthenticated: false },
            models: ['a'],
            startError: new Error('boom'),
            todos: [{ title: 't', status: 'done' }],
        });
        const client = scripted.factory({ cliPath: '/c', workingDirectory: '/w' });
        const exits: number[] = [];
        client.onExit((exit) => void exits.push(exit.code ?? -1));
        await expect(client.start()).rejects.toThrow('boom');
        expect(await client.getStatus()).toEqual({ version: '1.0.99', protocolVersion: 4 });
        expect(await client.getAuthStatus()).toEqual({ isAuthenticated: false });
        expect(await client.listModels()).toEqual(['a']);
        expect(await (await client.createSession(config([]))).readTodos()).toEqual([{ title: 't', status: 'done' }]);
        scripted.exit({ code: 7, message: 'gone' });
        expect(exits).toEqual([7]);
    });

    it('AC-019: resumeSession logs the session ID and replays the resume script', async () => {
        const clock = createFakeRuntimeClock();
        const scripted = createScriptedClient({ clock, onResume: toSteps(recordedRows('M-05', 's2-resumed')).slice(0, 1) });
        const received: string[] = [];
        const session = await scripted.factory({ cliPath: '/c', workingDirectory: '/w' }).resumeSession('old-session', config(received));
        expect(session.sessionId).toBe('old-session');
        expect(received).toEqual([`event:${events(toSteps(recordedRows('M-05', 's2-resumed')))[0]?.type ?? ''}`]);
        expect(scripted.log.find((entry) => entry.call === 'resumeSession')).toMatchObject({ sessionId: 'old-session' });
    });
});

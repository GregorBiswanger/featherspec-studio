import { beforeEach, describe, expect, it, vi } from 'vitest';

const host = vi.hoisted(() => ({
    executed: [] as unknown[][],
    result: undefined as unknown,
}));

vi.mock('vscode', () => ({
    commands: {
        executeCommand: (...args: unknown[]) => {
            host.executed.push(args);
            return host.result;
        },
    },
}));

import { createAssistantHost } from './assistantHost';

describe('0024 T-001: the assistant host executes a command', () => {
    beforeEach(() => {
        host.executed = [];
        host.result = undefined;
    });

    it('passes the command and its arguments through, an undefined argument kept in place', async () => {
        await createAssistantHost().execute('some.command', [undefined, 'line']);
        expect(host.executed).toEqual([['some.command', undefined, 'line']]);
    });

    it('passes no argument when there is none', async () => {
        await createAssistantHost().execute('some.command', []);
        expect(host.executed).toEqual([['some.command']]);
    });

    it('resolves with the host result and rejects with the host error', async () => {
        host.result = Promise.resolve(7);
        await expect(createAssistantHost().execute('a', [])).resolves.toBe(7);
        host.result = Promise.reject(new Error('boom'));
        await expect(createAssistantHost().execute('a', [])).rejects.toThrow('boom');
    });
});

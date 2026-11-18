import { beforeEach, describe, expect, it, vi } from 'vitest';

const host = vi.hoisted(() => ({
    executed: [] as unknown[][],
    result: undefined as unknown,
    extensions: new Map<string, { isActive: boolean; activate: () => Promise<unknown> }>(),
    asked: [] as string[],
    commandList: ['a.b'] as string[],
    commandsAsked: [] as unknown[],
    changeListeners: [] as Array<() => void>,
    disposed: 0,
}));

vi.mock('vscode', () => ({
    commands: {
        executeCommand: (...args: unknown[]) => {
            host.executed.push(args);
            return host.result;
        },
        getCommands: (filterInternal?: boolean) => {
            host.commandsAsked.push(filterInternal);
            return Promise.resolve(host.commandList);
        },
    },
    extensions: {
        getExtension: (id: string) => {
            host.asked.push(id);
            return host.extensions.get(id);
        },
        onDidChange: (listener: () => void) => {
            host.changeListeners.push(listener);
            return { dispose: () => void (host.disposed += 1) };
        },
    },
}));

import type { AssistantHostPort } from '../../core/ports/assistant';
import { createAssistantHost } from './assistantHost';

describe('0024 T-001: the assistant host executes a command', () => {
    beforeEach(() => {
        host.executed = [];
        host.result = undefined;
        host.extensions = new Map();
        host.asked = [];
        host.commandList = ['a.b'];
        host.commandsAsked = [];
        host.changeListeners = [];
        host.disposed = 0;
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

    it('extension returns undefined for a missing ID and the active state for a present one', () => {
        const assistant: AssistantHostPort = createAssistantHost();
        expect(assistant.extension('x.missing')).toBeUndefined();
        host.extensions.set('x.here', { isActive: false, activate: async () => undefined });
        expect(assistant.extension('x.here')).toEqual({ active: false });
        host.extensions.set('x.live', { isActive: true, activate: async () => undefined });
        expect(assistant.extension('x.live')).toEqual({ active: true });
        expect(host.asked).toEqual(['x.missing', 'x.here', 'x.live']);
    });

    it('activate activates the extension and resolves with nothing; a missing extension rejects; a failing activation rejects', async () => {
        const assistant = createAssistantHost();
        let activated = 0;
        host.extensions.set('x.here', { isActive: false, activate: async () => void (activated += 1) });
        await expect(assistant.activate('x.here')).resolves.toBeUndefined();
        expect(activated).toBe(1);
        await expect(assistant.activate('x.missing')).rejects.toThrow('x.missing');
        host.extensions.set('x.bad', { isActive: false, activate: () => Promise.reject(new Error('no luck')) });
        await expect(assistant.activate('x.bad')).rejects.toThrow('no luck');
    });

    it('commands lists the registered commands without the internal ones', async () => {
        host.commandList = ['one', 'two'];
        await expect(createAssistantHost().commands()).resolves.toEqual(['one', 'two']);
        expect(host.commandsAsked).toEqual([true]);
    });

    it('onDidChangeExtensions fires the listener on the host event and disposes the host subscription', () => {
        const assistant = createAssistantHost();
        let calls = 0;
        const subscription = assistant.onDidChangeExtensions(() => (calls += 1));
        host.changeListeners.forEach((listener) => listener());
        expect(calls).toBe(1);
        subscription.dispose();
        expect(host.disposed).toBe(1);
    });
});

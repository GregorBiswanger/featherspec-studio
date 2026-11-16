import { describe, expect, it } from 'vitest';
import type { ShellView } from '../../shared/protocol/messages';
import { createShellSelection } from './shellSelection';

function fake(selection: ShellView['selection']) {
    const listeners: ((view: ShellView) => void)[] = [];
    const view = { selection } as ShellView;
    return {
        service: {
            view: () => view,
            onDidChangeView(listener: (view: ShellView) => void) {
                listeners.push(listener);
                return { dispose: () => void listeners.splice(listeners.indexOf(listener), 1) };
            },
        },
        fire: () => listeners.forEach((listener) => listener(view)),
        count: () => listeners.length,
    };
}

describe('selection of the shell as the board selection source', () => {
    it('AC-028: reports the stem, and the path only where the shell has one', () => {
        expect(createShellSelection(fake({ stem: '0001-a', number: '0001' }).service).selection()).toEqual({ stem: '0001-a' });
        expect(createShellSelection(fake({ stem: '0001-a', path: '.specs/active/0001-a.md', number: '0001' }).service).selection()).toEqual({ stem: '0001-a', path: '.specs/active/0001-a.md' });
        expect(createShellSelection(fake(undefined).service).selection()).toBeUndefined();
    });

    it('tells the listener on every view change until it is disposed', () => {
        const { service, fire, count } = fake(undefined);
        let calls = 0;
        const subscription = createShellSelection(service).onDidChange(() => (calls += 1));
        fire();
        subscription.dispose();
        fire();
        expect(calls).toBe(1);
        expect(count()).toBe(0);
    });
});

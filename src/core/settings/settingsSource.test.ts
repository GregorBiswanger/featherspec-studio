import { describe, expect, it } from 'vitest';
import type { Disposable, SettingPort } from '../ports/host';
import { createSettingsSource } from './settingsSource';

function fakePort(initial: unknown): SettingPort & { value: unknown; fire(): void; listeners(): number } {
    const listeners = new Set<() => void>();
    return {
        value: initial,
        read() {
            return this.value;
        },
        onDidChange(listener): Disposable {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
        fire() {
            [...listeners].forEach((listener) => listener());
        },
        listeners: () => listeners.size,
    };
}

describe('0021 AC-011: the generic settings source', () => {
    it('read parses the current values of every port, fresh at each call', () => {
        const first = fakePort(1);
        const second = fakePort('b');
        const source = createSettingsSource([first, second], (values) => values.join('|'));
        expect(source.read()).toBe('1|b');
        first.value = 2;
        expect(source.read()).toBe('2|b');
    });

    it('a change of either port notifies, and dispose stops both', () => {
        const first = fakePort(1);
        const second = fakePort(2);
        const source = createSettingsSource([first, second], (values) => values);
        let calls = 0;
        const subscription = source.onDidChange(() => (calls += 1));
        first.fire();
        second.fire();
        expect(calls).toBe(2);
        subscription.dispose();
        first.fire();
        second.fire();
        expect(calls).toBe(2);
        expect([first.listeners(), second.listeners()]).toEqual([0, 0]);
    });

    it('a source without a listener holds no subscription on its ports', () => {
        const port = fakePort(1);
        createSettingsSource([port], (values) => values);
        expect(port.listeners()).toBe(0);
    });
});

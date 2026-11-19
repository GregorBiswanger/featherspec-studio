import { beforeEach, describe, expect, it, vi } from 'vitest';

const host = vi.hoisted(() => {
    const state = {
        values: {} as Record<string, unknown>,
        sections: [] as string[],
        listeners: [] as Array<(event: { affectsConfiguration(section: string): boolean }) => void>,
        updates: 0,
        disposed: 0,
    };
    return state;
});

vi.mock('vscode', () => ({
    workspace: {
        getConfiguration: (section: string) => {
            host.sections.push(section);
            return {
                get: (key: string) => host.values[`${section}.${key}`],
                update: () => {
                    host.updates += 1;
                },
                inspect: () => undefined,
            };
        },
        onDidChangeConfiguration: (listener: (event: { affectsConfiguration(section: string): boolean }) => void) => {
            host.listeners.push(listener);
            return { dispose: () => void (host.disposed += 1) };
        },
    },
}));

import { createSettingPort } from './settings';

function affects(changed: readonly string[], section: string): boolean {
    return changed.some((key) => key === section || key.startsWith(`${section}.`) || section.startsWith(`${key}.`));
}

function change(...changed: string[]): void {
    host.listeners.forEach((listener) => listener({ affectsConfiguration: (section) => affects(changed, section) }));
}

describe('0021 AC-011, AC-017: the setting port of the host', () => {
    beforeEach(() => {
        host.values = {};
        host.sections = [];
        host.listeners = [];
        host.updates = 0;
        host.disposed = 0;
    });

    it('reads its key under the featherspec-studio section, fresh at each call', () => {
        const port = createSettingPort('showStepTips');
        host.values['featherspec-studio.showStepTips'] = false;
        expect(port.read()).toBe(false);
        host.values['featherspec-studio.showStepTips'] = true;
        expect(port.read()).toBe(true);
        expect(host.sections.every((section) => section === 'featherspec-studio')).toBe(true);
    });

    it('fires only when its own key changed', () => {
        const port = createSettingPort('modelHints');
        let calls = 0;
        port.onDidChange(() => (calls += 1));
        change('featherspec-studio.showStepTips');
        change('editor.fontSize');
        expect(calls).toBe(0);
        change('featherspec-studio.modelHints');
        expect(calls).toBe(1);
        change('featherspec-studio.showStepTips', 'featherspec-studio.modelHints');
        expect(calls).toBe(2);
    });

    it('the host answers by section prefix: a change of another key of the section does not fire it, a change of the whole section does', () => {
        expect(affects(['featherspec-studio.showStepTips'], 'featherspec-studio')).toBe(true);
        expect(affects(['featherspec-studio.showStepTips'], 'featherspec-studio.modelHints')).toBe(false);
        expect(affects(['featherspec-studio'], 'featherspec-studio.modelHints')).toBe(true);
        expect(affects(['featherspec-studio2.modelHints'], 'featherspec-studio.modelHints')).toBe(false);
        const port = createSettingPort('modelHints');
        let calls = 0;
        port.onDidChange(() => (calls += 1));
        change('featherspec-studio.showStepTips');
        expect(calls).toBe(0);
        change('featherspec-studio');
        expect(calls).toBe(1);
    });

    it('dispose stops the listener, and the port never writes a setting', () => {
        const port = createSettingPort('modelHints');
        const subscription = port.onDidChange(() => undefined);
        port.read();
        subscription.dispose();
        expect(host.disposed).toBe(1);
        expect(host.updates).toBe(0);
    });
});

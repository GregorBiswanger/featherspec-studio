import { describe, expect, it } from 'vitest';
import type { Disposable, SettingPort } from '../ports/host';
import { createFakeRuntimeClock } from '../runtime/testing/fakes';
import { createProviderSetup } from './providerSetup';
import { declaredAdapter } from './testing/adapters';
import { createControlledAdapter } from './testing/controlledAdapter';
import type { ProviderEvent } from '../ports/agentProvider';

interface FakeSetting extends SettingPort {
    set(value: unknown): void;
    listeners(): number;
}

function setting(initial: unknown): FakeSetting {
    let value = initial;
    const listeners = new Set<() => void>();
    return {
        read: () => value,
        onDidChange(listener): Disposable {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
        set(next) {
            value = next;
            for (const listener of [...listeners]) {
                listener();
            }
        },
        listeners: () => listeners.size,
    };
}

function countingFactory(id = 'toggled') {
    const created: ReturnType<typeof createControlledAdapter>[] = [];
    let checks = 0;
    return {
        created,
        checks: () => checks,
        create() {
            const controlled = createControlledAdapter(id, {
                checkAvailability: () => {
                    checks += 1;
                    return Promise.resolve({ result: 'available' });
                },
            });
            created.push(controlled);
            return controlled.adapter;
        },
    };
}

describe('provider setup', () => {
    it('AC-012: a toggled provider is absent while its setting is off and no availability call happens at setup', () => {
        const enabled = setting(false);
        const factory = countingFactory();
        const setup = createProviderSetup({ clock: createFakeRuntimeClock(), toggled: [{ enabled, create: () => factory.create() }] });
        expect(setup.registry.list()).toEqual([]);
        expect(factory.checks()).toBe(0);
    });

    it('AC-012: a setting that is not exactly true (missing, a string) keeps the provider out', () => {
        for (const value of [undefined, 'true', 1, null]) {
            const factory = countingFactory();
            const setup = createProviderSetup({ clock: createFakeRuntimeClock(), toggled: [{ enabled: setting(value), create: () => factory.create() }] });
            expect(setup.registry.list()).toEqual([]);
        }
    });

    it('AC-012: switching on registers it without a reload, switching off removes it, on again registers once, no availability call anywhere', () => {
        const enabled = setting(false);
        const factory = countingFactory();
        const setup = createProviderSetup({ clock: createFakeRuntimeClock(), toggled: [{ enabled, create: () => factory.create() }] });
        enabled.set(true);
        expect(setup.registry.list().map((entry) => entry.id)).toEqual(['toggled']);
        enabled.set(true);
        expect(setup.registry.list()).toHaveLength(1);
        enabled.set(false);
        expect(setup.registry.list()).toEqual([]);
        enabled.set(true);
        expect(setup.registry.list()).toHaveLength(1);
        expect(factory.checks()).toBe(0);
    });

    it('AC-012: a provider whose setting is already on at setup is registered at once', () => {
        const factory = countingFactory();
        const setup = createProviderSetup({ clock: createFakeRuntimeClock(), toggled: [{ enabled: setting(true), create: () => factory.create() }] });
        expect(setup.registry.list().map((entry) => entry.id)).toEqual(['toggled']);
    });

    it('AC-012: a run already started continues to its end kind after the provider is switched off', async () => {
        const enabled = setting(true);
        const factory = countingFactory();
        const setup = createProviderSetup({ clock: createFakeRuntimeClock(), toggled: [{ enabled, create: () => factory.create() }] });
        const events: ProviderEvent[] = [];
        setup.service.onEvent((event) => events.push(event));
        await setup.service.start('toggled', { runId: 'run-1', workingDirectory: '/p', prompt: 'p' });
        enabled.set(false);
        expect(setup.registry.list()).toEqual([]);
        expect(await setup.service.start('toggled', { runId: 'run-2', workingDirectory: '/p', prompt: 'p' })).toEqual({ kind: 'not-registered', providerId: 'toggled' });
        const first = factory.created[0];
        first?.sink('run-1').emit({ kind: 'turn.started', source: 'provider', payload: {} });
        expect(await setup.service.cancel('run-1')).toEqual({ kind: 'ok' });
        first?.sink('run-1').emit({ kind: 'run.cancelled', source: 'provider', payload: {} });
        expect(events.map((event) => event.kind)).toEqual(['turn.started', 'run.cancelled']);
    });

    it('AC-012: fixed adapters are registered at setup and stay, and the service reads the same registry', async () => {
        const setup = createProviderSetup({ clock: createFakeRuntimeClock(), adapters: [declaredAdapter('fixed')] });
        expect(setup.registry.list().map((entry) => entry.id)).toEqual(['fixed']);
        expect(await setup.service.listModels('fixed')).toEqual({ kind: 'ok', models: [] });
    });

    it('AC-012: dispose stops listening to the settings', () => {
        const enabled = setting(false);
        const factory = countingFactory();
        const setup = createProviderSetup({ clock: createFakeRuntimeClock(), toggled: [{ enabled, create: () => factory.create() }] });
        expect(enabled.listeners()).toBe(1);
        setup.dispose();
        expect(enabled.listeners()).toBe(0);
        enabled.set(true);
        expect(setup.registry.list()).toEqual([]);
    });

    it('AC-010: the credential port of the setup sees the credentials of a registered toggled provider', () => {
        const enabled = setting(true);
        const setup = createProviderSetup({
            clock: createFakeRuntimeClock(),
            toggled: [{ enabled, create: () => declaredAdapter('toggled', { credentialValues: () => ['secret-1'] }) }],
        });
        expect(setup.service.credentials.values()).toEqual(['secret-1']);
    });
});

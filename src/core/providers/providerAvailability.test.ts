import { describe, expect, it } from 'vitest';
import { createFakeRuntimeClock } from '../runtime/testing/fakes';
import { createProviderService } from './providerService';
import { createProviderRegistry } from './registry';
import { declaredAdapter } from './testing/adapters';
import { createControlledAdapter } from './testing/controlledAdapter';
import {
    AVAILABILITY_REASONS,
    AVAILABILITY_RESULTS,
    AVAILABILITY_TIMEOUT_HINT,
    AVAILABILITY_TIMEOUT_MS,
    type AvailabilityResult,
} from './vocabulary';

function setup(report: () => Promise<{ result: AvailabilityResult; hint?: string }>) {
    const clock = createFakeRuntimeClock();
    const registry = createProviderRegistry();
    let checks = 0;
    const adapter = declaredAdapter('alpha', {
        checkAvailability: () => {
            checks += 1;
            return report();
        },
    });
    const service = createProviderService({ registry, clock });
    return { clock, registry, adapter, service, checks: () => checks };
}

describe('provider service: availability', () => {
    it('AC-010: each of the five results is returned with the generic reason, none for available, and the adapter hint kept', async () => {
        for (const result of AVAILABILITY_RESULTS) {
            const w = setup(() => Promise.resolve({ result, hint: 'run the installer' }));
            w.registry.register(w.adapter);
            const answer = await w.service.checkAvailability('alpha');
            if (result === 'available') {
                expect(answer).toEqual({ kind: 'ok', result, hint: 'run the installer' });
            } else {
                expect(answer).toEqual({ kind: 'ok', result, reason: AVAILABILITY_REASONS[result], hint: 'run the installer' });
            }
        }
        const plain = setup(() => Promise.resolve({ result: 'not-installed' }));
        plain.registry.register(plain.adapter);
        expect(await plain.service.checkAvailability('alpha')).toEqual({ kind: 'ok', result: 'not-installed', reason: AVAILABILITY_REASONS['not-installed'] });
    });

    it('AC-010: a provider that is not registered answers not registered', async () => {
        const w = setup(() => Promise.resolve({ result: 'available' }));
        expect(await w.service.checkAvailability('alpha')).toEqual({ kind: 'not-registered', providerId: 'alpha' });
    });

    it('AC-010: a check that throws or rejects is unknown with the generic reason', async () => {
        const rejecting = setup(() => Promise.reject(new Error('probe crashed')));
        rejecting.registry.register(rejecting.adapter);
        expect(await rejecting.service.checkAvailability('alpha')).toEqual({ kind: 'ok', result: 'unknown', reason: AVAILABILITY_REASONS.unknown });
        const throwing = setup(() => {
            throw new Error('sync crash');
        });
        throwing.registry.register(throwing.adapter);
        expect(await throwing.service.checkAvailability('alpha')).toEqual({ kind: 'ok', result: 'unknown', reason: AVAILABILITY_REASONS.unknown });
    });

    it('AC-010: a result outside the five is unknown', async () => {
        const w = setup(() => Promise.resolve({ result: 'perhaps' as AvailabilityResult }));
        w.registry.register(w.adapter);
        expect(await w.service.checkAvailability('alpha')).toMatchObject({ kind: 'ok', result: 'unknown' });
    });

    it('AC-010: no answer within the timeout is unknown with the timeout hint, and a late answer changes nothing', async () => {
        let answer: (value: { result: AvailabilityResult }) => void = () => undefined;
        const w = setup(() => new Promise((resolve) => (answer = resolve)));
        w.registry.register(w.adapter);
        const pending = w.service.checkAvailability('alpha');
        w.clock.advance(AVAILABILITY_TIMEOUT_MS - 1);
        let settled = false;
        void pending.then(() => (settled = true));
        await Promise.resolve();
        expect(settled).toBe(false);
        w.clock.advance(1);
        expect(await pending).toEqual({ kind: 'ok', result: 'unknown', reason: AVAILABILITY_REASONS.unknown, hint: AVAILABILITY_TIMEOUT_HINT });
        answer({ result: 'available' });
    });

    it('AC-010: an answer in time cancels the timeout timer', async () => {
        const w = setup(() => Promise.resolve({ result: 'available' }));
        w.registry.register(w.adapter);
        await w.service.checkAvailability('alpha');
        expect(w.clock.pendingTimers()).toBe(0);
    });

    it('AC-010: registering, reading the registry, listing and creating the service cause no availability call, a check causes exactly one', async () => {
        const w = setup(() => Promise.resolve({ result: 'available' }));
        w.registry.register(w.adapter);
        w.registry.list();
        w.registry.entry('alpha');
        w.registry.nextStartModel('alpha');
        w.registry.unregister('alpha');
        w.registry.register(w.adapter);
        expect(w.checks()).toBe(0);
        await w.service.checkAvailability('alpha');
        expect(w.checks()).toBe(1);
    });
});

describe('provider service: credentials', () => {
    it('AC-022: the credential port returns the union of registered adapters and adapters of runs already started', async () => {
        const clock = createFakeRuntimeClock();
        const registry = createProviderRegistry();
        const alpha = createControlledAdapter('alpha', { credentialValues: () => ['key-a', 'shared'] });
        const beta = createControlledAdapter('beta', { credentialValues: () => ['key-b', 'shared', ''] });
        registry.register(alpha.adapter);
        registry.register(beta.adapter);
        const service = createProviderService({ registry, clock });
        expect([...service.credentials.values()].sort()).toEqual(['key-a', 'key-b', 'shared']);
        await service.start('beta', { runId: 'b-1', workingDirectory: '/p', prompt: 'p' });
        registry.unregister('beta');
        expect([...service.credentials.values()].sort()).toEqual(['key-a', 'key-b', 'shared']);
        registry.unregister('alpha');
        expect([...service.credentials.values()].sort()).toEqual(['key-b', 'shared']);
    });

    it('AC-022: values are read at call time and an adapter that throws is skipped', () => {
        const clock = createFakeRuntimeClock();
        const registry = createProviderRegistry();
        let secret = 'one';
        registry.register(declaredAdapter('alpha', { credentialValues: () => [secret] }));
        registry.register(
            declaredAdapter('broken', {
                credentialValues: () => {
                    throw new Error('vault locked');
                },
            }),
        );
        const service = createProviderService({ registry, clock });
        expect(service.credentials.values()).toEqual(['one']);
        secret = 'two';
        expect(service.credentials.values()).toEqual(['two']);
    });
});

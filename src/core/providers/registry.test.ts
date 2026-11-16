import { describe, expect, it, vi } from 'vitest';
import { createProviderRegistry } from './registry';
import { declarationWith, declaredAdapter, fullDeclaration } from './testing/adapters';
import { CAPABILITIES, type CapabilityDeclaration } from './vocabulary';

function refusal(result: { kind: string }): string {
    return result.kind === 'refused' ? (result as { kind: 'refused'; reason: string }).reason : '';
}

describe('provider registry', () => {
    it('AC-003: lists ID, display name, declaration, permission-mode label and disclosure of every registered provider', () => {
        const registry = createProviderRegistry();
        expect(registry.list()).toEqual([]);
        expect(registry.register(declaredAdapter('alpha', { displayName: 'Alpha', permissionModeLabel: 'Label A', disclosure: 'Sends code to A' }))).toEqual({ kind: 'ok' });
        expect(registry.register(declaredAdapter('beta', { displayName: 'Beta', permissionModeLabel: 'Label B' }))).toEqual({ kind: 'ok' });
        expect(registry.list()).toEqual([
            { id: 'alpha', displayName: 'Alpha', capabilities: fullDeclaration(), permissionModeLabel: 'Label A', disclosure: 'Sends code to A' },
            { id: 'beta', displayName: 'Beta', capabilities: fullDeclaration(), permissionModeLabel: 'Label B' },
        ]);
        expect(registry.entry('beta')).toEqual({
            kind: 'ok',
            entry: { id: 'beta', displayName: 'Beta', capabilities: fullDeclaration(), permissionModeLabel: 'Label B' },
        });
        expect(registry.adapter('alpha')?.id).toBe('alpha');
        expect(registry.adapters().map((adapter) => adapter.id)).toEqual(['alpha', 'beta']);
    });

    it('AC-003: an ID that is not registered answers not registered, also after unregister', () => {
        const registry = createProviderRegistry();
        expect(registry.entry('ghost')).toEqual({ kind: 'not-registered', providerId: 'ghost' });
        expect(registry.nextStartModel('ghost')).toEqual({ kind: 'not-registered', providerId: 'ghost' });
        expect(registry.adapter('ghost')).toBeUndefined();
        registry.register(declaredAdapter('alpha'));
        registry.unregister('alpha');
        registry.unregister('never-there');
        expect(registry.entry('alpha')).toEqual({ kind: 'not-registered', providerId: 'alpha' });
        expect(registry.list()).toEqual([]);
    });

    it('AC-003: the next-start model is what the adapter reports now, or none', () => {
        const registry = createProviderRegistry();
        let model: string | undefined;
        registry.register(declaredAdapter('alpha', { nextStartModel: () => model }));
        expect(registry.nextStartModel('alpha')).toEqual({ kind: 'ok', model: undefined });
        model = 'gpt-x';
        expect(registry.nextStartModel('alpha')).toEqual({ kind: 'ok', model: 'gpt-x' });
    });

    it('AC-004: refuses an existing ID, naming it, and keeps the registry unchanged', () => {
        const registry = createProviderRegistry();
        registry.register(declaredAdapter('alpha', { displayName: 'First' }));
        const result = registry.register(declaredAdapter('alpha', { displayName: 'Second' }));
        expect(result.kind).toBe('refused');
        expect(refusal(result)).toContain("'alpha'");
        expect(refusal(result)).toContain('already registered');
        expect(registry.list().map((entry) => entry.displayName)).toEqual(['First']);
    });

    it('AC-004: refuses an empty ID and a not lowercase ID', () => {
        const registry = createProviderRegistry();
        const empty = registry.register(declaredAdapter(''));
        const blank = registry.register(declaredAdapter('   '));
        const upper = registry.register(declaredAdapter('Copilot'));
        expect([empty.kind, blank.kind, upper.kind]).toEqual(['refused', 'refused', 'refused']);
        expect(refusal(empty)).toContain('empty');
        expect(refusal(upper)).toContain("'Copilot'");
        expect(refusal(upper)).toContain('lowercase');
        expect(registry.list()).toEqual([]);
    });

    it('AC-004: refuses a declaration with a missing capability, an added one, an unknown value or start none', () => {
        const registry = createProviderRegistry();
        const missing: Record<string, unknown> = { ...fullDeclaration() };
        delete missing.usage;
        const added: Record<string, unknown> = { ...fullDeclaration(), teleport: { value: 'native' } };
        const badValue: Record<string, unknown> = { ...fullDeclaration(), usage: { value: 'maybe' } };
        const noStart = declarationWith({ start: 'none' });
        const notObject: Record<string, unknown> = { ...fullDeclaration(), usage: 'native' };
        const cases: [string, unknown, string][] = [
            ['p-missing', missing, 'usage'],
            ['p-added', added, 'teleport'],
            ['p-value', badValue, 'maybe'],
            ['p-start', noStart, 'start'],
            ['p-shape', notObject, 'usage'],
        ];
        for (const [id, declaration, defect] of cases) {
            const result = registry.register(declaredAdapter(id, { capabilities: declaration as CapabilityDeclaration }));
            expect(result.kind).toBe('refused');
            expect(refusal(result)).toContain(`'${id}'`);
            expect(refusal(result)).toContain(defect);
        }
        expect(registry.list()).toEqual([]);
    });

    it('AC-004: refuses an experimental marker beside none or with a value other than true', () => {
        const registry = createProviderRegistry();
        const beside = { ...fullDeclaration(), mcp: { value: 'none', experimental: true } } as CapabilityDeclaration;
        const wrong = { ...fullDeclaration(), usage: { value: 'native', experimental: 'yes' } } as unknown as CapabilityDeclaration;
        expect(registry.register(declaredAdapter('p-one', { capabilities: beside })).kind).toBe('refused');
        expect(registry.register(declaredAdapter('p-two', { capabilities: wrong })).kind).toBe('refused');
        expect(registry.list()).toEqual([]);
    });

    it('AC-005: reports each capability exactly as declared, all three values and the marker', () => {
        const registry = createProviderRegistry();
        const declaration: CapabilityDeclaration = {
            ...fullDeclaration(),
            start: { value: 'native' },
            cancel: { value: 'derived' },
            resume: { value: 'none' },
            streamText: { value: 'native', experimental: true },
            usage: { value: 'derived', experimental: true },
        };
        expect(registry.register(declaredAdapter('alpha', { capabilities: declaration }))).toEqual({ kind: 'ok' });
        const reported = registry.list()[0]?.capabilities;
        expect(reported).toEqual(declaration);
        expect(Object.keys(reported ?? {}).sort()).toEqual([...CAPABILITIES].sort());
        expect(reported?.streamText).toEqual({ value: 'native', experimental: true });
        expect(reported?.resume).toEqual({ value: 'none' });
        expect(reported?.cancel).toEqual({ value: 'derived' });
        expect(reported?.resume).not.toHaveProperty('experimental');
    });

    it('AC-005: the declaration is fixed at registration, a later change by the adapter does not alter it', () => {
        const registry = createProviderRegistry();
        const declaration = fullDeclaration();
        registry.register(declaredAdapter('alpha', { capabilities: declaration }));
        declaration.cancel = { value: 'none' };
        expect(registry.entry('alpha')).toMatchObject({ entry: { capabilities: { cancel: { value: 'native' } } } });
    });

    it('AC-003: notifies a listener on a registration and a removal, not on a refusal or removal of an unknown ID', () => {
        const registry = createProviderRegistry();
        const listener = vi.fn();
        const subscription = registry.onDidChange(listener);
        registry.register(declaredAdapter('alpha'));
        expect(listener).toHaveBeenCalledTimes(1);
        registry.register(declaredAdapter('alpha'));
        registry.unregister('ghost');
        expect(listener).toHaveBeenCalledTimes(1);
        registry.unregister('alpha');
        expect(listener).toHaveBeenCalledTimes(2);
        subscription.dispose();
        registry.register(declaredAdapter('beta'));
        expect(listener).toHaveBeenCalledTimes(2);
    });

    it('AC-003: a throwing listener does not break the registry or the other listeners', () => {
        const registry = createProviderRegistry();
        const second = vi.fn();
        registry.onDidChange(() => {
            throw new Error('boom');
        });
        registry.onDidChange(second);
        expect(registry.register(declaredAdapter('alpha')).kind).toBe('ok');
        expect(second).toHaveBeenCalledTimes(1);
        expect(registry.list()).toHaveLength(1);
    });
});

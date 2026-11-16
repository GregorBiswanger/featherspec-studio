import type { AgentProviderPort } from '../ports/agentProvider';
import type { Disposable } from '../ports/host';
import { CAPABILITIES, CAPABILITY_VALUES, type CapabilityDeclaration } from './vocabulary';

export interface ProviderEntry {
    id: string;
    displayName: string;
    capabilities: CapabilityDeclaration;
    permissionModeLabel: string;
    disclosure?: string;
}

export type RegisterResult = { kind: 'ok' } | { kind: 'refused'; reason: string };
export type NotRegistered = { kind: 'not-registered'; providerId: string };

export interface ProviderRegistry {
    register(adapter: AgentProviderPort): RegisterResult;
    unregister(id: string): void;
    list(): readonly ProviderEntry[];
    entry(id: string): { kind: 'ok'; entry: ProviderEntry } | NotRegistered;
    nextStartModel(id: string): { kind: 'ok'; model: string | undefined } | NotRegistered;
    adapter(id: string): AgentProviderPort | undefined;
    adapters(): readonly AgentProviderPort[];
    onDidChange(listener: () => void): Disposable;
}

function declarationDefect(declaration: unknown): string | undefined {
    if (typeof declaration !== 'object' || declaration === null) {
        return 'the capability declaration is missing';
    }
    const record = declaration as Record<string, unknown>;
    for (const name of Object.keys(record)) {
        if (!(CAPABILITIES as readonly string[]).includes(name)) {
            return `capability '${name}' is not in the closed list`;
        }
    }
    for (const capability of CAPABILITIES) {
        const declared = record[capability];
        if (declared === undefined) {
            return `capability '${capability}' is not declared`;
        }
        if (typeof declared !== 'object' || declared === null) {
            return `capability '${capability}' is not declared as { value }`;
        }
        const { value, experimental } = declared as { value?: unknown; experimental?: unknown };
        if (!(CAPABILITY_VALUES as readonly unknown[]).includes(value)) {
            return `capability '${capability}' has the value '${String(value)}', expected one of ${CAPABILITY_VALUES.join(', ')}`;
        }
        if (capability === 'start' && value === 'none') {
            return "capability 'start' must not be 'none'";
        }
        if (experimental !== undefined && (experimental !== true || value === 'none')) {
            return `capability '${capability}' carries the experimental marker without a value other than 'none'`;
        }
    }
    return undefined;
}

function copyDeclaration(declaration: CapabilityDeclaration): CapabilityDeclaration {
    const copy = {} as CapabilityDeclaration;
    for (const capability of CAPABILITIES) {
        const declared = declaration[capability];
        copy[capability] = declared.experimental === true ? { value: declared.value, experimental: true } : { value: declared.value };
    }
    return copy;
}

export function createProviderRegistry(): ProviderRegistry {
    const adapters = new Map<string, { adapter: AgentProviderPort; entry: ProviderEntry }>();
    const listeners = new Set<() => void>();

    const notify = (): void => {
        for (const listener of [...listeners]) {
            try {
                listener();
            } catch {
                continue;
            }
        }
    };

    return {
        register(adapter) {
            const id = adapter.id;
            if (typeof id !== 'string' || id.trim() === '') {
                return { kind: 'refused', reason: `Provider '${String(id)}' refused: the ID is empty.` };
            }
            if (id !== id.toLowerCase()) {
                return { kind: 'refused', reason: `Provider '${id}' refused: the ID is not lowercase.` };
            }
            if (adapters.has(id)) {
                return { kind: 'refused', reason: `Provider '${id}' refused: the ID is already registered.` };
            }
            const defect = declarationDefect(adapter.capabilities);
            if (defect !== undefined) {
                return { kind: 'refused', reason: `Provider '${id}' refused: ${defect}.` };
            }
            const entry: ProviderEntry = {
                id,
                displayName: adapter.displayName,
                capabilities: copyDeclaration(adapter.capabilities),
                permissionModeLabel: adapter.permissionModeLabel,
                ...(adapter.disclosure === undefined ? {} : { disclosure: adapter.disclosure }),
            };
            adapters.set(id, { adapter, entry });
            notify();
            return { kind: 'ok' };
        },
        unregister(id) {
            if (adapters.delete(id)) {
                notify();
            }
        },
        list: () => [...adapters.values()].map((held) => held.entry),
        entry(id) {
            const held = adapters.get(id);
            return held === undefined ? { kind: 'not-registered', providerId: id } : { kind: 'ok', entry: held.entry };
        },
        nextStartModel(id) {
            const held = adapters.get(id);
            return held === undefined ? { kind: 'not-registered', providerId: id } : { kind: 'ok', model: held.adapter.nextStartModel() };
        },
        adapter: (id) => adapters.get(id)?.adapter,
        adapters: () => [...adapters.values()].map((held) => held.adapter),
        onDidChange(listener) {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
    };
}

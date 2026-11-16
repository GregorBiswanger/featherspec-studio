import type { AgentProviderPort } from '../../ports/agentProvider';
import { CAPABILITIES, type Capability, type CapabilityDeclaration } from '../vocabulary';

export function fullDeclaration(overrides: Partial<CapabilityDeclaration> = {}): CapabilityDeclaration {
    const declaration = {} as CapabilityDeclaration;
    for (const capability of CAPABILITIES) {
        declaration[capability] = { value: capability === 'mcp' || capability === 'customTools' ? 'none' : 'native' };
    }
    return { ...declaration, ...overrides };
}

export function declarationWith(values: Partial<Record<Capability, 'native' | 'derived' | 'none'>>): CapabilityDeclaration {
    const declaration = fullDeclaration();
    for (const [capability, value] of Object.entries(values) as [Capability, 'native' | 'derived' | 'none'][]) {
        declaration[capability] = { value };
    }
    return declaration;
}

export function declaredAdapter(id: string, overrides: Partial<AgentProviderPort> = {}): AgentProviderPort {
    return {
        id,
        displayName: `Provider ${id}`,
        capabilities: fullDeclaration(),
        permissionModeLabel: 'Asks before every action',
        checkAvailability: () => Promise.resolve({ result: 'available' }),
        start: () => Promise.resolve(),
        resume: () => Promise.resolve(),
        cancel: () => Promise.resolve({ ok: true }),
        respondToApproval: () => Promise.resolve({ ok: true }),
        respondToInput: () => Promise.resolve({ ok: true }),
        endSession: () => undefined,
        listModels: () => Promise.resolve([]),
        nextStartModel: () => undefined,
        credentialValues: () => [],
        ...overrides,
    };
}

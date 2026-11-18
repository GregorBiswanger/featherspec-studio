import type { AssistantExtension, AssistantHostPort } from '../../ports/assistant';
import type { Disposable } from '../../ports/host';

export interface RecordedCall {
    command: string;
    args: readonly unknown[];
}

export interface FakeAssistantHost extends AssistantHostPort {
    calls: RecordedCall[];
    activated: string[];
    installed: Map<string, AssistantExtension & { activateRejects?: string; activateNever?: boolean }>;
    available: string[];
    rejects: Map<string, string>;
    never: Set<string>;
    install(id: string, state?: { active?: boolean; activateRejects?: string; activateNever?: boolean }): void;
    uninstall(id: string): void;
    fireExtensionsChanged(): void;
    listeners(): number;
}

export function createFakeAssistantHost(commands: readonly string[] = []): FakeAssistantHost {
    const listeners = new Set<() => void>();
    const host: FakeAssistantHost = {
        calls: [],
        activated: [],
        installed: new Map(),
        available: [...commands],
        rejects: new Map(),
        never: new Set(),
        install(id, state = {}) {
            host.installed.set(id, { active: state.active ?? true, ...(state.activateRejects === undefined ? {} : { activateRejects: state.activateRejects }), ...(state.activateNever === undefined ? {} : { activateNever: state.activateNever }) });
        },
        uninstall(id) {
            host.installed.delete(id);
        },
        extension: (id) => {
            const found = host.installed.get(id);
            return found === undefined ? undefined : { active: found.active };
        },
        async activate(id) {
            host.activated.push(id);
            const found = host.installed.get(id);
            if (found === undefined) {
                throw new Error(`extension ${id} is not installed`);
            }
            if (found.activateNever === true) {
                return new Promise<void>(() => undefined);
            }
            if (found.activateRejects !== undefined) {
                throw new Error(found.activateRejects);
            }
            found.active = true;
        },
        async commands() {
            return [...host.available];
        },
        async execute(command, args) {
            host.calls.push({ command, args });
            const message = host.rejects.get(command);
            if (message !== undefined) {
                throw new Error(message);
            }
            if (host.never.has(command)) {
                return new Promise<never>(() => undefined);
            }
            return undefined;
        },
        onDidChangeExtensions(listener): Disposable {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
        fireExtensionsChanged() {
            [...listeners].forEach((listener) => listener());
        },
        listeners: () => listeners.size,
    };
    return host;
}

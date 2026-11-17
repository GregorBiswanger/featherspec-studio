import type { AgentProviderPort } from '../ports/agentProvider';
import type { Disposable, SettingPort } from '../ports/host';
import type { RuntimeClock } from '../ports/runtimeMedium';
import { createProviderService, type ProviderService } from './providerService';
import { createProviderRegistry, type ProviderRegistry } from './registry';

export interface ToggledProvider {
    enabled: SettingPort;
    create(): AgentProviderPort;
}

export interface ProviderSetupOptions {
    clock: RuntimeClock;
    adapters?: readonly AgentProviderPort[];
    toggled?: readonly ToggledProvider[];
}

export interface ProviderSetup {
    registry: ProviderRegistry;
    service: ProviderService;
    dispose(): void;
}

export function createProviderSetup(options: ProviderSetupOptions): ProviderSetup {
    const registry = createProviderRegistry();
    const service = createProviderService({ registry, clock: options.clock });
    const subscriptions: Disposable[] = [];

    for (const adapter of options.adapters ?? []) {
        registry.register(adapter);
    }

    for (const toggle of options.toggled ?? []) {
        let registered: AgentProviderPort | undefined;
        const apply = (): void => {
            const wanted = toggle.enabled.read() === true;
            if (wanted && registered === undefined) {
                const adapter = toggle.create();
                if (registry.register(adapter).kind === 'ok') {
                    registered = adapter;
                }
            } else if (!wanted && registered !== undefined) {
                registry.unregister(registered.id);
                registered = undefined;
            }
        };
        apply();
        subscriptions.push(toggle.enabled.onDidChange(apply));
    }

    return {
        registry,
        service,
        dispose() {
            for (const subscription of subscriptions.splice(0)) {
                subscription.dispose();
            }
        },
    };
}

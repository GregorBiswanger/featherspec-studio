import type { Disposable, SettingPort } from '../ports/host';

export interface SettingsSource<T> {
    read(): T;
    onDidChange(listener: () => void): Disposable;
}

export function createSettingsSource<T>(ports: readonly SettingPort[], parse: (values: unknown[]) => T): SettingsSource<T> {
    return {
        read: () => parse(ports.map((port) => port.read())),
        onDidChange(listener) {
            const subscriptions = ports.map((port) => port.onDidChange(listener));
            return { dispose: () => subscriptions.forEach((subscription) => subscription.dispose()) };
        },
    };
}

import type { Disposable } from '../../ports/host';
import type { SettingsSource } from '../settingsSource';
import { parseStepTipSettings, type StepTipSettings } from '../stepTipSettings';

export interface FakeTips extends SettingsSource<StepTipSettings> {
    set(next: StepTipSettings): void;
}

export function createFakeTips(initial: StepTipSettings = parseStepTipSettings(false, {})): FakeTips {
    let current = initial;
    const listeners = new Set<() => void>();
    return {
        read: () => current,
        onDidChange(listener): Disposable {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
        set(next) {
            current = next;
            [...listeners].forEach((listener) => listener());
        },
    };
}

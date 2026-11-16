import type { LifecycleModel } from '../lifecycle/model';
import type { ProjectRead } from '../specs/readProject';
import type { Disposable } from './host';

export interface TrustPort {
    isTrusted(): boolean;
    onDidGrant(listener: () => void): Disposable;
}

export interface UiMemoryPort {
    get(): unknown;
    set(value: unknown): Promise<void>;
}

export interface ShellActionsPort {
    openFolder(): Promise<void>;
    openSetupGuide(): Promise<void>;
    showOutput(): void;
    manageTrust(): Promise<void>;
    reloadPanel(): void;
}

export interface ShellModel {
    project: ProjectRead;
    lifecycle: LifecycleModel;
}

export interface ShellModelSource {
    current(): ShellModel | undefined;
    updatedAt(): string;
    onDidChange(listener: () => void): Disposable;
}

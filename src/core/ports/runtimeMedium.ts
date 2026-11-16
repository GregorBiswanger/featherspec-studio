import type { Disposable } from './host';

export interface MediumLine {
    text: string;
    terminated: boolean;
}

export interface RuntimeMedium {
    open(): Promise<void>;
    read(name: string): Promise<string | undefined>;
    lines(name: string): AsyncIterable<MediumLine>;
    append(name: string, text: string): Promise<void>;
    replace(name: string, text: string): Promise<void>;
    createExclusive(name: string, text: string): Promise<boolean>;
    remove(name: string): Promise<void>;
    list(directory: string): Promise<string[]>;
}

export interface RuntimeClock {
    epochMs(): number;
    setTimeout(callback: () => void, milliseconds: number): Disposable;
}

export interface IdSource {
    newId(): string;
}

export interface CredentialValuesPort {
    values(): readonly string[];
}

export interface RuntimeNoticePort {
    show(message: string): void;
}

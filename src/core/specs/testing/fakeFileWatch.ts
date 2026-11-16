import type { Disposable } from '../../ports/host';
import type { FileWatchPort } from '../../ports/fileWatch';

export interface FakeFileWatch extends FileWatchPort {
    watched(): string[];
    fire(root: string, relativePath: string): void;
}

export function createFakeFileWatch(): FakeFileWatch {
    const registrations: { root: string; listener: (relativePath: string) => void }[] = [];
    return {
        watch(root, listener): Disposable {
            const registration = { root, listener };
            registrations.push(registration);
            return { dispose: () => void registrations.splice(registrations.indexOf(registration), 1) };
        },
        watched: () => registrations.map((registration) => registration.root),
        fire(root, relativePath) {
            registrations.filter((registration) => registration.root === root).forEach((registration) => registration.listener(relativePath));
        },
    };
}

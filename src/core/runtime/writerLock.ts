import type { RuntimeClock, RuntimeMedium } from '../ports/runtimeMedium';
import { LOCK_STALE_MS } from './model';

const LOCK_FILE = 'lock.json';

interface LockContent {
    owner: string;
    heartbeatAt: number;
}

export type LockPeek = { kind: 'free' } | { kind: 'stale' } | { kind: 'held'; owner: string } | { kind: 'mine' };

export interface WriterLock {
    tryAcquire(): Promise<boolean>;
    peek(): Promise<LockPeek>;
    heartbeat(): Promise<boolean>;
    release(): Promise<void>;
}

function parseLock(text: string | undefined): LockContent | undefined | 'broken' {
    if (text === undefined) {
        return undefined;
    }
    try {
        const value: unknown = JSON.parse(text);
        if (typeof value === 'object' && value !== null) {
            const candidate = value as Record<string, unknown>;
            if (typeof candidate['owner'] === 'string' && typeof candidate['heartbeatAt'] === 'number') {
                return { owner: candidate['owner'], heartbeatAt: candidate['heartbeatAt'] };
            }
        }
    } catch {
        return 'broken';
    }
    return 'broken';
}

export function createWriterLock(medium: RuntimeMedium, clock: RuntimeClock, owner: string): WriterLock {
    const content = (): string => JSON.stringify({ owner, heartbeatAt: clock.epochMs() });

    async function current(): Promise<LockContent | undefined | 'broken'> {
        return parseLock(await medium.read(LOCK_FILE));
    }

    function isStale(lock: LockContent | 'broken'): boolean {
        return lock === 'broken' || clock.epochMs() - lock.heartbeatAt > LOCK_STALE_MS;
    }

    return {
        async tryAcquire() {
            if (await medium.createExclusive(LOCK_FILE, content())) {
                return true;
            }
            const lock = await current();
            if (lock === undefined) {
                return medium.createExclusive(LOCK_FILE, content());
            }
            if (lock !== 'broken' && lock.owner === owner) {
                return true;
            }
            if (!isStale(lock)) {
                return false;
            }
            await medium.replace(LOCK_FILE, content());
            const confirmed = await current();
            return confirmed !== undefined && confirmed !== 'broken' && confirmed.owner === owner;
        },
        async peek() {
            const lock = await current();
            if (lock === undefined) {
                return { kind: 'free' };
            }
            if (lock !== 'broken' && lock.owner === owner) {
                return { kind: 'mine' };
            }
            if (isStale(lock)) {
                return { kind: 'stale' };
            }
            return { kind: 'held', owner: (lock as LockContent).owner };
        },
        async heartbeat() {
            const lock = await current();
            if (lock === undefined || lock === 'broken' || lock.owner !== owner) {
                return false;
            }
            await medium.replace(LOCK_FILE, content());
            return true;
        },
        async release() {
            const lock = await current();
            if (lock !== undefined && lock !== 'broken' && lock.owner === owner) {
                await medium.remove(LOCK_FILE);
            }
        },
    };
}

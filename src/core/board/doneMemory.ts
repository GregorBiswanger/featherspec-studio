import { isRecord } from '../../shared/protocol/envelope';

export interface DoneMemory {
    v: 1;
    done: 'expanded' | 'collapsed';
}

export function parseDoneMemory(value: unknown): boolean {
    return isRecord(value) && value.v === 1 && value.done === 'expanded';
}

export function serializeDoneMemory(expanded: boolean): DoneMemory {
    return { v: 1, done: expanded ? 'expanded' : 'collapsed' };
}

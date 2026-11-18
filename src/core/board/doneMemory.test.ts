import { describe, expect, it } from 'vitest';
import { parseDoneMemory, serializeDoneMemory } from './doneMemory';

describe('AC-016: the remembered Done choice', () => {
    it('round trips both choices', () => {
        expect(serializeDoneMemory(true)).toEqual({ v: 1, done: 'expanded' });
        expect(serializeDoneMemory(false)).toEqual({ v: 1, done: 'collapsed' });
        expect(parseDoneMemory(serializeDoneMemory(true))).toBe(true);
        expect(parseDoneMemory(serializeDoneMemory(false))).toBe(false);
    });

    it('anything else reads collapsed', () => {
        for (const damaged of [undefined, null, 'expanded', 1, [], {}, { v: 2, done: 'expanded' }, { v: 1 }, { v: 1, done: 'open' }, { v: 1, done: true }]) {
            expect(parseDoneMemory(damaged), JSON.stringify(damaged)).toBe(false);
        }
    });
});

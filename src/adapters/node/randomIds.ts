import { randomUUID } from 'node:crypto';
import type { IdSource } from '../../core/ports/runtimeMedium';

export function createRandomIds(): IdSource {
    return { newId: () => randomUUID() };
}

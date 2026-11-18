import { isRecord } from '../../shared/protocol/envelope';
import { isSideFraction } from '../../shared/protocol/layout';

export function parseSideWidth(value: unknown): number | undefined {
    return isRecord(value) && value.v === 1 && isSideFraction(value.fraction) ? value.fraction : undefined;
}

export function serializeSideWidth(fraction: number): unknown {
    return { v: 1, fraction };
}

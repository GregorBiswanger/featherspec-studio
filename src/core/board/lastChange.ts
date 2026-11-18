import type { LastChange } from '../../shared/protocol/board';
import type { FieldValue } from '../specs/fieldValue';

const PLAN_DAY = /^(\d{4})-(\d{2})-(\d{2})(?:\s|$)/;

function two(value: number): string {
    return String(value).padStart(2, '0');
}

export function planDay(field: FieldValue | undefined): string | undefined {
    if (field === undefined || field.state !== 'value') {
        return undefined;
    }
    const match = PLAN_DAY.exec(field.raw);
    if (match === null) {
        return undefined;
    }
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(Date.UTC(year, month - 1, day));
    const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    return real ? `${match[1]}-${match[2]}-${match[3]}` : undefined;
}

export function localDay(ms: number): string {
    const date = new Date(ms);
    return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

export function cardLastChange(planUpdated: FieldValue | undefined, specMs: number | undefined, planMs: number | undefined): LastChange | undefined {
    const fromPlan = planDay(planUpdated);
    if (fromPlan !== undefined) {
        return { day: fromPlan, source: 'plan' };
    }
    const known = [specMs, planMs].filter((time): time is number => time !== undefined);
    return known.length === 0 ? undefined : { day: localDay(Math.max(...known)), source: 'file' };
}

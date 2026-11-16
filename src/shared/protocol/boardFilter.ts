import { isRecord } from './envelope';

export const BOARD_STATES = ['Backlog', 'Ready', 'Active', 'Review', 'Done', 'Blocked'] as const;
export type BoardState = (typeof BOARD_STATES)[number];

export interface NamedSet {
    label: string;
    stems: string[];
}

export interface BoardFilter {
    states?: BoardState[];
    providers?: (string | null)[];
    set?: NamedSet;
}

const FILTER_KEYS = ['states', 'providers', 'set'];

export function isBoardState(value: unknown): value is BoardState {
    return typeof value === 'string' && (BOARD_STATES as readonly string[]).includes(value);
}

function isNamedSet(value: unknown): value is NamedSet {
    return (
        isRecord(value) &&
        Object.keys(value).every((key) => key === 'label' || key === 'stems') &&
        typeof value.label === 'string' &&
        value.label.length > 0 &&
        Array.isArray(value.stems) &&
        value.stems.every((stem) => typeof stem === 'string' && stem.length > 0)
    );
}

export function isBoardFilter(value: unknown): value is BoardFilter {
    if (!isRecord(value) || !Object.keys(value).every((key) => FILTER_KEYS.includes(key))) {
        return false;
    }
    const { states, providers, set } = value;
    if (states !== undefined && !(Array.isArray(states) && states.length > 0 && states.every(isBoardState))) {
        return false;
    }
    if (providers !== undefined && !(Array.isArray(providers) && providers.length > 0 && providers.every((item) => item === null || (typeof item === 'string' && item.length > 0)))) {
        return false;
    }
    return set === undefined || isNamedSet(set);
}

export function isFilterSet(filter: BoardFilter): boolean {
    return filter.states !== undefined || filter.providers !== undefined || filter.set !== undefined;
}

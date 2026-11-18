import type { CardView } from '../../../shared/protocol/board';

export function card(number: string, overrides: Partial<CardView> = {}): CardView {
    return {
        key: `.specs/active/${number}-thing.md`,
        stem: `${number}-thing`,
        number,
        title: `Thing ${number}`,
        titleIsStem: false,
        path: undefined,
        state: 'Active',
        derivedRule: undefined,
        deprecated: false,
        problems: 0,
        blocked: [],
        readiness: undefined,
        summary: undefined,
        tasks: undefined,
        criteria: undefined,
        lastChangeMs: undefined,
        ...overrides,
    };
}

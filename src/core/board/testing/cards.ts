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
        deprecated: false,
        problems: 0,
        blocked: [],
        need: undefined,
        step: undefined,
        summary: undefined,
        tasks: undefined,
        criteria: undefined,
        lastChange: undefined,
        ...overrides,
    };
}

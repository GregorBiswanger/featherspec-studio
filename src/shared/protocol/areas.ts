import { PLAN_MAP_PURPOSE, PLAN_MAP_TITLE } from './planMapTexts';

export const AREA_IDS = ['overview', 'board', 'planMap'] as const;
export type AreaId = (typeof AREA_IDS)[number];
export type DetailAreaId = 'overview' | 'board';

export interface AreaInfo {
    id: AreaId;
    title: string;
    purpose: string;
    placeholder: boolean;
}

export const AREAS: readonly AreaInfo[] = [
    {
        id: 'overview',
        title: 'Overview',
        purpose: 'See what is in progress, what comes next and what needs fixing.',
        placeholder: false,
    },
    {
        id: 'board',
        title: 'Board',
        purpose: 'See every spec as a card in the column of its board state.',
        placeholder: false,
    },
    {
        id: 'planMap',
        title: PLAN_MAP_TITLE,
        purpose: PLAN_MAP_PURPOSE,
        placeholder: false,
    },
];

export const DEFAULT_AREA: AreaId = 'overview';

export function isAreaId(value: unknown): value is AreaId {
    return typeof value === 'string' && (AREA_IDS as readonly string[]).includes(value);
}

export function areaInfo(id: AreaId): AreaInfo {
    return AREAS.find((area) => area.id === id) ?? AREAS[0]!;
}

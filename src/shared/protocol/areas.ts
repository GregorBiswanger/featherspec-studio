export const AREA_IDS = ['missionControl', 'specBoard', 'specExplorer', 'agentCenter'] as const;
export type AreaId = (typeof AREA_IDS)[number];

export interface AreaInfo {
    id: AreaId;
    title: string;
    purpose: string;
    placeholder: boolean;
}

export const AREAS: readonly AreaInfo[] = [
    {
        id: 'missionControl',
        title: 'Mission Control',
        purpose: 'See the project at a glance: spec counts, progress, what needs attention and recent activity.',
        placeholder: false,
    },
    {
        id: 'specBoard',
        title: 'Spec Board',
        purpose: 'See every spec as a card in the column of its board state.',
        placeholder: false,
    },
    {
        id: 'specExplorer',
        title: 'Spec Explorer',
        purpose: 'Browse the specs of the project and select one.',
        placeholder: false,
    },
    {
        id: 'agentCenter',
        title: 'Agent Center',
        purpose: 'Follow agent runs, their live events and the approvals they wait for.',
        placeholder: false,
    },
];

export const DEFAULT_AREA: AreaId = 'missionControl';

export function isAreaId(value: unknown): value is AreaId {
    return typeof value === 'string' && (AREA_IDS as readonly string[]).includes(value);
}

export function areaInfo(id: AreaId): AreaInfo {
    return AREAS.find((area) => area.id === id) ?? AREAS[0]!;
}

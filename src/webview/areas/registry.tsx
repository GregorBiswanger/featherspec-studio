import type { ComponentType } from 'react';
import type { AreaId } from '../../shared/protocol/areas';
import { Overview } from './overview/Overview';
import { PlanMap } from './planMap/PlanMap';
import { SpecBoard } from './SpecBoard';

export const AREA_COMPONENTS: Partial<Record<AreaId, ComponentType>> = {
    overview: Overview,
    board: SpecBoard,
    planMap: PlanMap,
};

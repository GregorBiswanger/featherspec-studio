import type { ComponentType } from 'react';
import type { AreaId } from '../../shared/protocol/areas';
import { Overview } from './overview/Overview';
import { SpecBoard } from './SpecBoard';
import { SpecExplorer } from './SpecExplorer';

export const AREA_COMPONENTS: Partial<Record<AreaId, ComponentType>> = {
    overview: Overview,
    board: SpecBoard,
    specExplorer: SpecExplorer,
};

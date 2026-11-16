import type { ComponentType } from 'react';
import type { AreaId } from '../../shared/protocol/areas';
import { SpecBoard } from './SpecBoard';
import { SpecExplorer } from './SpecExplorer';

export const AREA_COMPONENTS: Partial<Record<AreaId, ComponentType>> = {
    specBoard: SpecBoard,
    specExplorer: SpecExplorer,
};

import { DEFAULT_AREA, isAreaId, type AreaId } from '../../shared/protocol/areas';
import { isRecord } from '../../shared/protocol/envelope';

export interface RememberedSelection {
    projectRoot: string;
    stem: string;
    path?: string;
}

export interface UiMemory {
    v: 1;
    area: AreaId;
    selection?: RememberedSelection;
}

function parseSelection(value: unknown): RememberedSelection | undefined | 'invalid' {
    if (value === undefined) {
        return undefined;
    }
    if (!isRecord(value) || typeof value.projectRoot !== 'string' || typeof value.stem !== 'string' || value.stem.length === 0) {
        return 'invalid';
    }
    if (value.path !== undefined && typeof value.path !== 'string') {
        return 'invalid';
    }
    return value.path === undefined
        ? { projectRoot: value.projectRoot, stem: value.stem }
        : { projectRoot: value.projectRoot, stem: value.stem, path: value.path };
}

export function parseUiMemory(value: unknown): UiMemory | undefined {
    if (!isRecord(value) || value.v !== 1) {
        return undefined;
    }
    const area = value.area === 'specExplorer' ? DEFAULT_AREA : value.area;
    if (!isAreaId(area)) {
        return undefined;
    }
    const selection = parseSelection(value.selection);
    if (selection === 'invalid') {
        return undefined;
    }
    return selection === undefined ? { v: 1, area } : { v: 1, area, selection };
}

export function serializeUiMemory(memory: UiMemory): unknown {
    return memory.selection === undefined ? { v: 1, area: memory.area } : { v: 1, area: memory.area, selection: { ...memory.selection } };
}

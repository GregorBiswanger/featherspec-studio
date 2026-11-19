import { STAGE_DELIMITER } from '../specs/parsePlan';

const STEP_ID = /T-\d+/g;
export const STAGE_NUMBER = /^\d+\.[ \t]+/;
const PARALLEL_MARK = '‖';
const SEQUENCE_MARK = '→';

export interface StageItem {
    id: string;
    sep: '‖' | '→' | undefined;
}

export function headOf(line: string): { head: string; description: string } {
    const delimiter = STAGE_DELIMITER.exec(line);
    return delimiter === null ? { head: line, description: '' } : { head: line.slice(0, delimiter.index), description: line.slice(delimiter.index + delimiter[0].length) };
}

export function separatorsOf(head: string): StageItem[] {
    const found = [...head.matchAll(STEP_ID)];
    return found.map((match, index) => {
        if (index === 0) {
            return { id: match[0], sep: undefined };
        }
        const previous = found[index - 1]!;
        const between = head.slice(previous.index + previous[0].length, match.index);
        return { id: match[0], sep: between.includes(PARALLEL_MARK) ? PARALLEL_MARK : between.includes(SEQUENCE_MARK) ? SEQUENCE_MARK : undefined };
    });
}

/** The step IDs of a stage line, grouped by `‖` (a `→` or a plain break starts a new group). */
export function idGroupsOf(items: readonly StageItem[]): string[][] {
    const groups: string[][] = [];
    for (const item of items) {
        const last = groups[groups.length - 1];
        if (last !== undefined && item.sep === PARALLEL_MARK) {
            last.push(item.id);
        } else {
            groups.push([item.id]);
        }
    }
    return groups;
}

export const SEQUENCE = SEQUENCE_MARK;
export const PARALLEL = PARALLEL_MARK;

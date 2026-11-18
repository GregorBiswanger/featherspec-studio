import type { BoardState } from '../../shared/protocol/boardFilter';
import type { StepView } from '../../shared/protocol/stepView';
import { titleOf } from '../board/cards';
import { stepView } from '../board/nextStep';
import type { ShellModel } from '../ports/shell';

export interface SpecStep {
    key: string;
    stem: string;
    number: string;
    state: BoardState;
    title: string;
    label: string;
    step: StepView;
}

export interface SpecSelection {
    stem: string;
    path?: string | undefined;
}

const URGENT: readonly BoardState[] = ['Blocked', 'Review', 'Active'];
const PICK_ORDER: readonly BoardState[] = ['Blocked', 'Review', 'Active', 'Ready', 'Backlog', 'Done'];

function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

export function specsWithStep(model: ShellModel): SpecStep[] {
    const found: SpecStep[] = [];
    for (const entry of model.lifecycle.entries) {
        const step = stepView(model, entry.key);
        if (step === undefined) {
            continue;
        }
        const spec = model.project.specs.find((candidate) => candidate.key === entry.key);
        const title = (spec === undefined ? undefined : titleOf(spec)) ?? entry.stem;
        const titled = spec !== undefined && titleOf(spec) !== undefined;
        found.push({ key: entry.key, stem: entry.stem, number: entry.number, state: entry.state, title, label: titled ? `${entry.number} ${title}` : entry.stem, step });
    }
    return found;
}

function byNumber(left: SpecStep, right: SpecStep): number {
    return compareText(left.number, right.number) || compareText(left.key, right.key);
}

export function currentSpec(steps: readonly SpecStep[], selection: SpecSelection | undefined): SpecStep | undefined {
    if (selection !== undefined) {
        const matches = steps.filter((candidate) => candidate.stem === selection.stem);
        const selected = selection.path === undefined ? matches[0] : matches.find((candidate) => candidate.key === selection.path);
        if (selected !== undefined) {
            return selected;
        }
    }
    for (const state of URGENT) {
        const first = steps.filter((candidate) => candidate.state === state).sort(byNumber)[0];
        if (first !== undefined) {
            return first;
        }
    }
    return undefined;
}

export function pickOrder(steps: readonly SpecStep[]): SpecStep[] {
    return [...steps].sort((left, right) => PICK_ORDER.indexOf(left.state) - PICK_ORDER.indexOf(right.state) || byNumber(left, right));
}

export function readyCount(model: ShellModel): number {
    return model.lifecycle.entries.filter((entry) => entry.state === 'Ready').length;
}

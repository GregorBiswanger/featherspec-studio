import type { MoveResult } from '../../shared/protocol/board';
import { BOARD_STATES, type BoardState } from '../../shared/protocol/boardFilter';
import { AGENT_START_UNAVAILABLE_TEXT } from '../../shared/protocol/texts';
import { judgeTransition } from '../lifecycle/transitions';
import type { MovePickPort, MoveResultSink, SelectionSource, StartWorkflowPort } from '../ports/board';
import type { ShellModel, ShellModelSource } from '../ports/shell';
import { titleOf } from './cards';

export interface MovesDeps {
    source: ShellModelSource;
    start: StartWorkflowPort | undefined;
    picks: MovePickPort;
    sink: MoveResultSink;
    selection: SelectionSource;
    focused: () => string | null;
}

export interface Moves {
    requestMove(key: string, target: BoardState): Promise<MoveResult>;
    runMoveCommand(): Promise<void>;
}

function selectedKey(model: ShellModel, selection: { stem: string; path?: string } | undefined): string | undefined {
    if (selection === undefined) {
        return undefined;
    }
    const matches = model.lifecycle.entries.filter((entry) => entry.stem === selection.stem);
    return (selection.path === undefined ? matches[0] : matches.find((entry) => entry.key === selection.path))?.key;
}

export function createMoves(deps: MovesDeps): Moves {
    async function requestMove(key: string, target: BoardState): Promise<MoveResult> {
        const model = deps.source.current();
        const entry = model?.lifecycle.entries.find((candidate) => candidate.key === key);
        if (model === undefined || entry === undefined) {
            const verdict = judgeTransition(model?.lifecycle ?? { entries: [], projectDiagnostics: [] }, key, target);
            return { kind: 'refused', text: verdict.accepted ? '' : verdict.text };
        }
        if (entry.state === target) {
            return { kind: 'none' };
        }
        const verdict = judgeTransition(model.lifecycle, key, target);
        if (!verdict.accepted) {
            return { kind: 'refused', text: verdict.text };
        }
        if (deps.start === undefined) {
            return { kind: 'refused', text: AGENT_START_UNAVAILABLE_TEXT };
        }
        await deps.start.start({ stem: entry.stem, key });
        return { kind: 'handedOff', number: entry.number };
    }

    async function runMoveCommand(): Promise<void> {
        const model = deps.source.current();
        if (model === undefined) {
            return;
        }
        const known = (key: string | null | undefined) => (key === null || key === undefined ? undefined : model.lifecycle.entries.find((entry) => entry.key === key)?.key);
        let key = known(deps.focused()) ?? known(selectedKey(model, deps.selection.selection()));
        if (key === undefined) {
            const specs = new Map(model.project.specs.map((spec) => [spec.key, spec]));
            const items = model.lifecycle.entries
                .map((entry) => {
                    const spec = specs.get(entry.key);
                    return { key: entry.key, number: entry.number, title: (spec === undefined ? undefined : titleOf(spec)) ?? entry.stem };
                })
                .sort((left, right) => left.number.localeCompare(right.number) || left.key.localeCompare(right.key));
            key = await deps.picks.pickSpec(items);
        }
        const entry = key === undefined ? undefined : model.lifecycle.entries.find((candidate) => candidate.key === key);
        if (key === undefined || entry === undefined) {
            return;
        }
        const target = await deps.picks.pickTarget(
            entry.number,
            BOARD_STATES.filter((state) => state !== entry.state),
        );
        if (target === undefined) {
            return;
        }
        deps.sink.show(await requestMove(key, target));
    }

    return { requestMove, runMoveCommand };
}

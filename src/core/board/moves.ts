import type { MoveResult } from '../../shared/protocol/board';
import { BOARD_STATES, type BoardState } from '../../shared/protocol/boardFilter';
import { judgeTransition } from '../lifecycle/transitions';
import type { ClipboardPort, MoveMessagePort, MovePickPort, MoveResultSink, SelectionSource } from '../ports/board';
import type { ShellModel, ShellModelSource } from '../ports/shell';
import { titleOf } from './cards';
import { startLine } from './nextStep';
import { COPIED_TEXT, COPY_FAILED_TEXT, moveNextStepText, NEXT_STEP_COPY_LABEL } from '../../shared/protocol/nextStepTexts';

export interface MovesDeps {
    source: ShellModelSource;
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
        return { kind: 'nextStep', number: entry.number, line: startLine(model, entry) };
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

export interface CopyOutcome {
    ok: boolean;
    text: string;
}

export async function copyLine(clipboard: ClipboardPort, line: string): Promise<CopyOutcome> {
    try {
        await clipboard.writeText(line);
        return { ok: true, text: COPIED_TEXT };
    } catch {
        return { ok: false, text: COPY_FAILED_TEXT };
    }
}

export interface MoveResultPresenterDeps {
    boardShown: (result: MoveResult) => boolean;
    messages: MoveMessagePort;
    clipboard: ClipboardPort;
}

export interface MoveResultPresenter extends MoveResultSink {
    show(result: MoveResult): Promise<void>;
}

export function createMoveResultPresenter(deps: MoveResultPresenterDeps): MoveResultPresenter {
    return {
        async show(result) {
            if (result.kind === 'none' || deps.boardShown(result)) {
                return;
            }
            if (result.kind === 'refused') {
                deps.messages.warn(result.text);
                return;
            }
            const choice = await deps.messages.inform(`${moveNextStepText(result.number)} ${result.line}`, NEXT_STEP_COPY_LABEL);
            if (choice !== NEXT_STEP_COPY_LABEL) {
                return;
            }
            const copied = await copyLine(deps.clipboard, result.line);
            if (copied.ok) {
                void deps.messages.inform(copied.text);
            } else {
                deps.messages.warn(copied.text);
            }
        },
    };
}

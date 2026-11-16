import type { BoardState } from '../../shared/protocol/boardFilter';
import type { MoveResult } from '../../shared/protocol/board';
import type { Disposable } from './host';

export interface StartRequest {
    stem: string;
    key: string;
}

export interface StartWorkflowPort {
    start(request: StartRequest): Promise<void>;
}

export type OpenOutcome = 'opened' | 'not-found';

export interface EditorPort {
    open(root: string, key: string, line?: number): Promise<OpenOutcome>;
}

export interface PickableSpec {
    key: string;
    number: string;
    title: string;
}

export interface MovePickPort {
    pickSpec(items: PickableSpec[]): Promise<string | undefined>;
    pickTarget(number: string, targets: BoardState[]): Promise<BoardState | undefined>;
}

export interface MoveResultSink {
    show(result: MoveResult): void;
}

export interface SelectionSource {
    selection(): { stem: string; path?: string } | undefined;
    onDidChange(listener: () => void): Disposable;
}

import { useCallback, useLayoutEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import type { CardView } from '../../shared/protocol/board';
import { BOARD_LABEL, NO_SPECS_BOARD_TEXT } from '../../shared/protocol/texts';
import { useShell } from '../shell';
import { Banner } from '../board/Banner';
import { useBoard } from '../board/boardStore';
import { Column } from '../board/Column';
import { FilterBar } from '../board/FilterBar';
import { fallbackFocus, moveFocus, type Direction, type Grid } from '../board/focusModel';
import { EmptyState } from '../ui/EmptyState';

const ARROWS: Readonly<Record<string, Direction>> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

function cardElement(root: HTMLElement | null, key: string): HTMLElement | null {
    if (root === null) {
        return null;
    }
    return [...root.querySelectorAll<HTMLElement>('[data-card]')].find((element) => element.getAttribute('data-card') === key) ?? null;
}

function keyOfTarget(target: EventTarget): string | undefined {
    if (!(target instanceof HTMLElement)) {
        return undefined;
    }
    return target.closest('[data-card]')?.getAttribute('data-card') ?? undefined;
}

export function SpecBoard() {
    const shell = useShell();
    const api = useBoard();
    const { board } = api;
    const columnsRef = useRef<HTMLDivElement>(null);
    const [focusedKey, setFocusedKey] = useState<string | undefined>(undefined);
    const hasFocus = useRef(false);
    const previousGrid = useRef<Grid>([]);

    const grid: Grid = useMemo(() => board?.columns.map((column) => column.cards.map((entry) => entry.key)) ?? [], [board]);
    const allCards = useMemo(() => board?.columns.flatMap((column) => column.cards) ?? [], [board]);
    const tabbable = focusedKey !== undefined && allCards.some((entry) => entry.key === focusedKey) ? focusedKey : allCards[0]?.key;

    useLayoutEffect(() => {
        const before = previousGrid.current;
        previousGrid.current = grid;
        if (focusedKey === undefined) {
            return;
        }
        const target = fallbackFocus(before, focusedKey, grid);
        if (target !== undefined && target !== focusedKey) {
            setFocusedKey(target);
        }
        if (!hasFocus.current) {
            return;
        }
        const element = target === undefined ? columnsRef.current : cardElement(columnsRef.current, target);
        if (element !== null && document.activeElement !== element) {
            element.focus();
        }
    }, [grid, focusedKey]);

    const open = useCallback(
        (card: CardView): void => {
            shell.navigate({ area: 'specExplorer', target: card.path === undefined ? { kind: 'spec', stem: card.stem } : { kind: 'spec', stem: card.stem, path: card.path } });
        },
        [shell],
    );

    function onFocus(event: FocusEvent<HTMLElement>): void {
        const key = keyOfTarget(event.target);
        if (key === undefined) {
            return;
        }
        hasFocus.current = true;
        setFocusedKey(key);
    }

    function onBlur(event: FocusEvent<HTMLElement>): void {
        if (keyOfTarget(event.target) === undefined || !event.target.isConnected) {
            return;
        }
        const next = event.relatedTarget;
        if (next instanceof HTMLElement && columnsRef.current?.contains(next) === true) {
            return;
        }
        hasFocus.current = false;
    }

    function onKeyDown(event: KeyboardEvent<HTMLElement>): void {
        const key = keyOfTarget(event.target);
        if (key === undefined) {
            return;
        }
        const direction = ARROWS[event.key];
        if (direction !== undefined) {
            event.preventDefault();
            const target = moveFocus(grid, key, direction);
            if (target !== undefined) {
                cardElement(columnsRef.current, target)?.focus();
            }
        }
    }

    if (board === undefined) {
        return <div className="board" aria-label={BOARD_LABEL} />;
    }
    return (
        <div className="board" aria-label={BOARD_LABEL}>
            <Banner banner={board.banner} />
            {board.noSpecs ? (
                <EmptyState icon="Backlog" className="board-empty">
                    {NO_SPECS_BOARD_TEXT}
                </EmptyState>
            ) : null}
            <FilterBar board={board} setFilter={api.setFilter} setSort={api.setSort} clearFilters={api.clearFilters} />
            <div className="columns" ref={columnsRef} tabIndex={-1} onFocus={onFocus} onBlur={onBlur} onKeyDown={onKeyDown}>
                {board.columns.map((column) => (
                    <Column
                        key={column.state}
                        column={column}
                        onOpen={open}
                        copyResult={api.copyResult}
                        onCopy={api.copyText}
                        tabIndexOf={(card) => (card.key === tabbable ? 0 : -1)}
                    />
                ))}
            </div>
        </div>
    );
}

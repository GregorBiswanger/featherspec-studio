import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent, type FocusEvent, type KeyboardEvent } from 'react';
import type { BoardColumn, CardView } from '../../shared/protocol/board';
import type { BoardState } from '../../shared/protocol/boardFilter';
import { BOARD_LABEL, NO_SPECS_BOARD_TEXT } from '../../shared/protocol/texts';
import { useShell } from '../shell';
import { Announcer } from '../board/Announcer';
import { Banner } from '../board/Banner';
import { useBoard } from '../board/boardStore';
import { Column } from '../board/Column';
import { FilterBar } from '../board/FilterBar';
import { fallbackFocus, moveFocus, type Direction, type Grid } from '../board/focusModel';
import { MoveMenu } from '../board/MoveMenu';

const ARROWS: Readonly<Record<string, Direction>> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

function cardElement(root: HTMLElement | null, key: string): HTMLElement | null {
    if (root === null) {
        return null;
    }
    return [...root.querySelectorAll<HTMLElement>('[data-card]')].find((element) => element.getAttribute('data-card') === key) ?? null;
}

function keyOfTarget(target: EventTarget): string | undefined {
    if (!(target instanceof HTMLElement) || target.closest('[role="menu"]') !== null) {
        return undefined;
    }
    return target.closest('[data-card]')?.getAttribute('data-card') ?? undefined;
}

export function SpecBoard() {
    const shell = useShell();
    const api = useBoard();
    const { board, dismissMove, focusCard, requestMove } = api;
    const columnsRef = useRef<HTMLDivElement>(null);
    const [focusedKey, setFocusedKey] = useState<string | undefined>(undefined);
    const [menuKey, setMenuKey] = useState<string | undefined>(undefined);
    const [draggingKey, setDraggingKey] = useState<string | undefined>(undefined);
    const hasFocus = useRef(false);
    const previousGrid = useRef<Grid>([]);
    useEffect(() => () => dismissMove(), [dismissMove]);

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
        focusCard(key);
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
        focusCard(null);
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
        } else if ((event.key === 'F10' && event.shiftKey) || event.key === 'ContextMenu') {
            event.preventDefault();
            setMenuKey(key);
        }
    }

    function closeMenu(key: string): void {
        setMenuKey(undefined);
        cardElement(columnsRef.current, key)?.focus();
    }

    function onDragStart(event: DragEvent<HTMLElement>, card: CardView): void {
        const transfer: DataTransfer | null | undefined = event.dataTransfer;
        if (transfer) {
            transfer.effectAllowed = 'move';
            transfer.setData('text/plain', card.key);
        }
        setDraggingKey(card.key);
    }

    function draggedFrom(state: BoardState): CardView | undefined {
        return allCards.find((entry) => entry.key === draggingKey && entry.state !== state);
    }

    function onDragOver(event: DragEvent<HTMLElement>, column: BoardColumn): void {
        if (draggedFrom(column.state) !== undefined) {
            event.preventDefault();
        }
    }

    function onDrop(event: DragEvent<HTMLElement>, column: BoardColumn): void {
        const dragged = draggedFrom(column.state);
        setDraggingKey(undefined);
        if (dragged !== undefined) {
            event.preventDefault();
            requestMove(dragged.key, column.state);
        }
    }

    if (board === undefined) {
        return <div className="board" aria-label={BOARD_LABEL} />;
    }
    return (
        <div className="board" aria-label={BOARD_LABEL}>
            <Banner lines={board.banner} />
            {board.noSpecs ? <p className="board-empty">{NO_SPECS_BOARD_TEXT}</p> : null}
            <FilterBar board={board} setFilter={api.setFilter} setSort={api.setSort} clearFilters={api.clearFilters} />
            <Announcer move={api.move} onDismiss={dismissMove} />
            <div className="columns" ref={columnsRef} tabIndex={-1} onFocus={onFocus} onBlur={onBlur} onKeyDown={onKeyDown}>
                {board.columns.map((column) => (
                    <Column
                        key={column.state}
                        column={column}
                        onOpen={open}
                        tabIndexOf={(card) => (card.key === tabbable ? 0 : -1)}
                        draggingKey={draggingKey}
                        onDragStart={onDragStart}
                        onDragEnd={() => setDraggingKey(undefined)}
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        menuOf={(card) => (
                            <MoveMenu
                                card={card}
                                tabStop={card.key === tabbable}
                                open={menuKey === card.key}
                                onToggle={() => setMenuKey(menuKey === card.key ? undefined : card.key)}
                                onChoose={(target) => {
                                    requestMove(card.key, target);
                                    closeMenu(card.key);
                                }}
                                onClose={() => closeMenu(card.key)}
                            />
                        )}
                    />
                ))}
            </div>
        </div>
    );
}

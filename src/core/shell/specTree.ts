import type { CardView } from '../../shared/protocol/board';
import type { BoardState } from '../../shared/protocol/boardFilter';
import type { ActionId, PanelState } from '../../shared/protocol/messages';
import { DEPRECATED_MARKER, GROUP_LABELS, problemsBadgeText } from '../../shared/protocol/texts';
import { buildCards } from '../board/cards';
import { cutAt } from '../board/shortTitle';
import type { LifecycleEntry } from '../lifecycle/model';
import type { ShellModel } from '../ports/shell';

export interface SpecRowModel {
    kind: 'spec';
    id: string;
    label: string;
    description: string;
    icon: string;
    color: string;
    accessibleLabel: string;
    tooltip: string;
    contextValue: string;
    stem: string;
    path?: string;
    line?: string;
    planKey?: string;
    specKey: string;
}

export interface GroupModel {
    kind: 'group';
    id: string;
    label: string;
    description: string;
    collapsed: boolean;
    children: SpecRowModel[];
}

export interface ActionRowModel {
    kind: 'action';
    label: string;
    action: ActionId;
    icon: string;
}

export type TreeItemModel = GroupModel | ActionRowModel;

export interface SpecTreeModel {
    message: string | undefined;
    items: TreeItemModel[];
    welcome?: 'S2';
    badge?: { value: number; tooltip: string };
    description?: string;
}

export interface SpecTreeInput {
    projectActive: boolean;
    projectName: string | undefined;
    projectCount: number;
    state: PanelState | undefined;
    model: ShellModel | undefined;
}

const LABEL_MAX = 24;

type GroupKey = keyof typeof GROUP_LABELS;

const STATE_GROUP: Record<BoardState, GroupKey> = {
    Blocked: 'inProgress',
    Review: 'inProgress',
    Active: 'inProgress',
    Ready: 'upNext',
    Backlog: 'backlog',
    Done: 'done',
};

const GROUP_ORDER: readonly GroupKey[] = ['inProgress', 'upNext', 'backlog', 'done'];

const IN_PROGRESS_RANK: Partial<Record<BoardState, number>> = { Blocked: 0, Review: 1, Active: 2 };

const STATE_ICONS: Record<BoardState, { icon: string; color: string }> = {
    Backlog: { icon: 'list-flat', color: 'descriptionForeground' },
    Ready: { icon: 'pass', color: 'charts.blue' },
    Active: { icon: 'play', color: 'charts.purple' },
    Review: { icon: 'eye', color: 'charts.yellow' },
    Done: { icon: 'check', color: 'charts.green' },
    Blocked: { icon: 'circle-slash', color: 'charts.red' },
};

const PROBLEM_ICON = { icon: 'warning', color: 'problemsWarningIcon.foreground' };

function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

function compareRows(left: CardView, right: CardView): number {
    return (
        (IN_PROGRESS_RANK[left.state] ?? 0) - (IN_PROGRESS_RANK[right.state] ?? 0) ||
        Number(left.number) - Number(right.number) ||
        compareText(left.number, right.number) ||
        compareText(left.stem, right.stem) ||
        compareText(left.key, right.key)
    );
}

function rowId(root: string, card: CardView): string {
    return JSON.stringify(card.path === undefined ? ['spec', root, card.stem] : ['spec', root, card.stem, card.path]);
}

function fullTitle(card: CardView, slug: string): string {
    const title = card.titleIsStem ? '' : card.title.replace(/\s+/g, ' ').trim();
    return title === '' ? slug : title;
}

function descriptionOf(card: CardView): string {
    if (card.deprecated) {
        return DEPRECATED_MARKER;
    }
    return card.step === undefined ? card.state : `${card.state} · ${card.step.short}`;
}

function contextValueOf(card: CardView, entry: LifecycleEntry): string {
    return ['spec', ...(card.step === undefined ? [] : ['step']), ...(entry.plan === undefined ? [] : ['plan'])].join(' ');
}

function rowOf(model: ShellModel, card: CardView, entry: LifecycleEntry, slug: string): SpecRowModel {
    const title = fullTitle(card, slug);
    const description = descriptionOf(card);
    const style = card.problems > 0 ? PROBLEM_ICON : STATE_ICONS[card.state];
    const problem = card.problems > 0 ? `, ${problemsBadgeText(card.problems)}` : '';
    return {
        kind: 'spec',
        id: rowId(model.project.root, card),
        label: `${card.number} ${cutAt(title, LABEL_MAX)}`,
        description,
        icon: style.icon,
        color: style.color,
        accessibleLabel: `${card.number} ${title}, ${description}${problem}`,
        tooltip: '',
        contextValue: contextValueOf(card, entry),
        stem: card.stem,
        ...(card.path === undefined ? {} : { path: card.path }),
        ...(card.step === undefined ? {} : { line: card.step.line }),
        ...(entry.plan === undefined ? {} : { planKey: entry.plan }),
        specKey: card.key,
    };
}

function groupsOf(model: ShellModel): GroupModel[] {
    const cards = buildCards(model.project, model.lifecycle);
    const entries = new Map(model.lifecycle.entries.map((entry) => [entry.key, entry]));
    const slugs = new Map(model.project.specs.map((spec) => [spec.key, spec.slug]));
    return GROUP_ORDER.flatMap((key) => {
        const own = cards.filter((card) => STATE_GROUP[card.state] === key).sort(compareRows);
        if (own.length === 0) {
            return [];
        }
        return [
            {
                kind: 'group' as const,
                id: `group:${key}`,
                label: GROUP_LABELS[key],
                description: String(own.length),
                collapsed: key === 'done',
                children: own.map((card) => rowOf(model, card, entries.get(card.key)!, slugs.get(card.key) ?? card.stem)),
            },
        ];
    });
}

export function buildSpecTree(input: SpecTreeInput): SpecTreeModel {
    if (input.model === undefined) {
        return { message: undefined, items: [] };
    }
    return { message: undefined, items: groupsOf(input.model) };
}

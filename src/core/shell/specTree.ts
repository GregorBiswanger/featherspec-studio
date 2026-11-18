import type { CardView } from '../../shared/protocol/board';
import type { BoardState } from '../../shared/protocol/boardFilter';
import type { ActionId, PanelState } from '../../shared/protocol/messages';
import { isDerivedRule } from '../../shared/protocol/board';
import { STATE_LOOK } from '../../shared/protocol/stateLook';
import {
    ACTION_LABELS,
    badgeTooltip,
    criteriaShortText,
    DEPRECATED_MARKER,
    DERIVED_SENTENCES,
    GROUP_LABELS,
    groupProblemDescription,
    groupProblemLabel,
    LOADING_TEXT,
    NEXT_STEP_PREFIX,
    NO_SPECS_START_TEXT,
    panelStateActions,
    panelStateLines,
    PROBLEM_PREFIX,
    problemsBadgeText,
    stepsText,
    treeRowAccessibleLabel,
} from '../../shared/protocol/texts';
import { buildCards } from '../board/cards';
import { nextStep } from '../board/nextStep';
import { escapeMarkdown } from '../copyNextStep/entryView';
import type { LifecycleEntry } from '../lifecycle/model';
import { problemSentence } from '../lifecycle/problemSentence';
import type { ShellModel } from '../ports/shell';
import { treeLabel } from './treeLabel';

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
    state: BoardState;
}

export interface GroupModel {
    kind: 'group';
    id: string;
    label: string;
    description: string;
    collapsed: boolean;
    children: SpecRowModel[];
    icon?: string;
    color?: string;
    tooltip?: string;
    accessibleLabel?: string;
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

type GroupKey = keyof typeof GROUP_LABELS;

const STATE_GROUP: Record<BoardState, GroupKey> = {
    Blocked: 'inProgress',
    Review: 'inProgress',
    Active: 'inProgress',
    Ready: 'ready',
    Backlog: 'backlog',
    Done: 'done',
};

const GROUP_ORDER: readonly GroupKey[] = ['inProgress', 'ready', 'backlog', 'done'];

const IN_PROGRESS_RANK: Partial<Record<BoardState, number>> = { Blocked: 0, Review: 1, Active: 2 };

const PROBLEM_ICON = { icon: 'warning', color: 'problemsWarningIcon.foreground' };

function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

function compareRows(left: CardView, right: CardView): number {
    return (
        (IN_PROGRESS_RANK[left.state] ?? 0) - (IN_PROGRESS_RANK[right.state] ?? 0) ||
        Number(left.number) - Number(right.number) ||
        compareText(left.number, right.number) ||
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
    return card.step === undefined ? card.state : card.step.short;
}

function contextValueOf(card: CardView, entry: LifecycleEntry): string {
    return ['spec', ...(card.step === undefined ? [] : ['step']), ...(entry.plan === undefined ? [] : ['plan'])].join(' ');
}

function code(text: string): string {
    const run = Math.max(0, ...(text.match(/`+/g) ?? []).map((match) => match.length));
    const fence = '`'.repeat(run + 1);
    const padded = text.startsWith('`') || text.endsWith('`') ? ` ${text} ` : text;
    return `${fence}${padded}${fence}`;
}

function stateLine(card: CardView, entry: LifecycleEntry): string {
    if (card.deprecated) {
        return DEPRECATED_MARKER;
    }
    return entry.persistence === 'derived' && isDerivedRule(entry.rule) ? `${card.state} — ${DERIVED_SENTENCES[entry.rule]}` : card.state;
}

function tooltipOf(model: ShellModel, card: CardView, entry: LifecycleEntry, title: string): string {
    const paragraphs = [`**${escapeMarkdown(`${card.number} ${title}`)}**`, stateLine(card, entry)];
    const next = nextStep(model, card.key);
    if (next !== undefined && 'lines' in next) {
        next.lines.forEach((line, index) => {
            paragraphs.push(index === 0 ? `${NEXT_STEP_PREFIX}${code(line.text)}` : `${line.label === undefined ? '' : `${line.label} `}${code(line.text)}`);
        });
    } else if (next !== undefined) {
        paragraphs.push(`${NEXT_STEP_PREFIX}${next.text}`);
    }
    const figures = [...(card.tasks === undefined ? [] : [stepsText(card.tasks)]), ...(card.criteria === undefined ? [] : [criteriaShortText(card.criteria)])];
    if (figures.length > 0) {
        paragraphs.push(figures.join(' · '));
    }
    for (const diagnostic of entry.diagnostics) {
        if (diagnostic.tier === 'problem') {
            paragraphs.push(`${PROBLEM_PREFIX}${escapeMarkdown(problemSentence(diagnostic))}`);
        }
    }
    paragraphs.push(code(card.key));
    return paragraphs.join('\n\n');
}

function rowOf(model: ShellModel, card: CardView, entry: LifecycleEntry, slug: string): SpecRowModel {
    const title = fullTitle(card, slug);
    const shown = treeLabel({ number: card.number, title, description: descriptionOf(card) });
    const style = card.problems > 0 ? PROBLEM_ICON : { icon: STATE_LOOK[card.state].motif, color: STATE_LOOK[card.state].colour };
    return {
        kind: 'spec',
        id: rowId(model.project.root, card),
        label: shown.label,
        description: shown.description,
        icon: style.icon,
        color: style.color,
        accessibleLabel: treeRowAccessibleLabel({ number: card.number, title, state: card.state, deprecated: card.deprecated, step: card.step?.short, problems: card.problems }),
        tooltip: tooltipOf(model, card, entry, title),
        contextValue: contextValueOf(card, entry),
        stem: card.stem,
        ...(card.path === undefined ? {} : { path: card.path }),
        ...(card.step === undefined ? {} : { line: card.step.line }),
        ...(entry.plan === undefined ? {} : { planKey: entry.plan }),
        specKey: card.key,
        state: card.state,
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
        const problems = own.reduce((sum, card) => sum + card.problems, 0);
        const hint =
            problems === 0
                ? { description: String(own.length) }
                : {
                      description: groupProblemDescription(own.length, problems),
                      icon: PROBLEM_ICON.icon,
                      color: PROBLEM_ICON.color,
                      tooltip: groupProblemLabel(GROUP_LABELS[key], own.length, problems),
                      accessibleLabel: groupProblemLabel(GROUP_LABELS[key], own.length, problems),
                  };
        return [
            {
                kind: 'group' as const,
                id: `group:${key}`,
                label: GROUP_LABELS[key],
                collapsed: key === 'done',
                children: own.map((card) => rowOf(model, card, entries.get(card.key)!, slugs.get(card.key) ?? card.stem)),
                ...hint,
            },
        ];
    });
}

function badgeOf(groups: GroupModel[]): SpecTreeModel['badge'] {
    const rows = groups.flatMap((group) => group.children);
    const review = rows.filter((row) => row.state === 'Review').length;
    const blocked = rows.filter((row) => row.state === 'Blocked').length;
    return review + blocked === 0 ? undefined : { value: review + blocked, tooltip: badgeTooltip(review, blocked) };
}

const ACTION_ICON = 'play';

function actionRows(state: PanelState): ActionRowModel[] {
    return panelStateActions(state).map((action) => ({ kind: 'action', label: ACTION_LABELS[action], action, icon: ACTION_ICON }));
}

export function buildSpecTree(input: SpecTreeInput): SpecTreeModel {
    if (!input.projectActive) {
        const state = input.state;
        if (state === undefined || state.id === 'S6') {
            return { message: undefined, items: [] };
        }
        if (state.id === 'S2') {
            return { message: undefined, items: [], welcome: 'S2' };
        }
        return { message: panelStateLines(state).join(' '), items: actionRows(state) };
    }
    const description = input.projectCount >= 2 && input.projectName !== undefined ? { description: input.projectName } : {};
    const state = input.state;
    if (state?.id === 'S5' && state.reason.cause !== 'protocol') {
        return { message: panelStateLines(state).join(' '), items: actionRows(state), ...description };
    }
    if (input.model === undefined) {
        return { message: LOADING_TEXT, items: [], ...description };
    }
    const groups = groupsOf(input.model);
    if (groups.length === 0) {
        return { message: NO_SPECS_START_TEXT, items: [], ...description };
    }
    const badge = badgeOf(groups);
    return { message: undefined, items: groups, ...(badge === undefined ? {} : { badge }), ...description };
}

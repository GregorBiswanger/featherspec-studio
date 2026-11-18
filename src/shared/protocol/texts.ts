import type { StatusHistoryItem } from './detail';
import type { BoardState } from './boardFilter';
import type { ColumnNarrow, Progress, SortKey } from './board';
import type { ActionId, PanelState } from './messages';
import type { DerivedRule } from './board';

export const DERIVED_SENTENCES: Record<DerivedRule, string> = {
    'S-READY': 'Plan written, not started yet',
    'S-REVIEW': 'Plan done, waiting for review',
    'S-BLOCKED': 'Plan or return note says Blocked',
};

export function derivedTooltip(rule: string): string {
    return `Derived from the files · rule ${rule}`;
}

export function persistedTooltip(rule: string): string {
    return `Read from the files · rule ${rule}`;
}

function two(value: number): string {
    return String(value).padStart(2, '0');
}

function dayKey(date: Date): number {
    return date.getFullYear() * 10000 + date.getMonth() * 100 + date.getDate();
}

/** T-02, T-17: `Today HH:MM`, `Yesterday HH:MM` (local calendar day), else `YYYY-MM-DD HH:MM`; an unparsable value as stored. */
export function whenText(iso: string, now: Date): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return iso;
    }
    const time = `${two(date.getHours())}:${two(date.getMinutes())}`;
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    if (dayKey(date) === dayKey(now)) {
        return `Today ${time}`;
    }
    if (dayKey(date) === dayKey(yesterday)) {
        return `Yesterday ${time}`;
    }
    return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())} ${time}`;
}

/** T-02: `Updated HH:MM` today, else `Updated YYYY-MM-DD HH:MM`. */
export function updatedText(iso: string, now: Date): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return `Updated ${iso}`;
    }
    const time = `${two(date.getHours())}:${two(date.getMinutes())}`;
    return dayKey(date) === dayKey(now) ? `Updated ${time}` : `Updated ${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())} ${time}`;
}

export function projectTooltip(version: string, updatedAt: string | undefined, now: Date): string {
    return updatedAt === undefined ? `FeatherSpec ${version}` : `FeatherSpec ${version} · ${updatedText(updatedAt, now)}`;
}

export const HISTORY_LABEL = 'Only changes Studio saw while it was running.';
export const HISTORY_GONE_TEXT = 'no longer in the project';
export const HISTORY_WHILE_CLOSED_TEXT = '(changed while Studio was not running)';
export const HISTORY_OUTSIDE_FLOW_TEXT = '(outside the FeatherSpec flow)';

/** T-14, §6.4. */
export function historyEntryText(item: StatusHistoryItem, now: Date): string {
    const old = item.old ?? '—';
    const next = item.new ?? undefined;
    let change: string;
    if (next === undefined) {
        change = `${old} → ${HISTORY_GONE_TEXT}`;
    } else if (item.cause.kind === 'first-observed' || item.old === null) {
        change = `first seen as ${next}`;
    } else if (item.cause.kind === 'changed-while-not-running') {
        change = `${old} → ${next} ${HISTORY_WHILE_CLOSED_TEXT}`;
    } else {
        change = `${old} → ${next}`;
    }
    const flow = item.flow === 'outside the FeatherSpec flow' ? ` ${HISTORY_OUTSIDE_FLOW_TEXT}` : '';
    return `${whenText(item.observedAt, now)} — ${change}${flow}`;
}

/** Q-2: stored time, rule ID and changed paths; a part with no value is left out. */
export function historyTooltip(item: StatusHistoryItem): string {
    const parts = [item.observedAt];
    if (item.rule !== null) {
        parts.push(`rule ${item.rule}`);
    }
    if (item.cause.kind === 'files' && item.cause.paths.length > 0) {
        parts.push(item.cause.paths.join(', '));
    }
    return parts.join(' · ');
}

export const S2_SETUP_SENTENCE = 'Set up FeatherSpec downloads the latest FeatherSpec release from GitHub and adds its files; existing files are never overwritten.';

export function ignoredMessageLine(type: string, reason: string): string {
    return `Ignored a message from the Studio panel: type ${type}, ${reason}.`;
}

export const LOADING_TEXT = 'Loading project…';

export const OPEN_STUDIO_LABEL = 'Open Studio';

export const NAVIGATION_LABEL = 'Studio areas';

export type StateId = PanelState['id'] | 'S7';

export const ACTION_LABELS: Record<ActionId, string> = {
    openFolder: 'Open Folder',
    openSetupGuide: 'Open setup guide',
    refresh: 'Refresh',
    selectProject: 'Select project',
    showOutput: 'Show output',
    retry: 'Retry',
    manageTrust: 'Manage Workspace Trust',
    reload: 'Reload',
    setUp: 'Set up FeatherSpec',
    copyMergePrompt: 'Copy merge prompt',
};

export const STATE_LABELS: Record<StateId, string> = {
    S1: 'No folder open',
    S2: 'No project found',
    S3: 'Several projects found',
    S4: 'Loading',
    S5: 'Project could not be loaded',
    S6: 'Reload needed',
    S7: 'Restricted Mode',
    S8: 'Project not found',
    S9: 'Project incomplete',
};

export const RESTRICTED_TEXT = 'This workspace is in Restricted Mode. Setting up FeatherSpec needs a trusted workspace.';

export function s5ReasonText(reason: Extract<PanelState, { id: 'S5' }>['reason']): string {
    switch (reason.cause) {
        case 'discovery':
            return `project discovery failed (${reason.message})`;
        case 'listing':
            return `the lifecycle folders of .specs/ could not be listed (${reason.folder}: ${reason.reason})`;
        case 'protocol':
            return 'the Studio panel and the extension could not exchange data';
    }
}

export function panelStateLines(state: PanelState): string[] {
    switch (state.id) {
        case 'S1':
            return ['Open a folder to use FeatherSpec Studio.'];
        case 'S2':
            return ['No FeatherSpec project found in this workspace.', S2_SETUP_SENTENCE];
        case 'S3':
            return ['Several FeatherSpec projects found. Select one to continue.'];
        case 'S4':
            return [LOADING_TEXT];
        case 'S5':
            return [`The project could not be loaded: ${s5ReasonText(state.reason)}.`];
        case 'S6':
            return ['FeatherSpec Studio was updated. Reload to continue.'];
        case 'S8':
            return [`FeatherSpec project ${state.name} was not found.`];
        case 'S9':
            return state.folders.flatMap((folder) =>
                folder.setupPending === true
                    ? [`FeatherSpec setup not finished: ${folder.folder} has files to merge.`]
                    : folder.markers.map((marker) => `FeatherSpec project incomplete: ${folder.folder} has no ${marker}.`),
            );
    }
}

export function panelStateActions(state: PanelState): ActionId[] {
    switch (state.id) {
        case 'S1':
            return ['openFolder'];
        case 'S2':
            return ['setUp', 'openSetupGuide', 'refresh'];
        case 'S3':
            return ['selectProject'];
        case 'S4':
            return [];
        case 'S5':
            return ['showOutput', 'retry'];
        case 'S6':
            return ['reload'];
        case 'S8':
            return state.canSelect ? ['selectProject', 'refresh'] : ['refresh'];
        case 'S9': {
            const pending = state.folders.filter((folder) => folder.setupPending === true).length;
            if (pending === 0) {
                return ['setUp', 'openSetupGuide', 'refresh'];
            }
            return pending === state.folders.length
                ? ['copyMergePrompt', 'setUp', 'openSetupGuide', 'refresh']
                : ['setUp', 'copyMergePrompt', 'openSetupGuide', 'refresh'];
        }
    }
}

export const OPEN_STUDIO_COMMAND_ID = 'featherspec-studio.open';
export const SELECT_PROJECT_COMMAND_ID = 'featherspec-studio.selectProject';
export const SETUP_COMMAND_ID = 'featherspec-studio.setup';
export const COPY_MERGE_PROMPT_COMMAND_ID = 'featherspec-studio.copyMergePrompt';

function shellActionLink(label: string, action: ActionId): string {
    return `[${label}](command:featherspec-studio.shellAction?${encodeURIComponent(JSON.stringify([action]))})`;
}

export const S2_WELCOME = [
    'No FeatherSpec project found in this workspace.',
    S2_SETUP_SENTENCE,
    `[${ACTION_LABELS.setUp}](command:${SETUP_COMMAND_ID})`,
    `${shellActionLink(ACTION_LABELS.openSetupGuide, 'openSetupGuide')} · ${shellActionLink(ACTION_LABELS.refresh, 'refresh')}`,
].join('\n');

export const PLACEHOLDER_TEXT = 'Not available in this version of FeatherSpec Studio';

export const NO_SPECS_TEXT = 'This project has no specs yet.';

export const TITLE_NOT_AVAILABLE = 'not available';

export const SPEC_LIST_LABEL = 'Specs';

export const DISMISS_LABEL = 'Dismiss';

export function noticeText(number: string): string {
    return `Spec ${number} is no longer in the project`;
}

export function narrowColumnText(state: BoardState, narrow: ColumnNarrow, count: number): string {
    switch (narrow) {
        case 'empty':
            return `${state}: no spec`;
        case 'filtered':
            return `${state}: ${count} hidden by filter`;
        case 'collapsed':
            return `${state}: ${count} ${count === 1 ? 'spec' : 'specs'}, collapsed`;
    }
}

export function columnRuleTooltip(rule: DerivedRule): string {
    return `${DERIVED_SENTENCES[rule]} · ${derivedTooltip(rule)}`;
}

export function hiddenByFilterText(count: number): string {
    return `${count} hidden by filter`;
}

export const BOARD_LABEL = 'Board';
export const CLEAR_FILTERS_LABEL = 'Clear filters';
export const SORT_LABEL = 'Sort';
export const FILTER_CHIP_LABEL = 'Filter';

export const SORT_LABELS: Record<SortKey, string> = {
    number: 'Number',
    title: 'Title A–Z',
    lastChange: 'Last change (newest first)',
};

export const NO_SUMMARY_TEXT = 'No summary';

export function tasksText(tasks: Progress | undefined): string {
    return tasks === undefined ? 'Tasks: not available' : `Tasks: ${tasks.done} of ${tasks.total}`;
}

export const TASKS_PROGRESS_LABEL = 'Tasks';
export const CRITERIA_PROGRESS_LABEL = 'Criteria verified';

export function criteriaText(criteria: Progress | undefined): string {
    return criteria === undefined ? 'Criteria: not available' : `Criteria: ${criteria.done} of ${criteria.total} verified`;
}

export function formatLastChange(ms: number): string {
    const date = new Date(ms);
    return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())} ${two(date.getHours())}:${two(date.getMinutes())}`;
}

export function lastChangeText(ms: number | undefined): string {
    return ms === undefined ? 'Last change: not available' : `Last change: ${formatLastChange(ms)}`;
}

export const DEPRECATED_MARKER = 'Deprecated';
export const UNCERTAIN_FLAG = 'uncertain';
export const STRUCK_FLAG = 'struck';

export function problemsBadgeText(count: number): string {
    return count === 1 ? '1 problem' : `${count} problems`;
}

export const NO_SPECS_START_TEXT = 'No specs yet. Start with /sdd-specify';
export const SDD_SPECIFY_LINE = '/sdd-specify';

export const BANNER_HEADING = 'Problems';

export function formatNotesText(count: number): string {
    return count === 1 ? '1 format note — no action needed' : `${count} format notes — no action needed`;
}

export const NO_DETAIL_SELECTION_TEXT = 'Select a spec in the list to see its details.';
export const NO_REQUIREMENTS_TEXT = 'No FR- requirements found';
export const NO_PLAN_TEXT = 'No plan yet';
export const NEED_CRITERIA_TEXT = 'needs acceptance criteria';
export const NEED_PLAN_TEXT = 'needs a plan';
export const NEED_PLAN_LINK_TEXT = 'needs the Plan line to link its plan';
export const NEED_PLAN_STARTED_TEXT = 'plan already started';
export const NEED_PLAN_NO_STATUS_TEXT = 'plan has no status';

export function needTooltip(rule: string): string {
    return `Not Ready yet · rule ${rule}`;
}
export const OPEN_FILE_LABEL = 'Open file';
export const STATE_LABEL = 'State';
export const HISTORY_NOT_AVAILABLE_TEXT = 'Status history: not available';

export function fileNotFoundText(path: string): string {
    return `File not found: ${path}`;
}

export function successorText(successor: { kind: 'link'; text: string } | { kind: 'none' } | { kind: 'not-available' }): string {
    switch (successor.kind) {
        case 'link':
            return `Successor: ${successor.text}`;
        case 'none':
            return 'Successor: none — behaviour removed';
        case 'not-available':
            return 'Successor: not available';
    }
}

export const DETAIL_LABEL = 'Spec detail';
export const NO_RELATED_TEXT = 'No related artifacts';
export const SECTION_TITLES = {
    overview: 'Overview',
    requirements: 'Requirements',
    criteria: 'Acceptance criteria',
    plan: 'Plan & tasks',
    verification: 'Verification',
    related: 'Related artifacts',
    history: 'Status history',
} as const;

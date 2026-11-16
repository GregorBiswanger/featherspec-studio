import type { BoardState } from './boardFilter';
import type { CardRun, Progress, SortKey } from './board';
import type { ActionId, PanelState } from './messages';
import type { DerivedRule } from './missionControl';

export const DERIVED_SENTENCES: Record<DerivedRule, string> = {
    'S-READY': 'Derived: draft with a plan that has not started',
    'S-REVIEW': 'Derived: plan is Done, waiting for review',
    'S-BLOCKED': 'Derived: plan or return note says Blocked',
};

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

export const RESTRICTED_TEXT = 'This workspace is in Restricted Mode. Agent actions are unavailable.';

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
            return ['No FeatherSpec project found in this workspace.'];
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
                folder.markers.map((marker) => `FeatherSpec project incomplete: ${folder.folder} has no ${marker}.`),
            );
    }
}

export function panelStateActions(state: PanelState): ActionId[] {
    switch (state.id) {
        case 'S1':
            return ['openFolder'];
        case 'S2':
            return ['openSetupGuide', 'refresh'];
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
        case 'S9':
            return ['openSetupGuide', 'refresh'];
    }
}

export const PLACEHOLDER_TEXT = 'Not available in this version of FeatherSpec Studio';

export const NO_SPECS_TEXT = 'This project has no specs yet.';

export const TITLE_NOT_AVAILABLE = 'not available';

export const SPEC_LIST_LABEL = 'Specs';

export const DISMISS_LABEL = 'Dismiss';

export function noticeText(number: string): string {
    return `Spec ${number} is no longer in the project`;
}

export const COLUMN_HINTS: Record<BoardState, string> = {
    Backlog: 'No spec in the backlog.',
    Ready: 'No spec is ready.',
    Active: 'No spec is being implemented.',
    Review: 'No spec awaits review.',
    Done: 'No spec is done yet.',
    Blocked: 'No spec is blocked.',
};

export function hiddenByFilterText(count: number): string {
    return `${count} hidden by filter`;
}

export const BOARD_LABEL = 'Spec board';
export const STATE_FILTER_LABEL = 'State';
export const PROVIDER_FILTER_LABEL = 'Provider';
export const NO_RUN_LABEL = 'No run';
export const CLEAR_FILTERS_LABEL = 'Clear filters';
export const SORT_LABEL = 'Sort';
export const SPEC_SET_LABEL = 'Named set';

export const SORT_LABELS: Record<SortKey, string> = {
    number: 'Number',
    title: 'Title A–Z',
    lastChange: 'Last change (newest first)',
};

export const NO_SPECS_BOARD_TEXT = 'No specs yet. Run /sdd-specify to write the first one.';

export const NO_SUMMARY_TEXT = 'No summary';

export function tasksText(tasks: Progress | undefined): string {
    return tasks === undefined ? 'Tasks: not available' : `Tasks: ${tasks.done} of ${tasks.total}`;
}

export const TASKS_PROGRESS_LABEL = 'Tasks';
export const CRITERIA_PROGRESS_LABEL = 'Criteria verified';

export function criteriaText(criteria: Progress | undefined): string {
    return criteria === undefined ? 'Criteria: not available' : `Criteria: ${criteria.done} of ${criteria.total} verified`;
}

function two(value: number): string {
    return String(value).padStart(2, '0');
}

export function formatLastChange(ms: number): string {
    const date = new Date(ms);
    return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())} ${two(date.getHours())}:${two(date.getMinutes())}`;
}

export function lastChangeText(ms: number | undefined): string {
    return ms === undefined ? 'Last change: not available' : `Last change: ${formatLastChange(ms)}`;
}

export function cardRunText(run: CardRun): string {
    switch (run.kind) {
        case 'none':
            return 'No run';
        case 'unavailable':
            return 'Runs: not available';
        case 'run':
            return `${run.provider} · ${run.status}`;
        case 'unreadable':
            return `${run.provider} · history unreadable`;
    }
}

export const DEPRECATED_MARKER = 'Deprecated';
export const UNCERTAIN_FLAG = 'uncertain';
export const STRUCK_FLAG = 'struck';
export const HISTORY_INCOMPLETE_FLAG = 'history incomplete';
export const HISTORY_UNREADABLE_FLAG = 'history unreadable';

export function diagnosticsBadgeText(count: number): string {
    return count === 1 ? '1 diagnostic' : `${count} diagnostics`;
}

export const BANNER_HEADING = 'Project diagnostics';

export const AGENT_START_UNAVAILABLE_TEXT = 'Agent start is not available yet';

export function handedOffText(number: string): string {
    return `Spec ${number} was handed to the agent start.`;
}

export const MOVE_MENU_LABEL = 'Move to…';
export const MOVE_COMMAND_TITLE = 'FeatherSpec: Move Spec to…';
export function moveMenuAriaLabel(number: string): string {
    return `${MOVE_MENU_LABEL} (spec ${number})`;
}

export const PICK_SPEC_PLACEHOLDER = 'Select a spec to move';

export function pickTargetPlaceholder(number: string): string {
    return `Move spec ${number} to…`;
}

export const NO_DETAIL_SELECTION_TEXT = 'Select a spec in the list to see its details.';
export const NO_REQUIREMENTS_TEXT = 'No FR- requirements found';
export const NO_PLAN_TEXT = 'No plan yet';
export const PRIORITY_TEXT = 'Priority: not available';
export const OPEN_FILE_LABEL = 'Open file';
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
    history: 'Agent history',
} as const;

import type { Diagnostic } from '../specs/diagnostics';
import type { LifecycleFolder } from '../specs/files';

export const LIFECYCLE_STATES = ['Backlog', 'Ready', 'Active', 'Review', 'Done', 'Blocked'] as const;
export type LifecycleState = (typeof LIFECYCLE_STATES)[number];

export const RULE_IDS = ['S-DONE', 'S-BLOCKED', 'S-FOLDER', 'S-REVIEW', 'S-ACTIVE', 'S-READY', 'S-BACKLOG'] as const;
export type RuleId = (typeof RULE_IDS)[number];

export type Persistence = 'persisted' | 'derived';

export const READINESS_IDS = ['R-1', 'R-2', 'R-3', 'R-4', 'R-5', 'R-6', 'R-7'] as const;
export type ReadinessId = (typeof READINESS_IDS)[number];

export type ReadinessCheck =
    | { id: ReadinessId; result: 'pass' }
    | { id: ReadinessId; result: 'fail' | 'not available'; reason: string };

export interface ReadinessResult {
    ready: boolean;
    checks: ReadinessCheck[];
    failing: ReadinessId[];
}

export type ContradictionKind = 'folder-status' | 'active-without-plan' | 'done-without-archive-link';

export interface ContradictionDiagnostic {
    kind: 'lifecycle-contradiction';
    contradiction: ContradictionKind;
    scope: { file: string };
    reason: string;
}

export type LifecycleDiagnostic = Diagnostic | ContradictionDiagnostic;

export type Successor =
    | { kind: 'link'; target: string; text: string }
    | { kind: 'none' }
    | { kind: 'not-available' };

export interface DeprecatedMarker {
    successor: Successor;
}

export interface LifecycleEntry {
    key: string;
    stem: string;
    number: string;
    folder: LifecycleFolder;
    state: LifecycleState;
    rule: RuleId;
    persistence: Persistence;
    derivedLabel: string | undefined;
    readiness: ReadinessResult;
    diagnostics: LifecycleDiagnostic[];
    deprecated: DeprecatedMarker | undefined;
}

export interface LifecycleModel {
    entries: LifecycleEntry[];
    projectDiagnostics: Diagnostic[];
}

export const DERIVED_STATES: readonly LifecycleState[] = ['Ready', 'Review', 'Blocked'];

export function findEntry(model: LifecycleModel, key: string): LifecycleEntry | undefined {
    return model.entries.find((entry) => entry.key === key);
}

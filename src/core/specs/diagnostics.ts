export type DiagnosticKind =
    | 'unreadable-file'
    | 'unknown-content'
    | 'duplicate'
    | 'orphan'
    | 'dangling-link'
    | 'unverified-version';

export type DiagnosticTier = 'problem' | 'note';

export type DiagnosticScope = { file: string; line?: number } | 'project';

export interface Diagnostic {
    kind: DiagnosticKind;
    tier: DiagnosticTier;
    scope: DiagnosticScope;
    reason: string;
}

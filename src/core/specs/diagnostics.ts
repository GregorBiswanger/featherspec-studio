export type DiagnosticKind =
    | 'unreadable-file'
    | 'unknown-content'
    | 'duplicate'
    | 'orphan'
    | 'dangling-link'
    | 'unverified-version';

export type DiagnosticScope = { file: string; line?: number } | 'project';

export interface Diagnostic {
    kind: DiagnosticKind;
    scope: DiagnosticScope;
    reason: string;
}

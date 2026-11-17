import type { Diagnostic } from './diagnostics';
import type { FieldValue } from './fieldValue';
import type { HeaderField } from './parseSpec';

export interface ParsedReturnNote {
    status: HeaderField;
    files: HeaderField;
    verified: HeaderField;
    notes: HeaderField;
    blockedOn: HeaderField;
    diagnostics: Diagnostic[];
}

type Label = 'Status' | 'Files' | 'Verified' | 'Notes' | 'Blocked on';

const FIELD_LINE = /^(?:-[ \t]+)?\*\*([^*:\n]+):\*\*[ \t]*(.*?)[ \t]*$/;
const PLACEHOLDERS = new Set(['—', '_none_', '_none yet_']);
const KNOWN_STATUS = new Set(['DONE', 'BLOCKED']);
const LABELS: readonly Label[] = ['Status', 'Files', 'Verified', 'Notes', 'Blocked on'];

function classify(raw: string): FieldValue {
    if (raw === '') {
        return { state: 'empty', raw };
    }
    return { state: PLACEHOLDERS.has(raw) ? 'placeholder' : 'value', raw };
}

export function parseReturnNote(text: string, key: string): ParsedReturnNote {
    const fields = new Map<Label, HeaderField>();
    const diagnostics: Diagnostic[] = [];
    text.split('\n').forEach((line, index) => {
        const match = FIELD_LINE.exec(line);
        const label = LABELS.find((candidate) => candidate === match?.[1]);
        if (match === null || label === undefined || fields.has(label)) {
            return;
        }
        const value = classify(match[2]);
        fields.set(label, { value, line: index + 1 });
        if (label === 'Status' && value.state !== 'absent' && !KNOWN_STATUS.has(value.raw)) {
            diagnostics.push({ kind: 'unknown-content', tier: 'problem', scope: { file: key, line: index + 1 }, reason: `unknown status value "${value.raw}"` });
        }
    });
    const field = (label: Label): HeaderField => fields.get(label) ?? { value: { state: 'absent' } };
    return {
        status: field('Status'),
        files: field('Files'),
        verified: field('Verified'),
        notes: field('Notes'),
        blockedOn: field('Blocked on'),
        diagnostics,
    };
}

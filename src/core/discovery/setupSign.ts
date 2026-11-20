export type SetupRun = 'not run' | 'run or unknown';

const BRIEF_HEADINGS: readonly string[] = ['## Mission', '## Primary users', '## Success criteria'];
const RECONCILED_LINE = /^ *# last reconciled:(.*)$/;

function withoutBom(text: string): string {
    return text.startsWith('﻿') ? text.slice(1) : text;
}

function briefUntouched(briefText: string): boolean {
    const lines = withoutBom(briefText).split(/\r?\n/);
    return BRIEF_HEADINGS.every((heading) => {
        const start = lines.findIndex((line) => line.trimEnd() === heading);
        if (start < 0) {
            return false;
        }
        const rest = lines.slice(start + 1);
        const end = rest.findIndex((line) => line.startsWith('#'));
        const body = (end < 0 ? rest : rest.slice(0, end)).join('\n').trim();
        return body === 'TBD';
    });
}

function snapshotNeverReconciled(agentsText: string): boolean {
    for (const line of withoutBom(agentsText).split(/\r?\n/)) {
        const match = RECONCILED_LINE.exec(line);
        if (match !== null) {
            return (match[1] ?? '').split('·')[0]?.trim() === 'never';
        }
    }
    return false;
}

export function readSetupSign(agentsText: string | undefined, briefText: string | undefined): SetupRun {
    if (agentsText === undefined || briefText === undefined) {
        return 'run or unknown';
    }
    return briefUntouched(briefText) && snapshotNeverReconciled(agentsText) ? 'not run' : 'run or unknown';
}

import { COPIED_TEXT, COPY_FAILED_TEXT } from '../../shared/protocol/nextStepTexts';
import type { ClipboardPort } from '../ports/board';

export interface CopyOutcome {
    ok: boolean;
    text: string;
}

export async function copyLine(clipboard: ClipboardPort, line: string): Promise<CopyOutcome> {
    try {
        await clipboard.writeText(line);
        return { ok: true, text: COPIED_TEXT };
    } catch {
        return { ok: false, text: COPY_FAILED_TEXT };
    }
}

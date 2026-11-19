import {
    ACTIVE_WITHOUT_PLAN_SENTENCE,
    DONE_WITHOUT_ARCHIVE_SENTENCE,
    FOLDER_UNLISTABLE_SENTENCE,
    folderStatusSentence,
    numberTwiceSentence,
    orphanNoteSentence,
    PLAN_UNREADABLE_SENTENCE,
    planLinkDanglesSentence,
    returnNoteUnreadableSentence,
    sameSpecTwiceSentence,
    SPEC_UNREADABLE_SENTENCE,
    specLinkDanglesSentence,
    unknownNoteStatusSentence,
    unknownPlanStatusSentence,
    unknownSpecStatusSentence,
} from '../../shared/protocol/texts';
import type { Diagnostic } from '../specs/diagnostics';
import type { LifecycleDiagnostic } from './model';

type FileKind = 'spec' | 'plan' | 'note' | 'folder';

const RETURN_NOTE = /(?:^|\/)activeContext\.[^/]*\.md$/;
const FOLDER_STATUS = /^Folder (\S+)\/ does not match status "(.*)"\.$/;
const SAME_REFERENCE = /^reference .+? also exists in (.+)$/;
const SAME_NUMBER = /^number (\S+) also used by (.+)$/;
const PLAN_LINK = /^plan link (.+) points to a missing file$/;
const SPEC_LINK = /^spec link (.+) points to a missing file$/;
const SPEC_STATUS = /^unknown \*\*Status:\*\* value "(.*)"$/;
const PLAN_STATUS = /^Unknown plan status "(.*)"; documented values are /;
const NOTE_STATUS = /^unknown status value "(.*)"$/;
const ORPHAN_NOTE = /^return note matches no spec \(number (.+)\)$/;

function fileKindOf(file: string): FileKind {
    if (RETURN_NOTE.test(file)) {
        return 'note';
    }
    if (file.endsWith('.plan.md')) {
        return 'plan';
    }
    return file.endsWith('.md') ? 'spec' : 'folder';
}

function nameOf(file: string): string {
    return file.slice(file.lastIndexOf('/') + 1);
}

function unreadable(file: string): string {
    switch (fileKindOf(file)) {
        case 'spec':
            return SPEC_UNREADABLE_SENTENCE;
        case 'plan':
            return PLAN_UNREADABLE_SENTENCE;
        case 'note':
            return returnNoteUnreadableSentence(nameOf(file));
        case 'folder':
            return FOLDER_UNLISTABLE_SENTENCE;
    }
}

function contradictionSentence(diagnostic: LifecycleDiagnostic): string | undefined {
    if (!('contradiction' in diagnostic)) {
        return undefined;
    }
    switch (diagnostic.contradiction) {
        case 'folder-status': {
            const match = FOLDER_STATUS.exec(diagnostic.reason);
            return match === null ? undefined : folderStatusSentence(match[1]!, match[2] === '(missing)' ? undefined : match[2]);
        }
        case 'active-without-plan':
            return ACTIVE_WITHOUT_PLAN_SENTENCE;
        case 'done-without-archive-link':
            return DONE_WITHOUT_ARCHIVE_SENTENCE;
    }
}

function viaReason(diagnostic: Diagnostic): string | undefined {
    const reason = diagnostic.reason;
    switch (diagnostic.kind) {
        case 'duplicate': {
            const reference = SAME_REFERENCE.exec(reason);
            if (reference !== null) {
                return sameSpecTwiceSentence(reference[1]!);
            }
            const number = SAME_NUMBER.exec(reason);
            return number === null ? undefined : numberTwiceSentence(number[1]!, number[2]!);
        }
        case 'dangling-link': {
            const plan = PLAN_LINK.exec(reason);
            if (plan !== null) {
                return planLinkDanglesSentence(plan[1]!);
            }
            const spec = SPEC_LINK.exec(reason);
            return spec === null ? undefined : specLinkDanglesSentence(spec[1]!);
        }
        case 'unknown-content': {
            const spec = SPEC_STATUS.exec(reason);
            if (spec !== null) {
                return unknownSpecStatusSentence(spec[1]!);
            }
            const plan = PLAN_STATUS.exec(reason);
            if (plan !== null) {
                return unknownPlanStatusSentence(plan[1]!);
            }
            const note = NOTE_STATUS.exec(reason);
            return note === null ? undefined : unknownNoteStatusSentence(note[1]!);
        }
        case 'orphan': {
            const match = ORPHAN_NOTE.exec(reason);
            return match === null ? undefined : orphanNoteSentence(match[1]!);
        }
        case 'unreadable-file':
        case 'unverified-version':
            return undefined;
    }
}

export function knownProblemSentence(diagnostic: Diagnostic | LifecycleDiagnostic): string | undefined {
    if (diagnostic.tier !== 'problem') {
        return undefined;
    }
    const contradiction = contradictionSentence(diagnostic as LifecycleDiagnostic);
    if (contradiction !== undefined) {
        return contradiction;
    }
    if (diagnostic.scope === 'project') {
        return undefined;
    }
    if (diagnostic.kind === 'unreadable-file') {
        return unreadable(diagnostic.scope.file);
    }
    return viaReason(diagnostic as Diagnostic);
}

export function problemSentence(diagnostic: Diagnostic | LifecycleDiagnostic): string {
    return knownProblemSentence(diagnostic) ?? diagnostic.reason;
}

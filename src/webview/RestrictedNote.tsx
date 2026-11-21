import { ACTION_LABELS, RESTRICTED_TEXT, STATE_LABELS } from '../shared/protocol/texts';
import { translateTerms } from '../shared/protocol/vocabulary';
import { hostKind } from './hostKind';
import { useShell } from './shell';

export function RestrictedNote() {
    const shell = useShell();
    if (shell.view?.restricted !== true) {
        return null;
    }
    const host = hostKind();
    return (
        <div role="note" aria-label={translateTerms(STATE_LABELS.S7, host)} className="restricted-note" data-state="S7">
            <p>{translateTerms(RESTRICTED_TEXT, host)}</p>
            <button type="button" onClick={() => shell.runAction('manageTrust')}>
                {translateTerms(ACTION_LABELS.manageTrust, host)}
            </button>
        </div>
    );
}

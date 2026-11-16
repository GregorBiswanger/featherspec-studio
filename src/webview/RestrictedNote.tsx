import { ACTION_LABELS, RESTRICTED_TEXT, STATE_LABELS } from '../shared/protocol/texts';
import { useShell } from './shell';

export function RestrictedNote() {
    const shell = useShell();
    if (shell.view?.restricted !== true) {
        return null;
    }
    return (
        <div role="note" aria-label={STATE_LABELS.S7} className="restricted-note" data-state="S7">
            <p>{RESTRICTED_TEXT}</p>
            <button type="button" onClick={() => shell.runAction('manageTrust')}>
                {ACTION_LABELS.manageTrust}
            </button>
        </div>
    );
}

import type { PanelState } from '../shared/protocol/messages';
import { ACTION_LABELS, LOADING_TEXT, panelStateActions, panelStateLines, STATE_LABELS } from '../shared/protocol/texts';
import { useShell } from './shell';

export function PanelStateView(props: { state: PanelState }) {
    const shell = useShell();
    const { state } = props;
    return (
        <section role="status" aria-label={STATE_LABELS[state.id]} className="panel-state" data-state={state.id}>
            {state.id === 'S4' ? (
                <div role="progressbar" aria-label={LOADING_TEXT} className="loading">
                    {LOADING_TEXT}
                </div>
            ) : (
                panelStateLines(state).map((line) => <p key={line}>{line}</p>)
            )}
            {panelStateActions(state).length === 0 ? null : (
                <div className="actions">
                    {panelStateActions(state).map((action) => (
                        <button key={action} type="button" onClick={() => shell.runAction(action)}>
                            {ACTION_LABELS[action]}
                        </button>
                    ))}
                </div>
            )}
        </section>
    );
}

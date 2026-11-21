import type { PanelState } from '../shared/protocol/messages';
import { ACTION_LABELS, LOADING_TEXT, panelStateActions, panelStateLines, STATE_LABELS } from '../shared/protocol/texts';
import { translateTerms } from '../shared/protocol/vocabulary';
import { Glyph, type GlyphKind } from './board/icons';
import { hostKind } from './hostKind';
import { useShell } from './shell';

const STATE_ICONS: Record<PanelState['id'], GlyphKind> = {
    S1: 'folder',
    S2: 'info',
    S3: 'Backlog',
    S4: 'waiting',
    S5: 'failed',
    S6: 'waiting',
    S8: 'info',
    S9: 'diagnostic',
};

export function PanelStateView(props: { state: PanelState }) {
    const shell = useShell();
    const { state } = props;
    const host = hostKind();
    return (
        <section role="status" aria-label={translateTerms(STATE_LABELS[state.id], host)} className="panel-state" data-state={state.id}>
            <span className="panel-state-icon">
                <Glyph kind={STATE_ICONS[state.id]} />
            </span>
            {state.id === 'S4' ? (
                <div role="progressbar" aria-label={LOADING_TEXT} className="loading">
                    {LOADING_TEXT}
                </div>
            ) : (
                panelStateLines(state).map((line) => <p key={line}>{translateTerms(line, host)}</p>)
            )}
            {panelStateActions(state).length === 0 ? null : (
                <div className="actions">
                    {panelStateActions(state).map((action, index) => (
                        <button
                            key={action}
                            type="button"
                            {...(index === 0 && (state.id === 'S2' || state.id === 'S9') ? { 'data-primary': 'true' } : {})}
                            onClick={() => shell.runAction(action)}
                        >
                            {translateTerms(ACTION_LABELS[action], host)}
                        </button>
                    ))}
                </div>
            )}
        </section>
    );
}

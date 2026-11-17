import type { NavigationRequest } from '../../../shared/protocol/messages';
import type { AttentionReason, McAttention } from '../../../shared/protocol/missionControl';
import { Glyph, type GlyphKind } from '../../board/icons';
import { Drill } from './Drill';
import { attentionRequest, attentionRowRequest } from './requests';
import { SpecLabel } from './SpecLabel';
import { MC_NOTHING_ATTENTION, mcAttentionHeading, mcReason } from './texts';

const REASON_GLYPHS: Record<AttentionReason, GlyphKind> = {
    Blocked: 'Blocked',
    Diagnostic: 'diagnostic',
    'Review pending': 'Review',
};

export function Attention(props: { attention: McAttention; navigate: (request: NavigationRequest) => void }) {
    const { attention, navigate } = props;
    return (
        <section data-attention className="mc-attention mc-panel">
            <h2>
                <Drill id="attention" onActivate={() => navigate(attentionRequest(attention.rows))}>
                    {mcAttentionHeading(attention.rows.length)}
                </Drill>
            </h2>
            {attention.rows.length === 0 ? (
                <p className="mc-empty">
                    <Glyph kind="Done" />
                    {MC_NOTHING_ATTENTION}
                </p>
            ) : (
                <ul className="mc-list">
                    {attention.rows.map((row, position) => (
                        <li key={`${row.spec.stem}|${row.spec.path ?? ''}`} data-attention-row={row.spec.stem}>
                            <Drill id={`row:${position}`} className="mc-row" onActivate={() => navigate(attentionRowRequest(row))}>
                                <SpecLabel spec={row.spec} />
                                <span className="mc-sep">{' — '}</span>
                                <span className="mc-reasons">
                                    {row.reasons.map((reason, index) => (
                                        <span key={reason} className="mc-reason-item">
                                            {index === 0 ? '' : <span className="mc-sep">, </span>}
                                            <span data-reason data-reason-kind={reason} className="mc-reason">
                                                <Glyph kind={REASON_GLYPHS[reason]} />
                                                {mcReason(reason)}
                                            </span>
                                        </span>
                                    ))}
                                </span>
                            </Drill>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

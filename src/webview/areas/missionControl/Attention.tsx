import type { NavigationRequest } from '../../../shared/protocol/messages';
import type { McAttention } from '../../../shared/protocol/missionControl';
import { Drill } from './Drill';
import { attentionRequest, attentionRowRequest } from './requests';
import { MC_NOTHING_ATTENTION, mcAttentionHeading, mcReason, mcRunReasonsUnavailable, mcSpecLabel } from './texts';

export function Attention(props: { attention: McAttention; navigate: (request: NavigationRequest) => void }) {
    const { attention, navigate } = props;
    return (
        <section data-attention className="mc-attention">
            <h2>
                <Drill id="attention" onActivate={() => navigate(attentionRequest(attention.rows))}>
                    {mcAttentionHeading(attention.rows.length)}
                </Drill>
            </h2>
            {attention.rows.length === 0 ? (
                <p>{MC_NOTHING_ATTENTION}</p>
            ) : (
                <ul className="mc-list">
                    {attention.rows.map((row, position) => (
                        <li key={`${row.spec.stem}|${row.spec.path ?? ''}`} data-attention-row={row.spec.stem}>
                            <Drill id={`row:${position}`} onActivate={() => navigate(attentionRowRequest(row))}>
                                <span>{mcSpecLabel(row.spec)}</span>
                                {' — '}
                                {row.reasons.map((reason, index) => (
                                    <span key={reason}>
                                        {index === 0 ? '' : ', '}
                                        <span data-reason className="mc-reason">
                                            {mcReason(reason)}
                                        </span>
                                    </span>
                                ))}
                            </Drill>
                        </li>
                    ))}
                </ul>
            )}
            {attention.runReasons.available ? null : <p data-run-reasons>{mcRunReasonsUnavailable(attention.runReasons.reason)}</p>}
        </section>
    );
}

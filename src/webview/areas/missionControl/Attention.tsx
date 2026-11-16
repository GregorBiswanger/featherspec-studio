import type { McAttention } from '../../../shared/protocol/missionControl';
import { MC_NOTHING_ATTENTION, mcAttentionHeading, mcReason, mcRunReasonsUnavailable, mcSpecLabel } from './texts';

export function Attention(props: { attention: McAttention }) {
    const { attention } = props;
    return (
        <section data-attention className="mc-attention">
            <h2>{mcAttentionHeading(attention.rows.length)}</h2>
            {attention.rows.length === 0 ? (
                <p>{MC_NOTHING_ATTENTION}</p>
            ) : (
                <ul className="mc-list">
                    {attention.rows.map((row) => (
                        <li key={`${row.spec.stem}|${row.spec.path ?? ''}`} data-attention-row={row.spec.stem}>
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
                        </li>
                    ))}
                </ul>
            )}
            {attention.runReasons.available ? null : <p data-run-reasons>{mcRunReasonsUnavailable(attention.runReasons.reason)}</p>}
        </section>
    );
}

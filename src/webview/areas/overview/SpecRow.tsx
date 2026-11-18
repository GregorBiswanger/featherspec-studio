import type { NavigationRequest } from '../../../shared/protocol/messages';
import type { OverviewRow } from '../../../shared/protocol/overview';
import { problemsBadgeText } from '../../../shared/protocol/texts';
import { BadgeIcon } from '../../board/icons';
import { useBoard } from '../../board/boardStore';
import { CopyButton } from '../../ui/CopyButton';
import { StepText } from '../../ui/StepText';
import { Drill } from './Drill';
import { attentionRowRequest } from './requests';
import { MC_NOT_AVAILABLE, mcSpecLabel } from './texts';

export function SpecRow(props: { row: OverviewRow; group: string; navigate: (request: NavigationRequest) => void }) {
    const { row, group, navigate } = props;
    const { copyResult, copyText } = useBoard();
    const { spec } = row;
    const title = spec.found ? (spec.title ?? MC_NOT_AVAILABLE) : mcSpecLabel(spec);
    return (
        <li className="ov-row-item" data-spec-row={spec.stem} data-row-group={group}>
            <Drill id={`row:${group}:${spec.stem}`} className="ov-row" state={row.state} onActivate={() => navigate(attentionRowRequest(row))}>
                <span className="ov-number">{spec.number}</span>
                <span className="ov-title" title={title}>
                    {title}
                </span>
                <span className="ov-status" title={row.status}>
                    {row.status}
                </span>
                {row.problems > 0 ? (
                    <span className="ov-problem" title={problemsBadgeText(row.problems)} role="img" aria-label={problemsBadgeText(row.problems)}>
                        <BadgeIcon kind="diagnostic" />
                    </span>
                ) : null}
                {row.step === undefined ? null : <StepText step={row.step} />}
            </Drill>
            {row.step === undefined ? null : <CopyButton line={row.step.line} copyResult={copyResult} onCopy={copyText} />}
        </li>
    );
}

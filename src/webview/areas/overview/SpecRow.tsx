import type { OverviewRow } from '../../../shared/protocol/overview';
import { problemsBadgeText } from '../../../shared/protocol/texts';
import { BadgeIcon, StateIcon } from '../../board/icons';
import { useBoard } from '../../board/boardStore';
import { CopyButton, type CopyLook } from '../../ui/CopyButton';
import { StepText } from '../../ui/StepText';
import { Drill } from './Drill';
import { isSelectedSpec } from '../../detail/selected';
import { useOpenSpec } from '../../detail/useOpenSpec';
import { useShell } from '../../shell';
import { specReference } from './requests';
import { NOT_AVAILABLE_TEXT, specLabelText } from './texts';

export function SpecRow(props: { row: OverviewRow; group: string; copyLook?: CopyLook }) {
    const { row, group } = props;
    const openSpec = useOpenSpec();
    const selection = useShell().view?.selection;
    const { copyResult, copyText } = useBoard();
    const { spec } = row;
    const named = row.status === row.state;
    const title = spec.found ? (spec.title ?? NOT_AVAILABLE_TEXT) : specLabelText(spec);
    return (
        <li className="ov-row-item" data-spec-row={spec.stem} data-row-group={group}>
            <Drill id={`row:${group}:${spec.stem}`} className="ov-row" state={row.state} current={isSelectedSpec(selection, row.spec)}
                onActivate={(element) => openSpec(specReference(row.spec), element)}>
                <span className="ov-number">{spec.number}</span>
                <span className="ov-title" title={title}>
                    {title}
                </span>
                <span className="ov-state">
                    <span className="ov-state-icon" title={row.state} {...(named ? {} : { role: 'img', 'aria-label': row.state })}>
                        <StateIcon state={row.state} />
                    </span>
                    <span className={named ? 'ov-status ov-state-name' : 'ov-status'} title={row.reasons ?? row.status}>
                        {row.status}
                    </span>
                </span>
                {row.problems > 0 ? (
                    <span className="ov-problem" title={problemsBadgeText(row.problems)} role="img" aria-label={problemsBadgeText(row.problems)}>
                        <BadgeIcon kind="diagnostic" />
                    </span>
                ) : null}
                {row.step === undefined ? null : <StepText step={row.step} />}
            </Drill>
            {row.step === undefined ? null : <CopyButton look={props.copyLook ?? 'icon'} line={row.step.line} copyResult={copyResult} onCopy={copyText} />}
        </li>
    );
}

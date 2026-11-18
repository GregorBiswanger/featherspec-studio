import type { NavigationRequest } from '../../../shared/protocol/messages';
import type { OverviewRow, OverviewUpNext } from '../../../shared/protocol/overview';
import { SDD_SPECIFY_LINE } from '../../../shared/protocol/texts';
import { useBoard } from '../../board/boardStore';
import { CopyButton } from '../../ui/CopyButton';
import { Drill } from './Drill';
import { upNextRequest } from './requests';
import { SpecRow } from './SpecRow';
import { moreText, NOTHING_IN_PROGRESS_TEXT, NOTHING_UP_NEXT_TEXT, NOW_HEADING, UP_NEXT_HEADING } from './texts';

export function Now(props: { rows: readonly OverviewRow[] }) {
    return (
        <section data-now className="ov-now ov-panel">
            <h2>{NOW_HEADING}</h2>
            {props.rows.length === 0 ? (
                <p className="ov-empty">{NOTHING_IN_PROGRESS_TEXT}</p>
            ) : (
                <ul className="ov-list">
                    {props.rows.map((row, index) => (
                        <SpecRow key={`${row.spec.stem}|${row.spec.path ?? ''}`} row={row} group="now" copyLook={index === 0 ? 'primary' : 'icon'} />
                    ))}
                </ul>
            )}
        </section>
    );
}

export function UpNext(props: { upNext: OverviewUpNext; navigate: (request: NavigationRequest) => void }) {
    const { upNext, navigate } = props;
    const { copyResult, copyText } = useBoard();
    return (
        <section data-up-next className="ov-up-next ov-panel">
            <h2>{UP_NEXT_HEADING}</h2>
            {upNext.rows.length === 0 ? (
                <p className="ov-empty" data-nothing-up-next>
                    <span>{NOTHING_UP_NEXT_TEXT}</span>
                    <CopyButton look="icon" line={SDD_SPECIFY_LINE} copyResult={copyResult} onCopy={copyText} />
                </p>
            ) : (
                <ul className="ov-list">
                    {upNext.rows.map((row) => (
                        <SpecRow key={`${row.spec.stem}|${row.spec.path ?? ''}`} row={row} group="upNext" />
                    ))}
                </ul>
            )}
            {upNext.more === 0 ? null : (
                <p className="ov-more">
                    <Drill id="more" onActivate={() => navigate(upNextRequest(upNext.stems))}>
                        {moreText(upNext.more)}
                    </Drill>
                </p>
            )}
        </section>
    );
}

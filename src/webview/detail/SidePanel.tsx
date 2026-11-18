import type { SpecDetailView } from '../../shared/protocol/detail';
import type { SelectedSpec } from '../../shared/protocol/messages';
import { DETAIL_LABEL } from '../../shared/protocol/texts';
import { useBoard } from '../board/boardStore';
import { useShell } from '../shell';
import type { DetailAreaId } from '../../shared/protocol/areas';
import { BackButton } from './BackButton';
import { CloseButton } from './CloseButton';
import { DetailFrame } from './DetailFrame';
import { requestMapFocus } from '../areas/planMap/focus';
import { focusAfterClose } from './focus';
import { SpecDetail } from './SpecDetail';

function matches(selection: SelectedSpec, detail: ReturnType<typeof useBoard>['detail']): detail is SpecDetailView {
    return detail?.kind === 'spec' && detail.stem === selection.stem && (selection.path === undefined || detail.key === selection.path);
}

export const SIDE_PANEL_ID = 'side-panel';

export function SidePanel(props: { selection: SelectedSpec; back?: DetailAreaId; width?: number }) {
    const { selection, back, width } = props;
    const shell = useShell();
    const { detail, fileResult, copyResult, sendResult, openFile, copyText, sendPrompt } = useBoard();
    const close = shell.clearSelection;
    const fallback = () => focusAfterClose(selection.stem);
    const openMap = shell.area === 'planMap' ? undefined : () => {
        requestMapFocus(selection.stem);
        shell.navigate({ area: 'planMap', target: { kind: 'spec', stem: selection.stem, ...(selection.path === undefined ? {} : { path: selection.path }) } });
    };
    return (
        <aside id={SIDE_PANEL_ID} className="side-panel" role="complementary" aria-label={DETAIL_LABEL} {...(width === undefined ? {} : { style: { width } })}>
            {matches(selection, detail) ? (
                <SpecDetail detail={detail} fileResult={fileResult} copyResult={copyResult} sendResult={sendResult} onOpen={openFile} onCopy={copyText} onSend={sendPrompt} onClose={close} fallback={fallback} {...(back === undefined ? {} : { back })} {...(openMap === undefined ? {} : { onOpenMap: openMap })} />
            ) : (
                <DetailFrame as="div" labelled={false} onClose={close} fallback={fallback}>
                    {back === undefined ? null : <BackButton area={back} onBack={close} />}
                    <div className="detail-title">
                        <h2>{selection.number}</h2>
                        {back === undefined ? <CloseButton onClose={close} /> : null}
                    </div>
                </DetailFrame>
            )}
        </aside>
    );
}

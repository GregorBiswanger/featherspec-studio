import type { SpecDetailView } from '../../shared/protocol/detail';
import type { SelectedSpec } from '../../shared/protocol/messages';
import { DETAIL_LABEL } from '../../shared/protocol/texts';
import { useBoard } from '../board/boardStore';
import { useShell } from '../shell';
import type { AreaId } from '../../shared/protocol/areas';
import { BackButton } from './BackButton';
import { CloseButton } from './CloseButton';
import { DetailFrame } from './DetailFrame';
import { focusAfterClose } from './focus';
import { SpecDetail } from './SpecDetail';

function matches(selection: SelectedSpec, detail: ReturnType<typeof useBoard>['detail']): detail is SpecDetailView {
    return detail?.kind === 'spec' && detail.stem === selection.stem && (selection.path === undefined || detail.key === selection.path);
}

export function SidePanel(props: { selection: SelectedSpec; back?: AreaId }) {
    const { selection, back } = props;
    const shell = useShell();
    const { detail, fileResult, copyResult, openFile, copyText } = useBoard();
    const close = shell.clearSelection;
    const fallback = () => focusAfterClose(selection.stem);
    return (
        <aside className="side-panel" role="complementary" aria-label={DETAIL_LABEL}>
            {matches(selection, detail) ? (
                <SpecDetail detail={detail} fileResult={fileResult} copyResult={copyResult} onOpen={openFile} onCopy={copyText} onClose={close} fallback={fallback} {...(back === undefined ? {} : { back })} />
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

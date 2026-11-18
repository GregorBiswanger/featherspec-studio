import type { SelectedSpec } from '../../shared/protocol/messages';
import { DETAIL_LABEL } from '../../shared/protocol/texts';
import { useBoard } from '../board/boardStore';
import { useShell } from '../shell';
import { CloseButton } from './CloseButton';
import { DetailFrame } from './DetailFrame';
import { focusAfterClose } from './focus';
import { SpecDetail } from './SpecDetail';

function matches(selection: SelectedSpec, detail: ReturnType<typeof useBoard>['detail']): boolean {
    return detail?.kind === 'spec' && detail.stem === selection.stem && (selection.path === undefined || detail.key === selection.path);
}

export function SidePanel(props: { selection: SelectedSpec }) {
    const { selection } = props;
    const shell = useShell();
    const { detail, fileResult, copyResult, openFile, copyText } = useBoard();
    const close = shell.clearSelection;
    const fallback = () => focusAfterClose(selection.stem);
    return (
        <aside className="side-panel" role="complementary" aria-label={DETAIL_LABEL}>
            {matches(selection, detail) ? (
                <SpecDetail detail={detail} fileResult={fileResult} copyResult={copyResult} onOpen={openFile} onCopy={copyText} onClose={close} fallback={fallback} region={false} />
            ) : (
                <DetailFrame as="div" labelled={false} onClose={close} fallback={fallback}>
                    <div className="detail-title">
                        <h2>{selection.number}</h2>
                        <CloseButton onClose={close} />
                    </div>
                </DetailFrame>
            )}
        </aside>
    );
}

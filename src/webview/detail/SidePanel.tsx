import { DETAIL_LABEL } from '../../shared/protocol/texts';
import type { SelectedSpec } from '../../shared/protocol/messages';
import { useBoard } from '../board/boardStore';
import { SpecDetail } from './SpecDetail';

function matches(selection: SelectedSpec, detail: ReturnType<typeof useBoard>['detail']): boolean {
    return detail?.kind === 'spec' && detail.stem === selection.stem && (selection.path === undefined || detail.key === selection.path);
}

export function SidePanel(props: { selection: SelectedSpec }) {
    const { selection } = props;
    const { detail, fileResult, copyResult, openFile, copyText } = useBoard();
    return (
        <aside className="side-panel" role="complementary" aria-label={DETAIL_LABEL}>
            {matches(selection, detail) ? (
                <SpecDetail detail={detail} fileResult={fileResult} copyResult={copyResult} onOpen={openFile} onCopy={copyText} region={false} />
            ) : (
                <div className="spec-detail">
                    <div className="detail-title">
                        <h2>{selection.number}</h2>
                    </div>
                </div>
            )}
        </aside>
    );
}

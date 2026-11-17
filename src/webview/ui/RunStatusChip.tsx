import { acStatusWord } from '../../shared/protocol/agentCenterTexts';
import { Glyph, type GlyphKind } from '../board/icons';

const ICONS: Record<string, GlyphKind> = {
    Starting: 'Active',
    Running: 'Active',
    WaitingForApproval: 'waiting',
    WaitingForInput: 'waiting',
    Completed: 'Done',
    Failed: 'failed',
    Cancelled: 'deprecated',
    Interrupted: 'interrupted',
};

export function RunStatusChip(props: { status: string }) {
    return (
        <span className="run-status-chip" data-run-status={props.status}>
            <Glyph kind={ICONS[props.status] ?? 'info'} />
            <span className="run-status-label">{acStatusWord(props.status)}</span>
        </span>
    );
}

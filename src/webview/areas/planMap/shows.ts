import type { DetailView, SpecDetailView } from '../../../shared/protocol/detail';
import type { SelectedSpec } from '../../../shared/protocol/messages';

export function mapShows(detail: DetailView | undefined, selection: SelectedSpec | undefined): (SpecDetailView & { plan: Extract<SpecDetailView['plan'], { kind: 'plan' }> }) | undefined {
    if (selection === undefined || detail?.kind !== 'spec' || detail.stem !== selection.stem || (selection.path !== undefined && detail.key !== selection.path)) {
        return undefined;
    }
    return detail.plan?.kind === 'plan' && detail.state !== 'Done' ? { ...detail, plan: detail.plan } : undefined;
}

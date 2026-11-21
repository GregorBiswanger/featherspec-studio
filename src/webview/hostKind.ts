import { hostKindOf, type HostKind } from '../shared/protocol/vocabulary';

export function hostKind(): HostKind {
    return hostKindOf(document.body.dataset.host);
}

import type { ReactNode } from 'react';
import type { LineTarget } from '../../shared/protocol/detail';
import { stepLinkTooltip } from '../../shared/protocol/planMapTexts';
import { useShell } from '../shell';
import { FileLink, type FileResult } from './FileLink';

function onMac(): boolean {
    return /Mac/.test(navigator.platform) || /Mac/.test(navigator.userAgent);
}

export function StepLink(props: { id: string; target: LineTarget; fileResult: FileResult | undefined; onOpen(key: string, line: number): void; reason?: string; label?: string; tabIndex?: number; spec?: { stem: string; path?: string }; children: ReactNode }) {
    const shell = useShell();
    const selection = props.spec ?? shell.view?.selection;
    const { id, reason, spec: _spec, ...rest } = props;
    if (selection === undefined) {
        return <FileLink {...rest} {...(reason === undefined ? {} : { reason })} />;
    }
    const activate = {
        tooltip: stepLinkTooltip(reason ?? id, id, onMac()),
        onPlain: () => shell.navigate({ area: 'planMap', target: { kind: 'spec', stem: selection.stem, ...(selection.path === undefined ? {} : { path: selection.path }), step: id } }),
    };
    return <FileLink {...rest} activate={activate} />;
}

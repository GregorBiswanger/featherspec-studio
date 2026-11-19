import { useCallback, useEffect, useRef, useState } from 'react';
import { areaInfo, type AreaId } from '../shared/protocol/areas';
import { projectTooltip } from '../shared/protocol/texts';
import type { ShellClient } from './client';
import { AREA_COMPONENTS } from './areas/registry';
import { Placeholder } from './areas/Placeholder';
import { useNarrow } from './detail/narrow';
import { requestHeadingFocus } from './detail/focus';
import { Divider } from './detail/Divider';
import { requestMapFocus } from './areas/planMap/focus';
import { SIDE_PANEL_ID, SidePanel } from './detail/SidePanel';
import { useSideWidth } from './detail/sideWidth';
import { Navigation } from './Navigation';
import { NoticeBar } from './NoticeBar';
import { PanelStateView } from './PanelStateView';
import { RestrictedNote } from './RestrictedNote';
import { ShellProvider, useShell } from './shell';

function AreaContent(props: { area: AreaId }) {
    const Component = AREA_COMPONENTS[props.area];
    return Component === undefined ? <Placeholder area={areaInfo(props.area)} /> : <Component />;
}

function Frame() {
    const shell = useShell();
    const info = areaInfo(shell.area);
    const narrow = useNarrow();
    const detailArea = shell.area === 'overview' || shell.area === 'board' ? shell.area : undefined;
    const sideSelection = detailArea !== undefined || (shell.area === 'planMap' && !narrow) ? shell.view?.selection : undefined;
    const detailAlone = narrow && detailArea !== undefined && sideSelection !== undefined;
    const [frameElement, setFrameElement] = useState<HTMLDivElement | null>(null);
    const side = useSideWidth(frameElement, shell.view?.sideWidth, { set: shell.setSideWidth, reset: shell.resetSideWidth });
    const beside = !narrow && sideSelection !== undefined && side.frame > 0;
    const contentRef = useRef<HTMLDivElement>(null);
    const wasAlone = useRef(detailAlone);
    useEffect(() => {
        const crossed = detailAlone && !wasAlone.current;
        wasAlone.current = detailAlone;
        if (crossed && sideSelection !== undefined && contentRef.current?.contains(document.activeElement) === true) {
            requestHeadingFocus(sideSelection.stem);
        }
    }, [detailAlone, sideSelection]);
    const latest = useRef({ narrow, area: shell.area, selected: shell.view?.selection });
    latest.current = { narrow, area: shell.area, selected: shell.view?.selection };
    const leaveDivider = useCallback((): void => {
        const { narrow: isNarrow, area, selected } = latest.current;
        if (isNarrow && selected !== undefined) {
            if (area === 'planMap') {
                requestMapFocus(selected.stem);
            } else {
                requestHeadingFocus(selected.stem);
            }
        }
    }, []);
    return (
        <div className="studio">
            <header className="studio-header">
                <Navigation />
                {shell.view?.projectName === undefined ? null : (
                    <span className="project-name" title={shell.view.projectVersion === undefined ? undefined : projectTooltip(shell.view.projectVersion, shell.view.updatedAt, new Date())}>
                        {shell.view.projectName}
                    </span>
                )}
            </header>
            <main>
                <h1>{info.title}</h1>
                <RestrictedNote />
                <NoticeBar />
                {shell.state === undefined ? (
                    <div className="area-frame" ref={setFrameElement} {...(detailAlone ? { 'data-layout': 'detail' } : {})}>
                        <div className="area-content" ref={contentRef} {...(detailAlone ? { inert: true } : {})}>
                            <AreaContent area={shell.area} />
                        </div>
                        {beside ? <Divider side={side} panelId={SIDE_PANEL_ID} onLeaveWithFocus={leaveDivider} /> : null}
                        {sideSelection === undefined ? null : <SidePanel selection={sideSelection} {...(narrow && detailArea !== undefined ? { back: detailArea } : {})} {...(beside ? { width: side.width } : {})} />}
                    </div>
                ) : (
                    <PanelStateView state={shell.state} />
                )}
            </main>
        </div>
    );
}

export function App(props: { client: ShellClient }) {
    return (
        <ShellProvider client={props.client}>
            <Frame />
        </ShellProvider>
    );
}

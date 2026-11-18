import { useEffect, useRef, useState } from 'react';
import { areaInfo, type AreaId } from '../shared/protocol/areas';
import { projectTooltip } from '../shared/protocol/texts';
import type { ShellClient } from './client';
import { AREA_COMPONENTS } from './areas/registry';
import { Placeholder } from './areas/Placeholder';
import { useNarrow } from './detail/narrow';
import { requestHeadingFocus } from './detail/focus';
import { Divider } from './detail/Divider';
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
    const sideSelection = shell.area === 'overview' || shell.area === 'board' ? shell.view?.selection : undefined;
    const narrow = useNarrow();
    const detailAlone = narrow && sideSelection !== undefined;
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
                        {beside ? <Divider side={side} panelId={SIDE_PANEL_ID} /> : null}
                        {sideSelection === undefined ? null : <SidePanel selection={sideSelection} {...(narrow ? { back: shell.area } : {})} {...(beside ? { width: side.width } : {})} />}
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

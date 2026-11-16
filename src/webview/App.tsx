import { areaInfo, type AreaId } from '../shared/protocol/areas';
import type { ShellClient } from './client';
import { AREA_COMPONENTS } from './areas/registry';
import { Placeholder } from './areas/Placeholder';
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
    return (
        <div className="studio">
            <header className="studio-header">
                <Navigation />
                {shell.view?.projectName === undefined ? null : <span className="project-name">{shell.view.projectName}</span>}
            </header>
            <main>
                <h1>{info.title}</h1>
                <RestrictedNote />
                <NoticeBar />
                {shell.state === undefined ? <AreaContent area={shell.area} /> : <PanelStateView state={shell.state} />}
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

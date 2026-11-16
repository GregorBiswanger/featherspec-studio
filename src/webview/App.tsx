import { areaInfo } from '../shared/protocol/areas';
import type { ShellClient } from './client';
import { Navigation } from './Navigation';
import { PanelStateView } from './PanelStateView';
import { RestrictedNote } from './RestrictedNote';
import { ShellProvider, useShell } from './shell';

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
                {shell.state === undefined ? null : <PanelStateView state={shell.state} />}
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

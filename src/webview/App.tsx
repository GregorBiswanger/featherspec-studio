import { areaInfo } from '../shared/protocol/areas';
import { LOADING_TEXT } from '../shared/protocol/texts';
import type { ShellClient } from './client';
import { Navigation } from './Navigation';
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
                {shell.view === undefined ? (
                    <div role="progressbar" aria-label={LOADING_TEXT} className="loading">
                        {LOADING_TEXT}
                    </div>
                ) : null}
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

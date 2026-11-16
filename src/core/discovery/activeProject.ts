import type { DiscoveredFolder, DiscoveryResult } from './discoverWorkspace';

export type StatusBarModel =
    | { visible: false }
    | { visible: true; text: string; command: 'select' };

export interface ActiveProjectInput {
    result: DiscoveryResult;
    remembered: string | undefined;
    selection: string | undefined;
    sameRoot: (first: string, second: string) => boolean;
}

export interface ActiveProjectOutcome {
    active: DiscoveredFolder | undefined;
    remember: string | undefined;
    statusBar: StatusBarModel;
}

const NOT_FOUND: StatusBarModel = { visible: true, text: 'FeatherSpec project not found', command: 'select' };
const SELECT: StatusBarModel = { visible: true, text: 'Select FeatherSpec project', command: 'select' };

function activeOutcome(project: DiscoveredFolder): ActiveProjectOutcome {
    return {
        active: project,
        remember: project.root,
        statusBar: { visible: true, text: `FeatherSpec: ${project.name} (${project.version})`, command: 'select' },
    };
}

export function resolveActiveProject(input: ActiveProjectInput): ActiveProjectOutcome {
    const folders = input.result.folders;
    const projects = folders.filter((folder) => folder.verdict === 'project');
    const findProject = (root: string) => projects.find((project) => input.sameRoot(project.root, root));

    const selected = input.selection === undefined ? undefined : findProject(input.selection);
    if (selected !== undefined) {
        return activeOutcome(selected);
    }

    if (input.remembered !== undefined) {
        const remembered = findProject(input.remembered);
        return remembered !== undefined
            ? activeOutcome(remembered)
            : { active: undefined, remember: undefined, statusBar: NOT_FOUND };
    }

    const onlyProject = projects.length === 1 ? projects[0] : undefined;
    if (onlyProject !== undefined) {
        return activeOutcome(onlyProject);
    }
    if (projects.length > 1) {
        return { active: undefined, remember: undefined, statusBar: SELECT };
    }
    const hasIncomplete = folders.some((folder) => folder.verdict === 'incomplete');
    return { active: undefined, remember: undefined, statusBar: hasIncomplete ? NOT_FOUND : { visible: false } };
}

export type HostKind = 'vscode' | 'jetbrains';

export const TERM_PAIRS: ReadonlyArray<readonly [string, string]> = [
    ['This workspace is in Restricted Mode. Setting up FeatherSpec needs a trusted workspace.', 'This project is not trusted. Setting up FeatherSpec needs a trusted project.'],
    ['No FeatherSpec project found in this workspace.', 'No FeatherSpec project found in this project.'],
    ['No FeatherSpec project found in this workspace', 'No FeatherSpec project found in this project'],
    ['Setting up FeatherSpec needs a trusted workspace.', 'Setting up FeatherSpec needs a trusted project.'],
    ['the Studio panel and the extension could not exchange data', 'the Studio panel and the plugin could not exchange data'],
    ['Another VS Code window holds the write lock', 'Another IDE window holds the write lock'],
    ['Every folder of this workspace', 'Every folder of this project'],
    ['No folder of this workspace', 'No folder of this project'],
    ['Manage Workspace Trust', 'Trust Project'],
    ['Restricted Mode', 'Safe Mode'],
];

export const JETBRAINS_TEXTS = {
    jcefUnsupported: 'FeatherSpec Studio needs the embedded browser (JCEF), which this IDE does not support.',
    jcefSuspended: "FeatherSpec Studio needs the embedded browser (JCEF), which the operating system's sandbox has suspended.",
    openHelp: 'Open help',
    statusUnavailable: 'FeatherSpec unavailable',
    helpUrl: 'https://github.com/GregorBiswanger/featherspec-studio#jetbrains-ides',
} as const;

export function hostKindOf(value: string | undefined): HostKind {
    return value === 'jetbrains' ? 'jetbrains' : 'vscode';
}

const JETBRAINS_BY_VSCODE = new Map<string, string>(TERM_PAIRS);
const TERM_PATTERN = new RegExp(TERM_PAIRS.map(([vscode]) => vscode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');

export function translateTerms(text: string, host: HostKind): string {
    if (host === 'vscode') {
        return text;
    }
    return text.replace(TERM_PATTERN, (term) => JETBRAINS_BY_VSCODE.get(term) ?? term);
}

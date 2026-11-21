import type { WorkspaceFolderInfo } from '../../core/ports/host';

export const ASYNC_CALLS = [
    'source.list', 'source.stat', 'source.readBytes',
    'fs.stat', 'fs.readText', 'fs.readDirectory',
    'medium.open', 'medium.read', 'medium.lines', 'medium.append', 'medium.replace', 'medium.createExclusive', 'medium.remove', 'medium.list',
    'memory.set',
    'watch.add', 'watch.remove',
    'target.kind', 'target.readBytes', 'target.listDirectory', 'target.createExclusive', 'target.replaceIfUnchanged', 'target.clearSetupFolder',
    'http.get', 'archive.read',
    'ui.pick', 'ui.notify', 'ui.confirm', 'ui.progressStart', 'ui.openExternal',
    'clipboard.write', 'editor.open',
    'actions.openSetupGuide', 'actions.manageTrust', 'actions.openStudio', 'actions.reloadPanel',
] as const;

export type AsyncCall = (typeof ASYNC_CALLS)[number];

export const EMIT_CHANNELS = ['panel', 'tree', 'status', 'log', 'warn', 'progressEnd', 'showOutput'] as const;

export type EmitChannel = (typeof EMIT_CHANNELS)[number];

export const DISPATCH_EVENTS = [
    'panelMessage', 'panelOpened', 'panelClosed', 'fileChanged', 'markerChanged', 'foldersChanged', 'trustGranted', 'settingsChanged', 'progressCancelled',
] as const;

export type DispatchEvent = (typeof DISPATCH_EVENTS)[number];

export const INVOKE_COMMANDS = [
    'open', 'refresh', 'copyNextStep', 'setup', 'copyMergePrompt', 'selectProject', 'shellAction',
    'tree.select', 'tree.copy', 'tree.openSpec', 'tree.openPlan', 'tree.showInPlanMap', 'panelHtml', 'diagnostics',
] as const;

export type InvokeCommand = (typeof INVOKE_COMMANDS)[number];

export const FRAME_KINDS = ['call', 'emit', 'reply', 'ready', 'failed'] as const;

export type FrameKind = (typeof FRAME_KINDS)[number];

export interface CoreConfig {
    host: 'jetbrains';
    platform: string;
    studioVersion: string;
    settings: Readonly<Record<string, unknown>>;
    trusted: boolean;
    folders: readonly WorkspaceFolderInfo[];
    memory: Readonly<Record<string, string>>;
}

export interface NativeHost {
    send(frame: string): void;
}

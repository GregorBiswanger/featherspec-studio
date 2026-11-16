import { describe, expect, it } from 'vitest';
import type { DiscoveredFolder, DiscoveryResult } from '../discovery/discoverWorkspace';
import type { DiscoverySnapshot } from '../discovery/discoveryController';
import type { ProjectRead } from '../specs/readProject';
import { derivePanelState, listingFailure, type PanelStateInput } from './panelState';

const sameRoot = (first: string, second: string) => first === second;

function folder(root: string, verdict: DiscoveredFolder['verdict'], extra: Partial<DiscoveredFolder> = {}): DiscoveredFolder {
    return {
        root,
        name: root,
        verdict,
        legacy: false,
        version: '1.10.0',
        missingMarkers: [],
        diagnostics: [],
        readError: undefined,
        ...extra,
    };
}

function snapshot(folders: DiscoveredFolder[], extra: Partial<DiscoverySnapshot> = {}): DiscoverySnapshot {
    const result: DiscoveryResult = { folders };
    return { result, active: undefined, remembered: undefined, failure: undefined, ...extra };
}

function input(overrides: Partial<PanelStateInput> = {}): PanelStateInput {
    return { folderCount: 1, discovery: undefined, modelLoaded: false, listingFailure: undefined, sameRoot, ...overrides };
}

const a = folder('a', 'project');
const b = folder('b', 'project');
const incompleteA = folder('inc-a', 'incomplete', { missingMarkers: ['.specs/ directory'] });
const incompleteB = folder('inc-b', 'incomplete', { missingMarkers: ['AGENTS.md with a FeatherSpecVersion: line', '.specs/ directory'] });
const plain = folder('plain', 'not-a-project');

describe('panel state derivation (BR-05), each condition alone', () => {
    it('AC-011 S1: no workspace folder, even with a stale result', () => {
        expect(derivePanelState(input({ folderCount: 0, discovery: snapshot([]) }))).toEqual({ id: 'S1' });
        expect(derivePanelState(input({ folderCount: 0, discovery: undefined }))).toEqual({ id: 'S1' });
    });

    it('AC-012 S2: no remembered project and no folder is a project or incomplete', () => {
        expect(derivePanelState(input({ discovery: snapshot([plain]) }))).toEqual({ id: 'S2' });
        expect(derivePanelState(input({ discovery: snapshot([plain, folder('other', 'not-a-project')]) }))).toEqual({ id: 'S2' });
    });

    it('AC-013 S3: two projects and no remembered project', () => {
        expect(derivePanelState(input({ discovery: snapshot([a, b]) }))).toEqual({ id: 'S3' });
    });

    it('AC-026 S8: the remembered project is not reported as a project; Select project only while another one is', () => {
        expect(derivePanelState(input({ discovery: snapshot([plain], { remembered: 'gone' }) }))).toEqual({ id: 'S8', name: 'gone', canSelect: false });
        expect(derivePanelState(input({ discovery: snapshot([a], { remembered: 'gone' }) }))).toEqual({ id: 'S8', name: 'gone', canSelect: true });
    });

    it('AC-026 S8 names the project by its folder name when the folder is reported, else by the last segment of the remembered root', () => {
        expect(derivePanelState(input({ discovery: snapshot([folder('file:///w/old', 'incomplete', { name: 'old' })], { remembered: 'file:///w/old' }) }))).toMatchObject({ id: 'S8', name: 'old' });
        expect(derivePanelState(input({ discovery: snapshot([], { remembered: 'file:///w/my%20proj' }) }))).toMatchObject({ id: 'S8', name: 'my proj' });
        expect(derivePanelState(input({ discovery: snapshot([], { remembered: 'C:\\work\\proj' }) }))).toMatchObject({ id: 'S8', name: 'proj' });
    });

    it('AC-027 S9: no remembered project, no project, at least one incomplete; one entry per incomplete folder with its missing markers', () => {
        expect(derivePanelState(input({ discovery: snapshot([incompleteA, plain, incompleteB]) }))).toEqual({
            id: 'S9',
            folders: [
                { folder: 'inc-a', markers: ['.specs/ directory'] },
                { folder: 'inc-b', markers: ['AGENTS.md with a FeatherSpecVersion: line', '.specs/ directory'] },
            ],
        });
    });

    it('AC-015 S5: an unexpected discovery failure, and a listing failure of the loaded project', () => {
        expect(derivePanelState(input({ discovery: snapshot([a], { active: a, remembered: 'a', failure: 'boom' }), modelLoaded: true }))).toEqual({
            id: 'S5',
            reason: { cause: 'discovery', message: 'boom' },
        });
        expect(
            derivePanelState(
                input({ discovery: snapshot([a], { active: a, remembered: 'a' }), modelLoaded: true, listingFailure: { folder: '.specs/active', reason: 'denied' } }),
            ),
        ).toEqual({ id: 'S5', reason: { cause: 'listing', folder: '.specs/active', reason: 'denied' } });
    });

    it('AC-014 S4: no discovery result yet; an active project with no model yet', () => {
        expect(derivePanelState(input({ discovery: undefined }))).toEqual({ id: 'S4' });
        expect(derivePanelState(input({ discovery: { result: undefined, active: undefined, remembered: undefined, failure: undefined } }))).toEqual({ id: 'S4' });
        expect(derivePanelState(input({ discovery: snapshot([a], { active: a, remembered: 'a' }), modelLoaded: false }))).toEqual({ id: 'S4' });
    });

    it('no state while the active project has its model', () => {
        expect(derivePanelState(input({ discovery: snapshot([a], { active: a, remembered: 'a' }), modelLoaded: true }))).toBeUndefined();
    });

    it('a project found alone and not yet remembered is active, so it is no S3', () => {
        expect(derivePanelState(input({ discovery: snapshot([a], { active: a }), modelLoaded: true }))).toBeUndefined();
    });
});

describe('AC-018: precedence S1 > S8 > S2 > S9 > S3 > S5 > S4', () => {
    it('S1 over S8 and S5', () => {
        expect(derivePanelState(input({ folderCount: 0, discovery: snapshot([], { remembered: 'gone', failure: 'x' }) }))).toEqual({ id: 'S1' });
    });

    it('S8 over S9 and S3 (PD-033: "not found" stays until the user selects another project or it returns)', () => {
        expect(derivePanelState(input({ discovery: snapshot([incompleteA], { remembered: 'gone' }) }))?.id).toBe('S8');
        expect(derivePanelState(input({ discovery: snapshot([a, b], { remembered: 'gone' }) }))?.id).toBe('S8');
    });

    it('S8 over S5 and S4', () => {
        expect(derivePanelState(input({ discovery: snapshot([plain], { remembered: 'gone', failure: 'x' }) }))?.id).toBe('S8');
    });

    it('S9 over S5', () => {
        expect(derivePanelState(input({ discovery: snapshot([incompleteA], { failure: 'x' }) }))?.id).toBe('S9');
    });

    it('S3 over S5', () => {
        expect(derivePanelState(input({ discovery: snapshot([a, b], { failure: 'x' }) }))?.id).toBe('S3');
    });

    it('S5 over S4, also when no discovery result exists', () => {
        expect(derivePanelState(input({ discovery: { result: undefined, active: undefined, remembered: undefined, failure: 'x' } }))?.id).toBe('S5');
        expect(derivePanelState(input({ discovery: snapshot([a], { active: a, remembered: 'a', failure: 'x' }), modelLoaded: false }))?.id).toBe('S5');
    });

    it('a discovery failure comes before a listing failure', () => {
        expect(
            derivePanelState(
                input({
                    discovery: snapshot([a], { active: a, remembered: 'a', failure: 'x' }),
                    modelLoaded: true,
                    listingFailure: { folder: '.specs', reason: 'y' },
                }),
            ),
        ).toMatchObject({ reason: { cause: 'discovery' } });
    });
});

describe('listingFailure (PD-038)', () => {
    function project(diagnostics: ProjectRead['diagnostics']): ProjectRead {
        return { root: 'a', version: '1.10.0', specs: [], plans: [], returnNotes: [], diagnostics };
    }

    it.each(['.specs', '.specs/backlog', '.specs/active', '.specs/done'])('%s that could not be listed is a listing failure', (file) => {
        expect(listingFailure(project([{ kind: 'unreadable-file', scope: { file }, reason: 'could not be listed: EACCES' }]))).toEqual({
            folder: file,
            reason: 'EACCES',
        });
    });

    it('a single unreadable spec file is no listing failure (control)', () => {
        expect(listingFailure(project([{ kind: 'unreadable-file', scope: { file: '.specs/active/0001-x.md' }, reason: 'invalid UTF-8' }]))).toBeUndefined();
    });

    it('an unlisted plan archive or memory bank folder is no listing failure of the lifecycle folders', () => {
        expect(listingFailure(project([{ kind: 'unreadable-file', scope: { file: '.specs/plan-archive' }, reason: 'could not be listed: EIO' }]))).toBeUndefined();
        expect(listingFailure(project([{ kind: 'unreadable-file', scope: { file: '.memory-bank' }, reason: 'could not be listed: EIO' }]))).toBeUndefined();
    });

    it('a symbolic link that is not followed is no listing failure', () => {
        expect(listingFailure(project([{ kind: 'unreadable-file', scope: { file: '.specs/active' }, reason: 'symbolic link not followed' }]))).toBeUndefined();
    });

    it('other diagnostic kinds and no diagnostics give none', () => {
        expect(listingFailure(project([{ kind: 'orphan', scope: { file: '.specs/active' }, reason: 'could not be listed: x' }]))).toBeUndefined();
        expect(listingFailure(project([]))).toBeUndefined();
    });
});

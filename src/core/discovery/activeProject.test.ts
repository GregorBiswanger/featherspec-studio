import { describe, expect, it } from 'vitest';
import { resolveActiveProject } from './activeProject';
import type { DiscoveredFolder } from './discoverWorkspace';

const sameRoot = (first: string, second: string) => first === second;

function entry(name: string, overrides: Partial<DiscoveredFolder> = {}): DiscoveredFolder {
    return {
        root: `/work/${name}`,
        name,
        verdict: 'project',
        legacy: false,
        version: '1.10.0',
        missingMarkers: [],
        diagnostics: [],
        readError: undefined,
        ...overrides,
    };
}

function resolve(
    folders: DiscoveredFolder[],
    remembered?: string,
    selection?: string,
) {
    return resolveActiveProject({ result: { folders }, remembered, selection, sameRoot });
}

describe('resolveActiveProject', () => {
    it('AC-007: exactly one project and nothing remembered becomes active and is remembered', () => {
        const outcome = resolve([entry('app'), entry('docs', { verdict: 'not-a-project' })]);
        expect(outcome.active?.name).toBe('app');
        expect(outcome.remember).toBe('/work/app');
    });

    it('AC-007: negative control, an incomplete folder next to one project does not change the outcome', () => {
        const outcome = resolve([entry('app'), entry('half', { verdict: 'incomplete' })]);
        expect(outcome.active?.name).toBe('app');
    });

    it('AC-008: several projects and nothing remembered leave no active project and ask for a selection', () => {
        const outcome = resolve([entry('a'), entry('b')]);
        expect(outcome.active).toBeUndefined();
        expect(outcome.remember).toBeUndefined();
        expect(outcome.statusBar).toEqual({ visible: true, text: 'Select FeatherSpec project', command: 'select' });
    });

    it('AC-009: a selection makes the project active and remembered', () => {
        const outcome = resolve([entry('a'), entry('b')], undefined, '/work/b');
        expect(outcome.active?.name).toBe('b');
        expect(outcome.remember).toBe('/work/b');
    });

    it('AC-009: a selection overrides a remembered project', () => {
        const outcome = resolve([entry('a'), entry('b')], '/work/a', '/work/b');
        expect(outcome.active?.name).toBe('b');
        expect(outcome.remember).toBe('/work/b');
    });

    it('AC-009: negative control, a selection of an incomplete or unknown folder is ignored', () => {
        const folders = [entry('a'), entry('half', { verdict: 'incomplete' })];
        expect(resolve(folders, '/work/a', '/work/half').active?.name).toBe('a');
        expect(resolve(folders, '/work/a', '/work/unknown').active?.name).toBe('a');
    });

    it('AC-009: the remembered project is active again without asking, also with several projects', () => {
        const outcome = resolve([entry('a'), entry('b')], '/work/b');
        expect(outcome.active?.name).toBe('b');
        expect(outcome.remember).toBe('/work/b');
    });

    it('AC-010: a lost remembered project leaves no active project, no other one takes over, and the entry says not found', () => {
        const outcome = resolve([entry('a')], '/work/gone');
        expect(outcome.active).toBeUndefined();
        expect(outcome.remember).toBeUndefined();
        expect(outcome.statusBar).toEqual({ visible: true, text: 'FeatherSpec project not found', command: 'select' });
    });

    it('AC-010: the remembered project now incomplete counts as lost and the entry stays when nothing else is reported', () => {
        const outcome = resolve([entry('a', { verdict: 'incomplete' })], '/work/a');
        expect(outcome.active).toBeUndefined();
        expect(outcome.statusBar).toMatchObject({ visible: true, text: 'FeatherSpec project not found' });
        expect(resolve([], '/work/a').statusBar).toMatchObject({ visible: true, text: 'FeatherSpec project not found' });
    });

    it('AC-010: when the remembered project is reported again it is active again without asking', () => {
        const outcome = resolve([entry('a'), entry('b')], '/work/a');
        expect(outcome.active?.name).toBe('a');
        expect(outcome.statusBar).toMatchObject({ visible: true });
    });

    it('AC-014: the entry shows folder name and version, "unknown" for a legacy project', () => {
        expect(resolve([entry('app')]).statusBar).toEqual({
            visible: true,
            text: 'FeatherSpec: app (1.10.0)',
            command: 'select',
        });
        const legacy = resolve([entry('old', { legacy: true, version: 'unknown' })]);
        expect(legacy.statusBar).toMatchObject({ text: 'FeatherSpec: old (unknown)' });
    });

    it('AC-014: a version value as written is shown, an empty one shows "unknown"', () => {
        expect(resolve([entry('app', { version: 'nightly' })]).statusBar).toMatchObject({
            text: 'FeatherSpec: app (nightly)',
        });
        expect(resolve([entry('app', { version: 'unknown' })]).statusBar).toMatchObject({
            text: 'FeatherSpec: app (unknown)',
        });
    });

    it('AC-020: nothing reported and nothing remembered shows no status bar entry', () => {
        expect(resolve([]).statusBar).toEqual({ visible: false });
        expect(resolve([entry('x', { verdict: 'not-a-project' })]).statusBar).toEqual({ visible: false });
    });

    it('AC-020: negative control, an incomplete folder alone shows "FeatherSpec project not found"', () => {
        const outcome = resolve([entry('half', { verdict: 'incomplete' })]);
        expect(outcome.active).toBeUndefined();
        expect(outcome.statusBar).toMatchObject({ visible: true, text: 'FeatherSpec project not found' });
    });

    it('AC-010: the remembered root is compared with the injected rule', () => {
        const insensitive = (first: string, second: string) => first.toLowerCase() === second.toLowerCase();
        const outcome = resolveActiveProject({
            result: { folders: [entry('App')] },
            remembered: '/WORK/APP',
            selection: undefined,
            sameRoot: insensitive,
        });
        expect(outcome.active?.name).toBe('App');
        expect(outcome.remember).toBe('/work/App');
    });
});

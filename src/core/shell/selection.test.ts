import { describe, expect, it } from 'vitest';
import type { LifecycleEntry } from '../lifecycle/model';
import type { ShellModel } from '../ports/shell';
import { findSpec, numberOfStem, reconcileSelection } from './selection';

const sameRoot = (first: string, second: string) => first === second;

function entry(key: string, stem: string, number: string): LifecycleEntry {
    return { key, stem, number } as LifecycleEntry;
}

function model(root: string, entries: LifecycleEntry[]): ShellModel {
    return { project: { root } as ShellModel['project'], lifecycle: { entries, projectDiagnostics: [] } };
}

const M = model('p', [entry('.specs/active/0002-b.md', '0002-b', '0002'), entry('.specs/backlog/0003-c.md', '0003-c', '0003')]);

describe('numberOfStem', () => {
    it('takes the leading digits, or the whole stem when there are none', () => {
        expect(numberOfStem('0003-x')).toBe('0003');
        expect(numberOfStem('draft-idea')).toBe('draft-idea');
    });
});

describe('BR-03, AC-010: reconcileSelection', () => {
    it('another project becomes active: cleared without a notice', () => {
        const result = reconcileSelection({ selection: { projectRoot: 'old', stem: '0002-b' }, activeRoot: 'p', model: M, sameRoot });
        expect(result).toEqual({ selection: undefined, notice: undefined });
    });

    it('the loaded model of the active project has the stem: kept, no notice', () => {
        const selection = { projectRoot: 'p', stem: '0002-b' };
        expect(reconcileSelection({ selection, activeRoot: 'p', model: M, sameRoot })).toEqual({ selection, notice: undefined });
    });

    it('the loaded model lacks the stem (file deleted, or stem changed): cleared with the notice naming the number', () => {
        const result = reconcileSelection({ selection: { projectRoot: 'p', stem: '0007-gone' }, activeRoot: 'p', model: M, sameRoot });
        expect(result).toEqual({ selection: undefined, notice: { number: '0007' } });
    });

    it('a stem that changed (renamed) counts as removed', () => {
        const renamed = model('p', [entry('.specs/active/0002-new-name.md', '0002-new-name', '0002')]);
        const result = reconcileSelection({ selection: { projectRoot: 'p', stem: '0002-b' }, activeRoot: 'p', model: renamed, sameRoot });
        expect(result).toEqual({ selection: undefined, notice: { number: '0002' } });
    });

    it('a move to another lifecycle folder keeps the selection (the stem is the identity)', () => {
        const moved = model('p', [entry('.specs/done/0002-b.md', '0002-b', '0002')]);
        const selection = { projectRoot: 'p', stem: '0002-b' };
        expect(reconcileSelection({ selection, activeRoot: 'p', model: moved, sameRoot })).toEqual({ selection, notice: undefined });
    });

    it('no model of the active project: kept and not checked (a project that is lost and returns keeps it)', () => {
        const selection = { projectRoot: 'p', stem: '0007-gone' };
        expect(reconcileSelection({ selection, activeRoot: 'p', model: undefined, sameRoot })).toEqual({ selection, notice: undefined });
        expect(reconcileSelection({ selection, activeRoot: 'p', model: model('other', []), sameRoot })).toEqual({ selection, notice: undefined });
    });

    it('no active project: kept and not checked', () => {
        const selection = { projectRoot: 'p', stem: '0002-b' };
        expect(reconcileSelection({ selection, activeRoot: undefined, model: undefined, sameRoot })).toEqual({ selection, notice: undefined });
    });

    it('no selection stays none', () => {
        expect(reconcileSelection({ selection: undefined, activeRoot: 'p', model: M, sameRoot })).toEqual({ selection: undefined, notice: undefined });
    });

    it('a duplicated stem is identified by stem plus path; when its path is gone but the stem remains, the first match is kept', () => {
        const duplicated = model('p', [entry('.specs/backlog/0004-x.md', '0004-x', '0004'), entry('.specs/active/0004-x.md', '0004-x', '0004')]);
        const result = reconcileSelection({ selection: { projectRoot: 'p', stem: '0004-x', path: '.specs/active/0004-x.md' }, activeRoot: 'p', model: duplicated, sameRoot });
        expect(result.selection).toEqual({ projectRoot: 'p', stem: '0004-x', path: '.specs/active/0004-x.md' });
        const lost = reconcileSelection({ selection: { projectRoot: 'p', stem: '0004-x', path: '.specs/done/0004-x.md' }, activeRoot: 'p', model: duplicated, sameRoot });
        expect(lost.selection).toEqual({ projectRoot: 'p', stem: '0004-x', path: '.specs/backlog/0004-x.md' });
    });

    it('once the stem is no longer duplicated the path is dropped', () => {
        const single = model('p', [entry('.specs/active/0004-x.md', '0004-x', '0004')]);
        const result = reconcileSelection({ selection: { projectRoot: 'p', stem: '0004-x', path: '.specs/backlog/0004-x.md' }, activeRoot: 'p', model: single, sameRoot });
        expect(result.selection).toEqual({ projectRoot: 'p', stem: '0004-x' });
    });
});

describe('findSpec', () => {
    it('finds a stem, and by path for duplicates', () => {
        expect(findSpec(M, '0002-b', undefined)).toEqual({ stem: '0002-b', path: '.specs/active/0002-b.md' });
        expect(findSpec(M, '0009-none', undefined)).toBeUndefined();
    });
});

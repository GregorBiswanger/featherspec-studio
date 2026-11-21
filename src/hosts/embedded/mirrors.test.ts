import { describe, expect, it } from 'vitest';
import type { CoreConfig } from './contract';
import { createMirrors } from './mirrors';

function config(overrides: Partial<CoreConfig> = {}): CoreConfig {
    return {
        host: 'jetbrains',
        platform: 'linux',
        studioVersion: '1.12.0',
        settings: { 'showStepTips': true },
        trusted: false,
        folders: [{ root: 'file:///work/a', name: 'a' }],
        memory: { 'featherspec-studio.board': '{"filter":"open"}' },
        ...overrides,
    };
}

describe('embedded mirrors (R-3: host-pushed copies serve the sync ports)', () => {
    it('starts with the copies of the start config', () => {
        const mirrors = createMirrors(config());
        expect(mirrors.settings().get('showStepTips')).toBe(true);
        expect(mirrors.trusted()).toBe(false);
        expect(mirrors.folders()).toEqual([{ root: 'file:///work/a', name: 'a' }]);
        expect(mirrors.memoryGet('featherspec-studio.board')).toEqual({ filter: 'open' });
        expect(mirrors.memoryGet('missing')).toBeUndefined();
    });

    it('replaces the settings copy on settingsChanged and fires only the listener of that key once', () => {
        const mirrors = createMirrors(config());
        const changed: string[] = [];
        mirrors.onSettings((key) => changed.push(key));
        expect(mirrors.apply('settingsChanged', { key: 'showStepTips', value: false })).toBe(true);
        expect(mirrors.settings().get('showStepTips')).toBe(false);
        expect(changed).toEqual(['showStepTips']);
    });

    it('sets trusted and fires the trust listener once on trustGranted', () => {
        const mirrors = createMirrors(config());
        let fired = 0;
        mirrors.onTrust(() => {
            fired += 1;
        });
        expect(mirrors.apply('trustGranted', {})).toBe(true);
        expect(mirrors.trusted()).toBe(true);
        expect(fired).toBe(1);
    });

    it('replaces the folders copy on foldersChanged and fires the folder listener once', () => {
        const mirrors = createMirrors(config());
        let fired = 0;
        mirrors.onFolders(() => {
            fired += 1;
        });
        const folders = [{ root: 'file:///work/b', name: 'b', displayPath: '/work/b' }];
        expect(mirrors.apply('foldersChanged', { folders })).toBe(true);
        expect(mirrors.folders()).toEqual(folders);
        expect(fired).toBe(1);
    });

    it('returns false and fires nothing for every other event (panelOpened, fileChanged, unknown)', () => {
        const mirrors = createMirrors(config());
        let fired = 0;
        mirrors.onSettings(() => {
            fired += 1;
        });
        mirrors.onTrust(() => {
            fired += 1;
        });
        mirrors.onFolders(() => {
            fired += 1;
        });
        expect(mirrors.apply('panelOpened', {})).toBe(false);
        expect(mirrors.apply('fileChanged', { root: 'file:///work/a', path: 'x.md' })).toBe(false);
        expect(mirrors.apply('nonsense', {})).toBe(false);
        expect(fired).toBe(0);
    });

    it('stops firing a listener after its disposable is disposed', () => {
        const mirrors = createMirrors(config());
        let fired = 0;
        const subscription = mirrors.onTrust(() => {
            fired += 1;
        });
        subscription.dispose();
        mirrors.apply('trustGranted', {});
        expect(fired).toBe(0);
    });

    it('updates the memory copy first and removes the key on memorySet with undefined', () => {
        const mirrors = createMirrors(config());
        mirrors.memorySet('featherspec-studio.shell', '{"area":"board"}');
        expect(mirrors.memoryGet('featherspec-studio.shell')).toEqual({ area: 'board' });
        mirrors.memorySet('featherspec-studio.shell', undefined);
        expect(mirrors.memoryGet('featherspec-studio.shell')).toBeUndefined();
    });

    it('answers a prototype key such as constructor as absent (no prototype lookups)', () => {
        const mirrors = createMirrors(config());
        expect(mirrors.memoryGet('constructor')).toBeUndefined();
        expect(mirrors.settings().has('constructor')).toBe(false);
    });
});

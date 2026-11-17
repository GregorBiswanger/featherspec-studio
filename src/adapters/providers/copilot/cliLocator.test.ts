import { describe, expect, it } from 'vitest';
import { CLI_PATH_SETTING, INSTALL_URL, locateCli, MIN_CLI_VERSION, runCliVersion, type LocateCliInput } from './cliLocator';

const WIN_DIRS = [
    'C:\\Users\\dev\\AppData\\Local\\Microsoft\\WinGet\\Links',
    'C:\\Users\\dev\\AppData\\Local\\Programs\\Microsoft VS Code\\bin\\copilot-shim',
    'C:\\Users\\dev\\AppData\\Roaming\\npm',
];

function banner(version: string): string {
    return `GitHub Copilot CLI ${version}.\nRun 'copilot update' to check for updates.`;
}

function input(overrides: Partial<LocateCliInput> & { files?: string[]; versions?: Record<string, string> } = {}): LocateCliInput & { versionCalls: string[] } {
    const files = new Set((overrides.files ?? []).map((file) => file.toLowerCase()));
    const versionCalls: string[] = [];
    return {
        settingPath: '',
        pathVariable: WIN_DIRS.join(';'),
        platform: 'win32',
        isFile: (path) => Promise.resolve(files.has(path.toLowerCase())),
        runVersion: (path) => {
            versionCalls.push(path);
            const output = overrides.versions?.[path];
            return output === undefined ? Promise.reject(new Error('no output')) : Promise.resolve(output);
        },
        ...overrides,
        versionCalls,
    };
}

describe('locateCli', () => {
    it('AC-002: nothing on PATH and no setting is not installed with the install link', async () => {
        const result = await locateCli(input());
        expect(result.kind).toBe('not-installed');
        expect(result.kind === 'not-installed' && result.hint).toContain(INSTALL_URL);
    });

    it('AC-002 AC-003: the PoC machine, six PATH hits: the first copilot.exe wins, shims are never started', async () => {
        const exe = `${WIN_DIRS[0]}\\copilot.exe`;
        const second = `${WIN_DIRS[1]}\\copilot.exe`;
        const subject = input({
            files: [exe, second, `${WIN_DIRS[1]}\\copilot`, `${WIN_DIRS[2]}\\copilot.cmd`, `${WIN_DIRS[2]}\\copilot.ps1`, `${WIN_DIRS[2]}\\copilot`],
            versions: { [exe]: banner('1.0.87'), [second]: banner('1.0.87') },
        });
        expect(await locateCli(subject)).toEqual({ kind: 'found', path: exe, version: '1.0.87' });
        expect(subject.versionCalls).toEqual([exe]);
    });

    it('AC-002: on Windows only copilot.exe counts; a skipped .cmd shim names itself and asks for copilot.exe or the setting', async () => {
        const shim = `${WIN_DIRS[2]}\\copilot.cmd`;
        const result = await locateCli(input({ files: [shim, `${WIN_DIRS[2]}\\copilot.ps1`] }));
        expect(result.kind).toBe('not-installed');
        const hint = result.kind === 'not-installed' ? result.hint : '';
        expect(hint).toContain(shim);
        expect(hint).toContain('copilot.exe');
        expect(hint).toContain(CLI_PATH_SETTING);
        expect(hint).toContain(INSTALL_URL);
    });

    it.each(['copilot.bat', 'copilot.js', 'copilot.ps1'])('AC-002: a skipped %s is remembered for the hint', async (name) => {
        const shim = `${WIN_DIRS[2]}\\${name}`;
        const result = await locateCli(input({ files: [shim] }));
        expect(result.kind === 'not-installed' && result.hint).toContain(shim);
    });

    it('AC-002: on other platforms the file is named copilot, PATH order decides, a directory without it is skipped', async () => {
        const second = '/usr/local/bin/copilot';
        const subject = input({
            platform: 'linux',
            pathVariable: '/opt/none:/usr/local/bin:/usr/bin',
            files: [second, '/usr/bin/copilot'],
            versions: { [second]: banner('1.0.90') },
        });
        expect(await locateCli(subject)).toEqual({ kind: 'found', path: second, version: '1.0.90' });
    });

    it('AC-002: the setting is tried first and PATH is not consulted when it is set', async () => {
        const configured = 'D:\\tools\\copilot.exe';
        const onPath = `${WIN_DIRS[0]}\\copilot.exe`;
        const subject = input({
            settingPath: configured,
            files: [configured, onPath],
            versions: { [configured]: banner('2.1.0'), [onPath]: banner('1.0.87') },
        });
        expect(await locateCli(subject)).toEqual({ kind: 'found', path: configured, version: '2.1.0' });
        expect(subject.versionCalls).toEqual([configured]);
    });

    it('AC-002: a setting that points to no file is not installed, names the setting and the path', async () => {
        const result = await locateCli(input({ settingPath: 'D:\\gone\\copilot.exe', files: [`${WIN_DIRS[0]}\\copilot.exe`] }));
        expect(result.kind).toBe('not-installed');
        const hint = result.kind === 'not-installed' ? result.hint : '';
        expect(hint).toContain(CLI_PATH_SETTING);
        expect(hint).toContain('D:\\gone\\copilot.exe');
        expect(hint).toContain(INSTALL_URL);
    });

    it('AC-002: a setting that names a Windows shim is not installed and asks for copilot.exe', async () => {
        const shim = 'C:\\Users\\dev\\AppData\\Roaming\\npm\\copilot.cmd';
        const result = await locateCli(input({ settingPath: shim, files: [shim] }));
        expect(result.kind).toBe('not-installed');
        expect(result.kind === 'not-installed' && result.hint).toContain('copilot.exe');
    });

    it('AC-003: a version below the minimum is not installed and names both versions and the install link', async () => {
        const exe = `${WIN_DIRS[0]}\\copilot.exe`;
        const result = await locateCli(input({ files: [exe], versions: { [exe]: banner('1.0.86') } }));
        expect(result.kind).toBe('not-installed');
        const hint = result.kind === 'not-installed' ? result.hint : '';
        expect(hint).toContain('1.0.86');
        expect(hint).toContain(MIN_CLI_VERSION);
        expect(hint).toContain(INSTALL_URL);
    });

    it('AC-003: the minimum itself, and a newer minor or major, are accepted; versions compare as numbers', async () => {
        const exe = `${WIN_DIRS[0]}\\copilot.exe`;
        for (const version of ['1.0.87', '1.0.100', '1.1.0', '2.0.0']) {
            const result = await locateCli(input({ files: [exe], versions: { [exe]: banner(version) } }));
            expect(result).toEqual({ kind: 'found', path: exe, version });
        }
        const old = await locateCli(input({ files: [exe], versions: { [exe]: banner('0.9.200') } }));
        expect(old.kind).toBe('not-installed');
    });

    it('AC-003: no version readable is unknown with that reason', async () => {
        const exe = `${WIN_DIRS[0]}\\copilot.exe`;
        const failing = await locateCli(input({ files: [exe] }));
        expect(failing).toEqual({ kind: 'unknown', reason: expect.stringContaining('no output') as string });
        const garbled = await locateCli(input({ files: [exe], versions: { [exe]: 'hello' } }));
        expect(garbled.kind).toBe('unknown');
        expect(garbled.kind === 'unknown' && garbled.reason).toContain('version');
    });
});

describe('runCliVersion', () => {
    it('AC-003: runs the file with --version without a shell and returns its output', async () => {
        const output = await runCliVersion(process.execPath);
        expect(output).toContain(process.version);
    });

    it('AC-003: a file that cannot be started rejects with a reason', async () => {
        await expect(runCliVersion('/definitely/not/here/copilot')).rejects.toThrow(/ENOENT/);
    });
});

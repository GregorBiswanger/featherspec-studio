import { execFile } from 'child_process';
import * as path from 'path';

export const MIN_CLI_VERSION = '1.0.87';
export const INSTALL_URL = 'https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli';
export const CLI_PATH_SETTING = 'featherspec-studio.copilot.cliPath';

const VERSION_TIMEOUT_MS = 10_000;
const WINDOWS_SHIM_EXTENSIONS = ['.cmd', '.ps1', '.bat', '.js'];

export type CliLocation =
    | { kind: 'found'; path: string; version: string }
    | { kind: 'not-installed'; hint: string }
    | { kind: 'unknown'; reason: string };

export interface LocateCliInput {
    settingPath: string;
    pathVariable: string;
    platform: string;
    isFile(path: string): Promise<boolean>;
    runVersion(path: string): Promise<string>;
}

function parseVersion(text: string): string | undefined {
    return /GitHub Copilot CLI (\d+\.\d+\.\d+)/.exec(text)?.[1];
}

function compareVersions(left: string, right: string): number {
    const a = left.split('.').map(Number);
    const b = right.split('.').map(Number);
    for (let index = 0; index < 3; index++) {
        const difference = (a[index] ?? 0) - (b[index] ?? 0);
        if (difference !== 0) {
            return difference;
        }
    }
    return 0;
}

function notFoundHint(skipped: string | undefined): string {
    const shim =
        skipped === undefined
            ? ''
            : `Found ${skipped}, but Studio cannot start it without a shell. Install copilot.exe or set ${CLI_PATH_SETTING} to it. `;
    return `${shim}The GitHub Copilot CLI was not found. Install it (${INSTALL_URL}) or set ${CLI_PATH_SETTING}.`;
}

async function checkVersion(file: string, runVersion: LocateCliInput['runVersion']): Promise<CliLocation> {
    let output: string;
    try {
        output = await runVersion(file);
    } catch (error) {
        return { kind: 'unknown', reason: `The version of ${file} could not be read: ${error instanceof Error ? error.message : String(error)}` };
    }
    const version = parseVersion(output);
    if (version === undefined) {
        return { kind: 'unknown', reason: `The version of ${file} could not be read: unexpected output of --version.` };
    }
    if (compareVersions(version, MIN_CLI_VERSION) < 0) {
        return {
            kind: 'not-installed',
            hint: `GitHub Copilot CLI ${version} at ${file} is older than the required ${MIN_CLI_VERSION}. Update it: ${INSTALL_URL}`,
        };
    }
    return { kind: 'found', path: file, version };
}

export async function locateCli(input: LocateCliInput): Promise<CliLocation> {
    const windows = input.platform === 'win32';
    const flavour = windows ? path.win32 : path.posix;
    if (input.settingPath !== '') {
        const extension = flavour.extname(input.settingPath).toLowerCase();
        if (windows && WINDOWS_SHIM_EXTENSIONS.includes(extension)) {
            return {
                kind: 'not-installed',
                hint: `${CLI_PATH_SETTING} names ${input.settingPath}, which cannot be started without a shell. Set it to copilot.exe. Install: ${INSTALL_URL}`,
            };
        }
        if (!(await input.isFile(input.settingPath))) {
            return {
                kind: 'not-installed',
                hint: `${CLI_PATH_SETTING} points to ${input.settingPath}, which is not a file. Fix the setting or clear it. Install: ${INSTALL_URL}`,
            };
        }
        return checkVersion(input.settingPath, input.runVersion);
    }
    const names = windows ? ['copilot.exe'] : ['copilot'];
    const skippedNames = windows ? WINDOWS_SHIM_EXTENSIONS.map((extension) => `copilot${extension}`) : [];
    let skipped: string | undefined;
    for (const directory of input.pathVariable.split(windows ? ';' : ':').filter((entry) => entry !== '')) {
        for (const name of names) {
            const candidate = flavour.join(directory, name);
            if (await input.isFile(candidate)) {
                return checkVersion(candidate, input.runVersion);
            }
        }
        for (const name of skippedNames) {
            const candidate = flavour.join(directory, name);
            if (skipped === undefined && (await input.isFile(candidate))) {
                skipped = candidate;
            }
        }
    }
    return { kind: 'not-installed', hint: notFoundHint(skipped) };
}

export function runCliVersion(file: string): Promise<string> {
    return new Promise((resolve, reject) => {
        execFile(file, ['--version'], { timeout: VERSION_TIMEOUT_MS, windowsHide: true, shell: false }, (error, stdout) => {
            if (error !== null) {
                reject(error);
                return;
            }
            resolve(stdout);
        });
    });
}

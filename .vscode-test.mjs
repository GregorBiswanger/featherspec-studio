import { defineConfig } from '@vscode/test-cli';
import { cpSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const fixtureNames = ['fs110-de-active-review', 'incomplete-agents-only', 'not-fs-speckit'];
const base = mkdtempSync(join(tmpdir(), 'featherspec-studio-smoke-'));
for (const name of fixtureNames) {
	cpSync(resolve('test', 'fixtures', name), join(base, name), { recursive: true });
}
const workspaceFile = join(base, 'smoke.code-workspace');
writeFileSync(workspaceFile, JSON.stringify({ folders: fixtureNames.map((name) => ({ path: name })) }));

function singleFolderCopy(name) {
	const folder = join(mkdtempSync(join(tmpdir(), 'featherspec-studio-activation-')), name);
	cpSync(resolve('test', 'fixtures', name), folder, { recursive: true });
	return folder;
}

export default defineConfig([
	{
		label: 'smoke',
		files: 'out/test/*.test.js',
		workspaceFolder: workspaceFile,
	},
	{
		label: 'activation-specs-only',
		files: 'out/test/activation/specsOnly.test.js',
		workspaceFolder: singleFolderCopy('incomplete-specs-only'),
	},
	{
		label: 'activation-no-marker',
		files: 'out/test/activation/noMarker.test.js',
		workspaceFolder: singleFolderCopy('not-fs-speckit'),
	},
]);

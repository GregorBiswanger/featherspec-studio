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

export default defineConfig({
	files: 'out/test/**/*.test.js',
	workspaceFolder: workspaceFile,
});

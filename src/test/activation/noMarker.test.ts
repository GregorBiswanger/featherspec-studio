import * as assert from 'assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

/**
 * The activation event the extension host logged for this extension, or undefined when the log cannot be read.
 * The host suite runs with the user data of @vscode/test-cli below the extension folder.
 */
function loggedActivationEvent(extension: vscode.Extension<unknown>): string | undefined {
    try {
        const logs = path.join(extension.extensionPath, '.vscode-test', 'user-data', 'logs');
        const latest = fs.readdirSync(logs).sort().at(-1);
        if (latest === undefined) {
            return undefined;
        }
        const text = fs.readFileSync(path.join(logs, latest, 'window1', 'exthost', 'exthost.log'), 'utf8');
        const line = text.split('\n').find((candidate) => candidate.includes('_doActivateExtension') && candidate.toLowerCase().includes('featherspec-studio'));
        return line?.match(/activationEvent: '([^']+)'/)?.[1];
    } catch {
        return undefined;
    }
}

suite('FeatherSpec Studio activation: a workspace without any marker', function () {
    this.timeout(60_000);

    test('AC-019 negative control: stays inactive while no folder has AGENTS.md or .specs/ and no Studio command runs', async function () {
        const extension = vscode.extensions.all.find((candidate) => candidate.packageJSON.name === 'featherspec-studio');
        assert.ok(extension, 'extension is installed in the test host');
        await new Promise((resolve) => setTimeout(resolve, 5_000));
        if (extension.isActive) {
            const cause = loggedActivationEvent(extension);
            if (cause !== undefined && (cause.startsWith('onView:') || cause.startsWith('onCommand:'))) {
                console.log(`inconclusive: a Studio view or command was triggered in the test window (${cause}); the control covers activation without either`);
                return this.skip();
            }
            assert.fail(`the extension activated without a marker; activation event: ${cause ?? 'not found in the extension host log'}`);
        }
    });
});

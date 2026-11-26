import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

export const START_COMMIT = '1765403c57c02381dae9acc5f2d4caae7abf7dfb';
export const RELEASE_FILE = 'jetbrains-release.yml';
export const SECRET_NAMES = ['CERTIFICATE_CHAIN', 'PRIVATE_KEY', 'PRIVATE_KEY_PASSWORD', 'PUBLISH_TOKEN'];

const SECRETS_BY_STEP = {
    signPlugin: ['CERTIFICATE_CHAIN', 'PRIVATE_KEY', 'PRIVATE_KEY_PASSWORD'],
    verifyPluginSignature: ['CERTIFICATE_CHAIN'],
    publishPlugin: ['CERTIFICATE_CHAIN', 'PRIVATE_KEY', 'PRIVATE_KEY_PASSWORD', 'PUBLISH_TOKEN'],
};

const ORDER = [
    { key: 'package', test: (s) => /^\s*-?\s*run: npm run package\s*$/m.test(s) },
    { key: 'buildPlugin', test: (s) => /run: .*\bbuildPlugin\b/.test(s) },
    { key: 'verifyPluginStructure', test: (s) => /run: .*\bverifyPluginStructure\b/.test(s) },
    { key: 'verifyPlugin', test: (s) => /run: .*\bverifyPlugin\b(?!\w)/.test(s) },
    { key: 'signPlugin', test: (s) => /run: .*\bsignPlugin\b/.test(s) },
    { key: 'verifyPluginSignature', test: (s) => /run: .*\bverifyPluginSignature\b/.test(s) },
    { key: 'zipGuard', test: (s) => /run: .*jetbrains\/guards\/pluginZip\.mjs .*-signed\.zip/.test(s) },
    { key: 'upload', test: (s) => /uses: actions\/upload-artifact@/.test(s) && /name: plugin-zip-signed\s*$/m.test(s) },
    { key: 'publishPlugin', test: (s) => /run: .*\bpublishPlugin\b/.test(s) },
];

export const splitSteps = (text) => {
    const start = text.search(/^ {4}steps:\s*$/m);
    if (start < 0) {
        return [];
    }
    const lines = text.slice(start).split(/\r?\n/).slice(1);
    const steps = [];
    for (const line of lines) {
        if (/^ {6}- /.test(line)) {
            steps.push([line]);
        } else if (steps.length > 0) {
            steps[steps.length - 1].push(line);
        }
    }
    return steps.map((step) => step.join('\n'));
};

const topBlock = (text, key) => {
    const lines = text.split(/\r?\n/);
    const start = lines.findIndex((line) => line.startsWith(`${key}:`));
    if (start < 0) {
        return '';
    }
    const block = [];
    for (const line of lines.slice(start + 1)) {
        if (/^\S/.test(line)) {
            break;
        }
        block.push(line);
    }
    return block.join('\n');
};

export const checkTriggers = (text) => {
    const problems = [];
    const on = topBlock(text, 'on');
    const keys = [...on.matchAll(/^ {2}([A-Za-z_]+):/gm)].map((match) => match[1]);
    if (keys.length !== 1 || keys[0] !== 'workflow_dispatch') {
        problems.push(`the only trigger must be workflow_dispatch, found: ${keys.join(', ') || 'none'}`);
    }
    if (/workflow_call|workflow_run|pull_request|^\s*push:|^\s*schedule:/m.test(on)) {
        problems.push('the workflow must have no workflow_call, workflow_run, pull_request, push or schedule trigger');
    }
    if (/uses:\s*\.\/\.github\/workflows/.test(text)) {
        problems.push('the workflow must not call another workflow');
    }
    const inputs = on.match(/^ {6}([a-z]+):/gm)?.map((line) => line.trim().replace(':', '')) ?? [];
    if (inputs.join(',') !== 'mode,confirm') {
        problems.push(`the inputs must be mode and confirm, found: ${inputs.join(', ') || 'none'}`);
    }
    const mode = on.match(/^ {6}mode:[\s\S]*?(?=^ {6}confirm:)/m)?.[0] ?? '';
    if (!/type: choice/.test(mode) || !/- sign\s*$/m.test(mode) || !/- publish\s*$/m.test(mode)) {
        problems.push('the input mode must be a choice of sign and publish');
    }
    const confirm = on.match(/^ {6}confirm:[\s\S]*$/m)?.[0] ?? '';
    if (!/required: true/.test(confirm)) {
        problems.push('the input confirm must be required');
    }
    return problems;
};

export const checkJob = (text) => {
    const problems = [];
    const jobs = [...topBlock(text, 'jobs').matchAll(/^ {2}([A-Za-z0-9_-]+):\s*$/gm)].map((match) => match[1]);
    if (jobs.join(',') !== 'release') {
        problems.push(`the workflow must have exactly the job release, found: ${jobs.join(', ') || 'none'}`);
    }
    if (!/^ {4}if: inputs\.confirm == 'publish'\s*$/m.test(text)) {
        problems.push("the job release must run only if inputs.confirm == 'publish'");
    }
    if (!/^ {4}environment: jetbrains-marketplace\s*$/m.test(text)) {
        problems.push('the job release must run in the environment jetbrains-marketplace');
    }
    const permissions = topBlock(text, 'permissions')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    if (permissions.join('|') !== 'contents: read' || /^[ \t]+permissions:/m.test(text)) {
        problems.push('the only permission must be contents: read, at workflow level');
    }
    return problems;
};

export const checkSteps = (text) => {
    const problems = [];
    const steps = splitSteps(text);
    const positions = ORDER.map(({ key, test }) => ({ key, index: steps.findIndex(test) }));
    for (const { key, index } of positions) {
        if (index < 0) {
            problems.push(`step missing: ${key}`);
        }
    }
    const found = positions.filter(({ index }) => index >= 0);
    for (let i = 1; i < found.length; i++) {
        if (found[i].index < found[i - 1].index) {
            problems.push(`step order: ${found[i].key} must come after ${found[i - 1].key}`);
        }
    }
    const publishIndex = positions.find(({ key }) => key === 'publishPlugin')?.index ?? -1;
    if (publishIndex >= 0) {
        if (!/^\s+if: inputs\.mode == 'publish'\s*$/m.test(steps[publishIndex])) {
            problems.push("publishPlugin must run only if inputs.mode == 'publish'");
        }
        if (publishIndex !== steps.length - 1) {
            problems.push('publishPlugin must be the last step');
        }
    }
    const publishMentions = steps.filter((step) => /run: .*\bpublishPlugin\b/.test(step));
    if (publishMentions.length > 1) {
        problems.push('publishPlugin must run in exactly one step');
    }
    const firstGradle = steps.findIndex((step) => /run: .*\bgradle\b/.test(step));
    const refCheck = steps.findIndex(
        (step) => step.includes('refs/tags/jetbrains-v') && step.includes('build.gradle.kts') && /\bexit 1\b/.test(step),
    );
    if (refCheck < 0) {
        problems.push('a step must compare the run\'s ref with refs/tags/jetbrains-v<version> from build.gradle.kts and exit 1');
    } else if (firstGradle >= 0 && refCheck > firstGradle) {
        problems.push('the ref check must come before the first Gradle step');
    } else {
        const message = steps[refCheck].match(/::error::[^\n]*/g)?.join('\n') ?? '';
        if (!/\$REF/.test(message) || !/\$version/.test(message)) {
            problems.push('the ref check must name the ref and the version in its message');
        }
    }
    return problems;
};

export const checkSecrets = (text) => {
    const problems = [];
    const steps = splitSteps(text);
    const refs = [...text.matchAll(/\$\{\{\s*secrets\.([A-Za-z0-9_]+)\s*\}\}/g)].map((match) => match[1]);
    const unknown = refs.filter((name) => !SECRET_NAMES.includes(name));
    if (unknown.length > 0) {
        problems.push(`secrets outside the allowed four: ${[...new Set(unknown)].join(', ')}`);
    }
    for (const line of text.split(/\r?\n/)) {
        if (/secrets\./.test(line) && !/^\s+([A-Z_]+): \$\{\{ secrets\.\1 \}\}\s*$/.test(line)) {
            problems.push(`a secret may only be mapped as NAME: \${{ secrets.NAME }} in an env block: ${line.trim()}`);
        }
    }
    for (const step of steps) {
        const task = Object.keys(SECRETS_BY_STEP).find((key) => new RegExp(`run: .*\\b${key}\\b`).test(step));
        const env = step.match(/^ {8}env:\s*\n((?: {10}.*\n?)*)/m)?.[1] ?? '';
        const mapped = [...env.matchAll(/^ {10}([A-Z_]+): \$\{\{ secrets\./gm)].map((match) => match[1]);
        const allowed = task ? SECRETS_BY_STEP[task] : [];
        const outside = mapped.filter((name) => !allowed.includes(name));
        if (outside.length > 0) {
            problems.push(`step ${task ?? step.split('\n')[0].trim()} must not receive ${outside.join(', ')}`);
        }
        if (task && allowed.some((name) => !mapped.includes(name))) {
            problems.push(`step ${task} must receive ${allowed.join(', ')} through env`);
        }
        const runLines = step
            .split(/\r?\n/)
            .filter((line) => /run:|^\s{10,}\S/.test(line) && !/^\s+(env:|[A-Z_]+: \$\{\{)/.test(line));
        for (const name of SECRET_NAMES) {
            if (runLines.some((line) => line.includes(name) && !/^\s+name:/.test(line))) {
                problems.push(`${name} must not appear in a run command`);
            }
        }
    }
    if (/\becho\b[^\n]*\b(CERTIFICATE_CHAIN|PRIVATE_KEY|PUBLISH_TOKEN)/.test(text) || /\bset -x\b|xtrace|ACTIONS_STEP_DEBUG/.test(text)) {
        problems.push('no echo of a secret, no set -x, no step debug');
    }
    return problems;
};

export const checkOtherWorkflows = (files) =>
    files
        .filter(({ name }) => name !== RELEASE_FILE)
        .flatMap(({ name, text }) =>
            SECRET_NAMES.filter((secret) => text.includes(secret)).map((secret) => `${name} must not name ${secret}`),
        );

export const checkReleaseWorkflow = (text) => [
    ...checkTriggers(text),
    ...checkJob(text),
    ...checkSteps(text),
    ...checkSecrets(text),
];

export const readWorkflows = (repoRoot) => {
    const dir = path.join(repoRoot, '.github', 'workflows');
    return readdirSync(dir)
        .filter((name) => /\.ya?ml$/.test(name))
        .map((name) => ({ name, text: readFileSync(path.join(dir, name), 'utf8') }));
};

export const unchangedAgainstStart = (repoRoot) => {
    try {
        execFileSync('git', ['cat-file', '-e', `${START_COMMIT}^{commit}`], { cwd: repoRoot, stdio: 'ignore' });
    } catch {
        return null;
    }
    try {
        execFileSync('git', ['diff', '--exit-code', START_COMMIT, '--', '.github/workflows/ci.yml', '.github/workflows/publish.yml'], {
            cwd: repoRoot,
            stdio: 'ignore',
        });
        return true;
    } catch {
        return false;
    }
};

const main = () => {
    const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
    const files = readWorkflows(repoRoot);
    const release = files.find(({ name }) => name === RELEASE_FILE);
    const problems = release ? [...checkReleaseWorkflow(release.text), ...checkOtherWorkflows(files)] : [`${RELEASE_FILE} is missing`];
    problems.forEach((problem) => console.error(problem));
    return problems.length > 0 ? 1 : 0;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    process.exitCode = main();
}

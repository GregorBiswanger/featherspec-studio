import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

export const IGNORED_PATTERNS = ['*.pem', '*.crt', '*.key', '*.p12', '*.pfx'];
export const VERIFIER_PRODUCTS = {
    idea: 'IntellijIdea',
    webstorm: 'WebStorm',
    rider: 'Rider',
    pycharm: 'PyCharm',
    phpstorm: 'PhpStorm',
    goland: 'GoLand',
    clion: 'CLion',
    rubymine: 'RubyMine',
    rustrover: 'RustRover',
};
export const PLUGIN_VERSION = '0.1.0';
export const SINCE_BUILD = '253.29346';

export const checkGradle = (text) => {
    const problems = [];
    const need = (pattern, message) => {
        if (!pattern.test(text)) {
            problems.push(message);
        }
    };
    need(/certificateChain = providers\.environmentVariable\("CERTIFICATE_CHAIN"\)/, 'signing must read CERTIFICATE_CHAIN from the environment');
    need(/privateKey = providers\.environmentVariable\("PRIVATE_KEY"\)/, 'signing must read PRIVATE_KEY from the environment');
    need(/password = providers\.environmentVariable\("PRIVATE_KEY_PASSWORD"\)/, 'signing must read PRIVATE_KEY_PASSWORD from the environment');
    need(/token = providers\.environmentVariable\("PUBLISH_TOKEN"\)/, 'publishing must read PUBLISH_TOKEN from the environment');
    need(/channels = listOf\("default"\)/, 'publishing must use the channel default');
    need(/hidden = false/, 'publishing must set hidden = false');
    need(/FailureLevel\.COMPATIBILITY_PROBLEMS/, 'the verifier must fail on COMPATIBILITY_PROBLEMS');
    need(/FailureLevel\.INTERNAL_API_USAGES/, 'the verifier must fail on INTERNAL_API_USAGES');
    need(/FailureLevel\.INVALID_PLUGIN/, 'the verifier must fail on INVALID_PLUGIN');
    need(new RegExp(`version = "${PLUGIN_VERSION.replace(/\./g, '\\.')}"`), `the plugin version must be ${PLUGIN_VERSION}`);
    need(new RegExp(`sinceBuild = "${SINCE_BUILD.replace(/\./g, '\\.')}"`), `since-build must be ${SINCE_BUILD}`);
    need(/untilBuild = provider \{ null \}/, 'until-build must stay open');
    need(/url = "https:\/\/github\.com\/GregorBiswanger\/featherspec-studio"/, 'the vendor url must be the repository');
    if (/EXPERIMENTAL_API_USAGES|FailureLevel\.ALL\b/.test(text)) {
        problems.push('the verifier must not fail on experimental API usage');
    }
    for (const name of ['CERTIFICATE_CHAIN', 'PRIVATE_KEY', 'PRIVATE_KEY_PASSWORD', 'PUBLISH_TOKEN']) {
        const lines = text.split(/\r?\n/).filter((line) => new RegExp(`\\b${name}\\b`).test(line));
        if (lines.length !== 1 || !lines[0].includes(`providers.environmentVariable("${name}")`)) {
            problems.push(`${name} must appear once, read through providers.environmentVariable`);
        }
    }
    for (const [key, type] of Object.entries(VERIFIER_PRODUCTS)) {
        if (!new RegExp(`"${key}" to IntelliJPlatformType\\.${type}\\b`).test(text)) {
            problems.push(`verifyProducts must map ${key} to IntelliJPlatformType.${type}`);
        }
    }
    const mapped = [...text.matchAll(/"([a-z]+)" to IntelliJPlatformType\./g)].map((match) => match[1]);
    const extra = mapped.filter((key) => !(key in VERIFIER_PRODUCTS));
    if (extra.length > 0) {
        problems.push(`verifyProducts has unexpected products: ${extra.join(', ')}`);
    }
    return problems;
};

export const checkVerifierMatrix = (workflowText) => {
    const line = workflowText.match(/^\s+product: \[([^\]]*)\]\s*$/m)?.[1];
    if (!line) {
        return ['jetbrains.yml has no verify product matrix'];
    }
    const products = line.split(',').map((item) => item.trim());
    const expected = [...Object.keys(VERIFIER_PRODUCTS), 'recommended'];
    const missing = expected.filter((item) => !products.includes(item));
    const extra = products.filter((item) => !expected.includes(item));
    return [
        ...missing.map((item) => `the verify matrix lacks ${item}`),
        ...extra.map((item) => `the verify matrix has an unknown product ${item}`),
    ];
};

export const checkGitignore = (text) => {
    const lines = text.split(/\r?\n/).map((line) => line.trim());
    return IGNORED_PATTERNS.filter((pattern) => !lines.includes(pattern)).map((pattern) => `.gitignore must exclude ${pattern}`);
};

export const findKeyBlocks = (files) =>
    files.flatMap(({ path: filePath, text }) =>
        text
            .split(/\r?\n/)
            .flatMap((line, index) => (/-----BEGIN [A-Z ]+-----/.test(line) ? [`PEM block in ${filePath}:${index + 1}`] : [])),
    );

export const trackedFiles = (repoRoot) =>
    execFileSync('git', ['ls-files', '-z'], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 1 << 28 })
        .split('\0')
        .filter(Boolean)
        .flatMap((relative) => {
            const buffer = readFileSync(path.join(repoRoot, relative));
            return buffer.subarray(0, 8000).includes(0) ? [] : [{ path: relative, text: buffer.toString('utf8') }];
        });

const main = () => {
    const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
    const read = (relative) => readFileSync(path.join(repoRoot, relative), 'utf8');
    const problems = [
        ...checkGradle(read('jetbrains/build.gradle.kts')),
        ...checkVerifierMatrix(read('.github/workflows/jetbrains.yml')),
        ...checkGitignore(read('.gitignore')),
        ...findKeyBlocks(trackedFiles(repoRoot)),
    ];
    problems.forEach((problem) => console.error(problem));
    return problems.length > 0 ? 1 : 0;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    process.exitCode = main();
}

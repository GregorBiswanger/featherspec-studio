import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ZIP_LIMIT_BYTES = 60 * 1024 * 1024;
export const FORBIDDEN_ENTRY = /graal|truffle|polyglot|icu4j/i;
export const REQUIRED_JAR_ENTRIES = [
    'embedded/core.js',
    'webview/main.js',
    'webview/main.css',
    'icons/toolWindow.svg',
    'icons/toolWindow_dark.svg',
    'META-INF/plugin.xml',
];
export const BYTE_IDENTICAL = [
    ['webview/main.js', 'dist/webview/main.js'],
    ['webview/main.css', 'dist/webview/main.css'],
    ['embedded/core.js', 'dist/embedded/core.js'],
];

const EXPECTED_PLUGIN = {
    id: 'com.gregorbiswanger.featherspec.studio',
    name: 'FeatherSpec Studio',
    vendor: 'Gregor Biswanger',
    sinceBuild: '253.29346',
    depends: ['com.intellij.modules.platform', 'com.intellij.modules.jcef'],
    // 0035 OP-009: the Terminal plugin is the only optional dependency (Send to Claude Code).
    optionalDepends: ['org.jetbrains.plugins.terminal'],
};

const SECRET_PATTERNS = [
    { kind: 'PEM header', pattern: /-----BEGIN [A-Z ]+-----/ },
    {
        kind: 'secret assignment',
        pattern: /\b(?:PUBLISH_TOKEN|PRIVATE_KEY_PASSWORD|PRIVATE_KEY|CERTIFICATE_CHAIN)\s*[=:]\s*["']?[A-Za-z0-9_.+/-]{8,}/,
    },
];

export const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

export const checkZipSize = (bytes, limit = ZIP_LIMIT_BYTES) =>
    bytes > limit ? [`the plugin ZIP is ${bytes} bytes, the limit is ${limit}`] : [];

export const findForbiddenEntries = (names) =>
    names.filter((name) => FORBIDDEN_ENTRY.test(name)).map((name) => `forbidden entry: ${name}`);

export const findStrayClasses = (names) =>
    names
        .filter((name) => /(?:^|\/)spikes?\//i.test(name) || /Tests?\.class$/.test(name) || /^test\//.test(name))
        .map((name) => `spike or test class in the plugin jar: ${name}`);

export const missingEntries = (names, required = REQUIRED_JAR_ENTRIES) => {
    const present = new Set(names);
    return required.filter((entry) => !present.has(entry)).map((entry) => `missing in the plugin jar: ${entry}`);
};

export const checkIconsPresent = (names) =>
    names.some((name) => name.startsWith('icons/') && name.length > 'icons/'.length) ? [] : ['no icons/* entry in the plugin jar'];

export const compareDigests = (pairs) =>
    pairs
        .filter(({ jar, dist }) => jar !== dist)
        .map(({ name }) => `not byte-identical to the dist file: ${name}`);

export const checkPluginXml = (xml, expected = EXPECTED_PLUGIN) => {
    const problems = [];
    const tag = (name) => xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([^<]*)</${name}>`))?.[1];
    if (tag('id') !== expected.id) {
        problems.push(`plugin id is not ${expected.id}`);
    }
    if (tag('name') !== expected.name) {
        problems.push(`plugin name is not ${expected.name}`);
    }
    if (tag('vendor') !== expected.vendor) {
        problems.push(`plugin vendor is not ${expected.vendor}`);
    }
    if (!xml.includes(`since-build="${expected.sinceBuild}"`)) {
        problems.push(`since-build is not ${expected.sinceBuild}`);
    }
    if (xml.includes('until-build')) {
        problems.push('until-build must not be set');
    }
    const all = [...xml.matchAll(/<depends(\s[^>]*)?>([^<]*)<\/depends>/g)].map((match) => ({
        optional: /\boptional\s*=\s*"true"/.test(match[1] ?? ''),
        id: match[2],
    }));
    const depends = all.filter((d) => !d.optional).map((d) => d.id);
    const optional = all.filter((d) => d.optional).map((d) => d.id);
    if (depends.length !== expected.depends.length || !expected.depends.every((id) => depends.includes(id))) {
        problems.push(`plugin must depend on exactly ${expected.depends.join(' and ')}, found: ${depends.join(', ') || 'none'}`);
    }
    const allowedOptional = expected.optionalDepends ?? [];
    const unexpected = optional.filter((id) => !allowedOptional.includes(id));
    if (unexpected.length > 0 || new Set(optional).size !== optional.length) {
        problems.push(`optional depends may only be ${allowedOptional.join(', ') || 'none'} (once), found: ${optional.join(', ')}`);
    }
    return problems;
};

export const findSecrets = (files) =>
    files.flatMap(({ path: filePath, text }) =>
        text.split(/\r?\n/).flatMap((line, index) =>
            SECRET_PATTERNS.filter(({ pattern }) => pattern.test(line)).map(
                ({ kind }) => `${kind} in ${filePath}:${index + 1}`,
            ),
        ),
    );

export const isBinary = (buffer) => buffer.subarray(0, 8000).includes(0);

export const pickMainJar = (jars) => jars.find(({ entries }) => entries.includes('META-INF/plugin.xml'));

const unzipList = (file) => execFileSync('unzip', ['-Z1', file], { encoding: 'utf8', maxBuffer: 1 << 28 }).split(/\r?\n/).filter(Boolean);

const unzipEntry = (file, entry) => execFileSync('unzip', ['-p', file, entry], { maxBuffer: 1 << 29 });

const trackedTextFiles = (repoRoot) =>
    execFileSync('git', ['ls-files', '-z'], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 1 << 28 })
        .split('\0')
        .filter(Boolean)
        .flatMap((relative) => {
            const buffer = readFileSync(path.join(repoRoot, relative));
            return isBinary(buffer) ? [] : [{ path: relative, text: buffer.toString('utf8') }];
        });

const main = () => {
    const zipPath = process.argv[2];
    if (!zipPath) {
        console.error('usage: node pluginZip.mjs <plugin.zip>');
        return 1;
    }
    const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
    const work = mkdtempSync(path.join(tmpdir(), 'plugin-zip-'));
    try {
        const problems = checkZipSize(statSync(zipPath).size);
        const zipEntries = unzipList(zipPath);
        problems.push(...findForbiddenEntries(zipEntries));
        const jars = zipEntries
            .filter((entry) => /^[^/]+\/lib\/featherspec-studio[^/]*\.jar$/.test(entry))
            .map((entry) => {
                const file = path.join(work, path.basename(entry));
                writeFileSync(file, unzipEntry(zipPath, entry));
                return { entry, file, entries: unzipList(file) };
            });
        const main = pickMainJar(jars);
        if (!main) {
            problems.push('no featherspec-studio jar with META-INF/plugin.xml in the ZIP');
        } else {
            problems.push(...findForbiddenEntries(main.entries));
            problems.push(...findStrayClasses(main.entries));
            problems.push(...missingEntries(main.entries));
            problems.push(...checkIconsPresent(main.entries));
            problems.push(...checkPluginXml(unzipEntry(main.file, 'META-INF/plugin.xml').toString('utf8')));
            problems.push(
                ...compareDigests(
                    BYTE_IDENTICAL.filter(([jarEntry]) => main.entries.includes(jarEntry)).map(([jarEntry, distFile]) => ({
                        name: jarEntry,
                        jar: sha256(unzipEntry(main.file, jarEntry)),
                        dist: sha256(readFileSync(path.join(repoRoot, distFile))),
                    })),
                ),
            );
        }
        problems.push(...findSecrets(trackedTextFiles(repoRoot)));
        if (problems.length > 0) {
            problems.forEach((problem) => console.error(problem));
            return 1;
        }
        console.log(`plugin ZIP ok: ${zipEntries.length} entries, ${statSync(zipPath).size} bytes`);
        return 0;
    } finally {
        rmSync(work, { recursive: true, force: true });
    }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    process.exitCode = main();
}

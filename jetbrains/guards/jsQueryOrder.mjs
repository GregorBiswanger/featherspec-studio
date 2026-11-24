import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FACTORY = 'jcef/JsQueries.kt';

export const kotlinFiles = (dir) =>
    readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.kt'))
        .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name));

export const directQueryCalls = (files) =>
    files
        .filter(({ name, source }) => !name.split(path.sep).join('/').endsWith(FACTORY) && /\bJBCefJSQuery\.create\s*\(/.test(source))
        .map(({ name }) => name);

export const orderViolations = (source) => {
    const factory = source.search(/\bJsQueries\.create\s*\(/);
    const deferred = source.search(/\.setCreateImmediately\(\s*false\s*\)/);
    const native = source.search(/\.createImmediately\s*\(\s*\)/);
    const problems = [];
    if (factory < 0) problems.push('no JsQueries.create call');
    if (deferred < 0) problems.push('the builder does not defer the native browser');
    if (factory >= 0 && deferred > factory) problems.push('JsQueries.create comes before setCreateImmediately(false)');
    if (native >= 0 && factory >= 0 && native < factory) problems.push('createImmediately() comes before JsQueries.create');
    return problems;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/main/kotlin');
    const files = kotlinFiles(root).map((name) => ({ name, source: readFileSync(name, 'utf8') }));
    const stray = directQueryCalls(files);
    const sites = files.filter(({ name }) => /(CoreRuntime|PanelBrowser)\.kt$/.test(name));
    const problems = [
        ...stray.map((name) => `${name}: JBCefJSQuery.create outside ${FACTORY}`),
        ...sites.flatMap(({ name, source }) => orderViolations(source).map((problem) => `${name}: ${problem}`)),
    ];
    if (sites.length !== 2) problems.push('expected CoreRuntime.kt and PanelBrowser.kt');
    if (problems.length > 0) {
        console.error(problems.join('\n'));
        process.exit(1);
    }
}

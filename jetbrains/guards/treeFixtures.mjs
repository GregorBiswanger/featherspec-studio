import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const compareTreeFixture = (fixtureText, expectedText) => {
    const fixture = JSON.stringify(JSON.parse(fixtureText));
    const tree = JSON.stringify(JSON.parse(expectedText).tree);
    return fixture === tree;
};

export const driftedFixtures = (fixtures, expectedByName) =>
    fixtures.flatMap(({ name, text }) => {
        const expected = expectedByName[name];
        if (expected === undefined) {
            return [`${name}: no fresh conformance output`];
        }
        return compareTreeFixture(text, expected) ? [] : [`${name}: differs from a fresh conformanceExpected.mjs run`];
    });

const main = () => {
    const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
    const fixtureDir = path.join(repoRoot, 'jetbrains', 'src', 'test', 'resources', 'tree');
    const expectedDir = path.resolve(process.argv[2] ?? path.join(repoRoot, 'jetbrains', 'build', 'conformance', 'expected'));
    const names = readdirSync(fixtureDir).filter((name) => name.endsWith('.json'));
    if (names.length === 0) {
        console.error('no tree fixtures found');
        return 1;
    }
    const fixtures = names.map((name) => ({ name, text: readFileSync(path.join(fixtureDir, name), 'utf8') }));
    const expectedByName = Object.fromEntries(
        names
            .filter((name) => existsSync(path.join(expectedDir, name)))
            .map((name) => [name, readFileSync(path.join(expectedDir, name), 'utf8')]),
    );
    const problems = driftedFixtures(fixtures, expectedByName);
    if (problems.length > 0) {
        problems.forEach((problem) => console.error(problem));
        return 1;
    }
    console.log(`${names.length} tree fixtures equal a fresh conformance run`);
    return 0;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    process.exitCode = main();
}

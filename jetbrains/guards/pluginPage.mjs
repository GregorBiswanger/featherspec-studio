import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const REPO_URL = 'https://github.com/GregorBiswanger/featherspec-studio';
export const LINK_PREFIX = 'https://github.com/GregorBiswanger/';
export const FORBIDDEN_EVERYWHERE = ['official', 'endorsed', 'partner', 'certified', 'by Anthropic', 'by GitHub'];
export const FORBIDDEN_IN_NAME = ['Plugin', 'IntelliJ', 'JetBrains'];
export const NAME_LIMIT = 30;
export const NON_AFFILIATION =
    'Junie, Claude Code and GitHub Copilot are products of their owners; FeatherSpec Studio works with them and is not affiliated with them.';
export const CHANGE_NOTES_START = 'First release on the JetBrains Marketplace: the Specs tool window, Overview, Board and Plan map';
export const REQUIRED_SENTENCES = [
    'FeatherSpec Studio is the visual command center for spec-driven development with FeatherSpec',
    '<b>Copy prompt</b>',
    '<b>Send to Junie, Claude Code or GitHub Copilot</b>',
    "command-line agent in the IDE terminal",
    'when you click it, it may start the agent in a new terminal tab',
    'It never presses Enter.',
    'The Studio sends nothing.',
    'no account, no telemetry',
    NON_AFFILIATION,
];
export const IDE_NAMES = ['Rider', 'WebStorm', 'PhpStorm', 'IntelliJ IDEA', 'PyCharm', 'GoLand', 'CLion', 'RubyMine', 'RustRover'];

export const extractBlock = (xml, tag) => xml.match(new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`))?.[1]?.trim();

export const extractVendor = (xml) => {
    const match = xml.match(/<vendor(?:\s+([^>]*))?>([^<]*)<\/vendor>/);
    return match ? { name: match[2].trim(), url: match[1]?.match(/\burl="([^"]*)"/)?.[1], attrs: match[1] ?? '' } : undefined;
};

export const checkVendor = (xml) => {
    const vendor = extractVendor(xml);
    if (!vendor || vendor.name === '') {
        return ['the vendor is missing or empty'];
    }
    const problems = [];
    if (vendor.name !== 'Gregor Biswanger') {
        problems.push('the vendor name must be Gregor Biswanger');
    }
    if (vendor.url !== REPO_URL) {
        problems.push(`the vendor url must be ${REPO_URL}`);
    }
    if (/\bemail=/.test(vendor.attrs)) {
        problems.push('the vendor email lives only in the Marketplace vendor profile');
    }
    return problems;
};

export const checkDescription = (xml) => {
    const text = extractBlock(xml, 'description');
    if (!text) {
        return ['the description is missing or empty'];
    }
    const problems = REQUIRED_SENTENCES.filter((sentence) => !text.includes(sentence)).map((sentence) => `the description lacks: ${sentence}`);
    problems.push(...IDE_NAMES.filter((name) => !text.includes(name)).map((name) => `the description does not name ${name}`));
    for (const name of ['Junie', 'Claude Code', 'GitHub Copilot']) {
        if (!text.includes(name)) {
            problems.push(`the description does not name ${name}`);
        }
    }
    if (/<img\b/i.test(text)) {
        problems.push('the description must contain no image');
    }
    const links = [...text.matchAll(/(?:href|src)="([^"]*)"/g)].map((match) => match[1]);
    problems.push(...links.filter((link) => !link.startsWith(LINK_PREFIX)).map((link) => `a link outside ${LINK_PREFIX}: ${link}`));
    if (/https?:\/\/(?!github\.com\/GregorBiswanger\/)/.test(text)) {
        problems.push(`a URL in the text outside ${LINK_PREFIX}`);
    }
    return problems;
};

export const checkChangeNotes = (xml) => {
    const text = extractBlock(xml, 'change-notes');
    if (!text) {
        return ['the change notes are missing or empty'];
    }
    const problems = [];
    if (!text.includes(CHANGE_NOTES_START)) {
        problems.push('the change notes must start with the first-release text for 0.1.0');
    }
    if (/\b(TODO|TBD|FIXME|lorem|placeholder|<change-notes>|Add change notes)\b/i.test(text)) {
        problems.push('the change notes must carry no placeholder text');
    }
    return problems;
};

export const checkWords = (xml) => {
    const name = xml.match(/<name>([^<]*)<\/name>/)?.[1] ?? '';
    const page = [name, extractBlock(xml, 'description') ?? '', extractBlock(xml, 'change-notes') ?? '', extractVendor(xml)?.name ?? ''].join('\n');
    const problems = FORBIDDEN_EVERYWHERE.filter((word) => new RegExp(word, 'i').test(page)).map((word) => `the page must not contain "${word}"`);
    problems.push(...FORBIDDEN_IN_NAME.filter((word) => name.includes(word)).map((word) => `the name must not contain "${word}"`));
    if (name.length === 0 || name.length > NAME_LIMIT) {
        problems.push(`the name must have 1 to ${NAME_LIMIT} characters`);
    }
    return problems;
};

export const checkIcon = (svg) => (/<svg\b[^>]*\bwidth="40"[^>]*\bheight="40"/.test(svg) ? [] : ['the icon must be an SVG of width 40 and height 40']);

export const checkPage = (xml) => [...checkVendor(xml), ...checkDescription(xml), ...checkChangeNotes(xml), ...checkWords(xml)];

const main = () => {
    const root = new URL('../../jetbrains/src/main/resources/META-INF/', import.meta.url);
    const problems = [
        ...checkPage(readFileSync(new URL('plugin.xml', root), 'utf8')),
        ...['pluginIcon.svg', 'pluginIcon_dark.svg'].flatMap((file) => checkIcon(readFileSync(new URL(file, root), 'utf8')).map((p) => `${file}: ${p}`)),
    ];
    problems.forEach((problem) => console.error(problem));
    return problems.length > 0 ? 1 : 0;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    process.exitCode = main();
}

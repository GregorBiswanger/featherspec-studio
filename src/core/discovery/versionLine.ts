export interface VersionReading {
    version: string;
    diagnostics: readonly string[];
}

const VERSION_LINE = /^[ \t]*FeatherSpecVersion:(.*)$/;
const SEMANTIC_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function firstToken(rest: string): string {
    const trimmed = rest.trim();
    if (trimmed.startsWith('#')) {
        return '';
    }
    return trimmed.split(/\s+/)[0] ?? '';
}

export function readVersionLine(agentsText: string): VersionReading {
    const lines = agentsText.split(/\r?\n/);
    const diagnostics: string[] = [];
    let version = 'unknown';
    let firstSeen = false;

    lines.forEach((line, index) => {
        const match = VERSION_LINE.exec(line);
        if (match === null) {
            return;
        }
        if (firstSeen) {
            diagnostics.push(`A second FeatherSpecVersion: line at line ${index + 1} is ignored; the first one wins.`);
            return;
        }
        firstSeen = true;
        const value = firstToken(match[1] ?? '');
        if (value === '') {
            diagnostics.push('The FeatherSpecVersion: line has no value; the version is unknown.');
            return;
        }
        version = value;
        if (!SEMANTIC_VERSION.test(value)) {
            diagnostics.push(`The version value "${value}" is not a semantic version.`);
        }
    });

    return { version, diagnostics };
}

export interface CssRule {
    selectors: string[];
    body: string;
    media?: string;
}

export interface CssDeclaration {
    property: string;
    value: string;
    selectors: string[];
    media?: string;
}

function stripComments(css: string): string {
    return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function blockEnd(css: string, open: number): number {
    let depth = 0;
    for (let index = open; index < css.length; index += 1) {
        const char = css[index];
        if (char === '{') {
            depth += 1;
        } else if (char === '}') {
            depth -= 1;
            if (depth === 0) {
                return index;
            }
        }
    }
    return css.length;
}

function collect(css: string, media: string | undefined, rules: CssRule[]): void {
    let cursor = 0;
    while (cursor < css.length) {
        const open = css.indexOf('{', cursor);
        if (open < 0) {
            return;
        }
        const prelude = css.slice(cursor, open).replace(/^[\s;]+/, '').trim();
        const close = blockEnd(css, open);
        const body = css.slice(open + 1, close);
        if (prelude.startsWith('@media') || prelude.startsWith('@supports')) {
            collect(body, prelude, rules);
        } else {
            const selectors = prelude
                .split(',')
                .map((selector) => selector.trim())
                .filter((selector) => selector !== '');
            rules.push(media === undefined ? { selectors, body } : { selectors, body, media });
        }
        cursor = close + 1;
    }
}

export function parseRules(css: string): CssRule[] {
    const rules: CssRule[] = [];
    collect(stripComments(css), undefined, rules);
    return rules;
}

export function declarations(css: string): CssDeclaration[] {
    return parseRules(css).flatMap((rule) =>
        rule.body
            .split(';')
            .map((part) => part.trim())
            .filter((part) => part.includes(':'))
            .map((part) => {
                const colon = part.indexOf(':');
                const declaration: CssDeclaration = { property: part.slice(0, colon).trim(), value: part.slice(colon + 1).trim(), selectors: rule.selectors };
                return rule.media === undefined ? declaration : { ...declaration, media: rule.media };
            }),
    );
}

export function rulesFor(css: string, selector: string): CssRule[] {
    return parseRules(css).filter((rule) => rule.selectors.includes(selector));
}

export function rulesMatching(css: string, element: { matches(selector: string): boolean }): CssRule[] {
    return parseRules(css).filter((rule) =>
        rule.selectors.some((selector) => {
            try {
                return element.matches(selector);
            } catch {
                return false;
            }
        }),
    );
}

export interface CssRule {
    selectors: string[];
    body: string;
}

export function parseRules(css: string): CssRule[] {
    const rules: CssRule[] = [];
    const pattern = /([^{}]+)\{([^{}]*)\}/g;
    let match = pattern.exec(css);
    while (match !== null) {
        const selectors = (match[1] ?? '')
            .split(',')
            .map((selector) => selector.trim())
            .filter((selector) => selector !== '');
        rules.push({ selectors, body: match[2] ?? '' });
        match = pattern.exec(css);
    }
    return rules;
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

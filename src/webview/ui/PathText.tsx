import { Fragment, type ReactNode } from 'react';

const BREAK_AFTER = /([/.-])/;
const BREAK_AFTER_SLASH = /(\/)/;

/** `slash` (0033 §6.5): a break opportunity after each `/` only, never inside a file name. */
export type BreakAfter = 'separator' | 'slash';

function breakable(text: string, after: BreakAfter): ReactNode[] {
    return text.split(after === 'slash' ? BREAK_AFTER_SLASH : BREAK_AFTER).flatMap((part, index) => {
        if (part === '') {
            return [];
        }
        return index % 2 === 1 ? [part, <wbr key={index} />] : [part];
    });
}

export function PathText(props: ({ path: string } | { command: string }) & { after?: BreakAfter }) {
    const after = props.after ?? 'separator';
    if ('path' in props) {
        return <>{breakable(props.path, after)}</>;
    }
    const tokens = props.command.split(/(\s+)/);
    return (
        <>
            {tokens.map((token, index) => (
                <Fragment key={index}>{token.includes('/') && !token.startsWith('/') ? breakable(token, after) : token}</Fragment>
            ))}
        </>
    );
}

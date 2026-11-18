import { Fragment, type ReactNode } from 'react';

const BREAK_AFTER = /([/.-])/;

function breakable(text: string): ReactNode[] {
    return text.split(BREAK_AFTER).flatMap((part, index, parts) => {
        if (part === '') {
            return [];
        }
        const isSeparator = index % 2 === 1;
        const last = index === parts.length - 1 || parts.slice(index + 1).every((rest) => rest === '');
        return isSeparator && !last ? [part, <wbr key={index} />] : [part];
    });
}

export function PathText(props: { path: string } | { command: string }) {
    if ('path' in props) {
        return <>{breakable(props.path)}</>;
    }
    const tokens = props.command.split(/(\s+)/);
    return (
        <>
            {tokens.map((token, index) => (
                <Fragment key={index}>{token.includes('/') && !token.startsWith('/') ? breakable(token) : token}</Fragment>
            ))}
        </>
    );
}

import { Fragment, type ReactNode } from 'react';

function segments(text: string): ReactNode[] {
    if (!text.includes('/')) {
        return [text];
    }
    return text
        .split(/(?<=\/)/)
        .filter((part) => part !== '')
        .flatMap((part, index) => {
            const unit = (
                <span key={`s${index}`} className="path-seg">
                    {part}
                </span>
            );
            return part.endsWith('/') ? [unit, <wbr key={`w${index}`} />] : [unit];
        });
}

export function PathText(props: { path: string } | { command: string }) {
    if ('path' in props) {
        return <>{segments(props.path)}</>;
    }
    const tokens = props.command.split(/(\s+)/);
    return (
        <>
            {tokens.map((token, index) => (
                <Fragment key={index}>{token.includes('/') && !token.startsWith('/') ? segments(token) : token}</Fragment>
            ))}
        </>
    );
}

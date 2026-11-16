import type { ReactNode } from 'react';
import { tokenize, type InlineToken } from './inlineFormat';

function render(tokens: InlineToken[]): ReactNode[] {
    return tokens.map((token, index) => {
        switch (token.kind) {
            case 'text':
                return token.text;
            case 'strong':
                return <strong key={index}>{render(token.children)}</strong>;
            case 'em':
                return <em key={index}>{render(token.children)}</em>;
            case 'code':
                return <code key={index}>{token.text}</code>;
            case 'link':
                return (
                    <span key={index} className="inline-link">
                        <span className="inline-link-text">{render(token.children)}</span> <span className="inline-link-target">{token.target}</span>
                    </span>
                );
        }
    });
}

export function InlineText(props: { text: string }) {
    return <>{render(tokenize(props.text))}</>;
}

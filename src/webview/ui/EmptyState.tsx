import type { ReactNode } from 'react';
import { Glyph, type GlyphKind } from '../board/icons';

export function EmptyState(props: { icon: GlyphKind; className?: string; children: ReactNode; [data: `data-${string}`]: boolean | string | undefined }) {
    const { icon, className, children, ...data } = props;
    return (
        <div className={className === undefined ? 'empty-state' : `empty-state ${className}`} {...data}>
            <Glyph kind={icon} {...(icon === 'feather' ? { className: 'empty-state-feather' } : {})} />
            {children}
        </div>
    );
}

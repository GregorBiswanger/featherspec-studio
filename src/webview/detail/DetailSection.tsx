import { useId, type ReactNode } from 'react';
import { Glyph } from '../board/icons';
import { useCollapsed } from './sectionMemory';

export function PlainSection(props: { title: string; children: ReactNode }) {
    return (
        <section className="detail-section">
            <div className="section-head">
                <h3>{props.title}</h3>
            </div>
            <div className="section-body">{props.children}</div>
        </section>
    );
}

export function DetailSection(props: { title: string; memoryKey: string; children: ReactNode }) {
    const [collapsed, setCollapsed] = useCollapsed(props.memoryKey);
    const bodyId = useId();
    return (
        <section className="detail-section" data-collapsed={collapsed ? 'true' : undefined}>
            <div className="section-head">
                <h3>
                    <button type="button" className="section-toggle" aria-expanded={!collapsed} aria-controls={bodyId} onClick={() => setCollapsed(!collapsed)}>
                        <Glyph kind="chevron" />
                        {props.title}
                    </button>
                </h3>
            </div>
            <div id={bodyId} className="section-body" hidden={collapsed}>
                {props.children}
            </div>
        </section>
    );
}

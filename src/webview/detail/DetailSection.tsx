import { useId, type ReactNode } from 'react';
import type { OpenTarget } from '../../shared/protocol/detail';
import { OPEN_FILE_LABEL } from '../../shared/protocol/texts';
import { Glyph } from '../board/icons';
import { useCollapsed } from './sectionMemory';

export function OpenButton(props: { target: OpenTarget; onOpen(key: string): void; label?: string }) {
    const label = props.label === undefined ? OPEN_FILE_LABEL : `${OPEN_FILE_LABEL}: ${props.label}`;
    return (
        <button type="button" className="open-file" aria-label={label} onClick={() => props.onOpen(props.target.key)}>
            {OPEN_FILE_LABEL}
        </button>
    );
}

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

export function DetailSection(props: { title: string; open?: OpenTarget | undefined; keys: string[]; fileResult: { key: string; text: string } | undefined; onOpen(key: string): void; children: ReactNode }) {
    const [collapsed, setCollapsed] = useCollapsed(props.title);
    const bodyId = useId();
    const message = props.fileResult !== undefined && (props.keys.includes(props.fileResult.key) || props.open?.key === props.fileResult.key) ? props.fileResult.text : '';
    return (
        <section className="detail-section" data-collapsed={collapsed ? 'true' : undefined}>
            <div className="section-head">
                <h3>
                    <button type="button" className="section-toggle" aria-expanded={!collapsed} aria-controls={bodyId} onClick={() => setCollapsed(!collapsed)}>
                        <Glyph kind="chevron" />
                        {props.title}
                    </button>
                </h3>
                {props.open === undefined ? null : <OpenButton target={props.open} onOpen={props.onOpen} label={props.title} />}
            </div>
            <div className="detail-status" role="status">
                {message}
            </div>
            <div id={bodyId} className="section-body" hidden={collapsed}>
                {props.children}
            </div>
        </section>
    );
}

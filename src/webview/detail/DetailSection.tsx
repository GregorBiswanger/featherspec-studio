import type { ReactNode } from 'react';
import type { OpenTarget } from '../../shared/protocol/detail';
import { OPEN_FILE_LABEL } from '../../shared/protocol/texts';

export function OpenButton(props: { target: OpenTarget; onOpen(key: string, line?: number): void; label?: string }) {
    const { target } = props;
    const label = props.label === undefined ? OPEN_FILE_LABEL : `${OPEN_FILE_LABEL}: ${props.label}`;
    return (
        <button type="button" className="open-file" aria-label={label} onClick={() => (target.line === undefined ? props.onOpen(target.key) : props.onOpen(target.key, target.line))}>
            {OPEN_FILE_LABEL}
        </button>
    );
}

export function DetailSection(props: { title: string; open?: OpenTarget | undefined; keys: string[]; fileResult: { key: string; text: string } | undefined; onOpen(key: string, line?: number): void; children: ReactNode }) {
    const message = props.fileResult !== undefined && (props.keys.includes(props.fileResult.key) || props.open?.key === props.fileResult.key) ? props.fileResult.text : '';
    return (
        <section className="detail-section">
            <h3>{props.title}</h3>
            {props.open === undefined ? null : <OpenButton target={props.open} onOpen={props.onOpen} />}
            <div className="detail-status" role="status">
                {message}
            </div>
            {props.children}
        </section>
    );
}

import { useEffect, useId, useState, type ReactNode } from 'react';
import type { LineTarget } from '../../shared/protocol/detail';
import { openFileTooltip } from '../../shared/protocol/texts';

export interface FileResult {
    key: string;
    text: string;
}

const latestActivation = new Map<string, object>();

function baseName(key: string): string {
    return key.slice(key.lastIndexOf('/') + 1);
}

export interface StepActivation {
    tooltip: string;
    onPlain(): void;
}

const MODIFIED = (event: { ctrlKey: boolean; metaKey: boolean }): boolean => event.ctrlKey || event.metaKey;

export function FileLink(props: { activate?: StepActivation; target: LineTarget; fileResult: FileResult | undefined; onOpen(key: string, line: number): void; reason?: string; label?: string; tabIndex?: number; children: ReactNode }) {
    const { target, fileResult } = props;
    const [activation, setActivation] = useState<{ before: FileResult | undefined; token: object } | undefined>(undefined);
    const descriptionId = useId();
    const opening = openFileTooltip(baseName(target.key), target.line);
    const tooltip = props.activate?.tooltip ?? (props.reason === undefined ? opening : `${props.reason}\n${opening}`);
    const failed = activation !== undefined && latestActivation.get(target.key) === activation.token && fileResult !== undefined && fileResult !== activation.before && fileResult.key === target.key;

    const openFile = (): void => {
        const token = {};
        latestActivation.set(target.key, token);
        setActivation({ before: fileResult, token });
        props.onOpen(target.key, target.line);
    };

    useEffect(() => {
        if (fileResult === undefined) {
            setActivation(undefined);
        }
    }, [fileResult]);

    return (
        <>
            <button
                type="button"
                className="file-link"
                title={tooltip}
                aria-describedby={descriptionId}
                {...(props.label === undefined || failed ? {} : { 'aria-label': props.label })}
                {...(props.tabIndex === undefined ? {} : { tabIndex: props.tabIndex })}
                onKeyDown={(event) => {
                    if (props.activate !== undefined && (event.key === 'Enter' || event.key === ' ') && MODIFIED(event)) {
                        event.preventDefault();
                        openFile();
                    }
                }}
                onClick={(event) => {
                    if (props.activate === undefined) {
                        openFile();
                    } else if (!MODIFIED(event)) {
                        props.activate.onPlain();
                    } else if (event.detail > 0) {
                        openFile();
                    }
                }}
            >
                {failed ? fileResult.text : props.children}
            </button>
            <span id={descriptionId} className="visually-hidden">
                {tooltip}
            </span>
        </>
    );
}

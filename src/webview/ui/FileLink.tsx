import { useEffect, useId, useState, type ReactNode } from 'react';
import type { LineTarget } from '../../shared/protocol/detail';
import { openFileTooltip } from '../../shared/protocol/texts';

export interface FileResult {
    key: string;
    text: string;
}

function baseName(key: string): string {
    return key.slice(key.lastIndexOf('/') + 1);
}

export function FileLink(props: { target: LineTarget; fileResult: FileResult | undefined; onOpen(key: string, line: number): void; children: ReactNode }) {
    const { target, fileResult } = props;
    const [activation, setActivation] = useState<{ before: FileResult | undefined } | undefined>(undefined);
    const descriptionId = useId();
    const tooltip = openFileTooltip(baseName(target.key), target.line);
    const failed = activation !== undefined && fileResult !== undefined && fileResult !== activation.before && fileResult.key === target.key;

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
                onClick={() => {
                    setActivation({ before: fileResult });
                    props.onOpen(target.key, target.line);
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

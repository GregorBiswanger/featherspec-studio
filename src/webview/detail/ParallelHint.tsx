import { parallelHintText, WAYS_TO_RUN_IT_LABEL } from '../../shared/protocol/planMapTexts';
import { useShell } from '../shell';

/** 0025 §5.7 (U-06): the Next step names a stage that can run in parallel and leads to its ways. */
export function ParallelHint(props: { stage: number }) {
    const shell = useShell();
    const selection = shell.view?.selection;
    return (
        <p className="parallel-hint">
            {parallelHintText(props.stage)}
            <button
                type="button"
                className="file-link"
                {...(selection === undefined ? { disabled: true } : {})}
                onClick={() => {
                    if (selection !== undefined) {
                        shell.navigate({ area: 'planMap', target: { kind: 'spec', stem: selection.stem, ...(selection.path === undefined ? {} : { path: selection.path }), ways: true } });
                    }
                }}
            >
                {WAYS_TO_RUN_IT_LABEL}
            </button>
        </p>
    );
}

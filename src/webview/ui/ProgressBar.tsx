export function ProgressBar(props: { label: string; done: number; total: number; text: string }) {
    const share = props.total > 0 ? Math.round((Math.min(props.done, props.total) / props.total) * 1000) / 10 : 0;
    return (
        <div className="progress">
            <span className="progress-text">{props.text}</span>
            <div className="progress-track" role="progressbar" aria-label={props.label} aria-valuemin={0} aria-valuemax={props.total} aria-valuenow={props.done} aria-valuetext={props.text}>
                <span className="progress-fill" style={{ width: `${share}%` }} />
            </div>
        </div>
    );
}

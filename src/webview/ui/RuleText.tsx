export function RuleText(props: { text: string; tooltip: string }) {
    return (
        <span className="rule-text" title={props.tooltip}>
            <span className="rule-sentence">{props.text}</span>
        </span>
    );
}

export function RuleText(props: { text: string; id: string }) {
    return (
        <span className="rule-text">
            <span className="rule-sentence">{props.text}</span> <span className="rule-id">{props.id}</span>
        </span>
    );
}

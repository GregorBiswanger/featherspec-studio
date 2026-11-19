import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { PlanWaysView } from '../../../shared/protocol/planMap';
import { START_LINES_LEAD_TEXT, WAY_KEYS, WAYS, WAYS_LEAD_TEXT, waysHeading } from '../../../shared/protocol/planMapTexts';
import { CopyButton, type CopyResult } from '../../ui/CopyButton';
import { PathText } from '../../ui/PathText';
import { HIGHLIGHT_MS } from './target';

export function Ways(props: { ways: PlanWaysView; target?: { n: number }; copyResult: CopyResult | undefined; onCopy(text: string): void }) {
    const { ways } = props;
    const [open, setOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(false);
    const box = useRef<HTMLDivElement>(null);
    const toggle = useRef<HTMLButtonElement>(null);
    const targetN = props.target?.n;
    useEffect(() => {
        if (targetN === undefined) {
            return;
        }
        setOpen(true);
        setHighlighted(true);
        const timer = setTimeout(() => setHighlighted(false), HIGHLIGHT_MS);
        return () => clearTimeout(timer);
    }, [targetN]);
    useLayoutEffect(() => {
        if (targetN === undefined) {
            return;
        }
        box.current?.scrollIntoView({ block: 'nearest' });
        toggle.current?.focus();
    }, [targetN]);
    const panelId = useId();
    return (
        <div className="plan-ways" data-ways ref={box} {...(highlighted ? { 'data-highlight': '' } : {})}>
            <button type="button" className="plan-ways-toggle" ref={toggle} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((before) => !before)}>
                {waysHeading(ways.stage)}
            </button>
            <div id={panelId} className="plan-ways-body" hidden={!open}>
                <p className="plan-ways-lead">{WAYS_LEAD_TEXT}</p>
                <ul className="plan-ways-list">
                    {WAY_KEYS.map((key, index) => {
                        const prompt = ways.prompts[index]!;
                        return (
                            <li key={key} className="plan-way" data-way={key}>
                                <p className="plan-way-name">{WAYS[key].name}</p>
                                <p className="plan-way-effect">{WAYS[key].effect}</p>
                                <p className="plan-way-prompt">
                                    <code>
                                        <PathText command={prompt} />
                                    </code>
                                    <CopyButton look="secondary" line={prompt} copyResult={props.copyResult} onCopy={props.onCopy} />
                                </p>
                                {key === 'otherAgents' && ways.startLines.length > 0 ? (
                                    <div className="plan-start-lines">
                                        <p className="plan-start-lead">{START_LINES_LEAD_TEXT}</p>
                                        <ul>
                                            {ways.startLines.map((line) => (
                                                <li key={line}>
                                                    <code>
                                                        <PathText command={line} />
                                                    </code>
                                                    <CopyButton look="icon" line={line} copyResult={props.copyResult} onCopy={props.onCopy} />
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { PlanWaysView } from '../../../shared/protocol/planMap';
import { DEFAULT_TAG_TEXT, DEFAULT_WAY, START_LINES_LEAD_TEXT, WAY_KEYS, WAYS, waysHeading, type WayKey } from '../../../shared/protocol/planMapTexts';
import { CopyButton, type CopyResult } from '../../ui/CopyButton';
import { PathText } from '../../ui/PathText';
import { HIGHLIGHT_MS } from './target';

export function Ways(props: { ways: PlanWaysView; target?: { n: number }; copyResult: CopyResult | undefined; onCopy(text: string): void }) {
    const { ways } = props;
    const [open, setOpen] = useState(false);
    const [checked, setChecked] = useState<WayKey>(DEFAULT_WAY);
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
    const toggleId = useId();
    const groupName = useId();
    const prompt = ways.prompts[WAY_KEYS.indexOf(checked)]!;
    return (
        <div className="plan-ways" data-ways ref={box} {...(highlighted ? { 'data-highlight': '' } : {})}>
            <button type="button" id={toggleId} className="plan-ways-toggle" ref={toggle} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((before) => !before)}>
                {waysHeading(ways.stage)}
            </button>
            <div id={panelId} className="plan-ways-body" hidden={!open}>
                <div role="radiogroup" aria-labelledby={toggleId} className="plan-ways-list">
                    {WAY_KEYS.map((key) => (
                        <label key={key} className="plan-way" data-way={key}>
                            <input type="radio" name={groupName} value={key} checked={checked === key} onChange={() => setChecked(key)} />
                            <span className="plan-way-text">
                                <span className="plan-way-name">{WAYS[key].name}</span>
                                {key === DEFAULT_WAY ? (
                                    <>
                                        {' · '}
                                        <span className="plan-way-tag">{DEFAULT_TAG_TEXT}</span>
                                    </>
                                ) : null}
                                {' — '}
                                <span className="plan-way-line">{WAYS[key].line}</span>
                            </span>
                        </label>
                    ))}
                </div>
                {checked === 'otherAgents' && ways.startLines.length > 0 ? (
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
                ) : (
                    <p className="plan-way-prompt">
                        <code>
                            <PathText command={prompt} />
                        </code>
                        <CopyButton look="secondary" line={prompt} copyResult={props.copyResult} onCopy={props.onCopy} />
                    </p>
                )}
            </div>
        </div>
    );
}

import { useId, useState } from 'react';
import type { PlanWaysView } from '../../../shared/protocol/planMap';
import { START_LINES_LEAD_TEXT, WAY_KEYS, WAYS, WAYS_LEAD_TEXT, waysHeading } from '../../../shared/protocol/planMapTexts';
import { CopyButton, type CopyResult } from '../../ui/CopyButton';
import { PathText } from '../../ui/PathText';

export function Ways(props: { ways: PlanWaysView; copyResult: CopyResult | undefined; onCopy(text: string): void }) {
    const { ways } = props;
    const [open, setOpen] = useState(false);
    const panelId = useId();
    return (
        <div className="plan-ways" data-ways>
            <button type="button" className="plan-ways-toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((before) => !before)}>
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

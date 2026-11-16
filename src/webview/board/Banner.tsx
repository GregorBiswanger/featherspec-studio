import type { BannerLine } from '../../shared/protocol/board';
import { BANNER_HEADING } from '../../shared/protocol/texts';
import { BadgeIcon } from './icons';

export function Banner(props: { lines: BannerLine[] }) {
    if (props.lines.length === 0) {
        return null;
    }
    return (
        <div className="banner" data-banner role="region" aria-label={BANNER_HEADING}>
            <strong>
                <BadgeIcon kind="diagnostic" /> {BANNER_HEADING}
            </strong>
            <ul>
                {props.lines.map((line, index) => (
                    <li key={`${line.where}|${index}`}>
                        {line.where}: {line.reason}
                    </li>
                ))}
            </ul>
        </div>
    );
}

import type { Banner as BannerView } from '../../shared/protocol/board';
import { BANNER_HEADING, formatNotesText } from '../../shared/protocol/texts';
import { FormatNotes } from '../ui/FormatNotes';
import { BadgeIcon } from './icons';

export function Banner(props: { banner: BannerView }) {
    const { problems, notes } = props.banner;
    if (problems.length === 0 && notes.length === 0) {
        return null;
    }
    return (
        <div className={problems.length > 0 ? 'banner banner-problems' : 'banner'} data-banner role="region" aria-label={problems.length > 0 ? BANNER_HEADING : formatNotesText(notes.length)}>
            {problems.length === 0 ? null : (
                <>
                    <strong>
                        <BadgeIcon kind="diagnostic" /> {BANNER_HEADING}
                    </strong>
                    <ul>
                        {problems.map((line, index) => (
                            <li key={`${line.where}|${index}`}>
                                {line.where}: {line.reason}
                            </li>
                        ))}
                    </ul>
                </>
            )}
            <FormatNotes notes={notes.map((line) => ({ reason: `${line.where}: ${line.reason}` }))} />
        </div>
    );
}

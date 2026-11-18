import { useId, useState, type ReactNode } from 'react';
import { formatNotesText } from '../../shared/protocol/texts';
import { Glyph } from '../board/icons';
import { InlineText } from './InlineText';

export function FormatNotes<T extends { reason: string }>(props: { notes: readonly T[]; renderNote?: (note: T) => ReactNode }) {
    const [open, setOpen] = useState(false);
    const listId = useId();
    if (props.notes.length === 0) {
        return null;
    }
    return (
        <div className="format-notes">
            <button type="button" className="format-notes-toggle" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(!open)}>
                <Glyph kind="chevron" />
                {formatNotesText(props.notes.length)}
            </button>
            <ul id={listId} className="format-notes-list" hidden={!open}>
                {props.notes.map((note, index) => (
                    <li key={`${index}|${note.reason}`}>{props.renderNote === undefined ? <InlineText text={note.reason} /> : props.renderNote(note)}</li>
                ))}
            </ul>
        </div>
    );
}

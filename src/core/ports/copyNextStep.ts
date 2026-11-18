export type StatusEntryCommand = 'copyNextStep' | 'selectProject';

export type StatusTooltip = { markdown: string } | { plain: string };

export interface StatusEntryView {
    text: string;
    tooltip: StatusTooltip;
    accessibleLabel?: string;
    command: StatusEntryCommand;
}

export interface StatusItemPort {
    show(view: StatusEntryView): void;
    hide(): void;
}

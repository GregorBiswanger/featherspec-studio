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

export interface StepPickItem {
    key: string;
    label: string;
    description: string;
}

export interface StepUiPort {
    pick(items: readonly StepPickItem[], placeholder: string): Promise<StepPickItem | undefined>;
    inform(text: string, action: string): Promise<string | undefined>;
    warn(text: string): void;
}

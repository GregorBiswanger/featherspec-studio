export interface PickItem {
    id: string;
    label: string;
    description: string;
}

export interface OrchestratorUiPort {
    confirm(message: string, button: string): Promise<boolean>;
    pick(items: readonly PickItem[], placeholder: string): Promise<string | undefined>;
    info(message: string): void;
}

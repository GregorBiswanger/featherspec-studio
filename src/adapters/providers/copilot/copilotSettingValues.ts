export interface InspectedSetting {
    globalValue?: unknown;
    workspaceValue?: unknown;
    workspaceFolderValue?: unknown;
}

export function trimmedString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

export function globalOnlyString(inspected: InspectedSetting | undefined): string {
    return trimmedString(inspected?.globalValue);
}

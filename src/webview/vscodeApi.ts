export interface VsCodeApi {
    postMessage(message: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

let cached: VsCodeApi | undefined;

export function getVsCodeApi(): VsCodeApi {
    cached ??= acquireVsCodeApi();
    return cached;
}

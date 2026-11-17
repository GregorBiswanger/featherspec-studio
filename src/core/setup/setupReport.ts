import type { NoticeSink, RunResult, SetupServiceDeps } from './setupService';

export function reportRun(_deps: SetupServiceDeps, _notices: NoticeSink, _result: RunResult, _retry: (root: string) => void): void {
    return;
}

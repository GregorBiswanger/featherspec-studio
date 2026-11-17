import { isOpenStatusKey, type RunTiming } from './agentCenter';
import { AC_NOT_AVAILABLE } from './agentCenterTexts';

function two(value: number): string {
    return String(value).padStart(2, '0');
}

export function formatSeconds(totalSeconds: number): string {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = seconds % 60;
    return hours > 0 ? `${hours}:${two(minutes)}:${two(rest)}` : `${minutes}:${two(rest)}`;
}

export function runDuration(run: RunTiming, nowMs: number): string {
    const started = run.started === undefined ? Number.NaN : Date.parse(run.started);
    if (Number.isNaN(started) || run.status === 'Interrupted') {
        return AC_NOT_AVAILABLE;
    }
    const end = isOpenStatusKey(run.status) ? nowMs : run.ended === undefined ? Number.NaN : Date.parse(run.ended);
    return Number.isNaN(end) ? AC_NOT_AVAILABLE : formatSeconds((end - started) / 1000);
}

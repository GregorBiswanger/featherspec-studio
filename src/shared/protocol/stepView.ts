import { isRecord } from './envelope';

export interface StepLineView {
    text: string;
    intent: string;
}

export interface StepView {
    intent: string;
    short: string;
    line: string;
    lines: StepLineView[];
}

const KEYS: readonly string[] = ['intent', 'short', 'line', 'lines'];
const LINE_KEYS: readonly string[] = ['text', 'intent'];

function isStepLine(value: unknown): value is StepLineView {
    return isRecord(value) && Object.keys(value).length === LINE_KEYS.length && LINE_KEYS.every((key) => typeof value[key] === 'string');
}

export function isStepView(value: unknown): value is StepView {
    if (!isRecord(value) || Object.keys(value).length !== KEYS.length || !KEYS.every((key) => key in value)) {
        return false;
    }
    if (typeof value.intent !== 'string' || typeof value.short !== 'string' || typeof value.line !== 'string' || !Array.isArray(value.lines) || value.lines.length === 0 || !value.lines.every(isStepLine)) {
        return false;
    }
    return value.lines[0].text === value.line;
}

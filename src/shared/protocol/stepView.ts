import { isRecord } from './envelope';

export interface StepLineView {
    text: string;
    label?: string;
}

export interface StepView {
    short: string;
    line: string;
    lines: StepLineView[];
}

const KEYS: readonly string[] = ['short', 'line', 'lines'];
const LINE_KEYS: readonly string[] = ['text', 'label'];

function isStepLine(value: unknown): value is StepLineView {
    return isRecord(value) && Object.keys(value).every((key) => LINE_KEYS.includes(key)) && typeof value.text === 'string' && (value.label === undefined || typeof value.label === 'string');
}

export function isStepView(value: unknown): value is StepView {
    if (!isRecord(value) || Object.keys(value).length !== KEYS.length || !KEYS.every((key) => key in value)) {
        return false;
    }
    if (typeof value.short !== 'string' || typeof value.line !== 'string' || !Array.isArray(value.lines) || value.lines.length === 0 || !value.lines.every(isStepLine)) {
        return false;
    }
    return value.lines[0].text === value.line;
}

import { isRecord } from './envelope';

export interface StepLinkView {
    id: string;
    open: { key: string; line: number };
}

export function isStepLinkView(value: unknown): value is StepLinkView {
    return (
        isRecord(value) &&
        Object.keys(value).length === 2 &&
        typeof value.id === 'string' &&
        isRecord(value.open) &&
        Object.keys(value.open).length === 2 &&
        typeof value.open.key === 'string' &&
        typeof value.open.line === 'number'
    );
}

export function splitAtId(text: string, id: string): { before: string; after: string } | undefined {
    const match = new RegExp(`\\b${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).exec(text);
    return match === null ? undefined : { before: text.slice(0, match.index), after: text.slice(match.index + id.length) };
}

export interface StepLineView {
    text: string;
    intent: string;
}

export interface StepTipsView {
    coach: string;
    about: string[];
}

export function isStepTipsView(value: unknown): value is StepTipsView {
    return isRecord(value) && Object.keys(value).length === 2 && typeof value.coach === 'string' && Array.isArray(value.about) && value.about.every((paragraph) => typeof paragraph === 'string');
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

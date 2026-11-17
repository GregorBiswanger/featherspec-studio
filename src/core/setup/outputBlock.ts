import { OUTPUT_TEXTS } from './setupTexts';

export interface SetupBlockInput {
    when: string;
    folder: string;
    version: string | undefined;
    tag: string | undefined;
    outcome: string;
    created: readonly string[];
    completed: readonly string[];
    kept: readonly string[];
    notWritten: readonly string[];
    keptSettingKeys: readonly string[];
    mergePrompt: string | undefined;
    nextStep: string | undefined;
}

function group(label: string, paths: readonly string[]): string[] {
    return paths.length === 0 ? [] : [`${label}: ${paths.length}`, ...paths.map((path) => `  ${path}`)];
}

export function formatSetupBlock(input: SetupBlockInput): string[] {
    const lines = [OUTPUT_TEXTS.title(input.when), `folder: ${input.folder}`];
    if (input.version !== undefined) {
        lines.push(`version: ${input.version}`);
    }
    if (input.tag !== undefined) {
        lines.push(`tag: ${input.tag}`);
        if (input.version !== undefined && input.tag.replace(/^v/, '') !== input.version) {
            lines.push(OUTPUT_TEXTS.tagNote(input.tag, input.version));
        }
    }
    lines.push(`outcome: ${input.outcome}`);
    lines.push(...group('created', input.created), ...group('completed', input.completed), ...group('kept', input.kept), ...group('not written', input.notWritten));
    lines.push(...input.keptSettingKeys.map((key) => `setting kept: ${key}`));
    if (input.mergePrompt !== undefined) {
        lines.push('merge prompt:', ...input.mergePrompt.trimEnd().split('\n').map((line) => `  ${line}`.trimEnd()));
    }
    if (input.nextStep !== undefined) {
        lines.push(`next step: ${input.nextStep}`);
    }
    return lines;
}

import { OPEN_STUDIO_COMMAND_ID, SELECT_PROJECT_COMMAND_ID } from '../../shared/protocol/texts';
import type { StatusEntryView } from '../ports/copyNextStep';
import type { SpecStep } from './currentSpec';
import {
    CLICK_TO_COPY_TEXT,
    CLICK_TO_OPEN_TEXT,
    CLICK_TO_PICK_TEXT,
    currentEntryText,
    IDLE_ENTRY_TEXT,
    NO_PROJECT_TOOLTIP,
    OPEN_STUDIO_LINK_LABEL,
    projectLineText,
    readyEntryText,
    SWITCH_PROJECT_LINK_LABEL,
} from './copyNextStepTexts';
import type { ProjectLineState } from './projectLine';

export interface ProjectInfo {
    name: string;
    version: string;
}

export type Situation =
    | { kind: 'line'; line: ProjectLineState }
    | { kind: 'notRead'; project: ProjectInfo; projects: number }
    | { kind: 'current'; project: ProjectInfo; projects: number; spec: SpecStep; steps: SpecStep[] }
    | { kind: 'none'; project: ProjectInfo; projects: number; ready: number; steps: SpecStep[]; setupRun?: 'not run' };

export function escapeMarkdown(text: string): string {
    return text.replace(/[\r\n]+/g, ' ').replace(/[!-/:-@[-`{-~]/g, (character) => `\\${character}`);
}

export function accessibleText(text: string): string {
    return text.replace(/^\$\([a-z-]+\)\s*/, '').split(' · ').join(', ');
}

function link(label: string, commandId: string): string {
    return `[${label}](command:${commandId})`;
}

function tooltipOf(situation: Exclude<Situation, { kind: 'line' }>, click: string): string {
    const paragraphs: string[] = [];
    if (situation.kind === 'current') {
        const { spec } = situation;
        paragraphs.push(`**${escapeMarkdown(spec.number)} · ${escapeMarkdown(spec.state)}** ${escapeMarkdown(spec.title)}`);
        for (const line of spec.step.lines) {
            paragraphs.push(escapeMarkdown(line.intent), escapeMarkdown(line.text));
        }
    }
    paragraphs.push(escapeMarkdown(projectLineText(situation.project.name, situation.project.version)));
    paragraphs.push(escapeMarkdown(click));
    const links = [link(OPEN_STUDIO_LINK_LABEL, OPEN_STUDIO_COMMAND_ID)];
    if (situation.projects >= 2) {
        links.push(link(SWITCH_PROJECT_LINK_LABEL, SELECT_PROJECT_COMMAND_ID));
    }
    paragraphs.push(links.join(' · '));
    return paragraphs.join('\n\n');
}

function viewOf(text: string, situation: Exclude<Situation, { kind: 'line' }>, click: string): StatusEntryView {
    return {
        text,
        tooltip: { markdown: tooltipOf(situation, click) },
        accessibleLabel: `${accessibleText(text)}. ${click}`,
        command: 'copyNextStep',
    };
}

export function entryView(situation: Situation): StatusEntryView | undefined {
    switch (situation.kind) {
        case 'line':
            return situation.line.visible ? { text: situation.line.text, tooltip: { plain: NO_PROJECT_TOOLTIP }, command: 'selectProject' } : undefined;
        case 'notRead':
            return viewOf(IDLE_ENTRY_TEXT, situation, CLICK_TO_OPEN_TEXT);
        case 'current':
            return viewOf(currentEntryText(situation.spec.number, situation.spec.state, situation.spec.step.short), situation, CLICK_TO_COPY_TEXT);
        case 'none':
            return viewOf(situation.ready >= 1 ? readyEntryText(situation.ready) : IDLE_ENTRY_TEXT, situation, CLICK_TO_PICK_TEXT);
    }
}

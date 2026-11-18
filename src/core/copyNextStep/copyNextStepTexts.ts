export const ENTRY_ICON = '$(checklist)';

export const ENTRY_NAME = 'FeatherSpec';

export const NO_PROJECT_TOOLTIP = 'FeatherSpec Studio: select the active project';

export const CLICK_TO_COPY_TEXT = 'Click to copy the next step.';

export const CLICK_TO_PICK_TEXT = 'Nothing in progress. Click to pick a spec and copy its next step.';

export const CLICK_TO_OPEN_TEXT = 'Click to open the Studio.';

export const OPEN_STUDIO_LINK_LABEL = 'Open Studio';

export const SWITCH_PROJECT_LINK_LABEL = 'Switch project';

export function currentEntryText(number: string, state: string, short: string): string {
    return `${ENTRY_ICON} ${number} · ${state} · ${short}`;
}

export function readyEntryText(ready: number): string {
    return `${ENTRY_ICON} ${ENTRY_NAME} · ${ready} ready`;
}

export const IDLE_ENTRY_TEXT = `${ENTRY_ICON} ${ENTRY_NAME}`;

export function projectLineText(name: string, version: string): string {
    return `${name} · FeatherSpec ${version}`;
}

export const COPIED_ENTRY_TEXT = '$(check) Copied';

export const COPY_FAILED_ENTRY_TEXT = '$(warning) Could not copy';

export const PICK_PLACEHOLDER = 'Select a spec to copy its next step';

export const NO_STEP_MESSAGE = 'No spec has a next step to copy. Start the next spec with /sdd-specify';

export const NO_STEP_COPY_LINE = '/sdd-specify';

export const FEEDBACK_MS = 2000;

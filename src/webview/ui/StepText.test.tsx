import { afterEach, describe, expect, it } from 'vitest';
import { NEXT_STEP_HIDDEN_LABEL, STEP_GUIDES, stepShortForm, stepTooltip } from '../../shared/protocol/nextStepTexts';
import type { StepView } from '../../shared/protocol/stepView';
import { mount, type Mounted } from '../testing/dom';
import { StepText } from './StepText';

let mounted: Mounted | undefined;

afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
});

const STEPS: StepView[] = [
    { intent: STEP_GUIDES['NS-5'].short, short: '/sdd-compile', line: '/sdd-compile .specs/active/0001-a.md', lines: [{ text: '/sdd-compile .specs/active/0001-a.md', intent: 'Have the result verified' }] },
    { intent: STEP_GUIDES['NS-6-open'].short, short: 'Implement T-003', line: 'Implement T-003 of .specs/active/0001-a.plan.md', lines: [{ text: 'Implement T-003 of .specs/active/0001-a.plan.md', intent: 'Continue with T-003 Reject money values' }] },
    { intent: STEP_GUIDES['NS-9'].short, short: '/sdd-clarify', line: '/sdd-clarify .specs/backlog/0002-b.md', lines: [{ text: '/sdd-clarify .specs/backlog/0002-b.md', intent: 'Have the spec challenged, then plan it' }] },
];

describe('0021 AC-006, guideline 10: the step short form comes from the text module', () => {
    it('shows the label and then exactly stepShortForm(step), its intent and its prompt in their own elements, the full lines as tooltip', async () => {
        for (const step of STEPS) {
            mounted = await mount(<StepText step={step} />);
            const text = mounted.container.querySelector('.step-text')!;
            expect(text.textContent).toBe(`${NEXT_STEP_HIDDEN_LABEL}${stepShortForm(step)}`);
            expect(text.querySelector('.step-intent')?.textContent).toBe(step.intent);
            expect(text.querySelector('code.step-short')?.textContent).toBe(step.short);
            expect(text.getAttribute('title')).toBe(stepTooltip(step.lines));
            mounted.unmount();
            mounted = undefined;
        }
    });
});

describe('0026 AC-005: no visible Next before the short form, a visually hidden Next step: instead', () => {
    it('DOM order: hidden Next step: , the short intent, the separator, the command in code; with .visually-hidden removed there is no Next; the tooltip stays 0021 AC-007\'s', async () => {
        for (const step of STEPS) {
            mounted = await mount(<StepText step={step} />);
            const text = mounted.container.querySelector('.step-text')!;
            const children = [...text.children].map((child) => child.tagName.toLowerCase() + '.' + child.className);
            expect(children).toEqual(['span.visually-hidden', 'span.step-intent', 'code.step-short']);
            expect(text.children[0]?.textContent).toBe('Next step: ');
            expect(text.textContent).toBe(`Next step: ${step.intent} · ${step.short}`);
            const visible = text.cloneNode(true) as HTMLElement;
            visible.querySelectorAll('.visually-hidden').forEach((hidden) => hidden.remove());
            expect(visible.textContent).toBe(`${step.intent} · ${step.short}`);
            expect(visible.textContent).not.toMatch(/Next/);
            expect(text.getAttribute('title')).toBe(stepTooltip(step.lines));
            mounted.unmount();
            mounted = undefined;
        }
    });

    it('with a step link the hidden label, the intent and the split command stay in order', async () => {
        const step = STEPS[1]!;
        mounted = await mount(<StepText step={step} link={{ id: 'T-003', render: () => <button type="button">T-003</button> }} />);
        const text = mounted.container.querySelector('.step-text')!;
        expect(text.children[0]?.className).toBe('visually-hidden');
        expect(text.textContent).toBe('Next step: Continue · Implement T-003');
        expect(text.querySelector('code.step-short button')?.textContent).toBe('T-003');
    });

    it('negative control: the old visible label is gone, the stylesheet has no step-label rule', async () => {
        mounted = await mount(<StepText step={STEPS[0]!} />);
        expect(mounted.container.querySelector('.step-label')).toBeNull();
    });
});

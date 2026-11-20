import { describe, expect, it } from 'vitest';
import { modelOf } from '../board/testing/boardWorld';
import { parseStepTipSettings } from '../settings/stepTipSettings';
import { welcomeOf } from './welcome';

describe('0032 AC-007: the welcome carries its Tip', () => {
    it('0032 AC-007 Tip: Use a new chat with a strong model. while tips show, with or without an offer; none with showStepTips off', async () => {
        const base = await modelOf({});
        const model = { ...base, project: { ...base.project, setupRun: 'not run' as const } };
        const tip = 'Tip: Use a new chat with a strong model.';
        expect(welcomeOf(model, { assistant: 'claudeCode' }, parseStepTipSettings(true, {}))).toEqual({ send: { assistant: 'claudeCode', target: 'new', targets: ['new'] }, coach: tip });
        expect(welcomeOf(model, undefined, parseStepTipSettings(true, {}))).toEqual({ coach: tip });
        expect(welcomeOf(model, undefined, parseStepTipSettings(false, {}))).toEqual({});
    });
});

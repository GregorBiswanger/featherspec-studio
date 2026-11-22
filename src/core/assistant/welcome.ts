import type { SendView } from '../../shared/protocol/assistant';
import type { WelcomeView } from '../../shared/protocol/overview';
import type { ShellModel } from '../ports/shell';
import { stepTips } from '../board/stepTips';
import type { StepTipSettings } from '../settings/stepTipSettings';
import type { Offer } from './offer';
import { plainSendViewOf } from './sendView';

export function emptySendOf(model: ShellModel, offer: Offer | undefined): SendView | undefined {
    if (model.project.setupRun === 'not run' || model.lifecycle.entries.length > 0) {
        return undefined;
    }
    return plainSendViewOf(offer);
}

export function welcomeOf(model: ShellModel, offer: Offer | undefined, tips?: StepTipSettings): WelcomeView | undefined {
    if (model.project.setupRun !== 'not run' || model.lifecycle.entries.length > 0) {
        return undefined;
    }
    const send = plainSendViewOf(offer);
    const coach = tips === undefined || !tips.show ? undefined : stepTips('NS-9', tips).coach;
    return { ...(send === undefined ? {} : { send }), ...(coach === undefined ? {} : { coach }) };
}

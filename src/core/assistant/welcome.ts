import type { WelcomeView } from '../../shared/protocol/overview';
import type { ShellModel } from '../ports/shell';
import type { Offer } from './offer';
import { plainSendViewOf } from './sendView';

export function welcomeOf(model: ShellModel, offer: Offer | undefined): WelcomeView | undefined {
    if (model.project.setupRun !== 'not run' || model.lifecycle.entries.length > 0) {
        return undefined;
    }
    const send = plainSendViewOf(offer);
    return send === undefined ? {} : { send };
}

import type { ProbeOutcome } from '../../shared/protocol/messages';

export interface ProbeChannelDeps {
    send(url: string): void;
    helloTimeoutMs: number;
    answerTimeoutMs: number;
    describe(): string;
}

export interface ProbeChannel {
    markReady(): void;
    markNotReady(): void;
    answer(outcome: ProbeOutcome): void;
    probe(url: string): Promise<ProbeOutcome>;
}

interface Pending {
    url: string;
    startedAt: number;
    sends: number;
    resolve(outcome: ProbeOutcome): void;
    reject(error: Error): void;
    timer: ReturnType<typeof setTimeout> | undefined;
}

export function createProbeChannel(deps: ProbeChannelDeps): ProbeChannel {
    let ready = false;
    let pending: Pending | undefined;

    function finish(): Pending | undefined {
        const current = pending;
        pending = undefined;
        if (current?.timer !== undefined) {
            clearTimeout(current.timer);
        }
        return current;
    }

    function arm(current: Pending): void {
        if (current.timer !== undefined) {
            clearTimeout(current.timer);
        }
        const waited = (): number => Date.now() - current.startedAt;
        if (ready) {
            current.sends += 1;
            current.timer = setTimeout(() => {
                finish();
                current.reject(
                    new Error(`The probe got no answer within ${deps.answerTimeoutMs} ms (hello seen, probe sent ${current.sends} time(s), ${waited()} ms since the call; ${deps.describe()})`),
                );
            }, deps.answerTimeoutMs);
            deps.send(current.url);
            return;
        }
        current.timer = setTimeout(() => {
            finish();
            current.reject(
                new Error(`The probe got no hello within ${deps.helloTimeoutMs} ms, so nothing was sent (${current.sends} send(s) before; ${deps.describe()})`),
            );
        }, deps.helloTimeoutMs);
    }

    return {
        markReady() {
            ready = true;
            if (pending !== undefined) {
                arm(pending);
            }
        },
        markNotReady() {
            ready = false;
            if (pending !== undefined) {
                arm(pending);
            }
        },
        answer(outcome) {
            finish()?.resolve(outcome);
        },
        probe(url) {
            finish()?.reject(new Error('The probe was replaced by a newer probe'));
            return new Promise<ProbeOutcome>((resolve, reject) => {
                pending = { url, startedAt: Date.now(), sends: 0, resolve, reject, timer: undefined };
                arm(pending);
            });
        },
    };
}

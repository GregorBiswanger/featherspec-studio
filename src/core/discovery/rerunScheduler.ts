import type { ClockPort, Disposable } from '../ports/host';

export interface RerunScheduler {
    trigger(): void;
    whenIdle(): Promise<void>;
    dispose(): void;
}

export interface RerunSchedulerOptions {
    clock: ClockPort;
    debounceMs: number;
    run: () => Promise<void>;
}

export function createRerunScheduler(options: RerunSchedulerOptions): RerunScheduler {
    let timer: Disposable | undefined;
    let running: Promise<void> | undefined;
    let pending = false;
    let disposed = false;

    function startRun(): void {
        const current: Promise<void> = (async () => {
            try {
                await options.run();
            } catch {
                return;
            }
        })().then(() => {
            if (running === current) {
                running = undefined;
            }
            if (pending && !disposed) {
                pending = false;
                startRun();
            }
        });
        running = current;
    }

    function fire(): void {
        timer = undefined;
        if (running !== undefined) {
            pending = true;
        } else {
            startRun();
        }
    }

    return {
        trigger() {
            if (disposed) {
                return;
            }
            timer?.dispose();
            timer = options.clock.setTimeout(fire, options.debounceMs);
        },
        async whenIdle() {
            while (running !== undefined) {
                await running;
            }
        },
        dispose() {
            disposed = true;
            pending = false;
            timer?.dispose();
            timer = undefined;
        },
    };
}

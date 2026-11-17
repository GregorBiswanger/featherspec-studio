import { createFakeRuntimeClock, type FakeRuntimeClock } from '../../../../core/runtime/testing/fakes';
import { createRecordingSink, type RecordingSink } from '../../fake/testing/recordingSink';
import type { CliLocation } from '../cliLocator';
import { createCopilotProvider, type CopilotProvider } from '../copilotProvider';
import { createScriptedClient, type ScriptedClient, type ScriptedClientOptions } from './scriptedClient';

export interface CopilotWorldOptions {
    client?: Omit<ScriptedClientOptions, 'clock'>;
    location?: CliLocation;
    model?: string;
    trusted?: boolean;
    folders?: readonly string[];
    baseDirectory?: string;
    platform?: string;
}

export interface CopilotWorld {
    clock: FakeRuntimeClock;
    scripted: ScriptedClient;
    provider: CopilotProvider;
    sink: RecordingSink;
    request(overrides?: { runId?: string; prompt?: string; model?: string }): { runId: string; workingDirectory: string; prompt: string; model?: string };
    settle(milliseconds?: number): Promise<void>;
}

export const ROOT = '/work/project';
export const CLI_PATH = '/usr/local/bin/copilot';

export async function flush(): Promise<void> {
    for (let index = 0; index < 8; index++) {
        await new Promise<void>((resolve) => setImmediate(resolve));
    }
}

export function createCopilotWorld(options: CopilotWorldOptions = {}): CopilotWorld {
    const clock = createFakeRuntimeClock();
    const scripted = createScriptedClient({ clock, ...options.client });
    const location: CliLocation = options.location ?? { kind: 'found', path: CLI_PATH, version: '1.0.87' };
    const provider = createCopilotProvider({
        clock,
        clientFactory: scripted.factory,
        locate: () => Promise.resolve(location),
        settings: { model: () => options.model ?? '' },
        baseDirectory: options.baseDirectory ?? '/storage/copilot-home',
        workspaceFolders: () => options.folders ?? [ROOT],
        platform: options.platform ?? 'linux',
        isTrusted: () => options.trusted ?? true,
    });
    const sink = createRecordingSink();
    return {
        clock,
        scripted,
        provider,
        sink,
        request: (overrides = {}) => {
            const base = { runId: overrides.runId ?? 'run-1', workingDirectory: ROOT, prompt: overrides.prompt ?? 'Implement the spec.' };
            return overrides.model === undefined ? base : { ...base, model: overrides.model };
        },
        async settle(milliseconds = 0) {
            await flush();
            clock.advance(milliseconds);
            await flush();
        },
    };
}

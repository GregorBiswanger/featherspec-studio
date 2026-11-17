import type { LifecycleEntry } from '../lifecycle/model';
import { judgeTransition, type Refusal } from '../lifecycle/transitions';
import type { SettingPort } from '../ports/host';
import type { ReadOnlyFileSystem } from '../ports/readOnlyFileSystem';
import type { ShellModelSource, TrustPort } from '../ports/shell';
import type { RunSource } from '../missionControl/runSource';
import type { ProviderEntry, ProviderRegistry } from '../providers/registry';
import type { ProviderService } from '../providers/providerService';
import type { AvailabilityResult } from '../providers/vocabulary';
import { OPEN_STATUSES, type StoreState } from '../runtime/model';

export type PreconditionId = 'P-1' | 'P-2' | 'P-3' | 'P-4' | 'P-5' | 'P-6' | 'P-7' | 'P-8';

export type PreconditionFailure =
    | { id: 'P-1'; kind: 'transition'; refusal: Refusal; text: string }
    | { id: 'P-1'; kind: 'no-entry' }
    | { id: 'P-1'; kind: 'several'; keys: string[] }
    | { id: 'P-2'; missing: string[] }
    | { id: 'P-3'; configured: string | undefined }
    | { id: 'P-4'; result: AvailabilityResult; reason?: string; hint?: string }
    | { id: 'P-5'; runId: string; stem: string }
    | { id: 'P-6'; state: StoreState['kind']; reason: string | undefined }
    | { id: 'P-7' }
    | { id: 'P-8'; stem: string };

export interface StartProvider {
    entry: ProviderEntry;
    model: string | undefined;
}

export interface PreconditionResult {
    entry?: LifecycleEntry;
    provider?: StartProvider;
    failures: PreconditionFailure[];
}

export interface PreconditionDeps {
    model: ShellModelSource;
    files: ReadOnlyFileSystem;
    setting: SettingPort;
    registry: Pick<ProviderRegistry, 'entry' | 'nextStartModel'>;
    providers: Pick<ProviderService, 'checkAvailability'>;
    runs: Pick<RunSource, 'read'>;
    session: { state(): StoreState };
    trust: TrustPort;
}

export const REQUIRED_FILES = ['.claude/commands/sdd-plan.md', '.claude/commands/sdd-lifecycle.md', '.claude/rules/plans.md'] as const;

const STEM_FORMAT = /^\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function missingFiles(deps: PreconditionDeps, root: string): Promise<string[]> {
    const missing: string[] = [];
    for (const path of REQUIRED_FILES) {
        let kind: string | undefined;
        try {
            kind = await deps.files.stat(root, path);
        } catch {
            kind = undefined;
        }
        if (kind !== 'file') {
            missing.push(path);
        }
    }
    return missing;
}

export async function checkPreconditions(deps: PreconditionDeps, stem: string): Promise<PreconditionResult> {
    const failures: PreconditionFailure[] = [];
    const model = deps.model.current();
    const matches = model?.lifecycle.entries.filter((candidate) => candidate.stem === stem) ?? [];
    let entry: LifecycleEntry | undefined;

    if (model === undefined || matches.length === 0) {
        failures.push({ id: 'P-1', kind: 'no-entry' });
    } else if (matches.length > 1) {
        failures.push({ id: 'P-1', kind: 'several', keys: matches.map((candidate) => candidate.key) });
    } else {
        entry = matches[0];
        const verdict = judgeTransition(model.lifecycle, entry.key, 'Active');
        if (!verdict.accepted) {
            failures.push({ id: 'P-1', kind: 'transition', refusal: verdict.refusal, text: verdict.text });
        }
    }

    if (model !== undefined) {
        const missing = await missingFiles(deps, model.project.root);
        if (missing.length > 0) {
            failures.push({ id: 'P-2', missing });
        }
    }

    const configured = deps.setting.read();
    const providerId = typeof configured === 'string' && configured.trim() !== '' ? configured : undefined;
    const registered = providerId === undefined ? undefined : deps.registry.entry(providerId);
    let provider: StartProvider | undefined;
    if (providerId === undefined || registered === undefined || registered.kind !== 'ok') {
        failures.push({ id: 'P-3', configured: providerId });
    } else {
        const next = deps.registry.nextStartModel(providerId);
        provider = { entry: registered.entry, model: next.kind === 'ok' ? next.model : undefined };
        const availability = await deps.providers.checkAvailability(providerId);
        if (availability.kind !== 'ok') {
            failures.push({ id: 'P-4', result: 'unknown', reason: availability.kind === 'failed' ? availability.reason : undefined });
        } else if (availability.result !== 'available') {
            failures.push({
                id: 'P-4',
                result: availability.result,
                ...(availability.reason === undefined ? {} : { reason: availability.reason }),
                ...(availability.hint === undefined ? {} : { hint: availability.hint }),
            });
        }
    }

    const state = deps.session.state();
    if (state.kind !== 'unavailable') {
        const runs = await deps.runs.read();
        if (runs.available) {
            const open = runs.runs.find((run) => (OPEN_STATUSES as readonly string[]).includes(run.status));
            if (open !== undefined) {
                failures.push({ id: 'P-5', runId: open.runId, stem: open.spec.stem });
            }
        }
    }
    if (state.kind !== 'writable') {
        failures.push({ id: 'P-6', state: state.kind, reason: state.reason });
    }
    if (!deps.trust.isTrusted()) {
        failures.push({ id: 'P-7' });
    }
    if (!STEM_FORMAT.test(stem)) {
        failures.push({ id: 'P-8', stem });
    }

    return { ...(entry === undefined ? {} : { entry }), ...(provider === undefined ? {} : { provider }), failures };
}

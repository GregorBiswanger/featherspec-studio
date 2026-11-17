import { ACTION_LABELS } from '../../shared/protocol/texts';
import { buildMergePrompt, gatherParkedFiles } from './mergePrompt';
import { formatSetupBlock, type SetupBlockInput } from './outputBlock';
import type { NoticeSink, RunResult, SetupServiceDeps, SetupTargetFolder } from './setupService';
import { archiveRefusedText, downloadFailedText, FINISH_TEXTS, nextStepWithKept, nextStepWithoutKept, OUTPUT_TEXTS, setUpMessage, stoppedMessage } from './setupTexts';

const COPY_SETUP_LABEL = 'Copy /sdd-setup';

async function parkedPrompt(deps: SetupServiceDeps, target: SetupTargetFolder): Promise<string | undefined> {
    try {
        const files = await gatherParkedFiles(deps.target, target.root);
        return files.length === 0 ? undefined : buildMergePrompt(target.path, files);
    } catch {
        return undefined;
    }
}

function writeBlock(deps: SetupServiceDeps, target: SetupTargetFolder, parts: Partial<SetupBlockInput> & { outcome: string }): void {
    deps.output.appendBlock(
        formatSetupBlock({
            when: deps.clock.now(),
            folder: target.path,
            version: undefined,
            tag: undefined,
            created: [],
            completed: [],
            kept: [],
            notWritten: [],
            keptSettingKeys: [],
            mergePrompt: undefined,
            nextStep: undefined,
            ...parts,
        }),
    );
}

export async function reportRun(deps: SetupServiceDeps, notices: NoticeSink, result: RunResult, retry: (root: string) => Promise<void>): Promise<void> {
    switch (result.kind) {
        case 'no-target':
            return;
        case 'cancelled':
            writeBlock(deps, result.target, { outcome: OUTPUT_TEXTS.outcomeCancelled });
            return;
        case 'declined':
            writeBlock(deps, result.target, { outcome: OUTPUT_TEXTS.outcomeCancelled, version: result.release.version, tag: result.release.tag });
            return;
        case 'download-failed':
            writeBlock(deps, result.target, { outcome: OUTPUT_TEXTS.outcomeDownloadFailed(result.reason) });
            notices.show(downloadFailedText(result.reason), [ACTION_LABELS.retry, ACTION_LABELS.openSetupGuide], async (choice) => {
                if (choice === ACTION_LABELS.retry) {
                    await retry(result.target.root);
                } else if (choice === ACTION_LABELS.openSetupGuide) {
                    await deps.actions.openSetupGuide();
                }
            });
            return;
        case 'archive-refused':
            writeBlock(deps, result.target, { outcome: OUTPUT_TEXTS.outcomeArchiveRefused(result.reason), ...(result.tag === undefined ? {} : { tag: result.tag }) });
            notices.show(archiveRefusedText(result.reason), [ACTION_LABELS.retry], async (choice) => {
                if (choice === ACTION_LABELS.retry) {
                    await retry(result.target.root);
                }
            });
            return;
        case 'applied':
            await reportApplied(deps, notices, result, retry);
    }
}

async function reportApplied(deps: SetupServiceDeps, notices: NoticeSink, result: Extract<RunResult, { kind: 'applied' }>, retry: (root: string) => Promise<void>): Promise<void> {
    const { target, release, outcome } = result;
    if (outcome.created.length + outcome.completed.length + outcome.kept.length > 0) {
        try {
            await deps.discovery.refresh();
        } catch {
            void 0;
        }
    }
    const common = { version: release.version, tag: release.tag, created: outcome.created, completed: outcome.completed, kept: outcome.kept, notWritten: outcome.notWritten, keptSettingKeys: outcome.keptSettingKeys };
    const mergePrompt = outcome.kept.length > 0 ? await parkedPrompt(deps, target) : undefined;
    if (outcome.stopped !== undefined) {
        const { path, reason } = outcome.stopped;
        writeBlock(deps, target, { ...common, outcome: OUTPUT_TEXTS.outcomeStopped(path, reason), ...(mergePrompt === undefined ? {} : { mergePrompt }) });
        notices.show(stoppedMessage(path, reason), [ACTION_LABELS.retry, ACTION_LABELS.showOutput], async (choice) => {
            if (choice === ACTION_LABELS.retry) {
                await retry(target.root);
            } else if (choice === ACTION_LABELS.showOutput) {
                deps.actions.showOutput();
            }
        });
        return;
    }
    const kept = outcome.kept.length;
    writeBlock(deps, target, {
        ...common,
        outcome: OUTPUT_TEXTS.outcomeSetUp,
        nextStep: kept === 0 ? nextStepWithoutKept() : nextStepWithKept(kept),
        ...(mergePrompt === undefined ? {} : { mergePrompt }),
    });
    const action = kept === 0 ? COPY_SETUP_LABEL : ACTION_LABELS.copyMergePrompt;
    notices.show(setUpMessage(release.version, target.name, kept), [action], async (choice) => {
        if (choice === COPY_SETUP_LABEL) {
            await deps.ui.copy(FINISH_TEXTS.copySetup);
        } else if (choice === ACTION_LABELS.copyMergePrompt) {
            const prompt = await parkedPrompt(deps, target);
            if (prompt !== undefined) {
                await deps.ui.copy(prompt);
            }
        }
    });
}

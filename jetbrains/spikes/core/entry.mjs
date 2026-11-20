import { nextStep, stepView } from '../../../src/core/board/nextStep';
import { stepTips } from '../../../src/core/board/stepTips';
import { deriveLifecycle } from '../../../src/core/lifecycle/deriveLifecycle';
import { parseStepTipSettings } from '../../../src/core/settings/stepTipSettings';
import { readProject } from '../../../src/core/specs/readProject';
import { createMemorySpecSource } from '../../../src/core/specs/testing/memorySpecSource';
import { readSnapshot } from '../../../src/core/specs/testing/readSnapshot';

const ROOT = 'memory://fixture';
const DEFAULT_SETTINGS = parseStepTipSettings(undefined, undefined);
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function decodeBase64(text) {
    const bytes = [];
    let buffer = 0;
    let bits = 0;
    for (const char of text.replace(/=+$/, '')) {
        buffer = ((buffer << 6) | ALPHABET.indexOf(char)) & 0xffffff;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            bytes.push((buffer >> bits) & 0xff);
        }
    }
    return new Uint8Array(bytes);
}

function plain(value) {
    return value === undefined ? null : JSON.parse(JSON.stringify(value));
}

export async function run(filesJson, version) {
    const files = JSON.parse(filesJson);
    const source = createMemorySpecSource();
    for (const [relativePath, base64] of Object.entries(files)) {
        source.setFile(ROOT, relativePath, decodeBase64(base64));
    }
    const project = await readProject(source, ROOT, version);
    const model = { project, lifecycle: deriveLifecycle(project) };
    const next = {};
    for (const entry of model.lifecycle.entries) {
        const step = nextStep(model, entry.key);
        next[entry.key] = {
            state: entry.state,
            rule: entry.rule,
            persistence: entry.persistence,
            nextStep: plain(step),
            stepView: plain(stepView(model, entry.key)),
            tips: step !== undefined && 'case' in step ? plain(stepTips(step.case, DEFAULT_SETTINGS, undefined, { version: model.project.version, ...(step.reason === undefined ? {} : { reason: step.reason }) })) : null,
        };
    }
    return JSON.stringify({ read: readSnapshot(project), next });
}

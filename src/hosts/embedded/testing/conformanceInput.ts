import { readVersionLine } from '../../../core/discovery/versionLine';
import { fromBase64 } from '../bridge';
import type { ConformanceInput } from '../conformance';

const AGENTS = 'AGENTS.md';

export const WEAK_INPUTS: readonly string[] = ['gen-200', 'repo-8052f9a', 'repo-f9cadb4'];

export function conformanceInput(name: string, files: Record<string, string>, syntheticAgentsBase64: string): ConformanceInput {
    const complete = WEAK_INPUTS.includes(name) && !(AGENTS in files) ? { ...files, [AGENTS]: syntheticAgentsBase64 } : files;
    const version = readVersionLine(new TextDecoder().decode(fromBase64(complete[AGENTS] ?? ''))).version;
    return { files: complete, version };
}

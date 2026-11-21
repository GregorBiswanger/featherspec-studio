import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createFakeAssistantHost } from '../core/assistant/testing/fakeAssistantHost';
import { createFakeHost, createFakeState } from '../core/discovery/testing/fakeHost';
import { createMemoryFileSystem } from '../core/discovery/testing/memoryFileSystem';
import { createFakeNotices, createFakeRuntimeClock, createSequentialIds } from '../core/runtime/testing/fakes';
import { createMemoryBacking, createMemoryMedium } from '../core/runtime/testing/memoryMedium';
import { openRuntimeStore } from '../core/runtime/runtimeStore';
import { createMemoryTarget } from '../core/setup/testing/memoryTarget';
import { scriptedHttp } from '../core/setup/testing/scriptedHttp';
import { createFakeFileWatch } from '../core/specs/testing/fakeFileWatch';
import { createMemorySpecSource } from '../core/specs/testing/memorySpecSource';
import { composeStudio, type HostPorts, type PanelPort } from './compose';

const ROOT = 'proj';
const SPEC = '# A spec\n\n**Status:** Draft\n**Plan:** _none yet_\n';
const NETWORK_REFERENCE = /from\s+'(?:node:)?(?:http|https|net|tls|http2|dgram|dns)'|require\('(?:node:)?(?:http|https|net|tls|http2|dgram|dns)'\)|\bfetch\(/;

interface FakePanel extends PanelPort {
    shown: number;
}

function createFakePanel(): FakePanel {
    const panel: FakePanel = {
        shown: 0,
        panelCount: () => 0,
        show: () => {
            panel.shown += 1;
        },
    };
    return panel;
}

function createTestPorts(panel: FakePanel): HostPorts<FakePanel> {
    const fileSystem = createMemoryFileSystem();
    const specSource = createMemorySpecSource();
    fileSystem.setFile(ROOT, 'AGENTS.md', 'FeatherSpecVersion: 1.10.0\n');
    fileSystem.setDirectory(ROOT, '.specs');
    specSource.setFile(ROOT, 'AGENTS.md', 'FeatherSpecVersion: 1.10.0\n');
    specSource.setDirectory(ROOT, '.specs');
    for (const folder of ['backlog', 'active', 'done']) {
        specSource.setDirectory(ROOT, `.specs/${folder}`);
    }
    specSource.setFile(ROOT, '.specs/active/0001-a-spec.md', SPEC);
    const host = createFakeHost([{ root: ROOT, name: ROOT }], createFakeState());
    const notStubbed = () => Promise.reject(new Error('not used in this test'));
    return {
        platform: 'linux',
        studioVersion: '0.0.0-test',
        fileSystem,
        specSource,
        folders: host.folders,
        workspaceState: host.state,
        uiMemory: () => ({ get: () => undefined, set: async () => undefined }),
        clock: host.clock,
        ui: host.ui,
        markerWatch: host.watch,
        fileWatch: createFakeFileWatch(),
        sameRoot: (first, second) => first === second,
        output: { ...host.output, show: () => undefined },
        statusItem: { show: () => undefined, hide: () => undefined },
        openStore: (projectRoot) =>
            openRuntimeStore({
                medium: createMemoryMedium(createMemoryBacking()),
                ids: createSequentialIds(),
                clock: createFakeRuntimeClock(),
                notices: createFakeNotices(),
                projectRoot,
            }),
        trust: () => ({ isTrusted: () => true, onDidGrant: () => ({ dispose: () => undefined }) }),
        http: scriptedHttp({}),
        archive: { read: notStubbed },
        setupTarget: createMemoryTarget(),
        setupUi: { pickTarget: notStubbed, confirm: notStubbed, withProgress: notStubbed, notify: notStubbed, copy: notStubbed },
        setting: () => ({ read: () => undefined, onDidChange: () => ({ dispose: () => undefined }) }),
        assistantHost: createFakeAssistantHost(),
        clipboard: { writeText: async () => undefined },
        stepUi: { pick: async () => undefined, inform: async () => undefined, warn: () => undefined },
        editor: { open: async () => 'not-found' },
        shellActions: {
            openFolder: notStubbed,
            openSetupGuide: notStubbed,
            showOutput: () => undefined,
            manageTrust: notStubbed,
            reloadPanel: () => undefined,
            setUp: notStubbed,
            copyMergePrompt: notStubbed,
        },
        openStudio: async () => undefined,
        createPanel: () => panel,
        earlierRunData: { state: { has: () => false, remove: async () => undefined } },
    };
}

describe('composeStudio (T-012 characterization)', () => {
    it('shows the project in the spec tree and the status entry after start', async () => {
        const panel = createFakePanel();
        const studio = composeStudio(createTestPorts(panel));
        await studio.start();
        await studio.controller.whenIdle();
        await studio.repository.whenIdle();
        expect(studio.treeService.model()).toMatchObject({ message: undefined, items: [{ children: [{ label: '0001 A spec' }] }] });
        expect(studio.entry.situation()).toMatchObject({ kind: 'current', project: { name: 'proj' }, spec: { label: '0001 A spec' } });
        expect(studio.panel).toBe(panel);
    });

    it('compose.ts reaches neither the network nor fetch (the network guard of 0014 covered it through extension.ts)', () => {
        const text = readFileSync(path.join(__dirname, 'compose.ts'), 'utf8');
        expect(NETWORK_REFERENCE.test(text)).toBe(false);
    });

    it('negative control: the same pattern finds a network import and a fetch call', () => {
        expect(NETWORK_REFERENCE.test("import { request } from 'node:https';")).toBe(true);
        expect(NETWORK_REFERENCE.test('const response = await fetch(url);')).toBe(true);
    });
});

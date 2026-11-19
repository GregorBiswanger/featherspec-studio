import { describe, expect, it } from 'vitest';
import { buildDetail } from '../board/detail';
import { projectNow } from '../overview/rows';
import { createSpecResolver } from '../overview/specRefs';
import { createModelSource } from '../shell/modelSource';
import { addProject, createShellWorld, SPEC_HEADER } from '../shell/testing/world';
import { parseStepTipSettings } from '../settings/stepTipSettings';
import { createFakeOffer } from './testing/fakeOffer';
import { createAttachmentCheck } from './attachment';
import { createSend } from './send';
import { createFakeAssistantHost } from './testing/fakeAssistantHost';
import { createSetupClock } from '../setup/testing/setupClock';
import { createMemorySpecSource } from '../specs/testing/memorySpecSource';

describe('0024 AC-011: the views hold for the value the host returns, in a trusted and in a Restricted window alike', () => {
    async function views(trusted: boolean, assistant: 'copilot' | 'claudeCode') {
        const world = createShellWorld({ trusted });
        try {
            addProject(world, 'proj', { '.specs/active/0001-a.md': SPEC_HEADER('In Progress'), '.specs/backlog/0002-b.md': SPEC_HEADER('Draft') });
            await world.controller.start();
            await world.settle();
            const model = createModelSource(world.repository).current();
            if (model === undefined) {
                throw new Error('no model');
            }
            const offer = createFakeOffer({ assistant }).read();
            const tips = parseStepTipSettings(true, {});
            const detail = buildDetail({ selection: { stem: '0001-a' }, model, history: { available: true, label: 'x', entries: [] }, tips, ...(offer === undefined ? {} : { offer }) });
            const now = projectNow(model, createSpecResolver(model), tips, offer);
            return { detail, now };
        } finally {
            world.dispose();
        }
    }

    for (const assistant of ['copilot', 'claudeCode'] as const) {
        it(`${assistant}: detail and first Now row are equal with trust on and off, and both carry the send view`, async () => {
            const trusted = await views(true, assistant);
            const restricted = await views(false, assistant);
            expect(restricted).toEqual(trusted);
            expect(trusted.detail.kind === 'spec' && 'send' in trusted.detail.nextStep).toBe(true);
            expect(trusted.now.rows[0]?.send?.assistant).toBe(assistant);
        });
    }

    it('negative control: another assistant gives another view', async () => {
        expect(await views(true, 'copilot')).not.toEqual(await views(true, 'claudeCode'));
    });
});

describe('0026 AC-014: Now and the Send target need neither trust nor a writer', () => {
    it('the core files of the cap, the order, the day and the target name no trust, writer, Restricted Mode or reader window', async () => {
        const { promises: fs } = await import('node:fs');
        const path = await import('node:path');
        for (const file of ['overview/rows.ts', 'board/lastChange.ts', 'assistant/sendView.ts']) {
            const source = await fs.readFile(path.resolve(process.cwd(), 'src', 'core', ...file.split('/')), 'utf8');
            expect(source, file).not.toMatch(/trust|writer|restricted|\breader\b/i);
        }
        expect('const restricted = true;').toMatch(/restricted/i);
    });
});

describe('0027 AC-013: the attachment holds in a trusted and in a Restricted window alike', () => {
    async function attached(trusted: boolean, assistant: 'copilot' | 'claudeCode') {
        const world = createShellWorld({ trusted });
        try {
            addProject(world, 'proj', { '.specs/backlog/0002-b.md': SPEC_HEADER('Draft') });
            world.discoveryFs.setFile('proj', 'AGENTS.md', 'FeatherSpecVersion: 1.11.0\n');
            world.specs.setFile('proj', 'AGENTS.md', 'FeatherSpecVersion: 1.11.0\n');
            await world.controller.start();
            await world.settle();
            const source = createModelSource(world.repository);
            const model = source.current();
            if (model === undefined) {
                throw new Error('no model');
            }
            const offer = createFakeOffer({ assistant }, { attaching: () => true }).read()!;
            const tips = parseStepTipSettings(true, {});
            const detail = buildDetail({ selection: { stem: '0002-b' }, model, history: { available: true, label: 'x', entries: [] }, tips, offer });
            const host = createFakeAssistantHost(['workbench.action.chat.newChat', 'workbench.action.chat.open', 'claude-vscode.editor.open']);
            host.install('GitHub.copilot-chat');
            host.install('anthropic.claude-code');
            const memory = createMemorySpecSource();
            memory.setFile(model.project.root, '.specs/backlog/0002-b.md', 'x');
            const sender = createSend({
                host,
                clipboard: { writeText: async () => undefined },
                ui: { warn: () => undefined },
                output: { appendBlock: () => undefined },
                clock: createSetupClock(),
                platform: 'linux',
                chosen: { read: () => assistant },
                attachment: createAttachmentCheck({ source, specs: memory, host }),
                attaching: () => true,
            });
            const send = detail.kind === 'spec' && 'send' in detail.nextStep ? detail.nextStep.send : undefined;
            const result = await sender.send({ assistant, target: 'new', line: '/sdd-specify .specs/backlog/0002-b.md', ...(send?.attach === undefined ? {} : { attach: send.attach.path }) });
            return { send, result, calls: JSON.stringify(host.calls).replace(/"root":"[^"]*"/g, '"root":"r"') };
        } finally {
            world.dispose();
        }
    }

    for (const assistant of ['copilot', 'claudeCode'] as const) {
        it(`${assistant}: the view, the Send outcome and the calls are equal with trust on and off, and the spec is attached`, async () => {
            const trusted = await attached(true, assistant);
            const restricted = await attached(false, assistant);
            expect(restricted).toEqual(trusted);
            expect(trusted.send?.attach).toEqual({ name: '0002-b.md', path: '.specs/backlog/0002-b.md' });
            expect(trusted.result.outcome).toBe('opened');
            expect(trusted.calls).toContain(assistant === 'copilot' ? 'attachFiles' : '@.specs/backlog/0002-b.md');
        });
    }

    it('negative control: without the attaching table Copilot attaches nothing in the same world', async () => {
        const world = createShellWorld();
        try {
            addProject(world, 'proj', { '.specs/backlog/0002-b.md': SPEC_HEADER('Draft') });
            world.discoveryFs.setFile('proj', 'AGENTS.md', 'FeatherSpecVersion: 1.11.0\n');
            world.specs.setFile('proj', 'AGENTS.md', 'FeatherSpecVersion: 1.11.0\n');
            await world.controller.start();
            await world.settle();
            const model = createModelSource(world.repository).current()!;
            const detail = buildDetail({ selection: { stem: '0002-b' }, model, history: { available: true, label: 'x', entries: [] }, offer: { assistant: 'copilot' } });
            expect(detail.kind === 'spec' && 'send' in detail.nextStep ? detail.nextStep.send?.attach : 'x').toBeUndefined();
        } finally {
            world.dispose();
        }
    });
});

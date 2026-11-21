import { afterEach, describe, expect, it } from 'vitest';
import type { Disposable } from '../core/ports/host';
import { createShellWorld, type ShellWorld } from '../core/shell/testing/world';
import type { BoardView } from '../shared/protocol/board';
import type { DetailView, OpenFileResultPayload } from '../shared/protocol/detail';
import type { OverviewView } from '../shared/protocol/overview';
import { sampleView } from '../shared/protocol/testing/overviewSample';
import { PROTOCOL_VERSION, type Envelope } from '../shared/protocol/envelope';
import type { SendResultEventPayload } from '../shared/protocol/assistant';
import type { CopyResultEventPayload, ProbeOutcome } from '../shared/protocol/messages';
import { ignoredMessageLine } from '../shared/protocol/texts';
import { createPanelSession, type PanelBoard, type PanelOverview, type PanelSessionDeps } from './panelSession';

interface Emitter<Value> {
    on(listener: (value: Value) => void): Disposable;
    fire(value: Value): void;
    count(): number;
}

function emitter<Value>(): Emitter<Value> {
    const listeners = new Set<(value: Value) => void>();
    return {
        on(listener) {
            listeners.add(listener);
            return {
                dispose() {
                    listeners.delete(listener);
                },
            };
        },
        fire(value) {
            [...listeners].forEach((listener) => listener(value));
        },
        count: () => listeners.size,
    };
}

const noop = async () => undefined;
const BOARD: BoardView = { columns: [], banner: { problems: [], notes: [] }, filter: {}, sort: 'number', sortKeys: ['number'], noSpecs: true, planSpecs: [] };
const DETAIL: DetailView = { kind: 'none' };

function label(message: Envelope): string {
    if (message.kind === 'res') {
        return 'res';
    }
    return message.type === 'shell' ? `shell:${message.seq}` : message.type;
}

function hello(lastSeq: number): unknown {
    return { v: PROTOCOL_VERSION, kind: 'req', id: 'h1', type: 'hello', payload: { lastSeq } };
}

function createHarness(testMode = false) {
    const world = createShellWorld();
    const posts: Envelope[] = [];
    const output: string[] = [];
    const calls: string[] = [];
    const probeOutcomes: ProbeOutcome[] = [];
    const boardChanges = emitter<BoardView | undefined>();
    const boardDetails = emitter<DetailView>();
    const overviewChanges = emitter<OverviewView | undefined>();
    const service: PanelSessionDeps['service'] = {
        handlers: world.service.handlers,
        shellEvent: () => world.service.shellEvent(),
        panelReady: () => {
            calls.push('panelReady');
            world.service.panelReady();
        },
        panelGone: () => {
            calls.push('panelGone');
            world.service.panelGone();
        },
        onDidChangeView: (listener) => world.service.onDidChangeView(listener),
    };
    const board: PanelBoard = {
        handlers: { boardSetSort: noop, boardSetDone: noop, boardClearFilters: noop, openFile: noop, copyText: noop, sendPrompt: noop },
        view: () => BOARD,
        detail: () => DETAIL,
        onDidChangeView: boardChanges.on,
        onDidChangeDetail: boardDetails.on,
        onDidOpenFileResult: emitter<OpenFileResultPayload>().on,
        onDidCopyResult: emitter<CopyResultEventPayload>().on,
        onDidSendResult: emitter<SendResultEventPayload>().on,
        panelClosed: () => {
            calls.push('board.panelClosed');
        },
    };
    const overview: PanelOverview = {
        handlers: { overviewSetActivity: noop },
        view: () => sampleView(),
        onDidChangeView: overviewChanges.on,
    };
    const session = createPanelSession({
        service,
        board,
        overview,
        output: { appendBlock: (lines) => output.push(...lines) },
        post: (message) => posts.push(message),
        testMode,
        onHello: () => calls.push('onHello'),
        onProbeResult: (outcome) => probeOutcomes.push(outcome),
    });
    return { world, session, posts, output, calls, probeOutcomes, boardChanges };
}

async function flush(): Promise<void> {
    await new Promise<void>((resolve) => setImmediate(resolve));
}

describe('createPanelSession (T-013 characterization)', () => {
    const worlds: ShellWorld[] = [];

    afterEach(() => {
        worlds.splice(0).forEach((world) => world.dispose());
    });

    function open(testMode?: boolean) {
        const harness = createHarness(testMode);
        worlds.push(harness.world);
        return harness;
    }

    it('hello at lastSeq 5 posts the shell at seq 6, then the board, the overview and the detail, then the response', async () => {
        const harness = open();
        harness.session.attach();
        harness.session.receive(hello(5));
        await flush();
        expect(harness.posts.map(label)).toEqual(['shell:6', 'board', 'overview', 'detail', 'res']);
        expect(harness.calls).toEqual(['panelReady', 'onHello']);
        expect(harness.session.lastHelloAt()).toEqual(expect.any(Number));
    });

    it('a board view change posts one board envelope and nothing else', async () => {
        const harness = open();
        harness.session.attach();
        harness.boardChanges.fire({ ...BOARD, sort: 'title' });
        expect(harness.posts.map(label)).toEqual(['board']);
    });

    it('detach stops the listeners, then calls panelGone and panelClosed', () => {
        const harness = open();
        harness.session.attach();
        harness.session.detach();
        expect(harness.calls).toEqual(['panelGone', 'board.panelClosed']);
        expect(harness.boardChanges.count()).toBe(0);
        harness.boardChanges.fire(BOARD);
        expect(harness.posts).toEqual([]);
    });

    it('an unknown message type is ignored with one output line and posts nothing', async () => {
        const harness = open();
        harness.session.attach();
        harness.session.receive({ v: PROTOCOL_VERSION, kind: 'req', id: 'u1', type: 'nope', payload: {} });
        await flush();
        expect(harness.output).toEqual([ignoredMessageLine('nope', 'unknown message type')]);
        expect(harness.posts).toEqual([]);
    });

    it('in test mode a probe result is answered and not routed', async () => {
        const harness = open(true);
        harness.session.attach();
        harness.session.receive({ v: PROTOCOL_VERSION, kind: 'evt', type: 'probeResult', payload: { outcome: 'loaded' } });
        await flush();
        expect(harness.probeOutcomes).toEqual(['loaded']);
        expect(harness.output).toEqual([]);
    });

    it('outside test mode the same probe result is not answered and is ignored as not a request', async () => {
        const harness = open(false);
        harness.session.attach();
        harness.session.receive({ v: PROTOCOL_VERSION, kind: 'evt', type: 'probeResult', payload: { outcome: 'loaded' } });
        await flush();
        expect(harness.probeOutcomes).toEqual([]);
        expect(harness.output).toEqual([ignoredMessageLine('probeResult', 'not a request')]);
    });
});

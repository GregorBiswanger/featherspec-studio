import type {
    ClockPort,
    Disposable,
    MarkerWatchPort,
    NotificationAction,
    NotificationModel,
    OutputPort,
    SelectItem,
    StatusBarPort,
    UiPort,
    WorkspaceFolderInfo,
    WorkspaceFoldersPort,
    WorkspaceStatePort,
} from '../../ports/host';

export interface FakeStatusBar extends StatusBarPort {
    current: { text: string } | undefined;
    shown: string[];
}

export interface FakeOutput extends OutputPort {
    blocks: string[][];
}

export interface FakeState extends WorkspaceStatePort {
    value: string | undefined;
    writes: string[];
}

export interface FakeFolders extends WorkspaceFoldersPort {
    folders: WorkspaceFolderInfo[];
    change(next: WorkspaceFolderInfo[]): void;
}

export interface FakeUi extends UiPort {
    pickCalls: SelectItem[][];
    notifications: NotificationModel[];
    opened: string[];
    pickAnswer: (items: readonly SelectItem[]) => string | undefined;
    notificationAnswer: NotificationAction | undefined;
    callCount(): number;
}

export interface FakeClock extends ClockPort {
    advance(milliseconds: number): void;
    pendingTimers(): number;
}

export interface FakeMarkerWatch extends MarkerWatchPort {
    watched(): string[];
    fire(root: string): void;
}

export interface FakeHost {
    ui: FakeUi;
    watch: FakeMarkerWatch;
    statusBar: FakeStatusBar;
    output: FakeOutput;
    state: FakeState;
    folders: FakeFolders;
    clock: FakeClock;
}

export function createFakeState(initial?: string): FakeState {
    const state: FakeState = {
        value: initial,
        writes: [],
        get: () => state.value,
        async set(root) {
            state.value = root;
            state.writes.push(root);
        },
    };
    return state;
}

export function createFakeHost(folders: WorkspaceFolderInfo[], state: FakeState = createFakeState()): FakeHost {
    const statusBar: FakeStatusBar = {
        current: undefined,
        shown: [],
        show(text) {
            statusBar.current = { text };
            statusBar.shown.push(text);
        },
        hide() {
            statusBar.current = undefined;
        },
    };
    const output: FakeOutput = {
        blocks: [],
        appendBlock(lines) {
            output.blocks.push([...lines]);
        },
    };
    const listeners = new Set<() => void>();
    const folderPort: FakeFolders = {
        folders,
        list: () => folderPort.folders,
        onDidChange(listener): Disposable {
            listeners.add(listener);
            return { dispose: () => listeners.delete(listener) };
        },
        change(next) {
            folderPort.folders = next;
            listeners.forEach((listener) => listener());
        },
    };
    const ui: FakeUi = {
        pickCalls: [],
        notifications: [],
        opened: [],
        pickAnswer: () => undefined,
        notificationAnswer: undefined,
        callCount: () => ui.pickCalls.length + ui.notifications.length + ui.opened.length,
        async showQuickPick(items) {
            ui.pickCalls.push([...items]);
            const root = ui.pickAnswer(items);
            return items.find((item) => item.root === root);
        },
        async showNotification(model) {
            ui.notifications.push(model);
            return ui.notificationAnswer;
        },
        async openExternal(url) {
            ui.opened.push(url);
        },
    };
    let tick = 0;
    let time = 0;
    const timers = new Map<number, { due: number; callback: () => void }>();
    let nextTimer = 0;
    const clock: FakeClock = {
        now: () => `t${++tick}`,
        setTimeout(callback, milliseconds) {
            const id = nextTimer++;
            timers.set(id, { due: time + milliseconds, callback });
            return { dispose: () => timers.delete(id) };
        },
        advance(milliseconds) {
            const target = time + milliseconds;
            for (;;) {
                const next = [...timers.entries()].filter(([, timer]) => timer.due <= target).sort((a, b) => a[1].due - b[1].due)[0];
                if (next === undefined) {
                    break;
                }
                timers.delete(next[0]);
                time = Math.max(time, next[1].due);
                next[1].callback();
            }
            time = target;
        },
        pendingTimers: () => timers.size,
    };
    const watchers: { root: string; listener: () => void }[] = [];
    const watch: FakeMarkerWatch = {
        watch(root, listener) {
            const registration = { root, listener };
            watchers.push(registration);
            return { dispose: () => void watchers.splice(watchers.indexOf(registration), 1) };
        },
        watched: () => watchers.map((registration) => registration.root),
        fire(root) {
            watchers.filter((registration) => registration.root === root).forEach((registration) => registration.listener());
        },
    };
    return { statusBar, output, state, folders: folderPort, clock, ui, watch };
}

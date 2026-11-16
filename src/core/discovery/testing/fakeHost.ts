import type {
    ClockPort,
    Disposable,
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

export interface FakeHost {
    ui: FakeUi;
    statusBar: FakeStatusBar;
    output: FakeOutput;
    state: FakeState;
    folders: FakeFolders;
    clock: ClockPort;
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
    const clock: ClockPort = { now: () => `t${++tick}` };
    return { statusBar, output, state, folders: folderPort, clock, ui };
}

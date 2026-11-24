package com.gregorbiswanger.featherspec.studio.runtime

val ASYNC_CALLS: List<String> = listOf(
    "source.list", "source.stat", "source.readBytes", "source.scan",
    "fs.stat", "fs.readText", "fs.readDirectory",
    "medium.open", "medium.read", "medium.lines", "medium.append", "medium.replace", "medium.createExclusive", "medium.remove", "medium.list",
    "memory.set",
    "watch.add", "watch.remove",
    "target.kind", "target.readBytes", "target.listDirectory", "target.createExclusive", "target.replaceIfUnchanged", "target.clearSetupFolder",
    "http.get", "archive.read",
    "ui.pick", "ui.notify", "ui.confirm", "ui.progressStart", "ui.openExternal",
    "clipboard.write", "editor.open",
    "assistant.terminal",
    "actions.openSetupGuide", "actions.manageTrust", "actions.openStudio", "actions.reloadPanel",
)

val EMIT_CHANNELS: List<String> = listOf("panel", "tree", "status", "log", "warn", "progressEnd", "showOutput")

val DISPATCH_EVENTS: List<String> = listOf(
    "panelMessage", "panelOpened", "panelClosed", "fileChanged", "markerChanged", "foldersChanged", "trustGranted", "settingsChanged", "pluginsChanged", "progressCancelled",
)

val INVOKE_COMMANDS: List<String> = listOf(
    "open", "refresh", "copyNextStep", "setup", "copyMergePrompt", "selectProject", "shellAction",
    "tree.select", "tree.copy", "tree.openSpec", "tree.openPlan", "tree.showInPlanMap", "panelHtml", "diagnostics",
    "budget.read", "budget.update", "budget.discover",
)

val FRAME_KINDS: List<String> = listOf("call", "calls", "emit", "reply", "ready", "failed")

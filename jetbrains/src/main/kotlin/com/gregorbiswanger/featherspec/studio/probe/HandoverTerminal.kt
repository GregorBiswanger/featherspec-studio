package com.gregorbiswanger.featherspec.studio.probe

import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.gregorbiswanger.featherspec.studio.assistant.Screen
import com.gregorbiswanger.featherspec.studio.assistant.TerminalGlue
import com.gregorbiswanger.featherspec.studio.assistant.TerminalTab
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindowManager
import com.intellij.terminal.frontend.toolwindow.TerminalToolWindowTabsManager

object HandoverTerminal {
    private const val TERMINAL_WINDOW_ID = "Terminal"
    private const val TAB_NAME = "Claude Code"
    private const val COMMAND = "claude"
    private const val PASTE = "probe @README.md"
    private const val SHELL_WAIT_MS = 20_000L
    private const val READY_WAIT_MS = 30_000L
    private const val QUIET_MS = 1_000L
    private const val AFTER_PASTE_MS = 2_000L
    private const val POLL_MS = 100L
    private val MARKERS = listOf("Claude Code", "? for shortcuts", "Welcome", "Tip:", "bypass permissions", "╭", "│ >")

    private class Snapshot(val text: String, val altLength: Long, val blockRunning: Boolean, val blockSeen: Boolean, val status: String)

    fun tabs(project: Project): JsonArray {
        val manager = TerminalToolWindowTabsManager.getInstance(project)
        return HandoverReflect.onEdt {
            val array = JsonArray()
            for (tab in manager.tabs) {
                array.add(HandoverReflect.safe { describe(tab as Any) })
            }
            array
        }
    }

    fun screens(project: Project): JsonObject {
        val result = JsonObject()
        val home = System.getProperty("user.home")
        val glue = TerminalGlue(project)
        result.add(
            "screens",
            HandoverReflect.safe {
                val array = JsonArray()
                for (tab in glue.tabs()) {
                    array.add(HandoverReflect.safe { screenOf(glue, tab, home) })
                }
                array
            },
        )
        return result
    }

    private fun screenOf(glue: TerminalGlue, tab: TerminalTab, home: String?): JsonObject {
        val name = runCatching {
            HandoverReflect.onEdt { HandoverReflect.call(HandoverReflect.call(tab.key, "getContent")!!, "getDisplayName")?.toString() }
        }.getOrNull()
        var screen: Screen? = null
        var failure: String? = null
        try {
            screen = glue.screen(tab.key)
        } catch (error: Throwable) {
            failure = HandoverReflect.unavailable(error)
        }
        return HandoverScreen.tab(tab, name, screen, failure, home)
    }

    fun claudeTab(project: Project): JsonObject {
        val result = JsonObject()
        val steps = JsonObject()
        result.add("steps", steps)
        val manager = TerminalToolWindowTabsManager.getInstance(project)
        steps.add("tabsBefore", HandoverReflect.safe { HandoverReflect.onEdt { manager.tabs.size } })
        val tab = HandoverReflect.onEdt { createTab(manager, project, steps) }
        val view = HandoverReflect.call(tab, "getView")!!
        HandoverReflect.onEdt { steps.add("showTerminalWindow", HandoverReflect.safe { showWindow(project) }) }

        val started = System.nanoTime()
        val shellMs = awaitShell(view, started)
        steps.add("shellIntegrationReadyMs", HandoverReflect.element(shellMs))

        val sentAt = System.nanoTime()
        steps.add("sendCommand", HandoverReflect.safe { HandoverReflect.onEdt { send(view, COMMAND, execute = true, bracketed = false) }; COMMAND })
        val readiness = observeReadiness(view, sentAt)
        result.add("readinessCandidates", readiness.first)
        steps.add("pasteSentBecause", HandoverReflect.element(readiness.second))
        result.addProperty("beforePasteTail", tail(snapshot(view).text))

        steps.add("sendPaste", HandoverReflect.safe { HandoverReflect.onEdt { send(view, PASTE, execute = false, bracketed = true) }; PASTE })
        Thread.sleep(AFTER_PASTE_MS)
        val after = snapshot(view)
        result.addProperty("afterPasteTail", tail(after.text))
        result.addProperty("pastedTextVisible", after.text.contains(PASTE))
        result.add("tabAfter", HandoverReflect.safe { HandoverReflect.onEdt { describe(tab) } })
        return result
    }

    private fun createTab(manager: TerminalToolWindowTabsManager, project: Project, steps: JsonObject): Any {
        var builder: Any = manager.createTabBuilder()
        val options = JsonObject()
        steps.add("builderCalls", options)
        builder = chain(builder, "workingDirectory", project.basePath, options)
        builder = chain(builder, "tabName", TAB_NAME, options)
        builder = chain(builder, "requestFocus", true, options)
        return HandoverReflect.call(builder, "createTab")!!
    }

    private fun chain(builder: Any, name: String, value: Any?, record: JsonObject): Any = try {
        val next = HandoverReflect.call(builder, name, value) ?: builder
        record.addProperty(name, "ok")
        next
    } catch (failure: Throwable) {
        record.addProperty(name, HandoverReflect.unavailable(failure))
        builder
    }

    private fun showWindow(project: Project): String {
        val window = ToolWindowManager.getInstance(project).getToolWindow(TERMINAL_WINDOW_ID) ?: return "unavailable: no tool window $TERMINAL_WINDOW_ID"
        window.activate(null)
        return "ok"
    }

    private fun awaitShell(view: Any, startedNanos: Long): Any {
        val deadline = startedNanos + SHELL_WAIT_MS * 1_000_000L
        var state = "pending"
        while (System.nanoTime() < deadline) {
            state = runCatching { HandoverReflect.onEdt { shellState(view).first } }.getOrElse { HandoverReflect.unavailable(it) }
            if (state != "pending") {
                return "$state after ${(System.nanoTime() - startedNanos) / 1_000_000L}"
            }
            Thread.sleep(POLL_MS)
        }
        return "$state after $SHELL_WAIT_MS (timeout)"
    }

    private fun observeReadiness(view: Any, sentNanos: Long): Pair<JsonObject, String> {
        val markerMs = LinkedHashMap<String, Long>()
        var commandBlockMs: Long? = null
        var altBufferMs: Long? = null
        var quietMs: Long? = null
        var quietAfterMarkerMs: Long? = null
        var firstOutputMs: Long? = null
        var lastLength = -1
        var lastChangeMs = 0L
        var baseline = -1
        var because = "timeout ${READY_WAIT_MS}ms"
        while (true) {
            val elapsed = (System.nanoTime() - sentNanos) / 1_000_000L
            val now = runCatching { HandoverReflect.onEdt { snapshot(view) } }.getOrNull()
            if (now != null) {
                if (baseline < 0) {
                    baseline = now.text.length
                    lastLength = now.text.length
                    lastChangeMs = elapsed
                }
                if (now.text.length != lastLength) {
                    lastLength = now.text.length
                    lastChangeMs = elapsed
                    if (firstOutputMs == null) {
                        firstOutputMs = elapsed
                    }
                }
                if (commandBlockMs == null && now.blockRunning) {
                    commandBlockMs = elapsed
                }
                if (altBufferMs == null && now.altLength > 0) {
                    altBufferMs = elapsed
                }
                for (marker in MARKERS) {
                    if (marker !in markerMs && now.text.contains(marker)) {
                        markerMs[marker] = elapsed
                    }
                }
                if (quietMs == null && firstOutputMs != null && elapsed - lastChangeMs >= QUIET_MS) {
                    quietMs = elapsed
                }
                if (quietAfterMarkerMs == null && markerMs.isNotEmpty() && elapsed - lastChangeMs >= QUIET_MS && lastChangeMs >= markerMs.values.min()) {
                    quietAfterMarkerMs = elapsed
                    because = "quiet ${QUIET_MS}ms after first marker"
                }
            }
            if (quietAfterMarkerMs != null || elapsed >= READY_WAIT_MS) {
                break
            }
            Thread.sleep(POLL_MS)
        }
        val json = JsonObject()
        json.add("firstOutputMs", HandoverReflect.element(firstOutputMs))
        json.add("commandBlockStartedMs", HandoverReflect.element(commandBlockMs))
        json.add("alternateBufferMs", HandoverReflect.element(altBufferMs))
        json.add("outputQuiet1sMs", HandoverReflect.element(quietMs))
        json.add("quietAfterFirstMarkerMs", HandoverReflect.element(quietAfterMarkerMs))
        val markers = JsonObject()
        MARKERS.forEach { markers.add(it, HandoverReflect.element(markerMs[it])) }
        json.add("markerFirstSeenMs", markers)
        return json to because
    }

    private fun snapshot(view: Any): Snapshot = HandoverReflect.onEdt {
        val text = regularText(view)
        val alt = runCatching { textLength(model(view, "getAlternative")) }.getOrDefault(-1L)
        val blocks = runCatching { lastBlocks(view) }.getOrDefault(emptyList())
        val running = blocks.any { executedCommand(it)?.contains(COMMAND) == true && outputStarted(it) && exitCode(it) == null }
        val seen = blocks.any { executedCommand(it)?.contains(COMMAND) == true }
        val status = runCatching { outputStatus(view) }.getOrDefault("")
        Snapshot(text, alt, running, seen, status)
    }

    private fun describe(tab: Any): JsonObject {
        val view = HandoverReflect.call(tab, "getView")!!
        val entry = JsonObject()
        entry.add("name", HandoverReflect.safe { HandoverReflect.call(HandoverReflect.call(tab, "getContent")!!, "getDisplayName") })
        entry.add("viewTitle", HandoverReflect.safe { HandoverReflect.call(view, "getTitle") })
        entry.add("shellIntegration", HandoverReflect.safe { shellState(view).first })
        entry.add("outputStatus", HandoverReflect.safe { outputStatus(view) })
        entry.add("workingDirectory", HandoverReflect.safe { workingDirectory(view) })
        entry.add("sessionState", HandoverReflect.safe { stateValue(HandoverReflect.call(view, "getSessionState")) })
        entry.add("closeOnProcessTermination", HandoverReflect.safe { HandoverReflect.call(tab, "getCloseOnProcessTermination") })
        entry.add(
            "lastBlocks",
            HandoverReflect.safe {
                val array = JsonArray()
                for (block in lastBlocks(view)) {
                    val item = JsonObject()
                    item.add("executedCommand", HandoverReflect.element(executedCommand(block)))
                    item.add("workingDirectory", HandoverReflect.safe { HandoverReflect.call(block, "getWorkingDirectory") })
                    item.add("exitCode", HandoverReflect.element(exitCode(block)))
                    item.addProperty("outputStarted", outputStarted(block))
                    array.add(item)
                }
                array
            },
        )
        entry.add("alternateBufferLength", HandoverReflect.safe { textLength(model(view, "getAlternative")) })
        entry.add("tail", HandoverReflect.safe { tail(regularText(view)) })
        return entry
    }

    private fun shellState(view: Any): Pair<String, Any?> {
        val deferred = HandoverReflect.call(view, "getShellIntegrationDeferred")!!
        val completed = HandoverReflect.call(deferred, "isCompleted") as Boolean
        if (!completed) {
            return "pending" to null
        }
        val cancelled = HandoverReflect.call(deferred, "isCancelled") as Boolean
        if (cancelled) {
            return "failed" to null
        }
        return "ready" to HandoverReflect.call(deferred, "getCompleted")
    }

    private fun outputStatus(view: Any): String {
        val integration = shellState(view).second ?: return "no shell integration"
        return stateValue(HandoverReflect.call(integration, "getOutputStatus")).toString()
    }

    private fun lastBlocks(view: Any): List<Any> {
        val integration = shellState(view).second ?: return emptyList()
        val model = HandoverReflect.call(integration, "getBlocksModel")!!
        val blocks = HandoverReflect.call(model, "getBlocks") as List<*>
        return blocks.filterNotNull().takeLast(3)
    }

    private fun executedCommand(block: Any): String? = runCatching { HandoverReflect.call(block, "getExecutedCommand") as String? }.getOrNull()

    private fun exitCode(block: Any): Int? = runCatching { HandoverReflect.call(block, "getExitCode") as Int? }.getOrNull()

    private fun outputStarted(block: Any): Boolean = runCatching { HandoverReflect.call(block, "getOutputStartOffset") != null }.getOrDefault(false)

    private fun workingDirectory(view: Any): Any? {
        val flow = runCatching { HandoverReflect.call(view, "getWorkingDirectoryFlow") }.getOrNull()
        if (flow != null) {
            return stateValue(flow)
        }
        return HandoverReflect.call(view, "getCurrentDirectory")
    }

    private fun stateValue(flow: Any?): Any? = if (flow == null) null else HandoverReflect.call(flow, "getValue")

    private fun model(view: Any, which: String): Any {
        val models = HandoverReflect.call(view, "getOutputModels")!!
        return HandoverReflect.call(models, which)!!
    }

    private fun textLength(model: Any): Long = (HandoverReflect.call(model, "getTextLength") as Number).toLong()

    private fun regularText(view: Any): String {
        val model = model(view, "getRegular")
        val start = HandoverReflect.call(model, "getStartOffset")
        val end = HandoverReflect.call(model, "getEndOffset")
        return HandoverReflect.call(model, "getText", start, end).toString()
    }

    private fun send(view: Any, text: String, execute: Boolean, bracketed: Boolean) {
        var builder: Any = HandoverReflect.call(view, "createSendTextBuilder")!!
        if (bracketed) {
            builder = HandoverReflect.call(builder, "useBracketedPasteMode") ?: builder
        }
        if (execute) {
            builder = HandoverReflect.call(builder, "shouldExecute") ?: builder
        }
        HandoverReflect.call(builder, "send", text)
    }

    private fun tail(text: String): String = Redaction.tail(text, System.getProperty("user.home"))
}

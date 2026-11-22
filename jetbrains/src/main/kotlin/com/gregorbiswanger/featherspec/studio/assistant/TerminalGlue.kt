package com.gregorbiswanger.featherspec.studio.assistant

import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindowManager
import com.intellij.terminal.frontend.toolwindow.TerminalToolWindowTabsManager
import com.intellij.ui.content.Content
import javax.swing.JComponent

class TerminalGlue(private val project: Project) : TerminalAccess {
    override fun tabs(): List<TerminalTab> = onEdt {
        val listed = ArrayList<TerminalTab>()
        for (tab in TerminalToolWindowTabsManager.getInstance(project).tabs) {
            try {
                listed.add(describe(tab as Any))
            } catch (failure: Exception) {
                continue
            }
        }
        listed
    }

    override fun openTab(root: String): Any = onEdt {
        var builder: Any = TerminalToolWindowTabsManager.getInstance(project).createTabBuilder()
        builder = TerminalReflect.call(builder, "workingDirectory", root) ?: builder
        builder = TerminalReflect.callOrNull(builder, "tabName", TAB_NAME) ?: builder
        builder = TerminalReflect.callOrNull(builder, "requestFocus", true) ?: builder
        val tab = TerminalReflect.call(builder, "createTab") ?: throw IllegalStateException("the terminal tab was not created")
        ToolWindowManager.getInstance(project).getToolWindow(TOOL_WINDOW_ID)?.activate(null)
        tab
    }

    override fun shellReady(key: Any): Boolean = onEdt { shellIntegration(viewOf(key)) != null }

    override fun runClaude(key: Any) {
        onEdt { send(viewOf(key), COMMAND, execute = true, bracketed = false) }
    }

    override fun screen(key: Any): Screen? = onEdt {
        val view = viewOf(key)
        val state = commandState(view)
        Screen(state.executing && ClaudeTabs.isClaudeCommand(state.command), regularText(view))
    }

    override fun paste(key: Any, text: String) {
        onEdt { send(viewOf(key), text, execute = false, bracketed = true) }
    }

    override fun focus(key: Any) {
        onEdt {
            val window = ToolWindowManager.getInstance(project).getToolWindow(TOOL_WINDOW_ID)
            val content = TerminalReflect.callOrNull(key, "getContent") as? Content
            if (window != null && content != null) {
                window.contentManager.setSelectedContent(content, true)
            }
            window?.activate(null)
            (TerminalReflect.callOrNull(viewOf(key), "getPreferredFocusableComponent") as? JComponent)?.requestFocusInWindow()
        }
    }

    private class CommandState(val ready: Boolean, val executing: Boolean, val command: String?, val workingDirectory: String?)

    private fun describe(tab: Any): TerminalTab {
        val view = viewOf(tab)
        val state = commandState(view)
        return TerminalTab(tab, state.ready, state.executing, state.command, state.workingDirectory)
    }

    private fun viewOf(tab: Any): Any = TerminalReflect.call(tab, "getView") ?: throw IllegalStateException("the terminal tab has no view")

    private fun shellIntegration(view: Any): Any? {
        val deferred = TerminalReflect.call(view, "getShellIntegrationDeferred") ?: return null
        val completed = TerminalReflect.call(deferred, "isCompleted") as? Boolean ?: false
        val cancelled = TerminalReflect.call(deferred, "isCancelled") as? Boolean ?: false
        return if (completed && !cancelled) TerminalReflect.call(deferred, "getCompleted") else null
    }

    private fun commandState(view: Any): CommandState {
        val integration = shellIntegration(view) ?: return CommandState(false, false, null, null)
        val status = TerminalReflect.call(TerminalReflect.call(integration, "getOutputStatus")!!, "getValue")
        val executing = status != null && status.javaClass.simpleName == EXECUTING
        val model = TerminalReflect.call(integration, "getBlocksModel")
        val blocks = if (model == null) emptyList() else candidateBlocks(model)
        val block = blocks.firstOrNull { executedCommand(it) != null }
        val directory = block?.let { TerminalReflect.callOrNull(it, "getWorkingDirectory") as? String }
            ?: TerminalReflect.callOrNull(view, "getCurrentDirectory") as? String
        return CommandState(true, executing, block?.let { executedCommand(it) }, directory)
    }

    private fun candidateBlocks(model: Any): List<Any> {
        val active = TerminalReflect.callOrNull(model, "getActiveBlock")
        val last = (TerminalReflect.callOrNull(model, "getBlocks") as? List<*>)?.lastOrNull()
        return listOfNotNull(active, last)
    }

    private fun executedCommand(block: Any): String? = TerminalReflect.callOrNull(block, "getExecutedCommand") as? String

    private fun regularText(view: Any): String {
        val models = TerminalReflect.call(view, "getOutputModels") ?: return ""
        val regular = TerminalReflect.call(models, "getRegular") ?: return ""
        val start = TerminalReflect.call(regular, "getStartOffset")
        val end = TerminalReflect.call(regular, "getEndOffset")
        return TerminalReflect.call(regular, "getText", start, end).toString().takeLast(TEXT_TAIL)
    }

    private fun send(view: Any, text: String, execute: Boolean, bracketed: Boolean) {
        var builder: Any = TerminalReflect.call(view, "createSendTextBuilder") ?: throw IllegalStateException("the terminal cannot take text")
        if (bracketed) {
            builder = TerminalReflect.call(builder, "useBracketedPasteMode") ?: builder
        }
        if (execute) {
            builder = TerminalReflect.call(builder, "shouldExecute") ?: builder
        }
        TerminalReflect.call(builder, "send", text)
    }

    private fun <T> onEdt(block: () -> T): T = Edt.run(block)

    private companion object {
        const val TOOL_WINDOW_ID = "Terminal"
        const val TAB_NAME = "Claude Code"
        const val COMMAND = "claude"
        const val EXECUTING = "ExecutingCommand"
        const val TEXT_TAIL = 20_000
    }
}

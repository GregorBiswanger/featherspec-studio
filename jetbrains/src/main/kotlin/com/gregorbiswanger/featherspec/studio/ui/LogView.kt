package com.gregorbiswanger.featherspec.studio.ui

import com.gregorbiswanger.featherspec.studio.HostRouter
import com.intellij.execution.filters.TextConsoleBuilderFactory
import com.intellij.execution.ui.ConsoleView
import com.intellij.execution.ui.ConsoleViewContentType
import com.intellij.openapi.Disposable
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.wm.ToolWindow
import com.intellij.ui.content.ContentFactory
import javax.swing.JComponent

class LogView(project: Project, host: HostRouter) : Disposable {
    private val console: ConsoleView = TextConsoleBuilderFactory.getInstance().createBuilder(project).console
    private val unsubscribe: () -> Unit

    val component: JComponent
        get() = console.component

    init {
        unsubscribe = host.attachLog({ lines -> print(lines) }, { lines -> print(lines) })
    }

    override fun dispose() {
        unsubscribe()
        Disposer.dispose(console)
    }

    private fun print(lines: List<String>) {
        if (lines.isNotEmpty()) {
            console.print(LogLines.text(lines), ConsoleViewContentType.NORMAL_OUTPUT)
        }
    }

    companion object {
        const val TITLE = "Output"

        fun addTo(project: Project, toolWindow: ToolWindow, host: HostRouter) {
            val view = LogView(project, host)
            val content = ContentFactory.getInstance().createContent(view.component, TITLE, false)
            content.isCloseable = false
            content.setDisposer(view)
            toolWindow.contentManager.addContent(content)
        }
    }
}

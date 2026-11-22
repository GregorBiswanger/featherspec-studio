package com.gregorbiswanger.featherspec.studio.assistant

import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindowManager

class IdeChatWindows(private val project: Project) {
    fun open(candidates: List<String>): Boolean = ChatWindows.open(candidates, ::find)

    private fun find(id: String): ChatWindow? {
        val window = Edt.run { ToolWindowManager.getInstance(project).getToolWindow(id) } ?: return null
        return object : ChatWindow {
            override val available: Boolean
                get() = Edt.run { window.isAvailable }

            override fun open() {
                Edt.run { window.activate(null) }
            }
        }
    }
}

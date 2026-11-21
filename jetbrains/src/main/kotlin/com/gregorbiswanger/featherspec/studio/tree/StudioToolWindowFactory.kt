package com.gregorbiswanger.featherspec.studio.tree

import com.gregorbiswanger.featherspec.studio.StudioProjectService
import com.gregorbiswanger.featherspec.studio.ui.LogView
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory

class StudioToolWindowFactory : ToolWindowFactory, DumbAware {
    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val service = project.getService(StudioProjectService::class.java)
        val panel = SpecTreePanel(service, toolWindow)
        val content = ContentFactory.getInstance().createContent(panel, "Specs", false)
        content.isCloseable = false
        content.setDisposer(panel)
        toolWindow.contentManager.addContent(content)
        LogView.addTo(project, toolWindow, service.host)
    }
}

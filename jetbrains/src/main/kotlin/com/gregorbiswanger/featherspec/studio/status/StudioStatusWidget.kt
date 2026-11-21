package com.gregorbiswanger.featherspec.studio.status

import com.gregorbiswanger.featherspec.studio.StudioProjectService
import com.gregorbiswanger.featherspec.studio.actions.UnavailableBalloon
import com.intellij.icons.AllIcons
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.IconLoader
import com.intellij.openapi.wm.CustomStatusBarWidget
import com.intellij.openapi.wm.StatusBarWidget
import com.intellij.openapi.wm.StatusBarWidgetFactory
import com.intellij.ui.AnimatedIcon
import com.intellij.ui.components.JBLabel
import java.awt.Cursor
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
import javax.swing.Icon
import javax.swing.JComponent
import javax.swing.SwingUtilities

class StudioStatusWidgetFactory : StatusBarWidgetFactory, DumbAware {
    override fun getId(): String = StudioStatusWidget.WIDGET_ID

    override fun getDisplayName(): String = "FeatherSpec Studio"

    override fun isAvailable(project: Project): Boolean = true

    override fun createWidget(project: Project): StatusBarWidget = StudioStatusWidget(project)
}

class StudioStatusWidget(private val project: Project) : CustomStatusBarWidget, DumbAware {
    private val service = project.getService(StudioProjectService::class.java)
    private val label = JBLabel()
    private val unsubscribe = ArrayList<() -> Unit>()
    private var shown: StatusDisplay = StatusDisplay.Hidden

    @Volatile
    private var disposed = false

    init {
        label.isVisible = false
        label.addMouseListener(object : MouseAdapter() {
            override fun mouseClicked(event: MouseEvent) {
                if (SwingUtilities.isLeftMouseButton(event)) {
                    click()
                }
            }
        })
        unsubscribe.add(service.host.status.onChange { later { render() } })
        unsubscribe.add(service.state.onChange { later { render() } })
        render()
    }

    override fun ID(): String = WIDGET_ID

    override fun getComponent(): JComponent = label

    override fun dispose() {
        disposed = true
        unsubscribe.forEach { it() }
        unsubscribe.clear()
    }

    private fun later(block: () -> Unit) {
        ApplicationManager.getApplication().invokeLater {
            if (!disposed) {
                block()
            }
        }
    }

    private fun render() {
        val display = StatusEntryMapping.display(service.state.value, service.host.status.value)
        shown = display
        if (display !is StatusDisplay.Shown) {
            label.isVisible = false
            return
        }
        val view = display.view
        label.text = view.text
        label.icon = iconOf(view.iconId)
        label.toolTipText = StatusEntryMapping.tooltipHtml(view.tooltipLines)
        label.accessibleContext.accessibleName = view.accessibleName
        label.cursor = if (display.click == StatusClick.None) Cursor.getDefaultCursor() else Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
        label.isVisible = true
    }

    private fun click() {
        val display = shown as? StatusDisplay.Shown ?: return
        when (val target = display.click) {
            is StatusClick.Invoke -> service.invokeAsync(target.command, "{}")
            is StatusClick.Notice -> UnavailableBalloon.show(project, target.kind)
            StatusClick.None -> Unit
        }
    }

    private fun iconOf(id: String?): Icon? = when (id) {
        StatusEntryMapping.LOADING_ICON -> AnimatedIcon.Default()
        StatusEntryMapping.WARNING_ICON -> AllIcons.General.Warning
        "check" -> AllIcons.Actions.Checked
        "checklist" -> IconLoader.getIcon("/icons/toolWindow.svg", StudioStatusWidget::class.java)
        else -> null
    }

    companion object {
        const val WIDGET_ID = "featherspec.studio.status"
    }
}

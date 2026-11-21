package com.gregorbiswanger.featherspec.studio.actions

import com.gregorbiswanger.featherspec.studio.StudioProjectService
import com.intellij.notification.NotificationAction
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.ide.BrowserUtil
import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.options.ShowSettingsUtil
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.gregorbiswanger.featherspec.studio.runtime.UnavailableKind

private const val NOTIFICATION_GROUP = "FeatherSpec Studio"

class StudioAction : AnAction(), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun update(event: AnActionEvent) {
        val row = rowOf()
        val project = event.project
        if (row == null || project == null) {
            event.presentation.isEnabledAndVisible = false
            return
        }
        val service = project.getService(StudioProjectService::class.java)
        event.presentation.isEnabledAndVisible = ActionRules.enabled(row, service.selection.value)
    }

    override fun actionPerformed(event: AnActionEvent) {
        val row = rowOf() ?: return
        val project = event.project ?: return
        val service = project.getService(StudioProjectService::class.java)
        when (val outcome = ActionRules.outcome(row, service.selection.value, service.state.value)) {
            is Outcome.Notice -> UnavailableBalloon.show(project, outcome.kind)
            Outcome.Settings -> ShowSettingsUtil.getInstance().showSettingsDialog(project, ActionTable.SETTINGS_NAME)
            is Outcome.Invoke -> service.invokeAsync(outcome.command, outcome.args)
            Outcome.Skip -> Unit
        }
    }

    private fun rowOf(): ActionRow? = ActionTable.byId(ActionManager.getInstance().getId(this))
}

object UnavailableBalloon {
    fun show(project: Project, kind: UnavailableKind) {
        val content = NoticeContent.of(kind)
        NotificationGroupManager.getInstance()
            .getNotificationGroup(NOTIFICATION_GROUP)
            .createNotification(content.text, NotificationType.WARNING)
            .addAction(NotificationAction.createSimpleExpiring(content.helpLabel) { BrowserUtil.browse(content.helpUrl) })
            .notify(project)
    }
}

package com.gregorbiswanger.featherspec.studio.ui

import com.gregorbiswanger.featherspec.studio.HostRouter
import com.intellij.ide.BrowserUtil
import com.intellij.notification.NotificationAction
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.progress.ProgressManager
import com.intellij.openapi.progress.Task
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.MessageDialogBuilder
import com.intellij.openapi.ui.popup.JBPopupFactory
import com.intellij.openapi.ui.popup.PopupStep
import com.intellij.openapi.ui.popup.util.BaseListPopupStep
import com.intellij.openapi.util.text.StringUtil
import com.intellij.openapi.wm.ToolWindowManager
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ExecutionException

private const val NOTIFICATION_GROUP = "FeatherSpec Studio"

private const val TOOL_WINDOW_ID = "FeatherSpec Studio"

private const val DIALOG_TITLE = "FeatherSpec Studio"

private const val POLL_MILLISECONDS = 100L

class HostUi(
    private val project: Project,
    private val dispatch: (String, String) -> Unit,
) {
    private val book = ProgressBook()
    private val pending = ConcurrentHashMap.newKeySet<() -> Unit>()
    private val removers = ArrayList<() -> Unit>()

    fun attach(host: HostRouter) {
        removers.add(host.subscribe("warn") { warn(LogLines.parse(it).joinToString("\n")) })
        removers.add(host.subscribe("progressEnd") { payload -> UiRequests.progressId(payload)?.let { book.finish(it) } })
        removers.add(host.subscribe("showOutput") { showOutput() })
    }

    fun close() {
        removers.forEach { it() }
        removers.clear()
        book.finishAll()
        pending.toList().forEach { it() }
    }

    fun answer(name: String, argsJson: String): String? = when (name) {
        "ui.notify" -> {
            val request = UiRequests.notify(argsJson) ?: throw IllegalArgumentException("ui.notify needs message and actions")
            UiRequests.chosen(notify(request))
        }
        "ui.pick" -> {
            val request = UiRequests.pick(argsJson) ?: throw IllegalArgumentException("ui.pick needs items")
            UiRequests.index(if (request.entries.isEmpty()) null else pick(request))
        }
        "ui.confirm" -> {
            val request = UiRequests.confirm(argsJson) ?: throw IllegalArgumentException("ui.confirm needs message and confirmLabel")
            UiRequests.confirmed(confirm(request))
        }
        "ui.progressStart" -> {
            val title = UiRequests.progressTitle(argsJson) ?: throw IllegalArgumentException("ui.progressStart needs title")
            UiRequests.started(progressStart(title))
        }
        "ui.openExternal" -> {
            val url = UiRequests.externalUrl(argsJson) ?: throw IllegalArgumentException("ui.openExternal needs an http or https url")
            BrowserUtil.browse(url)
            UiRequests.OK_NULL
        }
        else -> null
    }

    private fun <T : Any> await(start: (CompletableFuture<T?>) -> Unit): T? {
        val future = CompletableFuture<T?>()
        val release: () -> Unit = { future.complete(null) }
        pending.add(release)
        try {
            ApplicationManager.getApplication().invokeLater {
                if (project.isDisposed) {
                    future.complete(null)
                } else {
                    try {
                        start(future)
                    } catch (failure: Exception) {
                        future.completeExceptionally(failure)
                    }
                }
            }
            return future.get()
        } catch (failure: ExecutionException) {
            throw (failure.cause as? Exception ?: failure)
        } finally {
            pending.remove(release)
        }
    }

    private fun notify(request: NotifyRequest): String? = await<String> { future ->
        val notification = NotificationGroupManager.getInstance()
            .getNotificationGroup(NOTIFICATION_GROUP)
            .createNotification(StringUtil.escapeXmlEntities(request.message), NotificationType.INFORMATION)
        request.actions.forEach { label ->
            notification.addAction(NotificationAction.createSimpleExpiring(label) { future.complete(label) })
        }
        notification.whenExpired { future.complete(null) }
        notification.notify(project)
    }

    private fun pick(request: PickRequest): Int? = await<Int> { future ->
        val step = object : BaseListPopupStep<PickEntry>(request.placeholder, request.entries) {
            override fun getTextFor(value: PickEntry): String = value.display

            override fun onChosen(selectedValue: PickEntry, finalChoice: Boolean): PopupStep<*>? {
                future.complete(selectedValue.index)
                return PopupStep.FINAL_CHOICE
            }

            override fun canceled() {
                future.complete(null)
            }

            override fun isSpeedSearchEnabled(): Boolean = true
        }
        JBPopupFactory.getInstance().createListPopup(step).showCenteredInCurrentWindow(project)
    }

    private fun confirm(request: ConfirmRequest): Boolean = await<Boolean> { future ->
        future.complete(MessageDialogBuilder.okCancel(DIALOG_TITLE, request.text).yesText(request.confirmLabel).ask(project))
    } ?: false

    private fun progressStart(title: String): String {
        val id = book.begin()
        ApplicationManager.getApplication().invokeLater {
            if (project.isDisposed) {
                book.finish(id)
            } else {
                ProgressManager.getInstance().run(
                    object : Task.Backgroundable(project, title, true) {
                        override fun run(indicator: ProgressIndicator) {
                            indicator.isIndeterminate = true
                            while (book.isActive(id)) {
                                if (indicator.isCanceled && book.requestCancel(id)) {
                                    dispatch("progressCancelled", UiRequests.cancelPayload(id))
                                    book.finish(id)
                                }
                                Thread.sleep(POLL_MILLISECONDS)
                            }
                        }
                    },
                )
            }
        }
        return id
    }

    private fun warn(message: String) {
        if (project.isDisposed || message.isBlank()) {
            return
        }
        NotificationGroupManager.getInstance()
            .getNotificationGroup(NOTIFICATION_GROUP)
            .createNotification(StringUtil.escapeXmlEntities(message), NotificationType.WARNING)
            .notify(project)
    }

    private fun showOutput() {
        ApplicationManager.getApplication().invokeLater {
            if (project.isDisposed) {
                return@invokeLater
            }
            val window = ToolWindowManager.getInstance(project).getToolWindow(TOOL_WINDOW_ID) ?: return@invokeLater
            window.show {
                window.contentManager.findContent(LogView.TITLE)?.let { window.contentManager.setSelectedContent(it) }
            }
        }
    }
}

package com.gregorbiswanger.featherspec.studio.probe

import com.gregorbiswanger.featherspec.studio.tree.UnavailableNotice
import com.gregorbiswanger.featherspec.studio.StudioProjectService
import com.gregorbiswanger.featherspec.studio.actions.ActionTable
import com.gregorbiswanger.featherspec.studio.runtime.CoreState
import com.gregorbiswanger.featherspec.studio.runtime.CoreStateHolder
import com.gregorbiswanger.featherspec.studio.settings.StudioConfigurable
import com.gregorbiswanger.featherspec.studio.status.StudioStatusWidget
import com.intellij.notification.Notification
import com.intellij.notification.Notifications
import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.impl.SimpleDataContext
import com.intellij.openapi.actionSystem.ex.ActionUtil
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.SimpleToolWindowPanel
import com.intellij.openapi.wm.ToolWindowManager
import com.intellij.openapi.wm.WindowManager
import com.intellij.ui.components.JBPanelWithEmptyText
import com.intellij.ui.jcef.JBCefApp
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference
import javax.swing.JLabel

private data class Captured(val group: String?, val content: String, val actions: List<String>)

class NoJcefProbe(private val project: Project, private val out: Path) {
    private val captured = CopyOnWriteArrayList<Captured>()

    fun run() {
        val connection = project.messageBus.connect()
        try {
            Files.createDirectories(out)
            connection.subscribe(
                Notifications.TOPIC,
                object : Notifications {
                    override fun notify(notification: Notification) {
                        captured.add(
                            Captured(
                                notification.groupId,
                                notification.content,
                                notification.actions.map { it.templatePresentation.text.orEmpty() },
                            ),
                        )
                    }
                },
            )
            val service = project.getService(StudioProjectService::class.java)
            val state = awaitUnavailable(service.state)
            if (state !is CoreState.Unavailable) {
                val observed = NoJcefReport(
                    state = NoJcefState.of(state),
                    jcefSupported = JBCefApp.isSupported(),
                    toolWindowContent = "",
                    emptyText = "",
                    status = "",
                    balloons = emptyList(),
                    settings = settingsComponentExists(),
                )
                Files.writeString(out.resolve(REPORT_FILE), observed.toJson())
                return
            }
            val content = toolWindowContent()
            val status = awaitStatus()
            val balloons = NoJcefCompare.ACTIONS.map { balloonAfter(it) }
            val report = NoJcefReport(
                state = NoJcefState.of(state),
                jcefSupported = JBCefApp.isSupported(),
                toolWindowContent = content.first,
                emptyText = content.second,
                status = status,
                balloons = balloons,
                settings = settingsComponentExists(),
            )
            Files.writeString(out.resolve(REPORT_FILE), report.toJson())
        } catch (failure: Throwable) {
            Files.writeString(out.resolve(ERROR_FILE), failure.toString())
        } finally {
            connection.disconnect()
        }
    }

    private fun awaitUnavailable(state: CoreStateHolder): CoreState {
        val settled = CountDownLatch(1)
        val remove = state.onChange { next ->
            if (next is CoreState.Unavailable) {
                settled.countDown()
            }
        }
        try {
            if (state.value is CoreState.Unavailable) {
                settled.countDown()
            }
            settled.await(UNAVAILABLE_WAIT_SECONDS, TimeUnit.SECONDS)
            return state.value
        } finally {
            remove()
        }
    }

    private fun toolWindowContent(): Pair<String, String> {
        val window = ToolWindowManager.getInstance(project).getToolWindow(TOOL_WINDOW_ID) ?: return "" to ""
        val shown = CountDownLatch(1)
        ApplicationManager.getApplication().invokeAndWait { window.show(Runnable { shown.countDown() }) }
        shown.await(POLL_SECONDS, TimeUnit.SECONDS)
        var observed = "" to ""
        val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(POLL_SECONDS)
        while (System.nanoTime() < deadline) {
            observed = onEdt {
                val panel = window.contentManager.contents.firstOrNull()?.component as? SimpleToolWindowPanel
                val inner = panel?.content
                val empty = (inner as? UnavailableNotice)?.lines?.joinToString("\n") ?: (inner as? JBPanelWithEmptyText)?.emptyText?.text.orEmpty()
                (inner?.javaClass?.simpleName.orEmpty()) to empty
            }
            if (observed.first == NoJcefCompare.NOTICE_CLASS) {
                return observed
            }
            Thread.sleep(POLL_MILLISECONDS)
        }
        return observed
    }

    private fun awaitStatus(): String {
        var text = ""
        val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(POLL_SECONDS)
        while (System.nanoTime() < deadline) {
            text = onEdt {
                val bar = WindowManager.getInstance().getStatusBar(project)
                val widget = bar?.getWidget(StudioStatusWidget.WIDGET_ID) as? StudioStatusWidget
                (widget?.component as? JLabel)?.text.orEmpty()
            }
            if (text.isNotEmpty()) {
                return text
            }
            Thread.sleep(POLL_MILLISECONDS)
        }
        return text
    }

    private fun balloonAfter(name: String): BalloonRecord {
        val before = captured.size
        val action = ActionManager.getInstance().getAction(ActionTable.ID_PREFIX + name)
        if (action != null) {
            ApplicationManager.getApplication().invokeAndWait {
                ActionUtil.invokeAction(action, SimpleDataContext.getProjectContext(project), "FeatherSpecProbe", null, null)
            }
        }
        val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(POLL_SECONDS)
        while (System.nanoTime() < deadline) {
            val found = captured.drop(before).firstOrNull { it.group == NOTIFICATION_GROUP }
            if (found != null) {
                return BalloonRecord(name, found.content, found.actions)
            }
            Thread.sleep(POLL_MILLISECONDS)
        }
        return BalloonRecord(name, "", emptyList())
    }

    private fun settingsComponentExists(): Boolean = try {
        onEdt {
            val configurable = StudioConfigurable()
            try {
                configurable.createComponent() != null
            } finally {
                configurable.disposeUIResources()
            }
        }
    } catch (failure: Exception) {
        false
    }

    private fun <T> onEdt(block: () -> T): T {
        val holder = AtomicReference<Result<T>>()
        ApplicationManager.getApplication().invokeAndWait { holder.set(runCatching(block)) }
        return holder.get().getOrThrow()
    }

    companion object {
        const val PROBE_NAME = "nojcef"
        const val REPORT_FILE = "nojcef.json"
        const val ERROR_FILE = "probe-error.txt"
        private const val TOOL_WINDOW_ID = "FeatherSpec Studio"
        private const val NOTIFICATION_GROUP = "FeatherSpec Studio"
        private const val UNAVAILABLE_WAIT_SECONDS = 60L
        private const val POLL_SECONDS = 15L
        private const val POLL_MILLISECONDS = 200L
    }
}

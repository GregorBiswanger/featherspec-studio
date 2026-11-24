package com.gregorbiswanger.featherspec.studio.probe

import com.google.gson.GsonBuilder
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.google.gson.JsonPrimitive
import com.gregorbiswanger.featherspec.studio.assistant.CliAgents
import com.gregorbiswanger.featherspec.studio.assistant.CliOnPath
import com.intellij.ide.plugins.PluginManagerCore
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.ApplicationInfo
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.extensions.PluginId
import com.intellij.openapi.ide.CopyPasteManager
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindowManager
import java.awt.datatransfer.StringSelection
import java.io.File
import java.time.Instant

object HandoverProperties {
    const val ENABLED = "featherspec.probe.handover"
    const val PREFIX = "FEATHERSPEC-HANDOVER-PROBE"

    fun enabled(): Boolean = System.getProperty(ENABLED) == "true"
}

abstract class HandoverAction(private val kind: String) : AnAction(), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = HandoverProperties.enabled() && e.project != null
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        if (!HandoverProperties.enabled()) {
            return
        }
        ApplicationManager.getApplication().executeOnPooledThread { HandoverRunner.run(project, kind, this::body) }
    }

    protected abstract fun body(project: Project): JsonObject
}

class HandoverInventoryAction : HandoverAction("inventory") {
    override fun body(project: Project): JsonObject = HandoverInventory.collect(project)
}

class HandoverClaudeTabAction : HandoverAction("claudeTab") {
    override fun body(project: Project): JsonObject = HandoverTerminal.claudeTab(project)
}

class HandoverJunieTabAction : HandoverAction("junieTab") {
    override fun body(project: Project): JsonObject = HandoverTerminal.agentTab(project, CliAgents.JUNIE)
}

class HandoverCopilotTabAction : HandoverAction("copilotTab") {
    override fun body(project: Project): JsonObject = HandoverTerminal.agentTab(project, CliAgents.COPILOT)
}

class HandoverScreenAction : HandoverAction("screen") {
    override fun body(project: Project): JsonObject = HandoverTerminal.screens(project)
}

object HandoverRunner {
    private val LOG = Logger.getInstance(HandoverRunner::class.java)

    fun run(project: Project, kind: String, body: (Project) -> JsonObject) {
        val root = JsonObject()
        root.addProperty("probe", kind)
        root.addProperty("capturedAt", Instant.now().toString())
        root.add("ide", HandoverReflect.safe { ideJson() })
        try {
            val result = body(project)
            result.entrySet().forEach { root.add(it.key, it.value) }
        } catch (failure: Throwable) {
            root.addProperty("probeFailure", HandoverReflect.unavailable(failure))
        }
        publish(project, root)
    }

    private fun ideJson(): JsonObject {
        val info = ApplicationInfo.getInstance()
        val ide = JsonObject()
        ide.addProperty("build", info.build.asString())
        ide.addProperty("name", info.fullApplicationName)
        ide.addProperty("os", System.getProperty("os.name"))
        return ide
    }

    private fun publish(project: Project, root: JsonObject) {
        val compact = GsonBuilder().create().toJson(root)
        val pretty = GsonBuilder().setPrettyPrinting().disableHtmlEscaping().create().toJson(root)
        runCatching { LOG.warn("${HandoverProperties.PREFIX} $compact") }
        runCatching {
            ApplicationManager.getApplication().invokeLater {
                runCatching { CopyPasteManager.getInstance().setContents(StringSelection(pretty)) }
            }
        }
        runCatching {
            NotificationGroupManager.getInstance().getNotificationGroup("FeatherSpec Studio")
                .createNotification(
                    "FeatherSpec Probe: Handover",
                    "The JSON is on the clipboard and in idea.log (prefix ${HandoverProperties.PREFIX}).",
                    NotificationType.INFORMATION,
                )
                .notify(project)
        }
    }
}

object HandoverInventory {
    private val PLUGINS = listOf(
        "org.jetbrains.junie",
        "com.intellij.ml.llm",
        "com.github.copilot",
        "org.jetbrains.plugins.terminal",
        "com.anthropic.code.plugin",
    )

    fun collect(project: Project): JsonObject {
        val body = JsonObject()
        body.add("toolWindows", HandoverReflect.safe { toolWindows(project) })
        body.add("plugins", HandoverReflect.safe { plugins() })
        body.add("terminalTabs", HandoverReflect.safe { HandoverTerminal.tabs(project) })
        body.add("cliAgents", HandoverReflect.safe { cliAgents() })
        return body
    }

    private fun cliAgents(): JsonObject {
        val idePath = runCatching { HandoverReflect.callStatic("com.intellij.util.EnvironmentUtil", "getValue", "PATH") as String? }
        val processPath = System.getenv("PATH")
        val result = JsonObject()
        result.add("idePathSource", HandoverReflect.safe { idePath.getOrThrow()?.let { "available" } ?: "null" })
        for (agent in CliAgents.ALL) {
            val entry = JsonObject()
            entry.add("foundOnIdePath", HandoverReflect.safe { matchOf(agent.pathNames, idePath.getOrThrow()) ?: false })
            entry.add("foundOnProcessPath", HandoverReflect.safe { matchOf(agent.pathNames, processPath) ?: false })
            result.add(agent.id, entry)
        }
        return result
    }

    private fun matchOf(names: List<String>, path: String?): String? =
        CliOnPath.match(names, path, File.pathSeparatorChar, CliOnPath::existsOnDisk)

    private fun toolWindows(project: Project): JsonArray {
        val manager = ToolWindowManager.getInstance(project)
        val ids = idsOf(manager)
        val array = JsonArray()
        for (id in ids.sorted()) {
            val entry = JsonObject()
            entry.addProperty("id", id)
            val window = manager.getToolWindow(id)
            entry.add("stripeTitle", HandoverReflect.safe { window?.stripeTitle })
            entry.add("available", HandoverReflect.safe { window?.isAvailable })
            entry.add("visible", HandoverReflect.safe { window?.isVisible })
            array.add(entry)
        }
        return array
    }

    private fun idsOf(manager: ToolWindowManager): List<String> {
        for (name in listOf("getToolWindowIdSet", "getToolWindowIds")) {
            val found = runCatching { HandoverReflect.strings(HandoverReflect.call(manager, name)) }.getOrNull()
            if (found != null) {
                return found
            }
        }
        throw NoSuchMethodException("ToolWindowManager exposes neither getToolWindowIdSet nor getToolWindowIds")
    }

    private fun plugins(): JsonObject {
        val result = JsonObject()
        for (raw in PLUGINS) {
            val id = PluginId.getId(raw)
            val entry = JsonObject()
            entry.add("isPluginInstalled", HandoverReflect.safe { PluginManagerCore.isPluginInstalled(id) })
            val candidates = JsonObject()
            candidates.add(
                "PluginManager.findEnabledPlugin != null",
                HandoverReflect.safe {
                    val manager = HandoverReflect.callStatic("com.intellij.ide.plugins.PluginManager", "getInstance")!!
                    HandoverReflect.call(manager, "findEnabledPlugin", id) != null
                },
            )
            candidates.add(
                "PluginManagerCore.getPlugin.isEnabled",
                HandoverReflect.safe {
                    val descriptor = HandoverReflect.callStatic("com.intellij.ide.plugins.PluginManagerCore", "getPlugin", id)
                    if (descriptor == null) JsonPrimitive("absent") else HandoverReflect.call(descriptor, "isEnabled")
                },
            )
            candidates.add(
                "PluginManagerCore.isLoaded",
                HandoverReflect.safe { HandoverReflect.callStatic("com.intellij.ide.plugins.PluginManagerCore", "isLoaded", id) },
            )
            candidates.add(
                "PluginManagerCore.isDisabled",
                HandoverReflect.safe { HandoverReflect.callStatic("com.intellij.ide.plugins.PluginManagerCore", "isDisabled", id) },
            )
            candidates.add(
                "PluginManagerCore.getPlugin.version",
                HandoverReflect.safe {
                    val descriptor = HandoverReflect.callStatic("com.intellij.ide.plugins.PluginManagerCore", "getPlugin", id)
                    if (descriptor == null) JsonPrimitive("absent") else HandoverReflect.call(descriptor, "getVersion")
                },
            )
            entry.add("enabledCandidates", candidates)
            result.add(raw, entry)
        }
        return result
    }
}

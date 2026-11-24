package com.gregorbiswanger.featherspec.studio.ports

import com.google.gson.JsonArray
import com.google.gson.JsonObject

object PluginIds {
    const val COPILOT = "com.github.copilot"
    const val TERMINAL = "org.jetbrains.plugins.terminal"
    const val JUNIE = "org.jetbrains.junie"
    const val AI_ASSISTANT = "com.intellij.ml.llm"

    val ALL: List<String> = listOf(TERMINAL)
}

enum class ActivityCheck { LOADED, NOT_DISABLED }

object PluginActivity {
    const val STATUS = "K-1 pending"

    val CURRENT: ActivityCheck = ActivityCheck.LOADED

    fun available(installed: Boolean, check: ActivityCheck, loaded: () -> Boolean, disabled: () -> Boolean): Boolean =
        installed && when (check) {
            ActivityCheck.LOADED -> loaded()
            ActivityCheck.NOT_DISABLED -> !disabled()
        }
}

fun interface PluginQuery {
    fun available(id: String): Boolean
}

enum class PluginEventKind { LOADED, UNLOADED }

object PluginAvailability {
    fun snapshot(query: PluginQuery, absent: Set<String> = emptySet()): List<String> =
        PluginIds.ALL.filter { it !in absent && query.available(it) }

    fun junie(plugins: List<String>): Boolean = PluginIds.JUNIE in plugins || PluginIds.AI_ASSISTANT in plugins

    fun recompute(kind: PluginEventKind, isUpdate: Boolean): Boolean = !(kind == PluginEventKind.UNLOADED && isUpdate)

    fun absentAfter(kind: PluginEventKind, pluginId: String, isUpdate: Boolean): Set<String> =
        if (kind == PluginEventKind.UNLOADED && !isUpdate) setOf(pluginId) else emptySet()

    fun event(plugins: List<String>): String = JsonObject().apply {
        add("plugins", JsonArray().apply { plugins.forEach { add(it) } })
    }.toString()
}

class PluginsWatch(initial: List<String>) {
    private var last: List<String> = initial

    @Synchronized
    fun changed(next: List<String>): Boolean {
        if (next == last) {
            return false
        }
        last = next
        return true
    }
}

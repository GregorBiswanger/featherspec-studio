package com.gregorbiswanger.featherspec.studio.ports

import com.gregorbiswanger.featherspec.studio.assistant.CliAgent
import com.gregorbiswanger.featherspec.studio.assistant.CliAgents
import com.gregorbiswanger.featherspec.studio.assistant.CliOnPath

object CliAvailability {
    const val PREFIX = "cli:"

    fun presenceId(agent: CliAgent): String = PREFIX + agent.command

    fun found(agent: CliAgent, path: String?, separator: Char, exists: (String, String) -> Boolean): Boolean =
        CliOnPath.found(agent.pathNames, path, separator, exists)

    fun finder(readPath: () -> String?, separator: Char, exists: (String, String) -> Boolean): (CliAgent) -> Boolean {
        val path = try {
            readPath()
        } catch (failure: Exception) {
            null
        }
        return { agent -> found(agent, path, separator, exists) }
    }

    fun pathOf(ide: () -> String?, process: () -> String?): String? {
        val fromIde = try {
            ide()
        } catch (failure: Exception) {
            null
        } catch (failure: LinkageError) {
            null
        }
        return fromIde?.takeIf { it.isNotBlank() } ?: process()
    }

    fun snapshot(plugins: List<String>, found: (CliAgent) -> Boolean): List<String> =
        if (PluginIds.TERMINAL in plugins) plugins + CliAgents.ALL.filter(found).map(::presenceId) else plugins
}

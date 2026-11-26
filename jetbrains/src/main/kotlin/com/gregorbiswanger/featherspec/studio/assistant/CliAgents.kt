package com.gregorbiswanger.featherspec.studio.assistant

import java.nio.file.Files
import java.nio.file.InvalidPathException
import java.nio.file.Paths

enum class PasteMode { BRACKETED, PLAIN }

class CliAgent(
    val id: String,
    val displayName: String,
    val command: String,
    val pathNames: List<String>,
    val tabName: String,
    val inputMarkers: List<String>,
    val waitingMarkers: List<String>,
    val markersStatus: String,
    val pasteMode: PasteMode,
    // Only Junie is started by its full path (the agent the IDE installs); the others stay exact (AC-015).
    val acceptsFullPath: Boolean = false,
) {
    fun hasInputBox(text: String): Boolean {
        val input = lastIndexOfAny(text, inputMarkers)
        return input >= 0 && input > lastIndexOfAny(text, waitingMarkers)
    }

    fun isCommand(text: String?, caseInsensitive: Boolean = false): Boolean {
        val trimmed = text?.trim()
        if (trimmed.isNullOrEmpty()) {
            return false
        }
        val first = trimmed.split(WHITESPACE, limit = 2).firstOrNull()
        if (!first.isNullOrEmpty() && COMMAND_SUFFIXES.any { suffix -> first.equals(command + suffix, ignoreCase = caseInsensitive) }) {
            return true
        }
        if (!acceptsFullPath) {
            return false
        }
        val executable = executableOf(trimmed) ?: return false
        val name = executable.substringAfterLast('/').substringAfterLast('\\')
        return COMMAND_SUFFIXES.any { suffix -> name.equals(command + suffix, ignoreCase = true) }
    }

    // A full path as the command (PD-112 amendment 2026-11-26): `"C:\a b\junie.exe"`, `& 'C:\a b\junie.exe'` or `/opt/x/junie`.
    private fun executableOf(text: String): String? {
        var rest = text
        if (rest.startsWith("& ")) {
            rest = rest.substring(2).trimStart()
        }
        val quote = rest.firstOrNull() ?: return null
        val path = if (quote == '"' || quote == '\'') {
            val end = rest.indexOf(quote, 1)
            if (end < 0) return null
            rest.substring(1, end)
        } else {
            rest.split(WHITESPACE, limit = 2).firstOrNull().orEmpty()
        }
        return path.takeIf { it.contains('/') || it.contains('\\') }
    }

    private fun lastIndexOfAny(text: String, markers: List<String>): Int = markers.maxOf { text.lastIndexOf(it) }

    private companion object {
        val WHITESPACE = Regex("\\s+")
        val COMMAND_SUFFIXES = listOf("", ".exe", ".bat", ".cmd")
    }
}

object CliAgents {
    const val MARKERS_STATUS = "K-1 pending"

    val JUNIE_INPUT_MARKERS: List<String> = listOf("? for shortcuts", "shift+tab")
    val JUNIE_WAITING_MARKERS: List<String> = listOf("Continue with JetBrains account", "Use a Junie API key", "Do you trust", "integration plugin")
    val COPILOT_INPUT_MARKERS: List<String> = listOf("@ to mention files", "/ for commands", "? for help")
    val COPILOT_WAITING_MARKERS: List<String> =
        listOf("trust the files in this folder", "Yes, and remember this folder for future sessions", "No (Esc)", "/login")

    val JUNIE = CliAgent(
        id = "junie",
        displayName = "Junie",
        command = "junie",
        pathNames = listOf("junie", "junie.exe", "junie.bat", "junie.cmd"),
        tabName = "Junie",
        inputMarkers = JUNIE_INPUT_MARKERS,
        waitingMarkers = JUNIE_WAITING_MARKERS,
        markersStatus = MARKERS_STATUS,
        pasteMode = PasteMode.BRACKETED,
        acceptsFullPath = true,
    )

    val CLAUDE_CODE = CliAgent(
        id = "claudeCode",
        displayName = "Claude Code",
        command = "claude",
        pathNames = listOf("claude", "claude.exe", "claude.cmd"),
        tabName = "Claude Code",
        inputMarkers = ClaudeReadiness.INPUT_MARKERS,
        waitingMarkers = ClaudeReadiness.WAITING_MARKERS,
        markersStatus = ClaudeReadiness.MARKERS_STATUS,
        pasteMode = PasteMode.BRACKETED,
    )

    val COPILOT = CliAgent(
        id = "copilot",
        displayName = "Copilot",
        command = "copilot",
        pathNames = listOf("copilot", "copilot.exe", "copilot.cmd"),
        tabName = "GitHub Copilot",
        inputMarkers = COPILOT_INPUT_MARKERS,
        waitingMarkers = COPILOT_WAITING_MARKERS,
        markersStatus = MARKERS_STATUS,
        pasteMode = PasteMode.BRACKETED,
    )

    val ALL: List<CliAgent> = listOf(JUNIE, CLAUDE_CODE, COPILOT)

    fun byId(id: String?): CliAgent? = ALL.firstOrNull { it.id == id }

    fun agentOf(command: String?, caseInsensitive: Boolean = false): CliAgent? = ALL.firstOrNull { it.isCommand(command, caseInsensitive) }
}

object CliOnPath {
    fun match(names: List<String>, path: String?, separator: Char, exists: (String, String) -> Boolean): String? {
        if (path.isNullOrBlank()) {
            return null
        }
        val directories = path.split(separator).map { it.trim().removeSurrounding("\"") }.filter { it.isNotBlank() }
        for (directory in directories) {
            val name = names.firstOrNull { exists(directory, it) }
            if (name != null) {
                return name
            }
        }
        return null
    }

    fun found(names: List<String>, path: String?, separator: Char, exists: (String, String) -> Boolean): Boolean =
        match(names, path, separator, exists) != null

    fun existsOnDisk(directory: String, name: String): Boolean = try {
        Files.isRegularFile(Paths.get(directory, name))
    } catch (failure: InvalidPathException) {
        false
    } catch (failure: SecurityException) {
        false
    }
}

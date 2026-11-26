package com.gregorbiswanger.featherspec.studio.ports

import com.gregorbiswanger.featherspec.studio.assistant.CliAgent
import com.gregorbiswanger.featherspec.studio.assistant.CliAgents
import java.nio.file.Files
import java.nio.file.InvalidPathException
import java.nio.file.Paths

// PD-112 amendment 2026-11-26: the Junie agent that the AI Assistant installs into the IDE system directory.
object IdeManagedJunie {
    const val AGENTS_FOLDER = "acp-agents"
    const val AGENT_FOLDER = "junie"
    const val INSTALLED_MARKER = ".installed"
    const val EXECUTABLE_WINDOWS = "junie.exe"
    const val EXECUTABLE_OTHER = "junie"

    fun executableName(windows: Boolean): String = if (windows) EXECUTABLE_WINDOWS else EXECUTABLE_OTHER

    fun separator(windows: Boolean): String = if (windows) "\\" else "/"

    fun join(parent: String, child: String, windows: Boolean): String = parent.trimEnd('/', '\\') + separator(windows) + child

    fun agentsDirectory(systemPath: String, windows: Boolean): String =
        join(join(systemPath, AGENTS_FOLDER, windows), AGENT_FOLDER, windows)

    fun version(name: String): List<Int>? {
        if (name.isEmpty()) {
            return null
        }
        val parts = name.split('.')
        if (parts.any { it.isEmpty() || !it.all { character -> character in '0'..'9' } }) {
            return null
        }
        return parts.map { it.toIntOrNull() ?: return null }
    }

    fun compare(first: List<Int>, second: List<Int>): Int {
        for (index in 0 until maxOf(first.size, second.size)) {
            val difference = first.getOrElse(index) { 0 }.compareTo(second.getOrElse(index) { 0 })
            if (difference != 0) {
                return difference
            }
        }
        return 0
    }

    // Returns the full path of the executable in the highest installed version folder, or null.
    // `list` gives the folder names inside a directory (empty when it is missing); `isFile` asks for a regular file.
    fun find(systemPath: String?, windows: Boolean, list: (String) -> List<String>, isFile: (String) -> Boolean): String? {
        if (systemPath.isNullOrBlank()) {
            return null
        }
        val directory = agentsDirectory(systemPath, windows)
        val candidates = list(directory).mapNotNull { name -> version(name)?.let { name to it } }
            .map { (name, parsed) -> Triple(name, parsed, join(join(join(directory, name, windows), AGENT_FOLDER, windows), executableName(windows), windows)) }
            .filter { (name, _, executable) -> isFile(join(join(directory, name, windows), INSTALLED_MARKER, windows)) && isFile(executable) }
        var best: Triple<String, List<Int>, String>? = null
        for (candidate in candidates) {
            val current = best
            if (current == null || compare(candidate.second, current.second) > 0) {
                best = candidate
            }
        }
        return best?.third
    }

    fun managedPath(agent: CliAgent, find: () -> String?): String? = if (agent.id == CliAgents.JUNIE.id) find() else null

    // PATH keeps the plain command; the IDE-managed full path is used only when the command is not on the PATH.
    fun launch(agent: CliAgent, onPath: Boolean, managed: String?): String = if (onPath || managed == null) agent.command else managed

    fun findOnDisk(systemPath: String?, windows: Boolean): String? = find(systemPath, windows, ::listFolders, ::isRegularFile)

    private fun listFolders(directory: String): List<String> = try {
        val path = Paths.get(directory)
        if (Files.isDirectory(path)) {
            Files.newDirectoryStream(path).use { stream -> stream.filter { Files.isDirectory(it) }.map { it.fileName.toString() } }
        } else {
            emptyList()
        }
    } catch (failure: InvalidPathException) {
        emptyList()
    } catch (failure: java.io.IOException) {
        emptyList()
    } catch (failure: SecurityException) {
        emptyList()
    }

    private fun isRegularFile(path: String): Boolean = try {
        Files.isRegularFile(Paths.get(path))
    } catch (failure: InvalidPathException) {
        false
    } catch (failure: SecurityException) {
        false
    }
}

object ShellCommand {
    enum class Shell { POWERSHELL, CMD, POSIX }

    private val SAFE = Regex("[A-Za-z0-9_./:\\\\@%+=,-]+")
    private val SAFE_POSIX = Regex("[A-Za-z0-9_./:@%+=,-]+")

    fun shellOf(shellPath: String?, windows: Boolean): Shell {
        val name = shellPath?.trim()?.trim('"', '\'')?.substringAfterLast('/')?.substringAfterLast('\\')?.lowercase()?.removeSuffix(".exe").orEmpty()
        return when (name) {
            "powershell", "pwsh" -> Shell.POWERSHELL
            "cmd" -> Shell.CMD
            "" -> if (windows) Shell.POWERSHELL else Shell.POSIX
            else -> Shell.POSIX
        }
    }

    // The text typed to start an executable given by full path (or a plain command, which is left as it is).
    fun launch(executable: String, shell: Shell): String {
        if ((if (shell == Shell.POSIX) SAFE_POSIX else SAFE).matches(executable)) {
            return executable
        }
        return when (shell) {
            Shell.POWERSHELL -> "& '" + executable.replace("'", "''") + "'"
            Shell.CMD -> "\"" + executable + "\""
            Shell.POSIX -> "'" + executable.replace("'", "'\\''") + "'"
        }
    }
}

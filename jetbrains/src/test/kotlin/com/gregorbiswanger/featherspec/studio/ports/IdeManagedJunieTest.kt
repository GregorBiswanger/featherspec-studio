package com.gregorbiswanger.featherspec.studio.ports

import com.gregorbiswanger.featherspec.studio.assistant.CliAgents
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class IdeManagedJunieTest {
    private val windowsRoot = "C:\\Users\\gregor\\AppData\\Local\\JetBrains\\Rider2026.3"
    private val windowsAgents = "$windowsRoot\\acp-agents\\junie"
    private val unixRoot = "/home/gregor/.cache/JetBrains/Rider2026.3"
    private val unixAgents = "$unixRoot/acp-agents/junie"

    private fun windowsFiles(version: String, installed: Boolean = true, executable: Boolean = true): List<String> =
        listOfNotNull(
            if (installed) "$windowsAgents\\$version\\.installed" else null,
            if (executable) "$windowsAgents\\$version\\junie\\junie.exe" else null,
        )

    private fun find(root: String?, windows: Boolean, folders: List<String>, files: List<String>): String? =
        IdeManagedJunie.find(root, windows, { folders }, { it in files })

    @Test
    fun `AC-054 the highest version by numeric segments is used`() {
        val files = windowsFiles("4100.11.0") + windowsFiles("4171.4.0")
        assertEquals("$windowsAgents\\4171.4.0\\junie\\junie.exe", find(windowsRoot, true, listOf("4100.11.0", "4171.4.0"), files))
        assertEquals("$windowsAgents\\4171.4.0\\junie\\junie.exe", find(windowsRoot, true, listOf("4171.4.0", "4100.11.0"), files))
        val tens = windowsFiles("9.9") + windowsFiles("10.0")
        assertEquals("$windowsAgents\\10.0\\junie\\junie.exe", find(windowsRoot, true, listOf("9.9", "10.0"), tens))
    }

    @Test
    fun `AC-054 folders without the installed marker, without the executable or with a non numeric name are ignored`() {
        val files = windowsFiles("4100.11.0") + windowsFiles("4300.0.0", installed = false) + windowsFiles("4200.0.0", executable = false) +
            windowsFiles("latest") + windowsFiles("5.x") + windowsFiles(".downloads")
        val folders = listOf("4100.11.0", "4300.0.0", "4200.0.0", "latest", "5.x", ".downloads", "")
        assertEquals("$windowsAgents\\4100.11.0\\junie\\junie.exe", find(windowsRoot, true, folders, files))
    }

    @Test
    fun `AC-054 no valid folder, a missing directory or no system path is no Junie`() {
        assertNull(find(windowsRoot, true, emptyList(), emptyList()))
        assertNull(find(windowsRoot, true, listOf("4100.11.0"), windowsFiles("4100.11.0", installed = false)))
        assertNull(find(null, true, listOf("4100.11.0"), windowsFiles("4100.11.0")))
        assertNull(find("  ", true, listOf("4100.11.0"), windowsFiles("4100.11.0")))
    }

    @Test
    fun `AC-054 the executable is junie dot exe on Windows and junie elsewhere`() {
        assertEquals("junie.exe", IdeManagedJunie.executableName(true))
        assertEquals("junie", IdeManagedJunie.executableName(false))
        val files = listOf("$unixAgents/4171.4.0/.installed", "$unixAgents/4171.4.0/junie/junie")
        assertEquals("$unixAgents/4171.4.0/junie/junie", find(unixRoot, false, listOf("4171.4.0"), files))
        assertNull(find(unixRoot, true, listOf("4171.4.0"), files))
        assertNull(find(unixRoot, false, listOf("4171.4.0"), listOf("$unixAgents/4171.4.0/.installed", "$unixAgents/4171.4.0/junie/junie.exe")))
    }

    @Test
    fun `AC-054 a trailing separator of the system path does not double`() {
        val files = windowsFiles("1.0")
        assertEquals("$windowsAgents\\1.0\\junie\\junie.exe", find("$windowsRoot\\", true, listOf("1.0"), files))
    }

    @Test
    fun `AC-054 the version order is numeric, short versions count as padded with zeros`() {
        assertEquals(listOf(4171, 4, 0), IdeManagedJunie.version("4171.4.0"))
        assertNull(IdeManagedJunie.version("4171.4.x"))
        assertNull(IdeManagedJunie.version("1..2"))
        assertNull(IdeManagedJunie.version(""))
        assertNull(IdeManagedJunie.version("-1.0"))
        assertEquals(0, IdeManagedJunie.compare(listOf(1, 0), listOf(1, 0, 0)))
        assertEquals(1, IdeManagedJunie.compare(listOf(10, 0), listOf(9, 9)))
        assertEquals(-1, IdeManagedJunie.compare(listOf(4100, 11, 0), listOf(4171, 4, 0)))
    }

    @Test
    fun `AC-054 only Junie has an IDE-managed path`() {
        assertEquals("/x/junie", IdeManagedJunie.managedPath(CliAgents.JUNIE) { "/x/junie" })
        assertNull(IdeManagedJunie.managedPath(CliAgents.CLAUDE_CODE) { "/x/junie" })
        assertNull(IdeManagedJunie.managedPath(CliAgents.COPILOT) { "/x/junie" })
    }

    @Test
    fun `AC-054 the PATH is preferred, the IDE-managed path is used only without it`() {
        assertEquals("junie", IdeManagedJunie.launch(CliAgents.JUNIE, true, "/x/junie"))
        assertEquals("/x/junie", IdeManagedJunie.launch(CliAgents.JUNIE, false, "/x/junie"))
        assertEquals("junie", IdeManagedJunie.launch(CliAgents.JUNIE, false, null))
        assertEquals("claude", IdeManagedJunie.launch(CliAgents.CLAUDE_CODE, false, null))
    }

    @Test
    fun `AC-054 the IDE-managed Junie makes the agent available, the PATH one too`() {
        val terminal = listOf(PluginIds.TERMINAL)
        val none = { _: String, _: String -> false }
        val onPath = CliAvailability.finder({ "/bin" }, ':', none)
        val managed = CliAvailability.orManaged(onPath) { agent -> IdeManagedJunie.managedPath(agent) { "/x/junie" } }
        assertEquals(listOf("org.jetbrains.plugins.terminal", "cli:junie"), CliAvailability.snapshot(terminal, managed))
        val onPathOnly = CliAvailability.finder({ "/bin" }, ':') { directory, name -> directory == "/bin" && (name == "claude" || name == "junie") }
        val both = CliAvailability.orManaged(onPathOnly) { null }
        assertEquals(listOf("org.jetbrains.plugins.terminal", "cli:junie", "cli:claude"), CliAvailability.snapshot(terminal, both))
        assertEquals(emptyList<String>(), CliAvailability.snapshot(emptyList(), managed))
    }

    @Test
    fun `AC-055 a path without special characters is typed as it is, a plain command always`() {
        assertEquals("junie", ShellCommand.launch("junie", ShellCommand.Shell.POWERSHELL))
        assertEquals("junie", ShellCommand.launch("junie", ShellCommand.Shell.POSIX))
        assertEquals("C:\\a\\junie.exe", ShellCommand.launch("C:\\a\\junie.exe", ShellCommand.Shell.POWERSHELL))
        assertEquals("C:\\a\\junie.exe", ShellCommand.launch("C:\\a\\junie.exe", ShellCommand.Shell.CMD))
        assertEquals("/opt/x/junie", ShellCommand.launch("/opt/x/junie", ShellCommand.Shell.POSIX))
    }

    @Test
    fun `AC-055 a path with a space is quoted for the shell of the terminal`() {
        val path = "C:\\Users\\Gregor B\\AppData\\junie.exe"
        assertEquals("& 'C:\\Users\\Gregor B\\AppData\\junie.exe'", ShellCommand.launch(path, ShellCommand.Shell.POWERSHELL))
        assertEquals("\"C:\\Users\\Gregor B\\AppData\\junie.exe\"", ShellCommand.launch(path, ShellCommand.Shell.CMD))
        assertEquals("'C:\\Users\\Gregor B\\AppData\\junie.exe'", ShellCommand.launch(path, ShellCommand.Shell.POSIX))
        assertEquals("'/home/o'\\''brien/junie'", ShellCommand.launch("/home/o'brien/junie", ShellCommand.Shell.POSIX))
        assertEquals("& 'C:\\o''brien\\junie.exe'", ShellCommand.launch("C:\\o'brien\\junie.exe", ShellCommand.Shell.POWERSHELL))
    }

    @Test
    fun `AC-055 a backslash path is quoted in a POSIX shell even without a space`() {
        assertEquals("'C:\\a\\junie.exe'", ShellCommand.launch("C:\\a\\junie.exe", ShellCommand.Shell.POSIX))
    }

    @Test
    fun `AC-055 the shell is told by its file name, PowerShell on Windows and POSIX elsewhere when unknown`() {
        assertEquals(ShellCommand.Shell.POWERSHELL, ShellCommand.shellOf("C:\\Program Files\\PowerShell\\7\\pwsh.exe", true))
        assertEquals(ShellCommand.Shell.POWERSHELL, ShellCommand.shellOf("powershell.exe", true))
        assertEquals(ShellCommand.Shell.CMD, ShellCommand.shellOf("C:\\Windows\\System32\\cmd.exe", true))
        assertEquals(ShellCommand.Shell.POSIX, ShellCommand.shellOf("C:\\Program Files\\Git\\bin\\bash.exe", true))
        assertEquals(ShellCommand.Shell.POSIX, ShellCommand.shellOf("/bin/zsh", false))
        assertEquals(ShellCommand.Shell.POWERSHELL, ShellCommand.shellOf(null, true))
        assertEquals(ShellCommand.Shell.POSIX, ShellCommand.shellOf(null, false))
    }
}

package com.gregorbiswanger.featherspec.studio.ports

import com.gregorbiswanger.featherspec.studio.assistant.CliAgent
import com.gregorbiswanger.featherspec.studio.assistant.CliAgents
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class CliAvailabilityTest {
    private val terminal = listOf(PluginIds.TERMINAL)

    private fun fileSystem(vararg present: String): (String, String) -> Boolean = { directory, name -> "${directory.trimEnd('/')}/$name" in present }

    private fun onPath(path: String?, vararg present: String): (CliAgent) -> Boolean =
        { agent -> CliAvailability.found(agent, path, ':', fileSystem(*present)) }

    @Test
    fun `AC-044 the presence id of an agent is cli and its command`() {
        assertEquals(listOf("cli:junie", "cli:claude", "cli:copilot"), CliAgents.ALL.map { CliAvailability.presenceId(it) })
    }

    @Test
    fun `AC-044 every name of each agent on the PATH makes it available, in every directory`() {
        for (agent in CliAgents.ALL) {
            for (name in agent.pathNames) {
                assertTrue(CliAvailability.found(agent, "/usr/bin:/opt/tools", ':', fileSystem("/opt/tools/$name")), "${agent.id} $name")
            }
        }
    }

    @Test
    fun `AC-044 blank and quoted entries, an empty PATH and another agent's folder do not confuse the search`() {
        val junie = CliAgents.JUNIE
        assertTrue(CliAvailability.found(junie, "\"C:\\Program Files\\Junie\";C:\\bin;", ';', fileSystem("C:\\Program Files\\Junie/junie.exe")))
        assertFalse(CliAvailability.found(junie, null, ':', fileSystem("/junie")))
        assertFalse(CliAvailability.found(junie, "", ':', fileSystem("/junie")))
        assertFalse(CliAvailability.found(junie, " : :: ", ':', fileSystem("/junie", "/ /junie")))
        assertFalse(CliAvailability.found(junie, "/opt/claude-tools", ':', fileSystem("/opt/claude-tools/claude", "/opt/claude-tools/junie-helper")))
        assertFalse(CliAvailability.found(junie, "/usr/bin", ':', fileSystem("/usr/bin/Junie.txt", "/usr/bin/juniex")))
    }

    @Test
    fun `AC-044 the snapshot adds a cli id for each agent on the PATH, in table order, after the plugin ids`() {
        val all = CliAvailability.snapshot(terminal, onPath("/bin", "/bin/copilot", "/bin/claude", "/bin/junie"))
        assertEquals(listOf("org.jetbrains.plugins.terminal", "cli:junie", "cli:claude", "cli:copilot"), all)
        assertEquals(listOf("org.jetbrains.plugins.terminal", "cli:claude"), CliAvailability.snapshot(terminal, onPath("/bin", "/bin/claude.cmd")))
        assertEquals(terminal, CliAvailability.snapshot(terminal, onPath("/bin")))
    }

    @Test
    fun `AC-044 without the Terminal plugin no cli id is listed, however many agents are on the PATH`() {
        assertEquals(emptyList<String>(), CliAvailability.snapshot(emptyList(), onPath("/bin", "/bin/claude", "/bin/junie", "/bin/copilot")))
    }

    @Test
    fun `AC-044 the PATH is read once for all agents and a failing read is no agent`() {
        var reads = 0
        val found = CliAvailability.finder({ reads++; "/bin" }, ':', fileSystem("/bin/junie"))
        assertEquals(listOf("cli:junie"), CliAvailability.snapshot(terminal, found).drop(1))
        assertEquals(1, reads)
        val failing = CliAvailability.finder({ throw IllegalStateException("no PATH") }, ':', fileSystem("/bin/junie"))
        assertEquals(terminal, CliAvailability.snapshot(terminal, failing))
    }

    @Test
    fun `AC-044 the PATH comes from the IDE environment first and the process environment second`() {
        assertEquals("/ide", CliAvailability.pathOf({ "/ide" }, { "/process" }))
        assertEquals("/process", CliAvailability.pathOf({ null }, { "/process" }))
        assertEquals("/process", CliAvailability.pathOf({ "" }, { "/process" }))
        assertEquals("/process", CliAvailability.pathOf({ throw ClassNotFoundException("x") }, { "/process" }))
        assertEquals(null, CliAvailability.pathOf({ null }, { null }))
    }
}

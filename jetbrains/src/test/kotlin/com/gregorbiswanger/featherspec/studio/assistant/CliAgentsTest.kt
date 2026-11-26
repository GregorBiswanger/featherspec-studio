package com.gregorbiswanger.featherspec.studio.assistant

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class CliAgentsTest {
    @Test
    fun `AC-044 the table lists the three agents with the names of the spec`() {
        assertEquals(listOf("junie", "claudeCode", "copilot"), CliAgents.ALL.map { it.id })
        assertEquals(listOf("Junie", "Claude Code", "Copilot"), CliAgents.ALL.map { it.displayName })
        assertEquals(listOf("junie", "claude", "copilot"), CliAgents.ALL.map { it.command })
        assertEquals(listOf("Junie", "Claude Code", "GitHub Copilot"), CliAgents.ALL.map { it.tabName })
        assertEquals(listOf("junie", "junie.exe", "junie.bat", "junie.cmd"), CliAgents.JUNIE.pathNames)
        assertEquals(listOf("claude", "claude.exe", "claude.cmd"), CliAgents.CLAUDE_CODE.pathNames)
        assertEquals(listOf("copilot", "copilot.exe", "copilot.cmd"), CliAgents.COPILOT.pathNames)
    }

    @Test
    fun `AC-048 a new tab starts the bare command and nothing else`() {
        for (agent in CliAgents.ALL) {
            assertEquals(agent.command, agent.command.trim())
            assertFalse(agent.command.any { it.isWhitespace() })
            assertFalse(agent.command.startsWith("-"))
            assertTrue(agent.command in agent.pathNames)
        }
    }

    @Test
    fun `AC-049 every agent says K-1 pending and the paste is bracketed until K-1`() {
        assertEquals(listOf("K-1 pending", "K-1 pending", "K-1 pending"), CliAgents.ALL.map { it.markersStatus })
        assertEquals(listOf(PasteMode.BRACKETED, PasteMode.BRACKETED, PasteMode.BRACKETED), CliAgents.ALL.map { it.pasteMode })
    }

    @Test
    fun `AC-049 the markers are the provisional ones of the spec`() {
        assertEquals(listOf("? for shortcuts", "shift+tab"), CliAgents.JUNIE.inputMarkers)
        assertEquals(
            listOf("Continue with JetBrains account", "Use a Junie API key", "Do you trust", "integration plugin"),
            CliAgents.JUNIE.waitingMarkers,
        )
        assertEquals(listOf("@ to mention files", "/ for commands", "? for help"), CliAgents.COPILOT.inputMarkers)
        assertEquals(
            listOf("trust the files in this folder", "Yes, and remember this folder for future sessions", "No (Esc)", "/login"),
            CliAgents.COPILOT.waitingMarkers,
        )
    }

    @Test
    fun `AC-047 the Claude row is the lists of ClaudeReadiness, so the Claude instance is unchanged`() {
        assertEquals(ClaudeReadiness.INPUT_MARKERS, CliAgents.CLAUDE_CODE.inputMarkers)
        assertEquals(ClaudeReadiness.WAITING_MARKERS, CliAgents.CLAUDE_CODE.waitingMarkers)
        assertEquals(ClaudeReadiness.MARKERS_STATUS, CliAgents.CLAUDE_CODE.markersStatus)
    }

    @Test
    fun `AC-049 an input marker after the last waiting marker is an input box, a dialog below it is not`() {
        val junie = CliAgents.JUNIE
        assertTrue(junie.hasInputBox("Junie\n? for shortcuts"))
        assertTrue(junie.hasInputBox("Continue with JetBrains account\n\n? for shortcuts"))
        assertFalse(junie.hasInputBox("? for shortcuts\nContinue with JetBrains account"))
        assertFalse(junie.hasInputBox(""))
        val copilot = CliAgents.COPILOT
        assertTrue(copilot.hasInputBox("Copilot\n@ to mention files"))
        assertFalse(copilot.hasInputBox("@ to mention files\nYes, and remember this folder for future sessions"))
    }

    @Test
    fun `AC-049 another agent's marker is no marker of this agent`() {
        assertFalse(CliAgents.COPILOT.hasInputBox("? for shortcuts"))
        assertFalse(CliAgents.JUNIE.hasInputBox("@ to mention files"))
    }

    @Test
    fun `AC-048 a command is the agent's command or that command with exe bat or cmd, then arguments`() {
        for (text in listOf("junie", "junie --help", "junie.exe", "junie.bat x", "junie.cmd", "  junie  ")) {
            assertTrue(CliAgents.JUNIE.isCommand(text), text)
        }
        for (text in listOf("claude", "claude.exe", "claude.bat", "claude.cmd", "claude -c")) {
            assertTrue(CliAgents.CLAUDE_CODE.isCommand(text), text)
        }
        for (text in listOf("copilot", "copilot.exe", "copilot.cmd --banner")) {
            assertTrue(CliAgents.COPILOT.isCommand(text), text)
        }
        for (text in listOf("junie2", "junies", "junie.ps1", "xjunie", "echo junie", "", "  ")) {
            assertFalse(CliAgents.JUNIE.isCommand(text), text)
        }
        assertFalse(CliAgents.JUNIE.isCommand(null))
    }

    @Test
    fun `AC-048 a tab running another agent is never this agent's terminal`() {
        assertEquals(CliAgents.CLAUDE_CODE, CliAgents.agentOf("claude"))
        assertEquals(CliAgents.JUNIE, CliAgents.agentOf("junie.bat"))
        assertEquals(CliAgents.COPILOT, CliAgents.agentOf("copilot --foo"))
        assertNull(CliAgents.agentOf("git status"))
        assertNull(CliAgents.agentOf(null))
        assertFalse(CliAgents.JUNIE.isCommand("claude"))
        assertFalse(CliAgents.COPILOT.isCommand("junie"))
    }

    @Test
    fun `AC-048 names compare without case only where the file system ignores case`() {
        assertFalse(CliAgents.JUNIE.isCommand("JUNIE.EXE"))
        assertTrue(CliAgents.JUNIE.isCommand("JUNIE.EXE", caseInsensitive = true))
        assertEquals(CliAgents.COPILOT, CliAgents.agentOf("Copilot.cmd", caseInsensitive = true))
        assertNull(CliAgents.agentOf("Copilot.cmd"))
    }

    @Test
    fun `AC-044 agents are found by id`() {
        assertEquals(CliAgents.JUNIE, CliAgents.byId("junie"))
        assertEquals(CliAgents.CLAUDE_CODE, CliAgents.byId("claudeCode"))
        assertEquals(CliAgents.COPILOT, CliAgents.byId("copilot"))
        assertNull(CliAgents.byId("none"))
        assertNull(CliAgents.byId(null))
        assertNull(CliAgents.byId("copyForCopilot"))
    }

    private fun fileSystem(vararg present: String): (String, String) -> Boolean = { directory, name -> "${directory.trimEnd('/')}/$name" in present }

    @Test
    fun `AC-044 every name of every agent is found in every directory of the PATH`() {
        for (agent in CliAgents.ALL) {
            for (name in agent.pathNames) {
                assertTrue(CliOnPath.found(agent.pathNames, "/a:/b/bin:/c", ':', fileSystem("/b/bin/$name")), name)
                assertEquals(name, CliOnPath.match(agent.pathNames, "/a:/b/bin:/c", ':', fileSystem("/b/bin/$name")))
            }
        }
    }

    @Test
    fun `AC-044 a directory that holds only another agent's name finds nothing`() {
        val present = fileSystem("/a/claude", "/a/claude.exe", "/b/copilot")
        assertFalse(CliOnPath.found(CliAgents.JUNIE.pathNames, "/a:/b", ':', present))
        assertTrue(CliOnPath.found(CliAgents.CLAUDE_CODE.pathNames, "/a:/b", ':', present))
        assertTrue(CliOnPath.found(CliAgents.COPILOT.pathNames, "/a:/b", ':', present))
        assertNull(CliOnPath.match(CliAgents.JUNIE.pathNames, "/a:/b", ':', present))
    }

    @Test
    fun `AC-044 an empty or blank PATH and blank entries find nothing`() {
        for (path in listOf<String?>(null, "", "   ", ":", " : ")) {
            assertFalse(CliOnPath.found(CliAgents.JUNIE.pathNames, path, ':', { _, _ -> true }), "[$path]")
        }
        assertTrue(CliOnPath.found(CliAgents.JUNIE.pathNames, ":/a:", ':', fileSystem("/a/junie")))
    }

    @Test
    fun `AC-044 quoted Windows entries and a trailing separator are read as directories`() {
        val present: (String, String) -> Boolean = { directory, name -> directory == "C:\\Program Files\\Junie" && name == "junie.bat" }
        assertTrue(CliOnPath.found(CliAgents.JUNIE.pathNames, "C:\\x;\"C:\\Program Files\\Junie\";", ';', present))
        assertFalse(CliOnPath.found(CliAgents.COPILOT.pathNames, "C:\\x;\"C:\\Program Files\\Junie\";", ';', present))
    }

    @Test
    fun `AC-044 a directory is a regular file check, not a name check`() {
        assertFalse(CliOnPath.existsOnDisk("/definitely/not/here", "junie"))
        assertFalse(CliOnPath.existsOnDisk("\u0000", "junie"))
    }

    @Test
    fun `AC-055 a full path is the agent's command by its file name without extension, with or without quotes`() {
        val windows = "C:\\Users\\Gregor B\\AppData\\Local\\JetBrains\\Rider2026.3\\acp-agents\\junie\\4171.4.0\\junie\\junie.exe"
        for (text in listOf("\"$windows\"", "& '$windows'", "\"$windows\" --help", "C:\\tools\\junie.exe", "/home/gregor/.cache/junie/4171.4.0/junie/junie", "'/opt/a b/junie'", "./junie")) {
            assertTrue(CliAgents.JUNIE.isCommand(text), text)
            assertEquals(CliAgents.JUNIE, CliAgents.agentOf(text), text)
        }
        assertTrue(CliAgents.JUNIE.isCommand("\"C:\\a b\\JUNIE.EXE\""))
        assertTrue(CliAgents.CLAUDE_CODE.isCommand("/usr/local/bin/claude"))
    }

    @Test
    fun `AC-055 a path of another file name, an unclosed quote or a command that only mentions a path is no agent tab`() {
        assertFalse(CliAgents.JUNIE.isCommand("\"C:\\a b\\junie2.exe\""))
        assertFalse(CliAgents.JUNIE.isCommand("/opt/junie/bin/other"))
        assertFalse(CliAgents.JUNIE.isCommand("\"C:\\a b\\junie.exe"))
        assertFalse(CliAgents.JUNIE.isCommand("& "))
        assertFalse(CliAgents.JUNIE.isCommand("cat /opt/junie"))
        assertFalse(CliAgents.JUNIE.isCommand("\"C:\\a b\\junie.ps1\""))
        assertFalse(CliAgents.COPILOT.isCommand("\"C:\\a b\\junie.exe\""))
    }
}

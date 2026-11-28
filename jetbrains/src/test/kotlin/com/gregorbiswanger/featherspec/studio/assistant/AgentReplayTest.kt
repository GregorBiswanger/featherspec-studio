package com.gregorbiswanger.featherspec.studio.assistant

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

// AC-049 replay: the screens K-1 saw on Gregor's Rider 2026.3 (2026-11-27/28), as text. When a CLI changes its screen, the
// markers in CliAgents.kt change and this test says which agent no longer reads as ready.
class AgentReplayTest {
    private val junieInput = """
        / available commands
        @ search for a file or a folder
        ! bash command
        ? show help
        § Agent heading down the wrong path? Use Plan Mode (shift + tab or /plan)...
        ▲ 1 MCP Setup Issue — run /mcp to manage
        > Tell me about this project
        ~ tip-split-rider-test (main)  Brave on ctrl + b  GPT-6.1 Terra High Eco
    """.trimIndent()

    private val claudeInput = """
        Claude Code v2.1.296
        Opus 5.5 (1M context) · Claude Ultra
        C:\projects\test\tip-split-rider-test
        Updated to latest.
        ❯ 
        ⏵⏵ auto mode on (shift+tab to cycle)
    """.trimIndent()

    private val copilotInput = """
        Current Sessions  Issues  Pull requests  Gists
        Copilot v1.0.116 uses AI. Check for mistakes.
        ● Connected to JetBrains Rider
        ● MCP Servers reloaded: 4 servers connected
        C:\projects\test\tip-split-rider-test [main%]   Run on: This computer ctrl+e change environment
        ▌
        ← open sidebar · Interactive · Manual Approval · / commands · ? help · tab next tab
    """.trimIndent()

    private val junieWaiting = "Welcome to Junie\nContinue with JetBrains account\nUse a Junie API key"
    private val claudeWaiting = "Claude Code v2.1.296\nDo you trust the files in this folder?\n❯ 1. Yes, proceed\n2. No, exit\nEnter to confirm"
    private val copilotWaiting = "Copilot v1.0.116\nDo you trust the files in this folder?\nYes, and remember this folder for future sessions\nNo (Esc)"

    @Test
    fun `AC-049 the input screen of Junie 26_11_3 is an input box`() {
        assertTrue(CliAgents.JUNIE.hasInputBox(junieInput))
    }

    @Test
    fun `AC-049 the input screen of Claude Code 2_1_296 is an input box`() {
        assertTrue(CliAgents.CLAUDE_CODE.hasInputBox(claudeInput))
    }

    @Test
    fun `AC-049 the input screen of Copilot CLI 1_0_116 is an input box`() {
        assertTrue(CliAgents.COPILOT.hasInputBox(copilotInput))
    }

    @Test
    fun `AC-049 a trust or login screen is no input box for its agent`() {
        assertFalse(CliAgents.JUNIE.hasInputBox(junieWaiting))
        assertFalse(CliAgents.CLAUDE_CODE.hasInputBox(claudeWaiting))
        assertFalse(CliAgents.COPILOT.hasInputBox(copilotWaiting))
    }

    @Test
    fun `AC-049 a dialog left in the scrollback above the input screen does not count as waiting`() {
        assertTrue(CliAgents.JUNIE.hasInputBox("$junieWaiting\n$junieInput"))
        assertTrue(CliAgents.CLAUDE_CODE.hasInputBox("$claudeWaiting\n$claudeInput"))
        assertTrue(CliAgents.COPILOT.hasInputBox("$copilotWaiting\n$copilotInput"))
    }
}

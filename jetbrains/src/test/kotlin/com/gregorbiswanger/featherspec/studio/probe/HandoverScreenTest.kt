package com.gregorbiswanger.featherspec.studio.probe

import com.gregorbiswanger.featherspec.studio.assistant.CliAgents
import com.gregorbiswanger.featherspec.studio.assistant.Screen
import com.gregorbiswanger.featherspec.studio.assistant.TerminalTab
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class HandoverScreenTest {
    private val home = "C:\\Users\\gregor"
    private val ready = "Welcome to Claude Code\n\u2502 > Try \"fix\"\n  ? for shortcuts\n\n\n"
    private val trust = "Do you trust the files in this folder?\n\u276f 1. Yes, proceed\n  2. No, exit\nEnter to confirm"

    private fun tab(command: String? = "claude", cwd: String? = "C:\\Users\\gregor\\proj") = TerminalTab("k", true, true, command, cwd)

    @Test
    fun emailAddressesBecomeEmail() {
        assertEquals("login as <email> now", Redaction.redact("login as gregor.b+x@example.co.uk now", null))
    }

    @Test
    fun longTokenLikeRunsBecomeToken() {
        val token = "sk_ant-ABCdef0123456789_xyzQ"
        assertTrue(token.length >= 24)
        assertEquals("key <token> end", Redaction.redact("key $token end", null))
    }

    @Test
    fun aRunOfTwentyThreeCharactersStaysAndTwentyFourGoes() {
        val shortRun = "a".repeat(23)
        assertEquals(shortRun, Redaction.redact(shortRun, null))
        assertEquals("<token>", Redaction.redact("a".repeat(24), null))
    }

    @Test
    fun aSpacedSentenceIsNotAToken() {
        val line = "Do you trust the files in this folder? shift+tab to cycle"
        assertEquals(line, Redaction.redact(line, null))
    }

    @Test
    fun homeBecomesTildeWithEitherSeparatorAndAnyCase() {
        assertEquals("~\\proj and ~/proj and ~/x", Redaction.redact("C:\\Users\\gregor\\proj and C:/Users/gregor/proj and c:\\users\\GREGOR/x", home))
        assertEquals("cd ~/work", Redaction.redact("cd /home/gregor/work", "/home/gregor"))
    }

    @Test
    fun homeOnlyMatchesAWholeFolderName() {
        assertEquals("C:\\Users\\gregor2\\p", Redaction.redact("C:\\Users\\gregor2\\p", home))
        assertEquals("~", Redaction.redact("C:\\Users\\gregor", home))
    }

    @Test
    fun aMissingOrTrivialHomeChangesNothing() {
        for (value in listOf(null, "", "  ", "/", "\\")) {
            assertEquals("/usr/bin and C:\\x", Redaction.redact("/usr/bin and C:\\x", value))
        }
    }

    @Test
    fun emailsInsideThePathOfTheHomeAreStillRedacted() {
        assertEquals("~ <email>", Redaction.redact("C:\\Users\\gregor a.b@c.de", home))
    }

    @Test
    fun theTailKeepsTheEndAfterRedactionAndTrimsTrailingWhitespace() {
        assertEquals("<email> end", Redaction.tail("x ".repeat(50) + "me@a.bc end  \n\n", null, 11))
        assertEquals(1_500, Redaction.tail("z ".repeat(1_000), null).length)
        assertFalse(Redaction.tail("abc  \n\n", null).endsWith("\n"))
    }

    @Test
    fun thePasteTailsHideAnEmailAndTheHome() {
        val tail = Redaction.tail("signed in: me@example.com in C:\\Users\\gregor\\proj\n", home)
        assertEquals("signed in: <email> in ~\\proj", tail)
    }

    @Test
    fun theVerdictIsReadyOnlyWhenClaudeRunsAndTheInputBoxIsLast() {
        assertEquals("ready", HandoverScreen.verdict(CliAgents.CLAUDE_CODE, true, ready))
        assertEquals("ready", HandoverScreen.verdict(CliAgents.CLAUDE_CODE, true, trust + "\n" + ready))
        assertTrue(CliAgents.CLAUDE_CODE.hasInputBox(ready))
    }

    @Test
    fun aDialogAfterTheBoxIsWaiting() {
        assertEquals("waiting", HandoverScreen.verdict(CliAgents.CLAUDE_CODE, true, ready + trust))
        assertEquals("waiting", HandoverScreen.verdict(CliAgents.CLAUDE_CODE, true, trust))
        assertEquals("waiting", HandoverScreen.verdict(CliAgents.CLAUDE_CODE, false, trust))
    }

    @Test
    fun noMarkerOrNoRunningClaudeIsUnknown() {
        assertEquals("unknown", HandoverScreen.verdict(CliAgents.CLAUDE_CODE, true, "Thinking... (esc to interrupt)\n"))
        assertEquals("unknown", HandoverScreen.verdict(CliAgents.CLAUDE_CODE, true, ""))
        assertEquals("unknown", HandoverScreen.verdict(CliAgents.CLAUDE_CODE, false, ready))
    }

    @Test
    fun everyMarkerConstantIsReportedWithItsLastLine() {
        val hits = HandoverScreen.markers("a\n? for shortcuts\nb\n? for shortcuts\nc")
        assertEquals(CliAgents.ALL.sumOf { it.inputMarkers.size + it.waitingMarkers.size }, hits.size)
        val shortcuts = hits.single { it.group == "claudeCode.input" && it.marker == "? for shortcuts" }
        assertEquals("claudeCode.input", shortcuts.group)
        assertTrue(shortcuts.hit)
        assertEquals(4, shortcuts.line)
        val trustMarker = hits.single { it.marker == "Yes, proceed" }
        assertEquals("claudeCode.waiting", trustMarker.group)
        assertFalse(trustMarker.hit)
        assertNull(trustMarker.line)
    }

    @Test
    fun theLineOfAMarkerCountsWindowsLineEndingsOnce() {
        assertEquals(3, HandoverScreen.markers("a\r\nb\r\n? for shortcuts").first { it.hit }.line)
    }

    @Test
    fun theTabJsonHoldsVerdictMarkersCountsAndTheRedactedLastTwelveLines() {
        val lines = (1..20).map { "line $it" }.toMutableList()
        lines[19] = "me@example.com ? for shortcuts C:\\Users\\gregor"
        val text = lines.joinToString("\n") + "\n\n\n"
        val json = HandoverScreen.tab(tab(), "Claude Code", Screen(true, text), null, home)
        assertEquals("Claude Code", json.get("name").asString)
        assertEquals("claude", json.get("command").asString)
        assertEquals("~\\proj", json.get("workingDirectory").asString)
        assertEquals("ready", json.get("verdict").asString)
        assertEquals("claudeCode", json.get("agent").asString)
        assertTrue(json.get("agentRunning").asBoolean)
        assertEquals(text.length, json.get("textLength").asInt)
        assertEquals(23, json.get("lineCount").asInt)
        assertEquals(3, json.get("trailingBlankLines").asInt)
        val last = json.getAsJsonArray("lastLines")
        assertEquals(12, last.size())
        assertEquals("line 9", last[0].asString)
        assertEquals("<email> ? for shortcuts ~", last[11].asString)
        assertEquals(CliAgents.ALL.sumOf { it.inputMarkers.size + it.waitingMarkers.size }, json.getAsJsonArray("markers").size())
        assertFalse(json.toString().contains("example.com"))
        assertFalse(json.toString().contains("gregor"))
    }

    @Test
    fun aLongLineIsCutAfterRedaction() {
        val json = HandoverScreen.tab(tab(), "t", Screen(true, "a b ".repeat(200)), null, null)
        assertEquals(HandoverScreen.LINE_LIMIT, json.getAsJsonArray("lastLines")[0].asString.length)
    }

    @Test
    fun aTabWithoutAScreenIsUnknownAndNamesTheError() {
        val json = HandoverScreen.tab(tab(command = null, cwd = null), null, null, "unavailable: boom me@x.yz", home)
        assertEquals("unknown", json.get("verdict").asString)
        assertEquals("unavailable: boom <email>", json.get("screenError").asString)
        assertEquals(0, json.getAsJsonArray("lastLines").size())
        assertEquals(0, json.get("textLength").asInt)
        assertTrue(json.get("name").isJsonNull)
        assertTrue(json.get("command").isJsonNull)
    }

    @Test
    fun theVerdictIsTheOneOfTheProductLogic() {
        for (text in listOf(ready, trust, ready + trust, trust + ready, "", "x")) {
            for (running in listOf(true, false)) {
                val product = running && CliAgents.CLAUDE_CODE.hasInputBox(text)
                assertEquals(product, HandoverScreen.verdict(CliAgents.CLAUDE_CODE, running, text) == "ready")
            }
        }
    }

    private val junieReady = "Junie CLI\n? for shortcuts\n"
    private val junieLogin = "Continue with JetBrains account\nUse a Junie API key\n"
    private val copilotReady = "GitHub Copilot\n@ to mention files\n"
    private val copilotTrust = "Do you trust the files in this folder? trust the files in this folder\nYes, and remember this folder for future sessions\nNo (Esc)"

    @Test
    fun `AC-049 the verdict of each agent uses that agent's markers`() {
        assertEquals("ready", HandoverScreen.verdict(CliAgents.JUNIE, true, junieReady))
        assertEquals("waiting", HandoverScreen.verdict(CliAgents.JUNIE, true, junieLogin))
        assertEquals("ready", HandoverScreen.verdict(CliAgents.COPILOT, true, copilotReady))
        assertEquals("waiting", HandoverScreen.verdict(CliAgents.COPILOT, true, copilotReady + copilotTrust))
        assertEquals("unknown", HandoverScreen.verdict(CliAgents.COPILOT, true, junieReady))
        assertEquals("unknown", HandoverScreen.verdict(CliAgents.JUNIE, false, junieReady))
    }

    @Test
    fun `AC-049 the markers of all three agents are reported in groups named after the agent`() {
        val groups = HandoverScreen.markers("x").map { it.group }.distinct()
        assertEquals(
            listOf("junie.input", "junie.waiting", "claudeCode.input", "claudeCode.waiting", "copilot.input", "copilot.waiting"),
            groups,
        )
    }

    @Test
    fun `AC-049 a tab shows the agent its command belongs to, the agent's verdict and every marker hit`() {
        val junie = HandoverScreen.tab(tab(command = "junie.bat"), "Junie", Screen(true, junieReady), null, home)
        assertEquals("junie", junie.get("agent").asString)
        assertEquals("ready", junie.get("verdict").asString)
        assertTrue(junie.get("agentRunning").asBoolean)
        val hits = junie.getAsJsonArray("markers").map { it.asJsonObject }
        assertTrue(hits.single { it.get("group").asString == "junie.input" && it.get("marker").asString == "? for shortcuts" }.get("hit").asBoolean)
        assertTrue(hits.single { it.get("group").asString == "claudeCode.input" && it.get("marker").asString == "? for shortcuts" }.get("hit").asBoolean)
        assertFalse(hits.single { it.get("group").asString == "copilot.input" && it.get("marker").asString == "@ to mention files" }.get("hit").asBoolean)
        val copilot = HandoverScreen.tab(tab(command = "copilot"), "GitHub Copilot", Screen(true, copilotReady + copilotTrust), null, home)
        assertEquals("copilot", copilot.get("agent").asString)
        assertEquals("waiting", copilot.get("verdict").asString)
    }

    @Test
    fun `AC-049 a tab of no agent has no agent, is not running one and is unknown`() {
        val json = HandoverScreen.tab(tab(command = "git status"), "Terminal", Screen(false, junieReady), null, home)
        assertTrue(json.get("agent").isJsonNull)
        assertFalse(json.get("agentRunning").asBoolean)
        assertEquals("unknown", json.get("verdict").asString)
    }

    @Test
    fun `AC-049 an agent that ended in the tab is not running, whatever the screen says`() {
        val ended = TerminalTab("k", true, false, "junie", "C:\\Users\\gregor\\proj")
        val json = HandoverScreen.tab(ended, "Junie", Screen(false, junieReady), null, home)
        assertEquals("junie", json.get("agent").asString)
        assertFalse(json.get("agentRunning").asBoolean)
        assertEquals("unknown", json.get("verdict").asString)
    }

    @Test
    fun `AC-049 a paste check says whether escape characters show and whether a new block started`() {
        assertTrue(HandoverScreen.escapeVisible("probe ^[[200~x"))
        assertTrue(HandoverScreen.escapeVisible("probe \u001b[200~x"))
        assertTrue(HandoverScreen.escapeVisible("probe [200~x"))
        assertFalse(HandoverScreen.escapeVisible("probe @README.md"))
        assertTrue(HandoverScreen.submitted(blocksBefore = 2, blocksAfter = 3))
        assertFalse(HandoverScreen.submitted(blocksBefore = 2, blocksAfter = 2))
    }
}

package com.gregorbiswanger.featherspec.studio.probe

import com.gregorbiswanger.featherspec.studio.assistant.ClaudeReadiness
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
        assertEquals("ready", HandoverScreen.verdict(true, ready))
        assertEquals("ready", HandoverScreen.verdict(true, trust + "\n" + ready))
        assertTrue(ClaudeReadiness.hasInputBox(ready))
    }

    @Test
    fun aDialogAfterTheBoxIsWaiting() {
        assertEquals("waiting", HandoverScreen.verdict(true, ready + trust))
        assertEquals("waiting", HandoverScreen.verdict(true, trust))
        assertEquals("waiting", HandoverScreen.verdict(false, trust))
    }

    @Test
    fun noMarkerOrNoRunningClaudeIsUnknown() {
        assertEquals("unknown", HandoverScreen.verdict(true, "Thinking... (esc to interrupt)\n"))
        assertEquals("unknown", HandoverScreen.verdict(true, ""))
        assertEquals("unknown", HandoverScreen.verdict(false, ready))
    }

    @Test
    fun everyMarkerConstantIsReportedWithItsLastLine() {
        val hits = HandoverScreen.markers("a\n? for shortcuts\nb\n? for shortcuts\nc")
        assertEquals(ClaudeReadiness.INPUT_MARKERS.size + ClaudeReadiness.WAITING_MARKERS.size, hits.size)
        val shortcuts = hits.single { it.marker == "? for shortcuts" }
        assertEquals("input", shortcuts.group)
        assertTrue(shortcuts.hit)
        assertEquals(4, shortcuts.line)
        val trustMarker = hits.single { it.marker == "Yes, proceed" }
        assertEquals("waiting", trustMarker.group)
        assertFalse(trustMarker.hit)
        assertNull(trustMarker.line)
    }

    @Test
    fun theLineOfAMarkerCountsWindowsLineEndingsOnce() {
        assertEquals(3, HandoverScreen.markers("a\r\nb\r\n? for shortcuts").single { it.hit }.line)
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
        assertTrue(json.get("claudeRunning").asBoolean)
        assertEquals(text.length, json.get("textLength").asInt)
        assertEquals(23, json.get("lineCount").asInt)
        assertEquals(3, json.get("trailingBlankLines").asInt)
        val last = json.getAsJsonArray("lastLines")
        assertEquals(12, last.size())
        assertEquals("line 9", last[0].asString)
        assertEquals("<email> ? for shortcuts ~", last[11].asString)
        assertEquals(ClaudeReadiness.INPUT_MARKERS.size + ClaudeReadiness.WAITING_MARKERS.size, json.getAsJsonArray("markers").size())
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
                val product = running && ClaudeReadiness.hasInputBox(text)
                assertEquals(product, HandoverScreen.verdict(running, text) == "ready")
            }
        }
    }
}

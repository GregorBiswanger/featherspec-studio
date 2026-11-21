package com.gregorbiswanger.featherspec.studio.probe

import com.gregorbiswanger.featherspec.studio.HostTexts
import com.gregorbiswanger.featherspec.studio.runtime.CoreState
import com.gregorbiswanger.featherspec.studio.runtime.UnavailableKind
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

class NoJcefCompareTest {
    private fun report(
        kind: String,
        state: String = kind,
        supported: Boolean = false,
        content: String = NoJcefCompare.NOTICE_CLASS,
        status: String = HostTexts.STATUS_UNAVAILABLE,
        balloons: Int = 3,
        settings: Boolean = true,
        help: String = HostTexts.OPEN_HELP,
    ): String {
        val reason = if (kind == "suspended") HostTexts.JCEF_SUSPENDED else HostTexts.JCEF_UNSUPPORTED
        return NoJcefReport(
            state = state,
            jcefSupported = supported,
            toolWindowContent = content,
            emptyText = "$reason\n$help",
            status = status,
            balloons = NoJcefCompare.ACTIONS.take(balloons).map { BalloonRecord(it, reason, listOf(help)) },
            settings = settings,
        ).toJson()
    }

    @Test
    fun `a complete report of each kind has no difference`() {
        assertEquals(emptyList<String>(), NoJcefCompare.differences("unsupported", report("unsupported")))
        assertEquals(emptyList<String>(), NoJcefCompare.differences("suspended", report("suspended")))
    }

    @Test
    fun `the other kind is a difference in the state and in every reason text`() {
        val problems = NoJcefCompare.differences("suspended", report("unsupported"))
        assertTrue(problems.any { it.startsWith("state: expected suspended, observed unsupported") })
        assertTrue(problems.any { it.startsWith("tool window notice lacks the reason") })
        assertEquals(3, problems.count { it.startsWith("balloon for ") && it.contains("lacks the reason") })
    }

    @Test
    fun `a loading state, a missing notice, a wrong status and a missing settings page are named`() {
        val problems = NoJcefCompare.differences(
            "unsupported",
            report("unsupported", state = "loading", content = "Tree", status = "", settings = false),
        )
        assertTrue(problems.any { it.startsWith("state: expected unsupported, observed loading") })
        assertTrue(problems.any { it.startsWith("tool window content") })
        assertTrue(problems.any { it.startsWith("status text") })
        assertTrue(problems.any { it.startsWith("the settings page") })
    }

    @Test
    fun `fewer than three balloons and a missing help action are named`() {
        val few = NoJcefCompare.differences("unsupported", report("unsupported", balloons = 2))
        assertTrue(few.any { it == "balloons: expected 3, observed 2" })
        assertTrue(few.any { it == "balloon for setup: missing" })
        val noHelp = NoJcefCompare.differences("unsupported", report("unsupported", help = "Dismiss"))
        assertTrue(noHelp.any { it.startsWith("tool window notice lacks 'Open help'") })
        assertEquals(3, noHelp.count { it.startsWith("balloon for ") && it.contains("lacks 'Open help'") })
    }

    @Test
    fun `balloons in the wrong order are named`() {
        val reason = HostTexts.JCEF_UNSUPPORTED
        val json = NoJcefReport(
            "unsupported", false, NoJcefCompare.NOTICE_CLASS, "$reason ${HostTexts.OPEN_HELP}", HostTexts.STATUS_UNAVAILABLE,
            listOf("setup", "open", "copyNextStep").map { BalloonRecord(it, reason, listOf(HostTexts.OPEN_HELP)) }, true,
        ).toJson()
        assertEquals(3, NoJcefCompare.differences("unsupported", json).count { it.startsWith("balloon ") && it.contains("expected action") })
    }

    @Test
    fun `no JSON object and an unknown kind are rejected`() {
        assertEquals(listOf("the probe wrote no JSON object"), NoJcefCompare.differences("unsupported", "nonsense"))
        assertEquals(listOf("the probe wrote no JSON object"), NoJcefCompare.differences("unsupported", "[]"))
        assertThrows<IllegalArgumentException> { NoJcefCompare.differences("loading", "{}") }
    }

    @Test
    fun `unsupported is unreachable only when JCEF stayed supported`() {
        assertTrue(NoJcefCompare.unreachable("unsupported", report("unsupported", state = "ready", supported = true)))
        assertFalse(NoJcefCompare.unreachable("unsupported", report("unsupported")))
        assertFalse(NoJcefCompare.unreachable("suspended", report("suspended", supported = true)))
        assertFalse(NoJcefCompare.unreachable("unsupported", "nonsense"))
    }

    @Test
    fun `the state names follow the core state`() {
        assertEquals("unsupported", NoJcefState.of(CoreState.Unavailable(UnavailableKind.UNSUPPORTED)))
        assertEquals("suspended", NoJcefState.of(CoreState.Unavailable(UnavailableKind.SUSPENDED)))
        assertEquals("loading", NoJcefState.of(CoreState.Loading))
        assertEquals("ready", NoJcefState.of(CoreState.Ready))
        assertEquals("failed", NoJcefState.of(CoreState.Failed("x")))
    }
}

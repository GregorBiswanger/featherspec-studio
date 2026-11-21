package com.gregorbiswanger.featherspec.studio.status

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.gregorbiswanger.featherspec.studio.HostTexts
import com.gregorbiswanger.featherspec.studio.actions.NoticeContent
import com.gregorbiswanger.featherspec.studio.runtime.CoreState
import com.gregorbiswanger.featherspec.studio.runtime.UnavailableKind
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.nio.file.Files
import java.nio.file.Path

class StatusEntryMappingTest {
    private val vocabulary: String = run {
        val relative = Path.of("src", "shared", "protocol", "vocabulary.ts")
        Files.readString(listOf(Path.of("..").resolve(relative), relative).first { Files.exists(it) })
    }

    private fun json(text: String, tooltip: JsonObject, command: String, accessible: String? = null): String =
        JsonObject().apply {
            addProperty("text", text)
            add("tooltip", tooltip)
            if (accessible != null) {
                addProperty("accessibleLabel", accessible)
            }
            addProperty("command", command)
        }.toString()

    private fun markdown(value: String) = JsonObject().apply { addProperty("markdown", value) }

    private fun plain(value: String) = JsonObject().apply { addProperty("plain", value) }

    private fun shown(display: StatusDisplay): StatusDisplay.Shown = display as StatusDisplay.Shown

    private val current = json(
        "\$(checklist) 0034 · In Progress · T-030",
        markdown(
            "**0034 · In Progress** Studio for JetBrains\n\nOpen the next step\n\nT-030 status bar\n\n" +
                "my\\-proj · FeatherSpec 1\\.10\\.0\n\nClick to copy the next step\\.\n\n" +
                "[Open Studio](command:featherspec-studio.open) · [Switch project](command:featherspec-studio.selectProject)",
        ),
        "copyNextStep",
        "0034, In Progress, T-030. Click to copy the next step.",
    )

    @Test
    fun `AC-016 a current step entry becomes icon text plain tooltip lines name and command`() {
        val display = shown(StatusEntryMapping.display(CoreState.Ready, current))
        assertEquals("checklist", display.view.iconId)
        assertEquals("0034 · In Progress · T-030", display.view.text)
        assertEquals(
            listOf(
                "0034 · In Progress Studio for JetBrains",
                "Open the next step",
                "T-030 status bar",
                "my-proj · FeatherSpec 1.10.0",
                "Click to copy the next step.",
            ),
            display.view.tooltipLines,
        )
        assertEquals("0034, In Progress, T-030. Click to copy the next step.", display.view.accessibleName)
        assertEquals(StatusClick.Invoke("copyNextStep"), display.click)
    }

    @Test
    fun `the idle and ready entries keep their text and the open click hint`() {
        val idle = json("\$(checklist) FeatherSpec", markdown("my project · FeatherSpec 1\\.10\\.0\n\nClick to open the Studio\\.\n\n[Open Studio](command:featherspec-studio.open)"), "copyNextStep")
        val view = shown(StatusEntryMapping.display(CoreState.Ready, idle)).view
        assertEquals("checklist", view.iconId)
        assertEquals("FeatherSpec", view.text)
        assertEquals(listOf("my project · FeatherSpec 1.10.0", "Click to open the Studio."), view.tooltipLines)
        assertEquals("FeatherSpec", view.accessibleName)
        val ready = shown(StatusEntryMapping.display(CoreState.Ready, json("\$(checklist) FeatherSpec · 3 ready", markdown("x"), "copyNextStep")))
        assertEquals("FeatherSpec · 3 ready", ready.view.text)
    }

    @Test
    fun `the no project entry is plain text and clicks select project`() {
        val entry = json("\$(folder) FeatherSpec", plain("FeatherSpec Studio: select the active project"), "selectProject")
        val display = shown(StatusEntryMapping.display(CoreState.Ready, entry))
        assertEquals(listOf("FeatherSpec Studio: select the active project"), display.view.tooltipLines)
        assertEquals(StatusClick.Invoke("selectProject"), display.click)
        assertEquals("folder", display.view.iconId)
    }

    @Test
    fun `an entry without an icon or accessible label keeps its text`() {
        val view = shown(StatusEntryMapping.display(CoreState.Ready, json("Plain text", plain("t"), "copyNextStep"))).view
        assertNull(view.iconId)
        assertEquals("Plain text", view.text)
        assertEquals("Plain text", view.accessibleName)
    }

    @Test
    fun `a null missing or malformed status hides the entry`() {
        for (payload in listOf(null, "null", "", "not json", "[]", "{}", """{"text":"x","command":"nope","tooltip":{"plain":"p"}}""", """{"command":"copyNextStep"}""")) {
            assertEquals(StatusDisplay.Hidden, StatusEntryMapping.display(CoreState.Ready, payload), payload.toString())
        }
    }

    @Test
    fun `AC-007 loading shows the spinner and the loading text without a click`() {
        val display = shown(StatusEntryMapping.display(CoreState.Loading, current))
        assertEquals(StatusEntryMapping.LOADING_ICON, display.view.iconId)
        assertEquals(listOf(HostTexts.LOADING), display.view.tooltipLines)
        assertEquals(HostTexts.LOADING, display.view.accessibleName)
        assertEquals(StatusClick.None, display.click)
        assertEquals("Loading project…", display.view.tooltipLines[0])
    }

    @Test
    fun `AC-030 unavailable shows the vocabulary text with the reason as tooltip and a notice click`() {
        for (kind in UnavailableKind.entries) {
            val display = shown(StatusEntryMapping.display(CoreState.Unavailable(kind), current))
            assertEquals(literal("    statusUnavailable:"), display.view.text)
            assertEquals(HostTexts.STATUS_UNAVAILABLE, display.view.text)
            assertEquals(listOf(NoticeContent.of(kind).text), display.view.tooltipLines)
            assertEquals(StatusClick.Notice(kind), display.click)
            assertEquals(StatusEntryMapping.WARNING_ICON, display.view.iconId)
            assertTrue(display.view.accessibleName.startsWith(HostTexts.STATUS_UNAVAILABLE))
        }
    }

    @Test
    fun `a failed core hides the entry`() {
        assertEquals(StatusDisplay.Hidden, StatusEntryMapping.display(CoreState.Failed("x"), current))
    }

    @Test
    fun `a ready core without a status is hidden`() {
        assertEquals(StatusDisplay.Hidden, StatusEntryMapping.display(CoreState.Ready, null))
    }

    @Test
    fun `tooltip html escapes markup and joins the lines`() {
        assertEquals("<html>a &lt;b&gt; &amp; &quot;c&quot;<br>d</html>", StatusEntryMapping.tooltipHtml(listOf("a <b> & \"c\"", "d")))
        assertNull(StatusEntryMapping.tooltipHtml(emptyList()))
    }

    @Test
    fun `a markdown tooltip with only command links yields no lines and a plain one splits on newlines`() {
        val onlyLinks = json("x", markdown("[Open Studio](command:featherspec-studio.open)"), "copyNextStep")
        assertEquals(emptyList<String>(), shown(StatusEntryMapping.display(CoreState.Ready, onlyLinks)).view.tooltipLines)
        val lines = json("x", plain("one\ntwo"), "copyNextStep")
        assertEquals(listOf("one", "two"), shown(StatusEntryMapping.display(CoreState.Ready, lines)).view.tooltipLines)
        val parsed = JsonParser.parseString(lines).asJsonObject
        assertEquals("copyNextStep", parsed.get("command").asString)
    }

    private fun literal(prefix: String): String {
        val line = vocabulary.lineSequence().first { it.startsWith(prefix) }
        val value = line.substring(prefix.length).trim()
        val quote = value[0]
        return value.substring(1, value.indexOf(quote, 1))
    }
}

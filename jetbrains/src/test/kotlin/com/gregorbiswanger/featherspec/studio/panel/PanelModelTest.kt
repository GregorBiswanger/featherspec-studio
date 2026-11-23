package com.gregorbiswanger.featherspec.studio.panel

import com.google.gson.JsonParser
import com.gregorbiswanger.featherspec.studio.HostTexts
import com.gregorbiswanger.featherspec.studio.runtime.CoreState
import com.gregorbiswanger.featherspec.studio.runtime.UnavailableKind
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

class PanelModelTest {
    @Test
    fun `AC-007 the loading state shows the loading text and ready shows the browser`() {
        assertEquals(PanelView.Loading, PanelViews.of(CoreState.Loading))
        assertEquals(HostTexts.LOADING, PanelViews.text(PanelView.Loading))
        assertEquals(PanelView.Browser, PanelViews.of(CoreState.Ready))
        assertNull(PanelViews.text(PanelView.Browser))
    }

    @Test
    fun `AC-007 a failed core shows the project could not be loaded text`() {
        val view = PanelViews.of(CoreState.Failed("boom"))
        assertEquals(PanelView.Failed("boom"), view)
        assertEquals(HostTexts.S5, PanelViews.text(view))
    }

    @Test
    fun `AC-030 an unavailable core shows the reason`() {
        assertEquals(HostTexts.JCEF_UNSUPPORTED, PanelViews.text(PanelViews.of(CoreState.Unavailable(UnavailableKind.UNSUPPORTED))))
        assertEquals(HostTexts.JCEF_SUSPENDED, PanelViews.text(PanelViews.of(CoreState.Unavailable(UnavailableKind.SUSPENDED))))
    }

    @Test
    fun `AC-013 the panel is opened once when the core is ready and never while it loads`() {
        val lifecycle = PanelLifecycle()
        assertNull(lifecycle.stateChanged(CoreState.Loading))
        assertEquals(PanelStep.OPENED, lifecycle.stateChanged(CoreState.Ready))
        assertNull(lifecycle.stateChanged(CoreState.Ready))
    }

    @Test
    fun `AC-013 the panel is closed on dispose only when it was opened`() {
        val opened = PanelLifecycle()
        opened.stateChanged(CoreState.Ready)
        assertEquals(PanelStep.CLOSED, opened.dispose())
        assertNull(opened.dispose())
        val never = PanelLifecycle()
        assertNull(never.dispose())
    }

    @Test
    fun `AC-013 a state change after dispose opens nothing`() {
        val lifecycle = PanelLifecycle()
        lifecycle.dispose()
        assertNull(lifecycle.stateChanged(CoreState.Ready))
    }

    @Test
    fun `AC-013 a failed or unavailable core never opens the panel`() {
        val lifecycle = PanelLifecycle()
        assertNull(lifecycle.stateChanged(CoreState.Failed("x")))
        assertNull(lifecycle.stateChanged(CoreState.Unavailable(UnavailableKind.SUSPENDED)))
        assertNull(lifecycle.dispose())
    }

    @Test
    fun `AC-014 the first load is not a reload and every later one is`() {
        val lifecycle = PanelLifecycle()
        assertFalse(lifecycle.nextLoadIsReload())
        assertTrue(lifecycle.nextLoadIsReload())
        assertTrue(lifecycle.nextLoadIsReload())
    }

    @Test
    fun `AC-014 only a json object from the panel reaches the core untouched`() {
        val envelope = """{"v":11,"kind":"req","type":"hello","payload":{"lastSeq":0}}"""
        assertEquals(envelope, PanelMessages.fromPanel(envelope))
        assertNull(PanelMessages.fromPanel("not json {"))
        assertNull(PanelMessages.fromPanel("[1,2]"))
        assertNull(PanelMessages.fromPanel("\"text\""))
        assertNull(PanelMessages.fromPanel("42"))
        assertNull(PanelMessages.fromPanel(""))
    }

    @Test
    fun `AC-014 an envelope is posted to the window of the panel`() {
        assertEquals("window.postMessage({\"v\":11,\"type\":\"shell\"},'*');", PanelMessages.postScript("{\"v\":11,\"type\":\"shell\"}"))
    }

    @Test
    fun `AC-014 the panelHtml arguments carry the origin and the reload flag`() {
        val args = JsonParser.parseString(PanelMessages.htmlArgs("abc", "https://studio.featherspec.invalid", true)).asJsonObject
        assertEquals(setOf("nonce", "cspSource", "scriptUri", "styleUri", "reloaded"), args.keySet())
        assertEquals("abc", args.get("nonce").asString)
        assertEquals("https://studio.featherspec.invalid", args.get("cspSource").asString)
        assertEquals("https://studio.featherspec.invalid/main.js", args.get("scriptUri").asString)
        assertEquals("https://studio.featherspec.invalid/main.css", args.get("styleUri").asString)
        assertTrue(args.get("reloaded").asBoolean)
        assertFalse(JsonParser.parseString(PanelMessages.htmlArgs("abc", "o", false)).asJsonObject.get("reloaded").asBoolean)
    }

    @Test
    fun `AC-014 the panelHtml reply is unquoted and anything else is refused`() {
        assertEquals("<p class=\"a\">\n</p>", PanelMessages.htmlFromReply("\"<p class=\\\"a\\\">\\n</p>\""))
        assertThrows<IllegalArgumentException> { PanelMessages.htmlFromReply("null") }
        assertThrows<IllegalArgumentException> { PanelMessages.htmlFromReply("{\"a\":1}") }
    }

    @Test
    fun `AC-042 an adopted browser makes the next page build a reload`() {
        val fresh = PanelLifecycle()
        assertFalse(fresh.nextLoadIsReload())
        val adopted = PanelLifecycle()
        adopted.adopted()
        assertTrue(adopted.nextLoadIsReload())
    }

    @Test
    fun `AC-042 the opened event says resumed only for a parked browser`() {
        assertEquals("null", PanelMessages.openedPayload(false))
        val resumed = JsonParser.parseString(PanelMessages.openedPayload(true)).asJsonObject
        assertTrue(resumed.get("resumed").asBoolean)
    }
}

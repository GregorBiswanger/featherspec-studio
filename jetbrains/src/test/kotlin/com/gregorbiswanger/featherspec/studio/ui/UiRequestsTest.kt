package com.gregorbiswanger.featherspec.studio.ui

import com.google.gson.JsonParser
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class UiRequestsTest {
    @Test
    fun `AC-023 a notification request carries the message and the actions in order`() {
        assertEquals(
            NotifyRequest("Specs changed", listOf("Open setup guide", "Refresh")),
            UiRequests.notify("""{"message":"Specs changed","actions":["Open setup guide","Refresh"]}"""),
        )
        assertEquals(NotifyRequest("Plain", emptyList()), UiRequests.notify("""{"message":"Plain","actions":[]}"""))
    }

    @Test
    fun `a malformed notification request is rejected`() {
        for (args in listOf("", "null", "[]", "{}", """{"message":"m"}""", """{"actions":[]}""", """{"message":1,"actions":[]}""", """{"message":"m","actions":"x"}""", """{"message":"m","actions":[1]}""", """{"message":"m","actions":[null]}""")) {
            assertNull(UiRequests.notify(args), args)
        }
    }

    @Test
    fun `a pick request keeps the item index and shows label description and detail`() {
        val request = UiRequests.pick(
            """{"items":[{"label":"api","description":"2 specs","detail":"/work/api","root":"file:///work/api"},{"label":"web","description":"","detail":"/work/web"},{"label":"solo"}],"placeholder":"Select project"}""",
        )
        assertEquals(
            PickRequest(listOf(PickEntry(0, "api - 2 specs - /work/api"), PickEntry(1, "web - /work/web"), PickEntry(2, "solo")), "Select project"),
            request,
        )
    }

    @Test
    fun `a pick request without a placeholder or without items`() {
        assertNull(UiRequests.pick("""{"items":[{"label":"a"}]}""")?.placeholder)
        assertEquals(emptyList<PickEntry>(), UiRequests.pick("""{"items":[]}""")?.entries)
        for (args in listOf("", "[]", "{}", """{"items":"a"}""", """{"items":["a"]}""", """{"items":[{"description":"d"}]}""", """{"items":[{"label":2}]}""")) {
            assertNull(UiRequests.pick(args), args)
        }
    }

    @Test
    fun `a confirm request joins message and detail and keeps the label`() {
        val request = UiRequests.confirm("""{"message":"Set up?","detail":"Writes three files.","confirmLabel":"Set up"}""")
        assertEquals(ConfirmRequest("Set up?", "Writes three files.", "Set up"), request)
        assertEquals("Set up?\n\nWrites three files.", request?.text)
        assertEquals("Only", UiRequests.confirm("""{"message":"Only","confirmLabel":"Go"}""")?.text)
        assertEquals("Only", UiRequests.confirm("""{"message":"Only","detail":" ","confirmLabel":"Go"}""")?.text)
    }

    @Test
    fun `a malformed confirm request is rejected`() {
        for (args in listOf("", "{}", """{"message":"m"}""", """{"confirmLabel":"c"}""", """{"message":"m","confirmLabel":3}""")) {
            assertNull(UiRequests.confirm(args), args)
        }
    }

    @Test
    fun `a progress title is read and a missing one is rejected`() {
        assertEquals("Downloading", UiRequests.progressTitle("""{"title":"Downloading"}"""))
        assertNull(UiRequests.progressTitle("{}"))
        assertNull(UiRequests.progressTitle("""{"title":1}"""))
        assertNull(UiRequests.progressTitle("nope"))
    }

    @Test
    fun `only http and https urls with a host may be opened`() {
        assertEquals("https://github.com/GregorBiswanger/featherspec", UiRequests.externalUrl("""{"url":"https://github.com/GregorBiswanger/featherspec"}"""))
        assertEquals("http://example.org/a?b=1", UiRequests.externalUrl("""{"url":" http://example.org/a?b=1 "}"""))
        for (url in listOf("file:///etc/passwd", "javascript:alert(1)", "mailto:a@b.c", "vscode://x/y", "https://", "not a url", "//example.org", "")) {
            assertNull(UiRequests.externalUrl("""{"url":"$url"}"""), url)
        }
        assertNull(UiRequests.externalUrl("{}"))
    }

    @Test
    fun `replies follow the wire shapes`() {
        assertEquals("""{"ok":"Refresh"}""", UiRequests.chosen("Refresh"))
        assertEquals("""{"ok":null}""", UiRequests.chosen(null))
        assertEquals("""{"ok":2}""", UiRequests.index(2))
        assertEquals("""{"ok":0}""", UiRequests.index(0))
        assertEquals("""{"ok":null}""", UiRequests.index(null))
        assertEquals("""{"ok":true}""", UiRequests.confirmed(true))
        assertEquals("""{"ok":false}""", UiRequests.confirmed(false))
        assertEquals("""{"ok":"progress-1"}""", UiRequests.started("progress-1"))
        assertEquals("""{"ok":null}""", UiRequests.OK_NULL)
    }

    @Test
    fun `a chosen label with quotes survives the round trip`() {
        val label = "Say \"hi\" \\ now"
        assertEquals(label, JsonParser.parseString(UiRequests.chosen(label)).asJsonObject.get("ok").asString)
    }

    @Test
    fun `the progress end payload is a json string and the cancel payload carries the id`() {
        assertEquals("progress-3", UiRequests.progressId("\"progress-3\""))
        assertNull(UiRequests.progressId("null"))
        assertNull(UiRequests.progressId("5"))
        assertNull(UiRequests.progressId("{"))
        assertEquals("""{"id":"progress-3"}""", UiRequests.cancelPayload("progress-3"))
    }

    @Test
    fun `progress ids are unique and finish once`() {
        val book = ProgressBook()
        val first = book.begin()
        val second = book.begin()
        assertEquals(listOf("progress-1", "progress-2"), listOf(first, second))
        assertTrue(book.isActive(first))
        assertTrue(book.finish(first))
        assertFalse(book.finish(first))
        assertFalse(book.isActive(first))
        assertTrue(book.isActive(second))
        assertFalse(book.finish("progress-9"))
        assertEquals("progress-3", book.begin())
    }

    @Test
    fun `a cancel is requested once and only while the progress is active`() {
        val book = ProgressBook()
        val id = book.begin()
        assertTrue(book.requestCancel(id))
        assertFalse(book.requestCancel(id))
        assertTrue(book.isActive(id))
        book.finish(id)
        assertFalse(book.requestCancel(id))
        assertFalse(book.requestCancel("progress-8"))
    }

    @Test
    fun `finishing all ends every running progress`() {
        val book = ProgressBook()
        val a = book.begin()
        val b = book.begin()
        book.finish(a)
        assertEquals(listOf(b), book.finishAll())
        assertFalse(book.isActive(b))
        assertEquals(emptyList<String>(), book.finishAll())
    }

    @Test
    fun `log payloads become lines whatever their shape`() {
        assertEquals(listOf("one", "two", ""), LogLines.parse("""["one","two",""]"""))
        assertEquals(listOf("single"), LogLines.parse("\"single\""))
        assertEquals(listOf("not json {"), LogLines.parse("not json {"))
        assertEquals(listOf("""{"a":1}"""), LogLines.parse("""{"a":1}"""))
        assertEquals(emptyList<String>(), LogLines.parse("[]"))
    }

    @Test
    fun `log text ends every line with a newline`() {
        assertEquals("a\n\nb\n", LogLines.text(listOf("a", "", "b")))
        assertEquals("", LogLines.text(emptyList()))
    }
}

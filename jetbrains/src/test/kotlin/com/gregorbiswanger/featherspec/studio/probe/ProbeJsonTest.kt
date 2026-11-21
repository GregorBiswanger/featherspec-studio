package com.gregorbiswanger.featherspec.studio.probe

import com.google.gson.JsonParser
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import java.util.Base64

class ProbeJsonTest {
    private fun b64(text: String): String = Base64.getEncoder().encodeToString(text.toByteArray(Charsets.UTF_8))

    private fun text(base64: String): String = String(Base64.getDecoder().decode(base64), Charsets.UTF_8)

    @Test
    fun `unquote returns the string a core reply carries`() {
        assertEquals("{\"a\":\"b\\\"c\"}\nä", ProbeJson.unquote("\"{\\\"a\\\":\\\"b\\\\\\\"c\\\"}\\nä\""))
    }

    @Test
    fun `heap bytes read a number and tolerate null and other shapes`() {
        assertEquals(42L, ProbeJson.heapBytes("{\"jsHeapBytes\":42}"))
        assertNull(ProbeJson.heapBytes("{\"jsHeapBytes\":null}"))
        assertNull(ProbeJson.heapBytes("{}"))
        assertNull(ProbeJson.heapBytes("null"))
        assertNull(ProbeJson.heapBytes("{\"jsHeapBytes\":\"x\"}"))
    }

    @Test
    fun `touch changes exactly the first spec file and keeps the order and the version`() {
        val input = "{\"files\":{\"AGENTS.md\":\"${b64("agents")}\",\".specs/a/0001-x.md\":\"${b64("# x")}\"," +
            "\".specs/a/0002-y.md\":\"${b64("# y")}\"},\"version\":\"1.10.0\"}"
        val touched = JsonParser.parseString(ProbeJson.touch(input, 2)).asJsonObject
        val before = JsonParser.parseString(input).asJsonObject
        assertEquals("1.10.0", touched.get("version").asString)
        val files = touched.getAsJsonObject("files")
        assertEquals(before.getAsJsonObject("files").keySet().toList(), files.keySet().toList())
        assertEquals("# x\n\n", text(files.get(".specs/a/0001-x.md").asString))
        assertEquals("# y", text(files.get(".specs/a/0002-y.md").asString))
        assertEquals("agents", text(files.get("AGENTS.md").asString))
    }

    @Test
    fun `touch with a different count gives a different input`() {
        val input = "{\"files\":{\".specs/a/0001-x.md\":\"${b64("# x")}\"},\"version\":\"1.10.0\"}"
        assertNotEquals(ProbeJson.touch(input, 1), ProbeJson.touch(input, 2))
        assertNotEquals(input, ProbeJson.touch(input, 1))
    }

    @Test
    fun `touch falls back to the first file when there is no spec`() {
        val input = "{\"files\":{\"AGENTS.md\":\"${b64("a")}\"},\"version\":\"1.10.0\"}"
        val files = JsonParser.parseString(ProbeJson.touch(input, 1)).asJsonObject.getAsJsonObject("files")
        assertEquals("a\n", text(files.get("AGENTS.md").asString))
    }
}

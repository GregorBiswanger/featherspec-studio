package com.gregorbiswanger.featherspec.studio.probe

import com.google.gson.JsonParser
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Files
import java.nio.file.Path
import java.util.Base64

class ProbeJsonTest {
    private fun b64(text: String): String = Base64.getEncoder().encodeToString(text.toByteArray(Charsets.UTF_8))

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
    fun `elapsed milliseconds are read from the core reply and rounded up`() {
        assertEquals(12L, ProbeJson.elapsedMs("{\"ms\":12}"))
        assertEquals(13L, ProbeJson.elapsedMs("{\"ms\":12.0004}"))
        assertEquals(0L, ProbeJson.elapsedMs("{\"ms\":0}"))
    }

    @Test
    fun `elapsed milliseconds reject replies without a number`() {
        assertThrows(IllegalArgumentException::class.java) { ProbeJson.elapsedMs("{}") }
        assertThrows(IllegalArgumentException::class.java) { ProbeJson.elapsedMs("{\"ms\":\"1\"}") }
        assertThrows(IllegalArgumentException::class.java) { ProbeJson.elapsedMs("null") }
    }

    @Test
    fun `traffic reads the calls and frames a core reply carries`() {
        assertEquals(Traffic(912L, 14L), ProbeJson.traffic("{\"ms\":12,\"calls\":912,\"frames\":14}"))
        assertEquals(Traffic(0L, 0L), ProbeJson.traffic("{\"calls\":0,\"frames\":0}"))
    }

    @Test
    fun `traffic is null when a count is missing or not a number or the reply is no object`() {
        assertNull(ProbeJson.traffic("{\"ms\":12}"))
        assertNull(ProbeJson.traffic("{\"calls\":1}"))
        assertNull(ProbeJson.traffic("{\"frames\":1}"))
        assertNull(ProbeJson.traffic("{\"calls\":\"1\",\"frames\":2}"))
        assertNull(ProbeJson.traffic("{\"calls\":null,\"frames\":2}"))
        assertNull(ProbeJson.traffic("null"))
        assertNull(ProbeJson.traffic("[1,2]"))
        assertNull(ProbeJson.traffic("not json"))
    }

    @Test
    fun `elapsed milliseconds still read ms from a reply with calls and frames`() {
        assertEquals(7L, ProbeJson.elapsedMs("{\"ms\":6.2,\"calls\":3,\"frames\":1}"))
    }

    @Test
    fun `the command arguments are escaped JSON`() {
        val read = JsonParser.parseString(ProbeJson.readArgs("file:///c:/a \"b\"", "1.11.0")).asJsonObject
        assertEquals("file:///c:/a \"b\"", read.get("root").asString)
        assertEquals("1.11.0", read.get("version").asString)
        assertEquals(".specs/active/x.md", JsonParser.parseString(ProbeJson.updateArgs(".specs/active/x.md")).asJsonObject.get("path").asString)
    }

    @Test
    fun `the spec to edit prefers the generated first spec, then an active spec, then any spec`() {
        val preferred = ".specs/active/0001-generated-spec.md"
        assertEquals(preferred, ProbeJson.specKey(listOf(".specs/done/0003-x.md", preferred, ".specs/active/0002-y.md")))
        assertEquals(".specs/active/0002-y.md", ProbeJson.specKey(listOf(".specs/done/0003-x.md", ".specs/active/0002-y.plan.md", ".specs/active/0002-y.md")))
        assertEquals(".specs/done/0003-x.md", ProbeJson.specKey(listOf("AGENTS.md", ".specs/done/0003-x.md")))
        assertNull(ProbeJson.specKey(listOf("AGENTS.md", ".specs/active/0002-y.plan.md")))
    }

    @Test
    fun `materialize writes every file by its path and reports the version and the spec`(@TempDir directory: Path) {
        val input = "{\"files\":{\"AGENTS.md\":\"${b64("agents")}\",\".specs/active/0001-generated-spec.md\":\"${b64("# x")}\"," +
            "\".memory-bank/n.md\":\"${b64("n")}\"},\"version\":\"1.11.0\"}"
        val project = ProbeJson.materialize(input, directory)
        assertEquals(ProbeProject("1.11.0", ".specs/active/0001-generated-spec.md"), project)
        assertEquals("agents", Files.readString(directory.resolve("AGENTS.md")))
        assertEquals("# x", Files.readString(directory.resolve(".specs/active/0001-generated-spec.md")))
        assertEquals("n", Files.readString(directory.resolve(".memory-bank/n.md")))
    }

    @Test
    fun `materialize refuses a path that leaves the directory`(@TempDir directory: Path) {
        val input = "{\"files\":{\"../escape.md\":\"${b64("x")}\"},\"version\":\"1.11.0\"}"
        assertThrows(IllegalArgumentException::class.java) { ProbeJson.materialize(input, directory) }
        assertFalse(Files.exists(directory.resolveSibling("escape.md")))
    }

    @Test
    fun `materialize needs a spec file`(@TempDir directory: Path) {
        val input = "{\"files\":{\"AGENTS.md\":\"${b64("a")}\"},\"version\":\"1.11.0\"}"
        assertThrows(IllegalArgumentException::class.java) { ProbeJson.materialize(input, directory) }
    }
}

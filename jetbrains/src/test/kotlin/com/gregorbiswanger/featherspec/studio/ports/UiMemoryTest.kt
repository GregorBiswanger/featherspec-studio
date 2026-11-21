package com.gregorbiswanger.featherspec.studio.ports

import com.google.gson.JsonParser
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class UiMemoryTest {
    private val entries = HashMap<String, String>()
    private val memory = UiMemory(entries)

    @Test
    fun keepsEntriesPerProject() {
        memory.set("/a", "featherspec-studio.board", """{"filter":"open"}""")
        memory.set("/b", "featherspec-studio.board", """{"filter":"done"}""")
        assertEquals(mapOf("featherspec-studio.board" to """{"filter":"open"}"""), memory.forProject("/a"))
        assertEquals(mapOf("featherspec-studio.board" to """{"filter":"done"}"""), memory.forProject("/b"))
        assertEquals(emptyMap<String, String>(), memory.forProject("/c"))
    }

    @Test
    fun aPrefixProjectDoesNotSeeALongerProjectsEntries() {
        memory.set("/a|b", "k", "1")
        assertEquals(emptyMap<String, String>(), memory.forProject("/a"))
    }

    @Test
    fun nullRemovesTheEntry() {
        memory.set("/a", "k", "1")
        memory.set("/a", "k", null)
        assertEquals(emptyMap<String, String>(), memory.forProject("/a"))
        assertTrue(entries.isEmpty())
    }

    @Test
    fun storesUnderTheProjectAndKey() {
        memory.set("/a", "k", "1")
        assertEquals(mapOf("/a|k" to "1"), entries)
    }

    @Test
    fun answersMemorySetWithAJsonValueOrNull() {
        assertEquals("""{"ok":null}""", memory.answer("memory.set", """{"key":"k","value":"{\"a\":1}"}""", "/a"))
        assertEquals("""{"a":1}""", memory.forProject("/a")["k"])
        assertEquals("""{"ok":null}""", memory.answer("memory.set", """{"key":"k","value":null}""", "/a"))
        assertNull(memory.forProject("/a")["k"])
    }

    @Test
    fun answersAnErrorForAMalformedCallAndNullForForeignNames() {
        val reply = memory.answer("memory.set", """{"value":"1"}""", "/a")
        assertTrue(JsonParser.parseString(reply).asJsonObject.has("error"))
        assertNull(memory.answer("medium.read", "{}", "/a"))
    }
}

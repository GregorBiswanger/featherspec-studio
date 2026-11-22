package com.gregorbiswanger.featherspec.studio.ports

import com.google.gson.JsonParser
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class PluginAvailabilityTest {
    private fun queryOf(vararg ids: String) = PluginQuery { it in ids }

    @Test
    fun `AC-003 the ids are the four of the spec`() {
        assertEquals(
            listOf("com.github.copilot", "org.jetbrains.plugins.terminal", "org.jetbrains.junie", "com.intellij.ml.llm"),
            PluginIds.ALL,
        )
    }

    @Test
    fun `AC-003 a snapshot lists exactly the watched plugins that are available, in table order`() {
        assertEquals(emptyList<String>(), PluginAvailability.snapshot(queryOf()))
        assertEquals(
            listOf("com.github.copilot", "org.jetbrains.plugins.terminal", "org.jetbrains.junie", "com.intellij.ml.llm"),
            PluginAvailability.snapshot(queryOf("com.intellij.ml.llm", "org.jetbrains.junie", "org.jetbrains.plugins.terminal", "com.github.copilot")),
        )
        assertEquals(listOf("org.jetbrains.junie"), PluginAvailability.snapshot(queryOf("org.jetbrains.junie", "com.anthropic.code.plugin")))
    }

    @Test
    fun `AC-003 a plugin that is reported unloaded counts as absent even while the platform still lists it`() {
        val query = queryOf("com.github.copilot", "org.jetbrains.plugins.terminal")
        assertEquals(listOf("org.jetbrains.plugins.terminal"), PluginAvailability.snapshot(query, setOf("com.github.copilot")))
        assertEquals(setOf("com.github.copilot"), PluginAvailability.absentAfter(PluginEventKind.UNLOADED, "com.github.copilot", false))
        assertEquals(emptySet<String>(), PluginAvailability.absentAfter(PluginEventKind.UNLOADED, "com.github.copilot", true))
        assertEquals(emptySet<String>(), PluginAvailability.absentAfter(PluginEventKind.LOADED, "com.github.copilot", false))
    }

    @Test
    fun `AC-003 a load and a plain unload recompute and an unload for an update waits for the load`() {
        assertTrue(PluginAvailability.recompute(PluginEventKind.LOADED, false))
        assertTrue(PluginAvailability.recompute(PluginEventKind.LOADED, true))
        assertTrue(PluginAvailability.recompute(PluginEventKind.UNLOADED, false))
        assertFalse(PluginAvailability.recompute(PluginEventKind.UNLOADED, true))
    }

    @Test
    fun `AC-003 Junie is available while either Junie plugin is`() {
        assertFalse(PluginAvailability.junie(emptyList()))
        assertFalse(PluginAvailability.junie(listOf("com.github.copilot", "org.jetbrains.plugins.terminal")))
        assertTrue(PluginAvailability.junie(listOf("org.jetbrains.junie")))
        assertTrue(PluginAvailability.junie(listOf("com.intellij.ml.llm")))
        assertTrue(PluginAvailability.junie(listOf("org.jetbrains.junie", "com.intellij.ml.llm")))
    }

    @Test
    fun `AC-003 the event carries the plugins array and nothing else`() {
        val event = JsonParser.parseString(PluginAvailability.event(listOf("com.github.copilot", "org.jetbrains.junie"))).asJsonObject
        assertEquals(setOf("plugins"), event.keySet())
        assertEquals(listOf("com.github.copilot", "org.jetbrains.junie"), event.getAsJsonArray("plugins").map { it.asString })
        assertEquals("""{"plugins":[]}""", PluginAvailability.event(emptyList()))
    }

    @Test
    fun `AC-003 the watch reports a change once and never an unchanged list`() {
        val watch = PluginsWatch(listOf("com.github.copilot"))
        assertFalse(watch.changed(listOf("com.github.copilot")))
        assertTrue(watch.changed(listOf("com.github.copilot", "org.jetbrains.junie")))
        assertFalse(watch.changed(listOf("com.github.copilot", "org.jetbrains.junie")))
        assertTrue(watch.changed(emptyList()))
        assertFalse(watch.changed(emptyList()))
        assertTrue(watch.changed(listOf("com.github.copilot")))
    }
}

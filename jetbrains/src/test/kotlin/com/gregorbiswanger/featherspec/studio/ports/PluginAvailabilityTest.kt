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

    @Test
    fun `AC-040 the check that tells whether an installed plugin is active is one swappable strategy, and today it is isLoaded`() {
        assertEquals(ActivityCheck.LOADED, PluginActivity.CURRENT)
        assertEquals(listOf(ActivityCheck.LOADED, ActivityCheck.NOT_DISABLED), ActivityCheck.values().toList())
        assertEquals("K-1 pending", PluginActivity.STATUS)
    }

    @Test
    fun `AC-040 the two strategies agree where the platform is sure and differ where K-1 may find them differ`() {
        for ((loaded, disabled) in listOf(true to false, false to true)) {
            assertEquals(loaded, PluginActivity.available(true, ActivityCheck.LOADED, { loaded }, { disabled }))
            assertEquals(loaded, PluginActivity.available(true, ActivityCheck.NOT_DISABLED, { loaded }, { disabled }))
        }
        assertTrue(PluginActivity.available(true, ActivityCheck.LOADED, { true }, { true }))
        assertFalse(PluginActivity.available(true, ActivityCheck.NOT_DISABLED, { true }, { true }))
        assertFalse(PluginActivity.available(true, ActivityCheck.LOADED, { false }, { false }))
        assertTrue(PluginActivity.available(true, ActivityCheck.NOT_DISABLED, { false }, { false }))
    }

    @Test
    fun `AC-040 only the chosen strategy is asked, and nothing is asked for a plugin that is not installed`() {
        var loadedAsked = 0
        var disabledAsked = 0
        PluginActivity.available(true, ActivityCheck.LOADED, { loadedAsked++; true }, { disabledAsked++; false })
        assertEquals(1 to 0, loadedAsked to disabledAsked)
        PluginActivity.available(true, ActivityCheck.NOT_DISABLED, { loadedAsked++; true }, { disabledAsked++; false })
        assertEquals(1 to 1, loadedAsked to disabledAsked)
        assertFalse(PluginActivity.available(false, ActivityCheck.LOADED, { loadedAsked++; true }, { disabledAsked++; false }))
        assertFalse(PluginActivity.available(false, ActivityCheck.NOT_DISABLED, { loadedAsked++; true }, { disabledAsked++; false }))
        assertEquals(1 to 1, loadedAsked to disabledAsked)
    }
}

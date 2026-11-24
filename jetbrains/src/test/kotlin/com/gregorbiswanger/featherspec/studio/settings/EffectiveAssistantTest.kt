package com.gregorbiswanger.featherspec.studio.settings

import com.google.gson.JsonParser
import com.gregorbiswanger.featherspec.studio.ports.PluginsWatch
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class EffectiveAssistantTest {
    private val terminal = "org.jetbrains.plugins.terminal"
    private val all = listOf(terminal, "cli:junie", "cli:claude", "cli:copilot")

    @Test
    fun `AC-051 unset follows Junie when its command is available and is none when it is not`() {
        assertEquals("junie", EffectiveAssistant.of("", all))
        assertEquals("junie", EffectiveAssistant.of(null, listOf(terminal, "cli:junie")))
        assertEquals("none", EffectiveAssistant.of("", listOf(terminal, "cli:claude", "cli:copilot")))
        assertEquals("none", EffectiveAssistant.of("", emptyList()))
        assertEquals("none", EffectiveAssistant.of("", listOf("cli:junie")))
    }

    @Test
    fun `AC-051 an explicit none stays none, also while every agent is available`() {
        assertEquals("none", EffectiveAssistant.of("none", all))
    }

    @Test
    fun `AC-051 an explicit agent is effective while its command and the Terminal plugin are there, else none`() {
        for (id in listOf("junie", "claudeCode", "copilot")) {
            assertEquals(id, EffectiveAssistant.of(id, all), id)
            assertEquals("none", EffectiveAssistant.of(id, listOf(terminal)), id)
            assertEquals("none", EffectiveAssistant.of(id, all.filter { it != terminal }), id)
        }
        assertEquals("none", EffectiveAssistant.of("claudeCode", listOf(terminal, "cli:junie")))
        assertEquals("claudeCode", EffectiveAssistant.of("claudeCode", listOf(terminal, "cli:claude")))
    }

    @Test
    fun `AC-051 a stored value of an older release or an unknown one is read as unset, never a failure`() {
        for (old in listOf("copyForCopilot", "copyForJunie", "Junie", "copilot ", "claude", "none ", "x", "1")) {
            assertEquals(EffectiveAssistant.of("", all), EffectiveAssistant.of(old, all), old)
            assertEquals(EffectiveAssistant.of("", emptyList()), EffectiveAssistant.of(old, emptyList()), old)
        }
    }

    @Test
    fun `AC-051 the settings event carries the effective value, other keys pass through untouched`() {
        val stored = SettingsTable.payload("assistant", com.google.gson.JsonPrimitive(""))
        assertEquals("junie", JsonParser.parseString(EffectiveAssistant.event(stored, all)).asJsonObject.get("value").asString)
        val missing = JsonParser.parseString(EffectiveAssistant.event(SettingsTable.payload("assistant", com.google.gson.JsonPrimitive("copilot")), listOf(terminal))).asJsonObject
        assertEquals("assistant", missing.get("key").asString)
        assertEquals("none", missing.get("value").asString)
        val other = SettingsTable.payload("showStepTips", com.google.gson.JsonPrimitive(false))
        assertEquals(other, EffectiveAssistant.event(other, all))
        assertEquals("not json", EffectiveAssistant.event("not json", all))
    }

    @Test
    fun `AC-051 the watch reports an effective change once, so that a recompute pushes only a real change`() {
        val watch = AssistantWatch("junie")
        assertFalse(watch.changed("junie"))
        assertTrue(watch.changed("none"))
        assertFalse(watch.changed("none"))
        assertTrue(watch.changed("junie"))
    }

    @Test
    fun `AC-051 a recompute pushes the plugins and then the effective value in one call, without a wait, only what changed`() {
        val pushed = ArrayList<String>()
        val recompute = AvailabilityRecompute(PluginsWatch(listOf(terminal)), AssistantWatch("none"), { pushed.add("plugins:" + it.joinToString(",")) }, { pushed.add("assistant:$it") })
        recompute.run("", listOf(terminal, "cli:junie"))
        assertEquals(listOf("plugins:$terminal,cli:junie", "assistant:junie"), pushed)
        pushed.clear()
        recompute.run("", listOf(terminal, "cli:junie"))
        assertEquals(emptyList<String>(), pushed)
        recompute.run("", listOf(terminal, "cli:junie", "cli:claude"))
        assertEquals(listOf("plugins:$terminal,cli:junie,cli:claude"), pushed)
        pushed.clear()
        recompute.run("claudeCode", listOf(terminal, "cli:junie", "cli:claude"))
        assertEquals(listOf("assistant:claudeCode"), pushed)
        pushed.clear()
        recompute.run("claudeCode", listOf(terminal, "cli:junie"))
        assertEquals(listOf("plugins:$terminal,cli:junie", "assistant:none"), pushed)
    }
}

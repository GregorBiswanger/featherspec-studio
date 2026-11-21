package com.gregorbiswanger.featherspec.studio.settings

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.google.gson.JsonPrimitive
import com.gregorbiswanger.featherspec.studio.CoreConfig
import java.nio.file.Files
import java.nio.file.Path
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class SettingsTableTest {
    private fun manifest(): JsonObject {
        val path = listOf(Path.of("..", "package.json"), Path.of("package.json")).first { Files.exists(it) }
        return JsonParser.parseString(Files.readString(path)).asJsonObject
    }

    private fun properties(): JsonObject =
        manifest().getAsJsonObject("contributes").getAsJsonObject("configuration").getAsJsonObject("properties")

    @Test
    fun `AC-018 the ids are the manifest ids except the assistant`() {
        val manifestIds = properties().keySet().filter { it.startsWith(SettingsTable.PREFIX) }.toSet()
        assertEquals(manifestIds - "featherspec-studio.assistant", SettingsTable.ids.toSet())
        assertFalse(SettingsTable.ids.any { it.contains("assistant") })
    }

    @Test
    fun `AC-018 show step tips equals its manifest entry`() {
        val entry = properties().getAsJsonObject(SettingsTable.SHOW_STEP_TIPS_ID)
        assertEquals("boolean", entry.get("type").asString)
        assertEquals(SettingsTable.SHOW_STEP_TIPS_DEFAULT, entry.get("default").asBoolean)
        assertEquals(SettingsTable.SHOW_STEP_TIPS_DESCRIPTION, entry.get("description").asString)
        assertFalse(entry.has("enum"))
    }

    @Test
    fun `AC-018 model hints equals its manifest entry`() {
        val entry = properties().getAsJsonObject(SettingsTable.MODEL_HINTS_ID)
        assertEquals("object", entry.get("type").asString)
        assertEquals(0, entry.getAsJsonObject("default").size())
        assertEquals(SettingsTable.MODEL_HINTS_DESCRIPTION, entry.get("description").asString)
        assertFalse(entry.get("additionalProperties").asBoolean)
        val hints = entry.getAsJsonObject("properties")
        assertEquals(setOf(SettingsTable.STRONG_HINT_KEY, SettingsTable.FAST_HINT_KEY), hints.keySet())
        assertEquals(SettingsTable.STRONG_MODEL_DESCRIPTION, hints.getAsJsonObject(SettingsTable.STRONG_HINT_KEY).get("description").asString)
        assertEquals(SettingsTable.FAST_MODEL_DESCRIPTION, hints.getAsJsonObject(SettingsTable.FAST_HINT_KEY).get("description").asString)
        assertEquals("string", hints.getAsJsonObject(SettingsTable.STRONG_HINT_KEY).get("type").asString)
        assertEquals("string", hints.getAsJsonObject(SettingsTable.FAST_HINT_KEY).get("type").asString)
    }

    @Test
    fun `AC-018 the bare keys are the ids without the prefix and match the core`() {
        assertEquals("showStepTips", SettingsTable.SHOW_STEP_TIPS_KEY)
        assertEquals("modelHints", SettingsTable.MODEL_HINTS_KEY)
        assertEquals(listOf("featherspec-studio.showStepTips", "featherspec-studio.modelHints"), SettingsTable.ids)
        val core = Files.readString(listOf(Path.of("..", "src", "core", "settings", "stepTipSettings.ts"), Path.of("src", "core", "settings", "stepTipSettings.ts")).first { Files.exists(it) })
        assertTrue(core.contains("SHOW_STEP_TIPS_KEY = 'showStepTips'"))
        assertTrue(core.contains("MODEL_HINTS_KEY = 'modelHints'"))
    }

    @Test
    fun `AC-031 the assistant setting is not offered`() {
        assertFalse(SettingsTable.values(SettingsModel()).containsKey("assistant"))
        assertEquals(setOf("showStepTips", "modelHints"), SettingsTable.values(SettingsModel()).keys)
    }

    @Test
    fun `defaults give true and no hints`() {
        val values = SettingsTable.values(SettingsModel())
        assertEquals(JsonPrimitive(true), values["showStepTips"])
        assertEquals(JsonObject(), values["modelHints"])
        assertEquals(SettingsModel(), SettingsTable.fromState(null, null, null))
    }

    @Test
    fun `hints are trimmed and blank ones are left out`() {
        val values = SettingsTable.values(SettingsModel(false, "  Opus  ", "   "))
        assertEquals(JsonPrimitive(false), values["showStepTips"])
        val hints = values["modelHints"] as JsonObject
        assertEquals(setOf("strong"), hints.keySet())
        assertEquals("Opus", hints.get("strong").asString)
        assertEquals(SettingsModel(true, "a", "b"), SettingsTable.sanitize(SettingsModel(true, " a", "b ")))
    }

    @Test
    fun `AC-019 a change event carries the bare key and the value`() {
        val events = SettingsTable.changeEvents(SettingsModel(), SettingsModel(showStepTips = false))
        assertEquals(1, events.size)
        val event = JsonParser.parseString(events[0]).asJsonObject
        assertEquals(setOf("key", "value"), event.keySet())
        assertEquals("showStepTips", event.get("key").asString)
        assertFalse(event.get("value").asBoolean)
    }

    @Test
    fun `AC-019 a hint change sends the whole hints object`() {
        val events = SettingsTable.changeEvents(SettingsModel(), SettingsModel(strongModel = "S", fastModel = "F"))
        assertEquals(1, events.size)
        val event = JsonParser.parseString(events[0]).asJsonObject
        assertEquals("modelHints", event.get("key").asString)
        val value = event.getAsJsonObject("value")
        assertEquals("S", value.get("strong").asString)
        assertEquals("F", value.get("fast").asString)
    }

    @Test
    fun `AC-019 clearing the hints sends an empty object and no change sends nothing`() {
        val cleared = SettingsTable.changeEvents(SettingsModel(strongModel = "S"), SettingsModel())
        assertEquals(1, cleared.size)
        assertEquals(0, JsonParser.parseString(cleared[0]).asJsonObject.getAsJsonObject("value").size())
        assertEquals(emptyList<String>(), SettingsTable.changeEvents(SettingsModel(), SettingsModel()))
        assertEquals(emptyList<String>(), SettingsTable.changeEvents(SettingsModel(strongModel = "S"), SettingsModel(strongModel = " S ")))
    }

    @Test
    fun `both changes give two events`() {
        assertEquals(2, SettingsTable.changeEvents(SettingsModel(), SettingsModel(false, "S", "")).size)
    }

    @Test
    fun `AC-018 the start config carries the settings under their bare keys`() {
        val json = CoreConfig.json("linux", "1.0.0", SettingsTable.values(SettingsModel(false, "S", "F")), true, emptyList(), emptyMap())
        val settings = JsonParser.parseString(json).asJsonObject.getAsJsonObject("settings")
        assertEquals(setOf("showStepTips", "modelHints"), settings.keySet())
        assertFalse(settings.get("showStepTips").asBoolean)
        assertEquals("S", settings.getAsJsonObject("modelHints").get("strong").asString)
    }
}

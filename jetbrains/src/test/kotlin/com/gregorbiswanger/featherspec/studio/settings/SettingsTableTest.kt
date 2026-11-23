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
    fun `AC-018 the ids are the manifest ids`() {
        val manifestIds = properties().keySet().filter { it.startsWith(SettingsTable.PREFIX) }.toSet()
        assertEquals(manifestIds, SettingsTable.ids.toSet())
        assertEquals("featherspec-studio.assistant", SettingsTable.ASSISTANT_ID)
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
        assertEquals(listOf("featherspec-studio.showStepTips", "featherspec-studio.assistant", "featherspec-studio.modelHints"), SettingsTable.ids)
        assertEquals("assistant", SettingsTable.ASSISTANT_KEY)
        val core = Files.readString(listOf(Path.of("..", "src", "core", "settings", "stepTipSettings.ts"), Path.of("src", "core", "settings", "stepTipSettings.ts")).first { Files.exists(it) })
        assertTrue(core.contains("SHOW_STEP_TIPS_KEY = 'showStepTips'"))
        assertTrue(core.contains("MODEL_HINTS_KEY = 'modelHints'"))
    }

    @Test
    fun `AC-001 the assistant is stored as one of four values and defaults to none`() {
        assertEquals("none", SettingsModel().assistant)
        assertEquals(JsonPrimitive("none"), SettingsTable.values(SettingsModel())["assistant"])
        assertEquals(listOf("showStepTips", "assistant", "modelHints"), SettingsTable.values(SettingsModel()).keys.toList())
        for (value in listOf("none", "copilot", "claudeCode", "junie")) {
            assertEquals(value, SettingsTable.sanitize(SettingsModel(assistant = value)).assistant)
            assertEquals(JsonPrimitive(value), SettingsTable.values(SettingsModel(assistant = value))["assistant"])
        }
        for (value in listOf("", "claude", "Claude Code", "42", "copilot ", "NONE")) {
            assertEquals("none", SettingsTable.sanitize(SettingsModel(assistant = value)).assistant, value)
        }
        assertEquals("none", SettingsTable.fromState(true, "", "", null).assistant)
        assertEquals("claudeCode", SettingsTable.fromState(true, "", "", "claudeCode").assistant)
        assertEquals("none", SettingsTable.fromState(true, "", "", "bogus").assistant)
    }

    @Test
    fun `AC-001 the row texts are those of section 7`() {
        assertEquals("Assistant:", SettingsTable.ASSISTANT_LABEL)
        assertEquals(
            "Your AI assistant for the next step. Send to Claude Code types the prompt into Claude Code in the terminal; Copy for Copilot or Junie copies it with the file paths and opens the chat. Nothing is sent; Copy prompt stays in the button's menu.",
            SettingsTable.ASSISTANT_DESCRIPTION,
        )
        assertEquals(listOf("none", "copilot", "claudeCode", "junie"), SettingsTable.ASSISTANT_OPTIONS.map { it.value })
        assertEquals(listOf("None: Copy prompt", "GitHub Copilot", "Claude Code", "Junie"), SettingsTable.ASSISTANT_OPTIONS.map { it.label })
        assertEquals(
            listOf(
                "Copy the prompt and paste it into any assistant.",
                "Copy for Copilot copies the prompt with the file paths. Paste it into GitHub Copilot Chat. Needs the GitHub Copilot plugin.",
                "Send to Claude Code types the prompt into Claude Code in the IDE terminal and sends nothing. Needs the claude command and the Terminal plugin.",
                "Copy for Junie copies the prompt with the file paths. Paste it into Junie in AI Chat.",
            ),
            SettingsTable.ASSISTANT_OPTIONS.map { it.description },
        )
        assertEquals("Junie", SettingsTable.ASSISTANT_OPTIONS[3].toString())
    }

    @Test
    fun `AC-001 the options show Junie last and only while Junie is available`() {
        assertEquals(listOf("none", "copilot", "claudeCode"), SettingsTable.options(false).map { it.value })
        assertEquals(listOf("none", "copilot", "claudeCode", "junie"), SettingsTable.options(true).map { it.value })
    }

    @Test
    fun `AC-001 a stored junie without Junie shows None and the stored value stays until another is applied`() {
        assertEquals("none", SettingsTable.displayed("junie", false).value)
        assertEquals("junie", SettingsTable.displayed("junie", true).value)
        assertEquals("claudeCode", SettingsTable.displayed("claudeCode", false).value)
        assertEquals("none", SettingsTable.displayed("bogus", true).value)
        val none = SettingsTable.ASSISTANT_OPTIONS[0]
        val copilot = SettingsTable.ASSISTANT_OPTIONS[1]
        assertEquals("junie", SettingsTable.storedAfterApply("junie", none, false))
        assertEquals("copilot", SettingsTable.storedAfterApply("junie", copilot, false))
        assertEquals("none", SettingsTable.storedAfterApply("junie", none, true))
        assertEquals("copilot", SettingsTable.storedAfterApply("none", copilot, true))
        assertEquals("none", SettingsTable.storedAfterApply("bogus", none, false))
    }

    @Test
    fun `AC-002 a change of the assistant sends one event with the bare key and the value`() {
        val events = SettingsTable.changeEvents(SettingsModel(), SettingsModel(assistant = "claudeCode"))
        assertEquals(1, events.size)
        val event = JsonParser.parseString(events[0]).asJsonObject
        assertEquals(setOf("key", "value"), event.keySet())
        assertEquals("assistant", event.get("key").asString)
        assertEquals("claudeCode", event.get("value").asString)
        assertEquals(emptyList<String>(), SettingsTable.changeEvents(SettingsModel(assistant = "copilot"), SettingsModel(assistant = "copilot")))
        assertEquals(1, SettingsTable.changeEvents(SettingsModel(assistant = "junie"), SettingsModel(assistant = "bogus")).size)
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
        assertEquals(setOf("showStepTips", "assistant", "modelHints"), settings.keySet())
        assertEquals("none", settings.get("assistant").asString)
        assertFalse(settings.get("showStepTips").asBoolean)
        assertEquals("S", settings.getAsJsonObject("modelHints").get("strong").asString)
    }
}

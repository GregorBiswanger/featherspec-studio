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
            "The assistant your next step goes to. Studio sends nothing; Copy prompt stays in the button's menu.",
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
    fun `AC-038 the setting description is two short sentences that repeat no option description`() {
        assertEquals("The assistant your next step goes to. Studio sends nothing; Copy prompt stays in the button's menu.", SettingsTable.ASSISTANT_DESCRIPTION)
        assertEquals(2, SettingsTable.ASSISTANT_DESCRIPTION.split(". ").size)
        for (option in SettingsTable.ASSISTANT_OPTIONS) {
            assertFalse(SettingsTable.ASSISTANT_DESCRIPTION.contains(option.description), option.value)
        }
        assertFalse(SettingsTable.ASSISTANT_DESCRIPTION.contains("Send to Claude Code"))
        assertFalse(SettingsTable.ASSISTANT_DESCRIPTION.contains("Copy for"))
    }

    private val copilot = "com.github.copilot"
    private val terminal = "org.jetbrains.plugins.terminal"
    private val junie = "org.jetbrains.junie"
    private val aiAssistant = "com.intellij.ml.llm"

    @Test
    fun `AC-039 every option except None appears only while its assistant is available, in the order of the table`() {
        assertEquals(listOf("none"), SettingsTable.options(emptyList()).map { it.value })
        assertEquals(listOf("none", "copilot"), SettingsTable.options(listOf(copilot)).map { it.value })
        assertEquals(listOf("none", "claudeCode"), SettingsTable.options(listOf(terminal)).map { it.value })
        assertEquals(listOf("none", "junie"), SettingsTable.options(listOf(junie)).map { it.value })
        assertEquals(listOf("none", "junie"), SettingsTable.options(listOf(aiAssistant)).map { it.value })
        assertEquals(listOf("none", "copilot", "claudeCode", "junie"), SettingsTable.options(listOf(junie, terminal, copilot)).map { it.value })
        assertEquals(listOf("none"), SettingsTable.options(listOf("org.other.plugin")).map { it.value })
    }

    @Test
    fun `AC-039 the availability of an assistant is the one of the offer, Copilot by its id, Claude Code by the Terminal plugin, Junie by either plugin`() {
        assertTrue(SettingsTable.assistantAvailable("none", emptyList()))
        assertTrue(SettingsTable.assistantAvailable("copilot", listOf(copilot)))
        assertFalse(SettingsTable.assistantAvailable("copilot", listOf(terminal, junie)))
        assertTrue(SettingsTable.assistantAvailable("claudeCode", listOf(terminal)))
        assertFalse(SettingsTable.assistantAvailable("claudeCode", listOf(copilot, junie, aiAssistant)))
        assertTrue(SettingsTable.assistantAvailable("junie", listOf(junie)))
        assertTrue(SettingsTable.assistantAvailable("junie", listOf(aiAssistant)))
        assertFalse(SettingsTable.assistantAvailable("junie", listOf(copilot, terminal)))
        assertFalse(SettingsTable.assistantAvailable("bogus", listOf(copilot, terminal, junie)))
    }

    @Test
    fun `AC-039 a stored value whose assistant is not available shows None and the stored value stays until another is applied`() {
        assertEquals("none", SettingsTable.displayed("junie", emptyList()).value)
        assertEquals("junie", SettingsTable.displayed("junie", listOf(junie)).value)
        assertEquals("none", SettingsTable.displayed("claudeCode", listOf(copilot)).value)
        assertEquals("claudeCode", SettingsTable.displayed("claudeCode", listOf(terminal)).value)
        assertEquals("none", SettingsTable.displayed("copilot", listOf(terminal)).value)
        assertEquals("none", SettingsTable.displayed("bogus", listOf(copilot, terminal, junie)).value)
        val none = SettingsTable.ASSISTANT_OPTIONS[0]
        val copilotOption = SettingsTable.ASSISTANT_OPTIONS[1]
        val claude = SettingsTable.ASSISTANT_OPTIONS[2]
        assertEquals("junie", SettingsTable.storedAfterApply("junie", none, emptyList()))
        assertEquals("claudeCode", SettingsTable.storedAfterApply("claudeCode", none, listOf(copilot)))
        assertEquals("copilot", SettingsTable.storedAfterApply("claudeCode", copilotOption, listOf(copilot)))
        assertEquals("none", SettingsTable.storedAfterApply("junie", none, listOf(junie)))
        assertEquals("claudeCode", SettingsTable.storedAfterApply("none", claude, listOf(terminal)))
        assertEquals("none", SettingsTable.storedAfterApply("bogus", none, emptyList()))
    }

    @Test
    fun `AC-039 a plugin that comes or goes while the page is open reaches every listener once and can be unsubscribed`() {
        val bus = PluginOptionsBus()
        val first = ArrayList<List<String>>()
        val second = ArrayList<List<String>>()
        val stopFirst = bus.subscribe { first.add(it) }
        bus.subscribe { second.add(it) }
        bus.publish(listOf(terminal))
        stopFirst()
        bus.publish(listOf(terminal, copilot))
        assertEquals(listOf(listOf(terminal)), first)
        assertEquals(listOf(listOf(terminal), listOf(terminal, copilot)), second)
        assertEquals(listOf("none", "copilot", "claudeCode"), SettingsTable.options(second.last()).map { it.value })
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

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

    private val terminal = "org.jetbrains.plugins.terminal"
    private val everything = listOf(terminal, "cli:junie", "cli:claude", "cli:copilot")

    @Test
    fun `AC-043 the assistant is stored as none, copilot, claudeCode, junie or nothing, and nothing is the default`() {
        assertEquals("", SettingsTable.ASSISTANT_UNSET)
        assertEquals(SettingsTable.ASSISTANT_UNSET, SettingsTable.ASSISTANT_DEFAULT)
        assertEquals("", SettingsModel().assistant)
        assertEquals(JsonPrimitive(""), SettingsTable.values(SettingsModel())["assistant"])
        assertEquals(listOf("showStepTips", "assistant", "modelHints"), SettingsTable.values(SettingsModel()).keys.toList())
        for (value in listOf("none", "copilot", "claudeCode", "junie", "")) {
            assertEquals(value, SettingsTable.sanitize(SettingsModel(assistant = value)).assistant)
            assertEquals(JsonPrimitive(value), SettingsTable.values(SettingsModel(assistant = value))["assistant"])
        }
        assertEquals("", SettingsTable.fromState(true, "", "", null).assistant)
        assertEquals("claudeCode", SettingsTable.fromState(true, "", "", "claudeCode").assistant)
    }

    @Test
    fun `AC-043 a stored value of an older release or an unknown one migrates to unset and never fails`() {
        for (old in listOf("copyForCopilot", "copyForJunie", "copyFor", "claude", "Claude Code", "42", "copilot ", "NONE", "bogus", " junie")) {
            assertEquals("", SettingsTable.sanitize(SettingsModel(assistant = old)).assistant, old)
            assertEquals("", SettingsTable.fromState(true, "", "", old).assistant, old)
            assertEquals(JsonPrimitive(""), SettingsTable.values(SettingsModel(assistant = old))["assistant"], old)
            assertEquals(SettingsTable.displayed("", everything), SettingsTable.displayed(old, everything), old)
            assertEquals("", SettingsTable.storedAfterApply(old, SettingsTable.displayed(old, everything), everything), old)
        }
        for (kept in listOf("junie", "claudeCode", "copilot", "none")) {
            assertEquals(kept, SettingsTable.fromState(true, "", "", kept).assistant)
        }
    }

    @Test
    fun `AC-043 the row texts are those of section 16`() {
        assertEquals("Assistant:", SettingsTable.ASSISTANT_LABEL)
        assertEquals(
            "The assistant your next step goes to. Studio sends nothing; Copy prompt stays in the button's menu.",
            SettingsTable.ASSISTANT_DESCRIPTION,
        )
        assertEquals(listOf("junie", "claudeCode", "copilot", "none"), SettingsTable.ASSISTANT_OPTIONS.map { it.value })
        assertEquals(listOf("Junie", "Claude Code", "GitHub Copilot", "None: Copy prompt"), SettingsTable.ASSISTANT_OPTIONS.map { it.label })
        assertEquals(
            listOf(
                "Send to Junie types the prompt into the Junie CLI in the IDE terminal and sends nothing. Needs the junie command or the Junie agent of AI Assistant, and the Terminal plugin.",
                "Send to Claude Code types the prompt into Claude Code in the IDE terminal and sends nothing. Needs the claude command and the Terminal plugin.",
                "Send to Copilot types the prompt into the GitHub Copilot CLI in the IDE terminal and sends nothing. Needs the copilot command and the Terminal plugin.",
                "Copy the prompt and paste it into any assistant.",
            ),
            SettingsTable.ASSISTANT_OPTIONS.map { it.description },
        )
        assertEquals("Junie", SettingsTable.ASSISTANT_OPTIONS[0].toString())
        assertEquals(
            "Assistants that are not available are greyed out with the reason. Installed one just now? Restart the IDE.",
            SettingsTable.ASSISTANT_HINT,
        )
    }

    @Test
    fun `AC-038 the setting description is two short sentences that repeat no option description`() {
        assertEquals("The assistant your next step goes to. Studio sends nothing; Copy prompt stays in the button's menu.", SettingsTable.ASSISTANT_DESCRIPTION)
        assertEquals(2, SettingsTable.ASSISTANT_DESCRIPTION.split(". ").size)
        for (option in SettingsTable.ASSISTANT_OPTIONS) {
            assertFalse(SettingsTable.ASSISTANT_DESCRIPTION.contains(option.description), option.value)
        }
        assertFalse(SettingsTable.ASSISTANT_DESCRIPTION.contains("Send to Claude Code"))
    }

    @Test
    fun `AC-043 every agent appears only while its command and the Terminal plugin are there, None always, in the order of the table`() {
        assertEquals(listOf("none"), SettingsTable.options(emptyList()).map { it.value })
        assertEquals(listOf("none"), SettingsTable.options(listOf("cli:junie", "cli:claude", "cli:copilot")).map { it.value })
        assertEquals(listOf("none"), SettingsTable.options(listOf(terminal)).map { it.value })
        assertEquals(listOf("junie", "none"), SettingsTable.options(listOf(terminal, "cli:junie")).map { it.value })
        assertEquals(listOf("claudeCode", "none"), SettingsTable.options(listOf(terminal, "cli:claude")).map { it.value })
        assertEquals(listOf("copilot", "none"), SettingsTable.options(listOf(terminal, "cli:copilot")).map { it.value })
        assertEquals(listOf("junie", "claudeCode", "copilot", "none"), SettingsTable.options(everything).map { it.value })
        assertEquals(listOf("none"), SettingsTable.options(listOf("org.jetbrains.junie", "com.github.copilot", "com.intellij.ml.llm")).map { it.value })
    }

    @Test
    fun `AC-043 an agent is available by its cli id and the Terminal plugin, the Junie and Copilot plugins are not asked`() {
        assertTrue(SettingsTable.assistantAvailable("none", emptyList()))
        assertTrue(SettingsTable.assistantAvailable("copilot", listOf(terminal, "cli:copilot")))
        assertFalse(SettingsTable.assistantAvailable("copilot", listOf(terminal, "com.github.copilot")))
        assertFalse(SettingsTable.assistantAvailable("junie", listOf(terminal, "org.jetbrains.junie", "com.intellij.ml.llm")))
        assertFalse(SettingsTable.assistantAvailable("claudeCode", listOf("cli:claude")))
        assertFalse(SettingsTable.assistantAvailable("bogus", everything))
        assertFalse(SettingsTable.assistantAvailable("", everything))
    }

    @Test
    fun `AC-043 the hint shows while one of the three agents is not available`() {
        assertEquals(SettingsTable.ASSISTANT_HINT, SettingsTable.assistantHint(emptyList()))
        assertEquals(SettingsTable.ASSISTANT_HINT, SettingsTable.assistantHint(listOf(terminal, "cli:junie", "cli:claude")))
        assertEquals(SettingsTable.ASSISTANT_HINT, SettingsTable.assistantHint(listOf("cli:junie", "cli:claude", "cli:copilot")))
        assertEquals(null, SettingsTable.assistantHint(everything))
    }

    @Test
    fun `AC-043 unset shows Junie while it is available and None otherwise, a stored agent that is missing shows None`() {
        assertEquals("junie", SettingsTable.displayed("", everything).value)
        assertEquals("none", SettingsTable.displayed("", listOf(terminal, "cli:claude")).value)
        assertEquals("none", SettingsTable.displayed("", emptyList()).value)
        assertEquals("junie", SettingsTable.displayed("junie", everything).value)
        assertEquals("none", SettingsTable.displayed("junie", emptyList()).value)
        assertEquals("none", SettingsTable.displayed("claudeCode", listOf(terminal, "cli:copilot")).value)
        assertEquals("claudeCode", SettingsTable.displayed("claudeCode", listOf(terminal, "cli:claude")).value)
        assertEquals("none", SettingsTable.displayed("copilot", listOf(terminal)).value)
        assertEquals("none", SettingsTable.displayed("none", everything).value)
    }

    @Test
    fun `AC-043 applying the shown option keeps an unset value unset, a stored value stays until another is applied`() {
        val junie = SettingsTable.ASSISTANT_OPTIONS[0]
        val claude = SettingsTable.ASSISTANT_OPTIONS[1]
        val copilot = SettingsTable.ASSISTANT_OPTIONS[2]
        val none = SettingsTable.ASSISTANT_OPTIONS[3]
        assertEquals("", SettingsTable.storedAfterApply("", junie, everything))
        assertEquals("", SettingsTable.storedAfterApply("", none, listOf(terminal, "cli:claude")))
        assertEquals("none", SettingsTable.storedAfterApply("", none, everything))
        assertEquals("claudeCode", SettingsTable.storedAfterApply("", claude, everything))
        assertEquals("junie", SettingsTable.storedAfterApply("junie", none, emptyList()))
        assertEquals("claudeCode", SettingsTable.storedAfterApply("claudeCode", none, listOf(terminal, "cli:copilot")))
        assertEquals("copilot", SettingsTable.storedAfterApply("claudeCode", copilot, everything))
        assertEquals("none", SettingsTable.storedAfterApply("junie", none, everything))
        assertEquals("junie", SettingsTable.storedAfterApply("none", junie, everything))
        assertEquals("none", SettingsTable.storedAfterApply("none", none, everything))
    }

    @Test
    fun `AC-043 a change of the availability while the page is open reaches every listener once and changes the list`() {
        val bus = PluginOptionsBus()
        val first = ArrayList<List<String>>()
        val second = ArrayList<List<String>>()
        val stopFirst = bus.subscribe { first.add(it) }
        bus.subscribe { second.add(it) }
        bus.publish(listOf(terminal))
        stopFirst()
        bus.publish(listOf(terminal, "cli:copilot"))
        assertEquals(listOf(listOf(terminal)), first)
        assertEquals(listOf(listOf(terminal), listOf(terminal, "cli:copilot")), second)
        assertEquals(listOf("copilot", "none"), SettingsTable.options(second.last()).map { it.value })
        assertEquals(listOf(terminal, "cli:copilot"), bus.last)
    }

    @Test
    fun `AC-002 a change of the assistant sends one event with the bare key and the value`() {
        val events = SettingsTable.changeEvents(SettingsModel(assistant = "none"), SettingsModel(assistant = "claudeCode"))
        assertEquals(1, events.size)
        val event = JsonParser.parseString(events[0]).asJsonObject
        assertEquals(setOf("key", "value"), event.keySet())
        assertEquals("assistant", event.get("key").asString)
        assertEquals("claudeCode", event.get("value").asString)
        assertEquals(emptyList<String>(), SettingsTable.changeEvents(SettingsModel(assistant = "copilot"), SettingsModel(assistant = "copilot")))
        assertEquals(1, SettingsTable.changeEvents(SettingsModel(assistant = "junie"), SettingsModel(assistant = "bogus")).size)
        assertEquals(emptyList<String>(), SettingsTable.changeEvents(SettingsModel(assistant = ""), SettingsModel(assistant = "copyForJunie")))
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
        assertEquals("", settings.get("assistant").asString)
        assertFalse(settings.get("showStepTips").asBoolean)
        assertEquals("S", settings.getAsJsonObject("modelHints").get("strong").asString)
    }

    @Test
    fun `AC-056 an agent that is not available is listed with its reason and cannot be chosen`() {
        val none = emptyList<String>()
        assertEquals(
            "Junie \u2014 not found (install the Junie CLI or the Junie agent in AI Assistant)",
            SettingsTable.rowLabel(SettingsTable.ASSISTANT_OPTIONS[0], listOf(terminal)),
        )
        assertEquals("Claude Code \u2014 `claude` not on the PATH", SettingsTable.rowLabel(SettingsTable.ASSISTANT_OPTIONS[1], listOf(terminal)))
        assertEquals("GitHub Copilot \u2014 `copilot` not on the PATH", SettingsTable.rowLabel(SettingsTable.ASSISTANT_OPTIONS[2], listOf(terminal, "cli:junie")))
        assertEquals("Claude Code \u2014 Terminal plugin is disabled", SettingsTable.rowLabel(SettingsTable.ASSISTANT_OPTIONS[1], none))
        assertEquals("Terminal plugin is disabled", SettingsTable.unavailableReason("junie", listOf("cli:junie")))
    }

    @Test
    fun `AC-056 an available agent, None and an unknown value have no reason and keep their label`() {
        assertEquals(null, SettingsTable.unavailableReason("junie", listOf(terminal, "cli:junie")))
        assertEquals(null, SettingsTable.unavailableReason("none", emptyList()))
        assertEquals(null, SettingsTable.unavailableReason("bogus", emptyList()))
        assertEquals("Junie", SettingsTable.rowLabel(SettingsTable.ASSISTANT_OPTIONS[0], listOf(terminal, "cli:junie")))
        assertEquals("None: Copy prompt", SettingsTable.rowLabel(SettingsTable.ASSISTANT_OPTIONS[3], emptyList()))
    }

    @Test
    fun `AC-056 a stored value of an unavailable agent still shows None`() {
        assertEquals("none", SettingsTable.displayed("junie", listOf(terminal)).value)
    }
}

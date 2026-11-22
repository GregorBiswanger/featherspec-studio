package com.gregorbiswanger.featherspec.studio

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.google.gson.JsonPrimitive
import com.gregorbiswanger.featherspec.studio.ports.ProjectFolders
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class CoreConfigTest {
    private fun parse(json: String): JsonObject = JsonParser.parseString(json).asJsonObject

    @Test
    fun `two folders untrusted on Windows`() {
        val folders = ProjectFolders.folders("C:/projects/test", listOf("D:/other/lib"), true)
        val config = parse(
            CoreConfig.json("win32", "0.1.0", emptyMap(), false, folders, mapOf("featherspec-studio.activeProject" to "\"a\"")),
        )
        assertEquals("jetbrains", config.get("host").asString)
        assertEquals("win32", config.get("platform").asString)
        assertEquals("0.1.0", config.get("studioVersion").asString)
        assertFalse(config.get("trusted").asBoolean)
        assertEquals(0, config.getAsJsonObject("settings").size())
        val listed = config.getAsJsonArray("folders").map { it.asJsonObject }
        assertEquals(
            listOf("file:///c%3A/projects/test", "file:///d%3A/other/lib"),
            listed.map { it.get("root").asString },
        )
        assertEquals(listOf("test", "lib"), listed.map { it.get("name").asString })
        assertEquals(listOf("C:\\projects\\test", "D:\\other\\lib"), listed.map { it.get("displayPath").asString })
        assertEquals("\"a\"", config.getAsJsonObject("memory").get("featherspec-studio.activeProject").asString)
    }

    @Test
    fun `settings pass through with their bare keys and the keys are exactly those of the core config`() {
        val config = parse(CoreConfig.json("linux", "1.2.3", mapOf("showStepTips" to JsonPrimitive(false)), true, emptyList(), emptyMap()))
        assertEquals(setOf("host", "platform", "studioVersion", "settings", "trusted", "folders", "memory", "plugins"), config.keySet())
        assertEquals(0, config.getAsJsonArray("plugins").size())
        assertFalse(config.getAsJsonObject("settings").get("showStepTips").asBoolean)
        assertTrue(config.get("trusted").asBoolean)
        assertEquals(0, config.getAsJsonArray("folders").size())
    }

    @Test
    fun `AC-003 the start config carries the available plugin ids in order`() {
        val plugins = listOf("com.github.copilot", "org.jetbrains.plugins.terminal")
        val config = parse(CoreConfig.json("linux", "1.2.3", emptyMap(), true, emptyList(), emptyMap(), plugins))
        assertEquals(plugins, config.getAsJsonArray("plugins").map { it.asString })
    }

    @Test
    fun `platform names`() {
        assertEquals("win32", CoreConfig.platform(windows = true, mac = false))
        assertEquals("darwin", CoreConfig.platform(windows = false, mac = true))
        assertEquals("linux", CoreConfig.platform(windows = false, mac = false))
    }

    @Test
    fun `folders event carries the folders array`() {
        val folders = ProjectFolders.folders("/work/app", emptyList(), false)
        val event = parse(CoreConfig.foldersEvent(folders))
        assertEquals(setOf("folders"), event.keySet())
        assertEquals("file:///work/app", event.getAsJsonArray("folders")[0].asJsonObject.get("root").asString)
    }
}

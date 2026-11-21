package com.gregorbiswanger.featherspec.studio

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.nio.file.Files
import java.nio.file.Path

class HostTextsTest {
    private val texts: String = read("shared", "protocol", "texts.ts")
    private val vocabulary: String = read("shared", "protocol", "vocabulary.ts")

    @Test
    fun `loading text equals LOADING_TEXT`() {
        assertEquals(HostTexts.LOADING, literal(texts, "export const LOADING_TEXT ="))
    }

    @Test
    fun `S5 label equals STATE_LABELS S5`() {
        assertEquals(HostTexts.S5, literal(texts, "    S5:"))
    }

    @Test
    fun `show output equals ACTION_LABELS showOutput`() {
        assertEquals(HostTexts.SHOW_OUTPUT, literal(texts, "    showOutput:"))
    }

    @Test
    fun `JetBrains texts equal JETBRAINS_TEXTS`() {
        assertEquals(HostTexts.JCEF_UNSUPPORTED, literal(vocabulary, "    jcefUnsupported:"))
        assertEquals(HostTexts.JCEF_SUSPENDED, literal(vocabulary, "    jcefSuspended:"))
        assertEquals(HostTexts.OPEN_HELP, literal(vocabulary, "    openHelp:"))
        assertEquals(HostTexts.STATUS_UNAVAILABLE, literal(vocabulary, "    statusUnavailable:"))
        assertEquals(HostTexts.HELP_URL, literal(vocabulary, "    helpUrl:"))
    }

    private fun literal(source: String, prefix: String): String {
        val line = source.lineSequence().firstOrNull { it.startsWith(prefix) } ?: error("$prefix not found")
        val value = line.substring(prefix.length).trim()
        val quote = value[0]
        require(quote == '\'' || quote == '"') { "$prefix is not a string literal: $value" }
        return value.substring(1, value.indexOf(quote, 1))
    }

    private fun read(vararg parts: String): String {
        val relative = Path.of("src", *parts)
        val candidates = listOf(Path.of("..").resolve(relative), relative)
        val path = candidates.firstOrNull { Files.exists(it) }
            ?: error("$relative not found from ${Path.of("").toAbsolutePath()}")
        return Files.readString(path)
    }
}

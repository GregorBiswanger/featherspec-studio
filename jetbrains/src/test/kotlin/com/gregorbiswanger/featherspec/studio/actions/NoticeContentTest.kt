package com.gregorbiswanger.featherspec.studio.actions

import com.gregorbiswanger.featherspec.studio.HostTexts
import com.gregorbiswanger.featherspec.studio.runtime.UnavailableKind
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Test
import java.nio.file.Files
import java.nio.file.Path

class NoticeContentTest {
    private val vocabulary: String = run {
        val relative = Path.of("src", "shared", "protocol", "vocabulary.ts")
        val path = listOf(Path.of("..").resolve(relative), relative).first { Files.exists(it) }
        Files.readString(path)
    }

    @Test
    fun `AC-030 the unsupported notice carries the JETBRAINS_TEXTS wording and the help link`() {
        val content = NoticeContent.of(UnavailableKind.UNSUPPORTED)
        assertEquals(literal("    jcefUnsupported:"), content.text)
        assertEquals(literal("    openHelp:"), content.helpLabel)
        assertEquals(literal("    helpUrl:"), content.helpUrl)
    }

    @Test
    fun `AC-030 the suspended notice carries the JETBRAINS_TEXTS wording`() {
        val content = NoticeContent.of(UnavailableKind.SUSPENDED)
        assertEquals(literal("    jcefSuspended:"), content.text)
        assertEquals(HostTexts.JCEF_SUSPENDED, content.text)
        assertEquals(HostTexts.OPEN_HELP, content.helpLabel)
        assertEquals(HostTexts.HELP_URL, content.helpUrl)
    }

    @Test
    fun `the two reasons differ`() {
        assertNotEquals(NoticeContent.of(UnavailableKind.UNSUPPORTED).text, NoticeContent.of(UnavailableKind.SUSPENDED).text)
    }

    private fun literal(prefix: String): String {
        val line = vocabulary.lineSequence().first { it.startsWith(prefix) }
        val value = line.substring(prefix.length).trim()
        val quote = value[0]
        return value.substring(1, value.indexOf(quote, 1))
    }
}

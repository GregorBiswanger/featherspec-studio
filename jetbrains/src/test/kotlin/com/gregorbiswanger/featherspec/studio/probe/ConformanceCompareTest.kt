package com.gregorbiswanger.featherspec.studio.probe

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Files
import java.nio.file.Path

class ConformanceCompareTest {
    @TempDir
    lateinit var temp: Path

    private fun write(directory: String, name: String, text: String) {
        val dir = temp.resolve(directory)
        Files.createDirectories(dir)
        Files.write(dir.resolve(name), text.toByteArray(Charsets.UTF_8))
    }

    @Test
    fun `first difference finds the byte and the length`() {
        assertEquals(-1, ConformanceCompare.firstDifference("abc".toByteArray(), "abc".toByteArray()))
        assertEquals(1, ConformanceCompare.firstDifference("abc".toByteArray(), "aXc".toByteArray()))
        assertEquals(3, ConformanceCompare.firstDifference("abc".toByteArray(), "abcd".toByteArray()))
        assertEquals(2, ConformanceCompare.firstDifference("abc".toByteArray(), "ab".toByteArray()))
    }

    @Test
    fun `names lists json files without the skipped ones and sorted`() {
        write("expected", "b.json", "1")
        write("expected", "a.json", "1")
        write("expected", "setup-expected.json", "1")
        write("expected", "notes.txt", "1")
        assertEquals(listOf("a", "b"), ConformanceCompare.names(temp.resolve("expected"), setOf("setup-expected")))
        assertEquals(emptyList<String>(), ConformanceCompare.names(temp.resolve("absent"), emptySet()))
    }

    @Test
    fun `equal files give no difference`() {
        write("expected", "a.json", "{\"x\":\"ä\"}")
        write("actual", "a.json", "{\"x\":\"ä\"}")
        assertEquals(emptyList<String>(), ConformanceCompare.differences(temp.resolve("expected"), temp.resolve("actual"), listOf("a")))
    }

    @Test
    fun `a trailing newline is a difference`() {
        write("expected", "a.json", "{}")
        write("actual", "a.json", "{}\n")
        val found = ConformanceCompare.differences(temp.resolve("expected"), temp.resolve("actual"), listOf("a"))
        assertEquals(1, found.size)
        assertTrue(found[0].startsWith("a: differs at byte 2"))
    }

    @Test
    fun `a missing actual file is a difference`() {
        write("expected", "a.json", "{}")
        Files.createDirectories(temp.resolve("actual"))
        assertEquals(
            listOf("a: no actual output"),
            ConformanceCompare.differences(temp.resolve("expected"), temp.resolve("actual"), listOf("a")),
        )
    }

    @Test
    fun `compare files names the label`() {
        write("expected", "s.json", "1")
        write("actual", "s.json", "1")
        assertNull(ConformanceCompare.compareFiles("setup", temp.resolve("expected/s.json"), temp.resolve("actual/s.json")))
    }
}

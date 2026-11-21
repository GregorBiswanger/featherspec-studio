package com.gregorbiswanger.featherspec.studio.ports

import com.google.gson.JsonElement
import com.google.gson.JsonParser
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.AccessDeniedException
import java.nio.file.Files
import java.nio.file.NoSuchFileException
import java.nio.file.Path
import java.util.concurrent.Callable
import java.util.concurrent.Executors

class FileRuntimeMediumTest {
    @TempDir
    lateinit var dir: Path

    private fun medium(): FileRuntimeMedium = FileRuntimeMedium(dir.resolve("store"))

    @Test
    fun readsNothingForAnAbsentFile() {
        assertNull(medium().read("status.jsonl"))
    }

    @Test
    fun openCreatesTheStoreDirectory() {
        medium().open()
        assertTrue(Files.isDirectory(dir.resolve("store")))
    }

    @Test
    fun appendsInOrderAndCreatesParents() {
        val medium = medium()
        medium.append("runs/a.jsonl", "one\n")
        medium.append("runs/a.jsonl", "two\n")
        assertEquals("one\ntwo\n", medium.read("runs/a.jsonl"))
    }

    @Test
    fun concurrentAppendsStayWhole() {
        val medium = medium()
        val pool = Executors.newFixedThreadPool(8)
        try {
            val tasks = (0 until 64).map { index -> Callable { medium.append("log.txt", "line-$index\n") } }
            pool.invokeAll(tasks).forEach { it.get() }
        } finally {
            pool.shutdown()
        }
        val lines = medium.lines("log.txt")
        assertEquals(64, lines.size)
        assertTrue(lines.all { it.terminated && it.text.startsWith("line-") })
    }

    @Test
    fun replaceSwapsTheContentAndLeavesNoTemporaryFile() {
        val medium = medium()
        medium.replace("state.json", "first")
        medium.replace("state.json", "second")
        assertEquals("second", medium.read("state.json"))
        assertEquals(listOf("state.json"), Files.list(dir.resolve("store")).use { s -> s.map { it.fileName.toString() }.toList() })
    }

    @Test
    fun createExclusiveWritesOnceOnly() {
        val medium = medium()
        assertTrue(medium.createExclusive("lock", "a"))
        assertFalse(medium.createExclusive("lock", "b"))
        assertEquals("a", medium.read("lock"))
    }

    @Test
    fun linesMarkTheUnterminatedTail() {
        val medium = medium()
        medium.append("x.jsonl", "a\n\nb\r\nc")
        assertEquals(
            listOf(
                FileRuntimeMedium.Line("a", true),
                FileRuntimeMedium.Line("", true),
                FileRuntimeMedium.Line("b\r", true),
                FileRuntimeMedium.Line("c", false),
            ),
            medium.lines("x.jsonl"),
        )
    }

    @Test
    fun linesOfAnAbsentOrEmptyFileAreEmpty() {
        val medium = medium()
        assertEquals(emptyList<FileRuntimeMedium.Line>(), medium.lines("none"))
        medium.append("empty", "")
        assertEquals(emptyList<FileRuntimeMedium.Line>(), medium.lines("empty"))
    }

    @Test
    fun linesKeepMultibyteText() {
        val medium = medium()
        medium.append("u", "Zürich ✓\n")
        assertEquals(listOf(FileRuntimeMedium.Line("Zürich ✓", true)), medium.lines("u"))
    }

    @Test
    fun listReturnsSortedFilesWithTheDirectoryPrefix() {
        val medium = medium()
        medium.append("runs/b.jsonl", "b")
        medium.append("runs/a.jsonl", "a")
        medium.append("runs/sub/c.jsonl", "c")
        Files.writeString(dir.resolve("store/runs/a.jsonl.tmp-1-1"), "t")
        assertEquals(listOf("runs/a.jsonl", "runs/b.jsonl"), medium.list("runs"))
    }

    @Test
    fun listOfAnAbsentDirectoryIsEmpty() {
        assertEquals(emptyList<String>(), medium().list("nothing"))
    }

    @Test
    fun removeDeletesAndToleratesAbsence() {
        val medium = medium()
        medium.append("gone", "x")
        medium.remove("gone")
        medium.remove("gone")
        assertNull(medium.read("gone"))
    }

    @Test
    fun rejectsNamesOutsideTheStore() {
        val medium = medium()
        listOf("", "/abs", "../x", "a/../b", "a//b", "a/./b", "a\\b", ".", "a/").forEach { name ->
            assertThrows(IllegalArgumentException::class.java, { medium.read(name) }, name)
            assertThrows(IllegalArgumentException::class.java, { medium.append(name, "x") }, name)
        }
    }

    @Test
    fun retriesBusyFilesThenSucceeds() {
        var calls = 0
        val result = withRetry(listOf(0L, 0L)) {
            calls += 1
            if (calls < 3) {
                throw AccessDeniedException("busy")
            }
            "done"
        }
        assertEquals("done", result)
        assertEquals(3, calls)
    }

    @Test
    fun givesUpAfterTheLastDelay() {
        var calls = 0
        assertThrows(AccessDeniedException::class.java) {
            withRetry<Unit>(listOf(0L, 0L)) {
                calls += 1
                throw AccessDeniedException("busy")
            }
        }
        assertEquals(3, calls)
    }

    @Test
    fun doesNotRetryAMissingFile() {
        var calls = 0
        assertThrows(NoSuchFileException::class.java) {
            withRetry<Unit>(listOf(0L, 0L)) {
                calls += 1
                throw NoSuchFileException("gone")
            }
        }
        assertEquals(1, calls)
    }

    private fun call(ports: MediumPorts, name: String, args: String): JsonElement {
        val reply = ports.answer(name, args) ?: throw AssertionError("no answer for $name")
        val parsed = JsonParser.parseString(reply).asJsonObject
        if (parsed.has("error")) {
            throw AssertionError(parsed.get("error").asString)
        }
        return parsed.get("ok")
    }

    @Test
    fun answersTheWireShapes() {
        val ports = MediumPorts.under(dir, false)
        val root = "file:///home/dev/project"
        val base = "\"root\":\"$root\""
        assertTrue(call(ports, "medium.open", "{$base}").isJsonNull)
        assertTrue(call(ports, "medium.read", """{$base,"name":"a"}""").isJsonNull)
        assertTrue(call(ports, "medium.append", """{$base,"name":"a/x.jsonl","text":"one\ntwo"}""").isJsonNull)
        assertEquals("one\ntwo", call(ports, "medium.read", """{$base,"name":"a/x.jsonl"}""").asString)
        val lines = call(ports, "medium.lines", """{$base,"name":"a/x.jsonl"}""").asJsonArray
        assertEquals(2, lines.size())
        assertEquals("one", lines[0].asJsonObject.get("text").asString)
        assertTrue(lines[0].asJsonObject.get("terminated").asBoolean)
        assertFalse(lines[1].asJsonObject.get("terminated").asBoolean)
        assertTrue(call(ports, "medium.createExclusive", """{$base,"name":"l","text":"1"}""").asBoolean)
        assertFalse(call(ports, "medium.createExclusive", """{$base,"name":"l","text":"2"}""").asBoolean)
        assertTrue(call(ports, "medium.replace", """{$base,"name":"l","text":"3"}""").isJsonNull)
        assertEquals(listOf("a/x.jsonl"), call(ports, "medium.list", """{$base,"name":"a"}""").asJsonArray.map { it.asString })
        assertTrue(call(ports, "medium.remove", """{$base,"name":"l"}""").isJsonNull)
        assertTrue(Files.isDirectory(StoreLocation.storeDir(dir, root, false)))
    }

    @Test
    fun answersAnErrorForABadNameAndNullForForeignCalls() {
        val ports = MediumPorts.under(dir, false)
        val reply = ports.answer("medium.read", """{"root":"file:///p","name":"../x"}""")
        assertTrue(JsonParser.parseString(reply).asJsonObject.has("error"))
        assertNull(ports.answer("source.list", "{}"))
    }
}

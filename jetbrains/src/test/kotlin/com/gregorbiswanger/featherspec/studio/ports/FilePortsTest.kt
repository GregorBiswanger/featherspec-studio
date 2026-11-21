package com.gregorbiswanger.featherspec.studio.ports

import com.google.gson.JsonElement
import com.google.gson.JsonParser
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Assumptions.assumeTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.IOException
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.NoSuchFileException
import java.nio.file.Path
import java.nio.file.attribute.FileTime
import java.util.Base64

class FilePortsTest {
    private val ports = FilePorts()

    private fun rootOf(directory: Path): String = FileUris.toUri(directory, HostOs.windows)

    private fun project(directory: Path): String {
        Files.createDirectories(directory.resolve(".specs/backlog"))
        Files.writeString(directory.resolve(".specs/backlog/a.md"), "# A\n")
        Files.writeString(directory.resolve("AGENTS.md"), "agents")
        return rootOf(directory)
    }

    private fun call(root: String, name: String, relativePath: String): JsonElement {
        val args = """{"root":${quote(root)},"relativePath":${quote(relativePath)}}"""
        val reply = ports.answer(name, args) ?: throw AssertionError("no answer for $name")
        val parsed = JsonParser.parseString(reply).asJsonObject
        if (parsed.has("error")) {
            throw AssertionError(parsed.get("error").asString)
        }
        return parsed.get("ok")
    }

    private fun quote(text: String): String = "\"" + text.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

    @Test
    fun listsEntriesWithKinds(@TempDir directory: Path) {
        val root = project(directory)
        val entries = ports.list(root, "")!!.associate { it.name to it.kind }
        assertEquals(mapOf(".specs" to "directory", "AGENTS.md" to "file"), entries)
    }

    @Test
    fun listsNestedDirectory(@TempDir directory: Path) {
        val root = project(directory)
        assertEquals(listOf(FilePorts.Entry("a.md", "file")), ports.list(root, ".specs/backlog"))
    }

    @Test
    fun listOfMissingDirectoryIsNull(@TempDir directory: Path) {
        assertNull(ports.list(project(directory), ".specs/missing"))
    }

    @Test
    fun listOfAFileIsNull(@TempDir directory: Path) {
        assertNull(ports.list(project(directory), "AGENTS.md"))
    }

    @Test
    fun listBelowAFileIsNull(@TempDir directory: Path) {
        assertNull(ports.list(project(directory), "AGENTS.md/inner"))
    }

    @Test
    fun statReportsKindSizeAndModifiedTime(@TempDir directory: Path) {
        val root = project(directory)
        val file = directory.resolve("AGENTS.md")
        Files.setLastModifiedTime(file, FileTime.fromMillis(1_700_000_000_000L))
        assertEquals(FilePorts.Stat("file", 1_700_000_000_000L, 6L), ports.stat(root, "AGENTS.md"))
        assertEquals("directory", ports.stat(root, ".specs")!!.kind)
    }

    @Test
    fun statOfMissingIsNull(@TempDir directory: Path) {
        assertNull(ports.stat(project(directory), "nope.md"))
    }

    @Test
    fun statDoesNotFollowSymbolicLinks(@TempDir directory: Path) {
        val root = project(directory)
        val created = try {
            Files.createSymbolicLink(directory.resolve("link.md"), directory.resolve("AGENTS.md"))
            true
        } catch (failure: IOException) {
            false
        } catch (failure: UnsupportedOperationException) {
            false
        }
        assumeTrue(created)
        assertEquals("symlink", ports.stat(root, "link.md")!!.kind)
        assertEquals("file", ports.fsStat(root, "link.md"))
        assertEquals("symlink", ports.list(root, "")!!.single { it.name == "link.md" }.kind)
    }

    @Test
    fun readBytesReturnsTheFileContent(@TempDir directory: Path) {
        val root = project(directory)
        val bytes = byteArrayOf(0, 1, 2, -1, -128, 127)
        Files.write(directory.resolve("bin.dat"), bytes)
        assertArrayEquals(bytes, ports.readBytes(root, "bin.dat"))
    }

    @Test
    fun readBytesOfMissingFileThrows(@TempDir directory: Path) {
        val root = project(directory)
        assertThrows(NoSuchFileException::class.java) { ports.readBytes(root, "nope.md") }
    }

    @Test
    fun readTextDecodesUtf8(@TempDir directory: Path) {
        val root = project(directory)
        Files.write(directory.resolve("t.md"), "Grüße 😀".toByteArray(StandardCharsets.UTF_8))
        assertEquals("Grüße 😀", ports.readText(root, "t.md"))
    }

    @Test
    fun readDirectoryListsNamesOrNull(@TempDir directory: Path) {
        val root = project(directory)
        assertEquals(listOf("backlog"), ports.readDirectory(root, ".specs"))
        assertNull(ports.readDirectory(root, "missing"))
    }

    @Test
    fun fsStatFollowsKinds(@TempDir directory: Path) {
        val root = project(directory)
        assertEquals("file", ports.fsStat(root, "AGENTS.md"))
        assertEquals("directory", ports.fsStat(root, ".specs"))
        assertNull(ports.fsStat(root, "missing"))
    }

    @Test
    fun parentSegmentsAreRejected(@TempDir directory: Path) {
        val root = project(directory)
        assertThrows(IllegalArgumentException::class.java) { ports.list(root, "../x") }
    }

    @Test
    fun emptyAndDotSegmentsAreSkipped(@TempDir directory: Path) {
        val root = project(directory)
        assertEquals(listOf("a.md"), ports.readDirectory(root, "./.specs//backlog/"))
    }

    @Test
    fun answerSourceListShape(@TempDir directory: Path) {
        val root = project(directory)
        val list = call(root, "source.list", ".specs/backlog").asJsonArray
        assertEquals("""[{"name":"a.md","kind":"file"}]""", list.toString())
        assertTrue(call(root, "source.list", "missing").isJsonNull)
    }

    @Test
    fun answerSourceStatShape(@TempDir directory: Path) {
        val root = project(directory)
        Files.setLastModifiedTime(directory.resolve("AGENTS.md"), FileTime.fromMillis(1_700_000_000_000L))
        assertEquals(
            """{"kind":"file","mtimeMs":1700000000000,"size":6}""",
            call(root, "source.stat", "AGENTS.md").toString(),
        )
        assertTrue(call(root, "source.stat", "missing").isJsonNull)
    }

    @Test
    fun answerSourceReadBytesIsBase64(@TempDir directory: Path) {
        val root = project(directory)
        val expected = Base64.getEncoder().encodeToString("agents".toByteArray(StandardCharsets.UTF_8))
        assertEquals(expected, call(root, "source.readBytes", "AGENTS.md").asString)
    }

    @Test
    fun answerFsShapes(@TempDir directory: Path) {
        val root = project(directory)
        assertEquals("file", call(root, "fs.stat", "AGENTS.md").asString)
        assertTrue(call(root, "fs.stat", "missing").isJsonNull)
        assertEquals("agents", call(root, "fs.readText", "AGENTS.md").asString)
        assertEquals("""["backlog"]""", call(root, "fs.readDirectory", ".specs").toString())
        assertTrue(call(root, "fs.readDirectory", "missing").isJsonNull)
    }

    @Test
    fun answerReportsFailuresAsError(@TempDir directory: Path) {
        val root = project(directory)
        val args = """{"root":${quote(root)},"relativePath":"nope.md"}"""
        val reply = JsonParser.parseString(ports.answer("source.readBytes", args)!!).asJsonObject
        assertTrue(reply.has("error"))
        val escaping = """{"root":${quote(root)},"relativePath":"../x"}"""
        assertTrue(JsonParser.parseString(ports.answer("source.list", escaping)!!).asJsonObject.has("error"))
        assertTrue(JsonParser.parseString(ports.answer("source.list", "{}")!!).asJsonObject.has("error"))
    }

    @Test
    fun answerIgnoresOtherNames() {
        assertNull(ports.answer("memory.set", "{}"))
        assertNull(ports.answer("watch.add", "{}"))
    }
}

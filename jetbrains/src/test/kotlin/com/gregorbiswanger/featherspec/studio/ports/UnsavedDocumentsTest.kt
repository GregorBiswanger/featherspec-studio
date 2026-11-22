package com.gregorbiswanger.featherspec.studio.ports

import com.google.gson.JsonParser
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.attribute.FileTime
import java.util.Base64

class UnsavedDocumentsTest {
    private class FakeDocuments : UnsavedDocuments {
        val texts = HashMap<Path, Unsaved>()

        override fun unsaved(path: Path): Unsaved? = texts[path]
    }

    private val documents = FakeDocuments()
    private val ports = FilePorts(unsaved = documents)

    private fun project(directory: Path): String {
        Files.createDirectories(directory.resolve(".specs/backlog"))
        Files.writeString(directory.resolve(".specs/backlog/a.md"), "disk\n")
        Files.writeString(directory.resolve("AGENTS.md"), "agents")
        Files.writeString(directory.resolve("README.md"), "readme")
        Files.setLastModifiedTime(directory.resolve(".specs/backlog/a.md"), FileTime.fromMillis(1_700_000_000_000L))
        return FileUris.toUri(directory, HostOs.windows)
    }

    private fun unsavedText(directory: Path, relative: String, text: String, stamp: Long) {
        documents.texts[directory.resolve(relative)] = Unsaved(text.toByteArray(StandardCharsets.UTF_8), stamp)
    }

    @Test
    fun readBytesPrefersTheUnsavedDocument(@TempDir directory: Path) {
        val root = project(directory)
        unsavedText(directory, ".specs/backlog/a.md", "edited in the editor\n", 7)
        assertEquals("edited in the editor\n", String(ports.readBytes(root, ".specs/backlog/a.md"), StandardCharsets.UTF_8))
        assertEquals("edited in the editor\n", ports.readText(root, ".specs/backlog/a.md"))
    }

    @Test
    fun readBytesFallsBackToDiskWithoutADocument(@TempDir directory: Path) {
        val root = project(directory)
        assertEquals("disk\n", ports.readText(root, ".specs/backlog/a.md"))
    }

    @Test
    fun statReportsTheDocumentSizeAndAFreshMtime(@TempDir directory: Path) {
        val root = project(directory)
        unsavedText(directory, ".specs/backlog/a.md", "longer unsaved text\n", 1)
        val stat = ports.stat(root, ".specs/backlog/a.md")!!
        assertEquals("file", stat.kind)
        assertEquals(20L, stat.size)
        assertTrue(stat.mtimeMs > 1_700_000_000_000L)
    }

    @Test
    fun everyEditChangesTheMtime(@TempDir directory: Path) {
        val root = project(directory)
        unsavedText(directory, ".specs/backlog/a.md", "one\n", 1)
        val first = ports.stat(root, ".specs/backlog/a.md")!!.mtimeMs
        assertEquals(first, ports.stat(root, ".specs/backlog/a.md")!!.mtimeMs)
        unsavedText(directory, ".specs/backlog/a.md", "two\n", 2)
        val second = ports.stat(root, ".specs/backlog/a.md")!!.mtimeMs
        unsavedText(directory, ".specs/backlog/a.md", "three\n", 3)
        val third = ports.stat(root, ".specs/backlog/a.md")!!.mtimeMs
        assertTrue(second > first)
        assertTrue(third > second)
    }

    @Test
    fun statIsTheDiskStatAgainOnceTheDocumentIsSaved(@TempDir directory: Path) {
        val root = project(directory)
        val disk = ports.stat(root, ".specs/backlog/a.md")!!
        unsavedText(directory, ".specs/backlog/a.md", "unsaved\n", 1)
        assertNotEquals(disk, ports.stat(root, ".specs/backlog/a.md"))
        documents.texts.clear()
        assertEquals(disk, ports.stat(root, ".specs/backlog/a.md"))
    }

    @Test
    fun scanEntriesCarryTheOverlay(@TempDir directory: Path) {
        val root = project(directory)
        unsavedText(directory, ".specs/backlog/a.md", "scan overlay\n", 4)
        val entries = ports.scan(root, listOf(".specs"))
        assertEquals(13L, entries[".specs/backlog/a.md"]!!.stat.size)
        assertTrue(entries[".specs/backlog/a.md"]!!.stat.mtimeMs > 1_700_000_000_000L)
    }

    @Test
    fun theAnswerWireCarriesTheOverlay(@TempDir directory: Path) {
        val root = project(directory)
        unsavedText(directory, ".specs/backlog/a.md", "wire\n", 2)
        val args = """{"root":"$root","relativePath":".specs/backlog/a.md"}"""
        val bytes = JsonParser.parseString(ports.answer("source.readBytes", args)).asJsonObject.get("ok").asString
        assertEquals("wire\n", String(Base64.getDecoder().decode(bytes), StandardCharsets.UTF_8))
        val stat = JsonParser.parseString(ports.answer("source.stat", args)).asJsonObject.get("ok").asJsonObject
        assertEquals(5L, stat.get("size").asLong)
    }

    @Test
    fun theMarkerFileAndTheMemoryBankAreOverlaid(@TempDir directory: Path) {
        val root = project(directory)
        Files.createDirectories(directory.resolve(".memory-bank"))
        Files.writeString(directory.resolve(".memory-bank/activeContext.md"), "old")
        unsavedText(directory, "AGENTS.md", "new agents", 1)
        unsavedText(directory, ".memory-bank/activeContext.md", "new context", 1)
        assertEquals("new agents", ports.readText(root, "AGENTS.md"))
        assertEquals("new context", ports.readText(root, ".memory-bank/activeContext.md"))
    }

    @Test
    fun otherFilesAreNeverAsked(@TempDir directory: Path) {
        val root = project(directory)
        unsavedText(directory, "README.md", "unsaved readme", 1)
        assertEquals("readme", ports.readText(root, "README.md"))
        assertEquals(6L, ports.stat(root, "README.md")!!.size)
    }

    @Test
    fun theOverlayNeverWritesToDisk(@TempDir directory: Path) {
        val root = project(directory)
        unsavedText(directory, ".specs/backlog/a.md", "unsaved\n", 1)
        ports.readBytes(root, ".specs/backlog/a.md")
        ports.stat(root, ".specs/backlog/a.md")
        ports.scan(root, listOf(".specs"))
        assertEquals("disk\n", Files.readString(directory.resolve(".specs/backlog/a.md")))
        assertEquals(1_700_000_000_000L, Files.getLastModifiedTime(directory.resolve(".specs/backlog/a.md")).toMillis())
    }

    @Test
    fun aMissingFileStaysMissingEvenWithAStaleDocument(@TempDir directory: Path) {
        val root = project(directory)
        unsavedText(directory, ".specs/backlog/gone.md", "ghost", 1)
        assertEquals(null, ports.stat(root, ".specs/backlog/gone.md"))
    }

    @Test
    fun encodesWithCharsetSeparatorAndBom() {
        assertArrayEquals(
            "a\r\nb".toByteArray(StandardCharsets.UTF_8),
            DocumentBytes.encode("a\nb", StandardCharsets.UTF_8, "\r\n", null),
        )
        assertArrayEquals("a\nb".toByteArray(StandardCharsets.UTF_8), DocumentBytes.encode("a\nb", StandardCharsets.UTF_8, null, null))
        assertArrayEquals("ä\n".toByteArray(StandardCharsets.ISO_8859_1), DocumentBytes.encode("ä\n", StandardCharsets.ISO_8859_1, "\n", null))
        val bom = byteArrayOf(0xEF.toByte(), 0xBB.toByte(), 0xBF.toByte())
        assertArrayEquals(bom + "x".toByteArray(), DocumentBytes.encode("x", StandardCharsets.UTF_8, "\n", bom))
    }

    @Test
    fun overlayMtimeStaysAboveDiskAndForgets() {
        val mtimes = OverlayMtimes()
        assertEquals(101L, mtimes.mtime("k", 1, 100))
        assertEquals(101L, mtimes.mtime("k", 1, 100))
        assertEquals(102L, mtimes.mtime("k", 2, 100))
        assertEquals(1001L, mtimes.mtime("k", 2, 1000))
        mtimes.forget("k")
        assertEquals(101L, mtimes.mtime("k", 9, 100))
    }

    @Test
    fun coalescerFiresOncePerPathPerWindow() {
        val tasks = ArrayList<() -> Unit>()
        val fired = ArrayList<String>()
        val coalescer = PathCoalescer(100, { _, task -> tasks.add(task) }) { fired.add(it) }
        coalescer.submit("a")
        coalescer.submit("a")
        coalescer.submit("b")
        assertEquals(2, tasks.size)
        tasks.toList().forEach { it() }
        assertEquals(listOf("a", "b"), fired)
        coalescer.submit("a")
        assertEquals(3, tasks.size)
        tasks[2].invoke()
        assertEquals(listOf("a", "b", "a"), fired)
    }

    @Test
    fun overlayPathsAreRecognised() {
        assertTrue(WatchedPaths.hasUnsavedOverlay(".specs/backlog/a.md"))
        assertTrue(WatchedPaths.hasUnsavedOverlay("./.specs//x.md"))
        assertTrue(WatchedPaths.hasUnsavedOverlay(".memory-bank/techContext.md"))
        assertTrue(WatchedPaths.hasUnsavedOverlay("AGENTS.md"))
        assertTrue(!WatchedPaths.hasUnsavedOverlay("README.md"))
        assertTrue(!WatchedPaths.hasUnsavedOverlay(".specs"))
        assertTrue(!WatchedPaths.hasUnsavedOverlay("src/AGENTS.md"))
    }
}

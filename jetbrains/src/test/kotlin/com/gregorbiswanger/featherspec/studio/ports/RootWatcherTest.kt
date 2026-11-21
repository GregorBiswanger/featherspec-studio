package com.gregorbiswanger.featherspec.studio.ports

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit

class RootWatcherTest {
    private class Recorder {
        val all = CopyOnWriteArrayList<String>()
        val queue = LinkedBlockingQueue<String>()

        fun record(@Suppress("UNUSED_PARAMETER") root: Path, relative: String) {
            all.add(relative)
            queue.add(relative)
        }
    }

    private fun osLabel(): String = when {
        HostOs.windows -> "windows"
        HostOs.mac -> "macos"
        else -> "linux"
    }

    private fun awaitReport(recorder: Recorder, expected: String, startedNanos: Long): Long {
        val deadline = startedNanos + TimeUnit.MILLISECONDS.toNanos(TIMEOUT_MS)
        while (true) {
            val remaining = deadline - System.nanoTime()
            if (remaining <= 0) {
                throw AssertionError("No report for $expected within $TIMEOUT_MS ms, saw ${recorder.all}")
            }
            val next = recorder.queue.poll(remaining, TimeUnit.NANOSECONDS) ?: continue
            if (next == expected) {
                return (System.nanoTime() - startedNanos) / 1_000_000L
            }
        }
    }

    private fun withWatcher(root: Path, body: (RootWatcher, Recorder) -> Unit) {
        val recorder = Recorder()
        val watcher = RootWatcher { changed, relative -> recorder.record(changed, relative) }
        try {
            watcher.watch(root)
            body(watcher, recorder)
        } finally {
            watcher.close()
        }
    }

    @Test
    fun reportsAWriteUnderSpecsAndPrintsTheDelay(@TempDir root: Path) {
        Files.createDirectories(root.resolve(".specs/backlog"))
        withWatcher(root) { _, recorder ->
            val started = System.nanoTime()
            Files.writeString(root.resolve(".specs/backlog/x.md"), "# X\n")
            val elapsed = awaitReport(recorder, ".specs/backlog/x.md", started)
            println("ROOTWATCHER-MS ${osLabel()} $elapsed")
        }
    }

    @Test
    fun reportsAModificationOfAnExistingFile(@TempDir root: Path) {
        Files.createDirectories(root.resolve(".specs/active"))
        Files.writeString(root.resolve(".specs/active/m.md"), "one")
        withWatcher(root) { _, recorder ->
            Files.writeString(root.resolve(".specs/active/m.md"), "two")
            awaitReport(recorder, ".specs/active/m.md", System.nanoTime())
        }
    }

    @Test
    fun reportsADeletion(@TempDir root: Path) {
        Files.createDirectories(root.resolve(".specs/active"))
        Files.writeString(root.resolve(".specs/active/d.md"), "gone")
        withWatcher(root) { _, recorder ->
            Files.delete(root.resolve(".specs/active/d.md"))
            awaitReport(recorder, ".specs/active/d.md", System.nanoTime())
        }
    }

    @Test
    fun reportsAFileInANewSubdirectory(@TempDir root: Path) {
        Files.createDirectories(root.resolve(".specs/backlog"))
        withWatcher(root) { _, recorder ->
            val started = System.nanoTime()
            Files.createDirectories(root.resolve(".specs/backlog/sub"))
            Files.writeString(root.resolve(".specs/backlog/sub/y.md"), "# Y\n")
            awaitReport(recorder, ".specs/backlog/sub/y.md", started)
        }
    }

    @Test
    fun reportsFilesWhenSpecsAppearsAfterWatching(@TempDir root: Path) {
        withWatcher(root) { _, recorder ->
            val started = System.nanoTime()
            Files.createDirectories(root.resolve(".specs/backlog"))
            Files.writeString(root.resolve(".specs/backlog/z.md"), "# Z\n")
            awaitReport(recorder, ".specs/backlog/z.md", started)
        }
    }

    @Test
    fun reportsAgentsMdAtTheRoot(@TempDir root: Path) {
        withWatcher(root) { _, recorder ->
            val started = System.nanoTime()
            Files.writeString(root.resolve("AGENTS.md"), "rules")
            awaitReport(recorder, "AGENTS.md", started)
        }
    }

    @Test
    fun reportsTheProjectBrief(@TempDir root: Path) {
        Files.createDirectories(root.resolve(".memory-bank"))
        withWatcher(root) { _, recorder ->
            val started = System.nanoTime()
            Files.writeString(root.resolve(".memory-bank/projectbrief.md"), "brief")
            awaitReport(recorder, ".memory-bank/projectbrief.md", started)
        }
    }

    @Test
    fun reportsAReturnNote(@TempDir root: Path) {
        Files.createDirectories(root.resolve(".memory-bank"))
        withWatcher(root) { _, recorder ->
            val started = System.nanoTime()
            Files.writeString(root.resolve(".memory-bank/activeContext.0034-T-023.md"), "note")
            awaitReport(recorder, ".memory-bank/activeContext.0034-T-023.md", started)
        }
    }

    @Test
    fun doesNotReportFilesOutsideTheWatchedParts(@TempDir root: Path) {
        Files.createDirectories(root.resolve(".specs/backlog"))
        Files.createDirectories(root.resolve(".memory-bank"))
        Files.createDirectories(root.resolve("src"))
        withWatcher(root) { _, recorder ->
            Files.writeString(root.resolve("notes.md"), "n")
            Files.writeString(root.resolve("src/a.md"), "a")
            Files.writeString(root.resolve(".memory-bank/other.md"), "o")
            val started = System.nanoTime()
            Files.writeString(root.resolve(".specs/backlog/sentinel.md"), "s")
            awaitReport(recorder, ".specs/backlog/sentinel.md", started)
            Thread.sleep(QUIET_MS)
            assertFalse(recorder.all.any { it == "notes.md" || it.startsWith("src") || it == ".memory-bank/other.md" }, "saw ${recorder.all}")
        }
    }

    @Test
    fun unwatchStopsTheReports(@TempDir root: Path) {
        Files.createDirectories(root.resolve(".specs/backlog"))
        withWatcher(root) { watcher, recorder ->
            watcher.unwatch(root)
            Files.writeString(root.resolve(".specs/backlog/after.md"), "x")
            Thread.sleep(QUIET_MS)
            assertTrue(recorder.all.isEmpty(), "saw ${recorder.all}")
        }
    }

    @Test
    fun closeEndsTheThread(@TempDir root: Path) {
        val watcher = RootWatcher { _, _ -> }
        watcher.watch(root)
        assertTrue(watcher.isRunning())
        watcher.close()
        assertFalse(watcher.isRunning())
        watcher.close()
    }

    @Test
    fun watchAfterCloseDoesNothing(@TempDir root: Path) {
        val recorder = Recorder()
        val watcher = RootWatcher { changed, relative -> recorder.record(changed, relative) }
        watcher.close()
        watcher.watch(root)
        Files.writeString(root.resolve("AGENTS.md"), "x")
        Thread.sleep(QUIET_MS)
        assertTrue(recorder.all.isEmpty())
    }

    @Test
    fun reportedPathsTable() {
        val reported = listOf(
            "AGENTS.md",
            ".specs",
            ".specs/backlog/x.md",
            ".specs/active",
            ".memory-bank/projectbrief.md",
            ".memory-bank/activeContext.0034-T-023.md",
        )
        val ignored = listOf(
            "",
            "agents.txt",
            "src/a.md",
            ".specs2/x.md",
            ".memory-bank",
            ".memory-bank/other.md",
            ".memory-bank/activeContext.md",
            ".memory-bank/sub/activeContext.1.md",
            "docs/AGENTS.md",
        )
        reported.forEach { assertTrue(WatchedPaths.isReported(it), it) }
        ignored.forEach { assertFalse(WatchedPaths.isReported(it), it) }
    }

    @Test
    fun markerPathsTable() {
        assertTrue(WatchedPaths.isMarker("AGENTS.md"))
        assertTrue(WatchedPaths.isMarker(".specs"))
        assertTrue(WatchedPaths.isMarker(".memory-bank/projectbrief.md"))
        assertFalse(WatchedPaths.isMarker(".specs/backlog/x.md"))
        assertFalse(WatchedPaths.isMarker(".memory-bank/activeContext.1-T-1.md"))
    }

    @Test
    fun watchedDirectoriesTable() {
        assertTrue(WatchedPaths.isWatchedDirectory(".specs"))
        assertTrue(WatchedPaths.isWatchedDirectory(".specs/backlog/sub"))
        assertTrue(WatchedPaths.isWatchedDirectory(".memory-bank"))
        assertFalse(WatchedPaths.isWatchedDirectory("src"))
        assertFalse(WatchedPaths.isWatchedDirectory(".specs2"))
    }

    @Test
    fun relativeInsideTable() {
        assertEquals(".specs/a.md", WatchedPaths.relativeInside("/work/app", "/work/app/.specs/a.md", false))
        assertEquals("", WatchedPaths.relativeInside("/work/app", "/work/app", false))
        assertEquals("", WatchedPaths.relativeInside("/work/app/", "/work/app", false))
        assertNull(WatchedPaths.relativeInside("/work/app", "/work/app2/.specs/a.md", false))
        assertNull(WatchedPaths.relativeInside("/work/app", "/work/other/a.md", false))
        assertNull(WatchedPaths.relativeInside("/work/app", "/work/App/a.md", false))
    }

    @Test
    fun relativeInsideFoldsCaseAndSeparatorsWhenAsked() {
        assertEquals("AGENTS.md", WatchedPaths.relativeInside("c:/projects/test", "C:/Projects/Test/AGENTS.md", true))
        assertEquals(".specs/A.md", WatchedPaths.relativeInside("c:\\projects\\test", "C:/projects/test/.specs/A.md", true))
        assertNull(WatchedPaths.relativeInside("c:/projects/test", "D:/projects/test/AGENTS.md", true))
    }

    @Test
    fun registryCountsPerRootAndKind() {
        val registry = WatchRegistry()
        assertTrue(registry.add("file:///a", "files"))
        assertFalse(registry.add("file:///a", "files"))
        assertFalse(registry.add("file:///a", "markers"))
        assertTrue(registry.has("file:///a", "files"))
        assertFalse(registry.remove("file:///a", "files"))
        assertTrue(registry.has("file:///a", "files"))
        assertFalse(registry.remove("file:///a", "files"))
        assertFalse(registry.has("file:///a", "files"))
        assertTrue(registry.has("file:///a", "markers"))
        assertEquals(listOf("file:///a"), registry.roots())
        assertTrue(registry.remove("file:///a", "markers"))
        assertEquals(emptyList<String>(), registry.roots())
    }

    @Test
    fun registryIgnoresRemovalOfUnknownEntries() {
        val registry = WatchRegistry()
        assertFalse(registry.remove("file:///a", "files"))
        registry.add("file:///a", "files")
        assertFalse(registry.remove("file:///a", "markers"))
        assertTrue(registry.has("file:///a", "files"))
    }

    @Test
    fun changeEventPayloads() {
        assertEquals("""{"root":"file:///a","path":".specs/x.md"}""", ChangeEvents.fileChanged("file:///a", ".specs/x.md"))
        assertEquals("""{"root":"file:///a"}""", ChangeEvents.markerChanged("file:///a"))
    }

    private companion object {
        const val TIMEOUT_MS = 20_000L
        const val QUIET_MS = 3_000L
    }
}

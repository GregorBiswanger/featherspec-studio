package com.gregorbiswanger.featherspec.studio.setup

import com.gregorbiswanger.featherspec.studio.ports.FileUris
import com.gregorbiswanger.featherspec.studio.ports.HostOs
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Assumptions.assumeTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.IOException
import java.nio.file.AccessDeniedException
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.attribute.PosixFilePermissions

class SetupTargetTest {
    private val target = SetupTarget()

    private fun rootOf(directory: Path): String = FileUris.toUri(directory, HostOs.windows)

    private fun bytes(text: String): ByteArray = text.toByteArray(Charsets.UTF_8)

    private fun names(directory: Path): List<String> =
        Files.newDirectoryStream(directory).use { stream -> stream.map { it.fileName.toString() } }.sorted()

    @Test
    fun `kind tells a file a directory and nothing`(@TempDir temp: Path) {
        Files.writeString(temp.resolve("a.txt"), "a")
        Files.createDirectories(temp.resolve("d"))
        val root = rootOf(temp)
        assertEquals("file", target.kind(root, "a.txt"))
        assertEquals("directory", target.kind(root, "d"))
        assertEquals("directory", target.kind(root, ""))
        assertNull(target.kind(root, "missing"))
        assertNull(target.kind(root, "a.txt/inside"))
    }

    @Test
    fun `kind reports a dangling symlink as other`(@TempDir temp: Path) {
        val link = temp.resolve("dangling")
        val created = try {
            Files.createSymbolicLink(link, temp.resolve("nowhere"))
            true
        } catch (failure: IOException) {
            false
        } catch (failure: UnsupportedOperationException) {
            false
        }
        assumeTrue(created)
        assertEquals("other", target.kind(rootOf(temp), "dangling"))
    }

    @Test
    fun `readBytes returns the bytes and a missing file is an error without the path`(@TempDir temp: Path) {
        Files.write(temp.resolve("a.bin"), byteArrayOf(0, 1, 2, -1))
        val root = rootOf(temp)
        assertArrayEquals(byteArrayOf(0, 1, 2, -1), target.readBytes(root, "a.bin"))
        val failure = assertThrows(IOException::class.java) { target.readBytes(root, "missing.bin") }
        assertEquals("no such file or directory", failure.message)
    }

    @Test
    fun `listDirectory gives the names and nothing for a missing folder or a file`(@TempDir temp: Path) {
        Files.createDirectories(temp.resolve("d/sub"))
        Files.writeString(temp.resolve("d/a.txt"), "a")
        Files.writeString(temp.resolve("f.txt"), "f")
        val root = rootOf(temp)
        assertEquals(listOf("a.txt", "sub"), target.listDirectory(root, "d")!!.sorted())
        assertNull(target.listDirectory(root, "nope"))
        assertNull(target.listDirectory(root, "f.txt"))
    }

    @Test
    fun `AC-022 createExclusive creates the folders and the file and never replaces`(@TempDir temp: Path) {
        val root = rootOf(temp)
        assertEquals("created", target.createExclusive(root, "a/b/c.txt", bytes("first")))
        assertEquals("first", Files.readString(temp.resolve("a/b/c.txt")))
        assertEquals("exists", target.createExclusive(root, "a/b/c.txt", bytes("second")))
        assertEquals("first", Files.readString(temp.resolve("a/b/c.txt")))
        assertEquals("exists", target.createExclusive(root, "a/b", bytes("dir")))
        assertTrue(Files.isDirectory(temp.resolve("a/b")))
    }

    @Test
    fun `createExclusive fails when a parent is a file`(@TempDir temp: Path) {
        Files.writeString(temp.resolve("f"), "file")
        assertThrows(IOException::class.java) { target.createExclusive(rootOf(temp), "f/x.txt", bytes("x")) }
        assertEquals("file", Files.readString(temp.resolve("f")))
    }

    @Test
    fun `AC-022 replaceIfUnchanged replaces only the content that was read`(@TempDir temp: Path) {
        val file = temp.resolve("settings.json")
        Files.writeString(file, "old")
        val root = rootOf(temp)
        assertEquals("changed", target.replaceIfUnchanged(root, "settings.json", bytes("other"), bytes("new")))
        assertEquals("old", Files.readString(file))
        assertEquals("replaced", target.replaceIfUnchanged(root, "settings.json", bytes("old"), bytes("new")))
        assertEquals("new", Files.readString(file))
        assertEquals(listOf("settings.json"), names(temp))
    }

    @Test
    fun `replaceIfUnchanged of a missing file is changed`(@TempDir temp: Path) {
        assertEquals("changed", target.replaceIfUnchanged(rootOf(temp), "missing.json", bytes("a"), bytes("b")))
        assertEquals(emptyList<String>(), names(temp))
    }

    @Test
    fun `replaceIfUnchanged writes through a symlink and keeps the link`(@TempDir temp: Path) {
        val real = temp.resolve("real.txt")
        Files.writeString(real, "old")
        val link = temp.resolve("link.txt")
        val created = try {
            Files.createSymbolicLink(link, real)
            true
        } catch (failure: IOException) {
            false
        } catch (failure: UnsupportedOperationException) {
            false
        }
        assumeTrue(created)
        assertEquals("replaced", target.replaceIfUnchanged(rootOf(temp), "link.txt", bytes("old"), bytes("new")))
        assertTrue(Files.isSymbolicLink(link))
        assertEquals("new", Files.readString(real))
        assertEquals(listOf("link.txt", "real.txt"), names(temp))
    }

    @Test
    fun `replaceIfUnchanged keeps the permissions`(@TempDir temp: Path) {
        val file = temp.resolve("run.sh")
        Files.writeString(file, "old")
        val permissions = try {
            Files.setPosixFilePermissions(file, PosixFilePermissions.fromString("rwxr-x---"))
            true
        } catch (failure: UnsupportedOperationException) {
            false
        }
        assumeTrue(permissions)
        assertEquals("replaced", target.replaceIfUnchanged(rootOf(temp), "run.sh", bytes("old"), bytes("new")))
        assertEquals("rwxr-x---", PosixFilePermissions.toString(Files.getPosixFilePermissions(file)))
    }

    @Test
    fun `AC-022 a busy file is retried and the replace goes through`(@TempDir temp: Path) {
        val file = temp.resolve("busy.txt")
        Files.writeString(file, "old")
        var attempts = 0
        val retrying = SetupTarget(move = { from, to ->
            attempts++
            if (attempts < 3) {
                throw AccessDeniedException(to.toString())
            }
            SetupTarget.moveOver(from, to)
        }, retryDelayMs = 1)
        assertEquals("replaced", retrying.replaceIfUnchanged(rootOf(temp), "busy.txt", bytes("old"), bytes("new")))
        assertEquals(3, attempts)
        assertEquals("new", Files.readString(file))
        assertEquals(listOf("busy.txt"), names(temp))
    }

    @Test
    fun `a file that stays busy fails after five tries and leaves the original and no temporary file`(@TempDir temp: Path) {
        val file = temp.resolve("busy.txt")
        Files.writeString(file, "old")
        var attempts = 0
        val stuck = SetupTarget(move = { _, to ->
            attempts++
            throw AccessDeniedException(to.toString())
        }, retryDelayMs = 1)
        val failure = assertThrows(IOException::class.java) {
            stuck.replaceIfUnchanged(rootOf(temp), "busy.txt", bytes("old"), bytes("new"))
        }
        assertEquals("permission denied", failure.message)
        assertEquals(5, attempts)
        assertEquals("old", Files.readString(file))
        assertEquals(listOf("busy.txt"), names(temp))
    }

    @Test
    fun `a failure that is not a busy file is not retried`(@TempDir temp: Path) {
        val file = temp.resolve("x.txt")
        Files.writeString(file, "old")
        var attempts = 0
        val broken = SetupTarget(move = { _, _ ->
            attempts++
            throw IOException("disk full")
        }, retryDelayMs = 1)
        assertThrows(IOException::class.java) { broken.replaceIfUnchanged(rootOf(temp), "x.txt", bytes("old"), bytes("new")) }
        assertEquals(1, attempts)
        assertEquals(listOf("x.txt"), names(temp))
    }

    @Test
    fun `clearSetupFolder removes only the setup folder`(@TempDir temp: Path) {
        Files.createDirectories(temp.resolve(".featherspec-setup/a/b"))
        Files.writeString(temp.resolve(".featherspec-setup/a/b/c.txt"), "c")
        Files.writeString(temp.resolve(".featherspec-setup/top.txt"), "t")
        Files.writeString(temp.resolve("keep.txt"), "k")
        Files.createDirectories(temp.resolve(".specs"))
        target.clearSetupFolder(rootOf(temp))
        assertEquals(listOf(".specs", "keep.txt"), names(temp))
    }

    @Test
    fun `clearSetupFolder without a folder does nothing and leaves a file of that name`(@TempDir temp: Path) {
        target.clearSetupFolder(rootOf(temp))
        Files.writeString(temp.resolve(".featherspec-setup"), "a file")
        target.clearSetupFolder(rootOf(temp))
        assertTrue(Files.isRegularFile(temp.resolve(".featherspec-setup")))
    }

    @Test
    fun `a path that leaves the root is refused`(@TempDir temp: Path) {
        val root = rootOf(temp)
        assertThrows(IllegalArgumentException::class.java) { target.kind(root, "../outside") }
        assertThrows(IllegalArgumentException::class.java) { target.createExclusive(root, "a/../../x", bytes("x")) }
        assertThrows(IllegalArgumentException::class.java) { target.readBytes(root, "..") }
        assertFalse(Files.exists(temp.resolveSibling("x")))
    }
}

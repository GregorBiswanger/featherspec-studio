package com.gregorbiswanger.featherspec.studio.setup

import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.ByteArrayOutputStream
import java.util.zip.GZIPOutputStream

class TarGzArchiveTest {
    private val archive = TarGzArchive()

    private fun put(block: ByteArray, offset: Int, text: String) {
        text.toByteArray(Charsets.UTF_8).copyInto(block, offset)
    }

    private fun header(
        name: String,
        size: Int,
        type: Char,
        prefix: String = "",
        sizeField: String = "%011o".format(size),
    ): ByteArray {
        val block = ByteArray(512)
        put(block, 0, name)
        put(block, 100, "0000644")
        put(block, 124, sizeField)
        block[156] = type.code.toByte()
        put(block, 257, "ustar")
        put(block, 345, prefix)
        for (index in 148 until 156) {
            block[index] = 32
        }
        val sum = block.sumOf { it.toInt() and 0xFF }
        put(block, 148, "%06o".format(sum))
        block[154] = 0
        block[155] = 32
        return block
    }

    private fun padded(content: ByteArray): ByteArray {
        val length = ((content.size + 511) / 512) * 512
        return content.copyOf(length)
    }

    private fun member(name: String, content: ByteArray, type: Char = '0', prefix: String = ""): ByteArray =
        header(name, content.size, type, prefix) + padded(content)

    private fun record(key: String, value: String): String {
        val body = " $key=$value\n"
        var length = body.length + 1
        while (length.toString().length + body.length != length) {
            length = length.toString().length + body.length
        }
        return "$length$body"
    }

    private fun tar(vararg parts: ByteArray, terminated: Boolean = true): ByteArray {
        val out = ByteArrayOutputStream()
        parts.forEach { out.write(it) }
        if (terminated) {
            out.write(ByteArray(1024))
        }
        return out.toByteArray()
    }

    private fun gzip(data: ByteArray): ByteArray {
        val out = ByteArrayOutputStream()
        GZIPOutputStream(out).use { it.write(data) }
        return out.toByteArray()
    }

    private fun entriesOf(result: ArchiveReadResult): List<ArchiveEntry> = (result as ArchiveReadResult.Entries).entries

    private fun unreadable(result: ArchiveReadResult): String = (result as ArchiveReadResult.Unreadable).detail

    @Test
    fun `AC-005 the real release archive gives the same paths kinds sizes and bytes as the Node reader`() {
        val expected = SetupFixtures.expectedEntries()
        val entries = entriesOf(archive.read(SetupFixtures.archiveBytes(), SetupFixtures.expectedLimit()))
        assertEquals(expected.size, entries.size)
        for ((index, entry) in entries.withIndex()) {
            val want = expected[index]
            assertEquals(want.path, entry.path, "path $index")
            assertEquals(want.kind, entry.kind, want.path)
            assertEquals(want.size, entry.bytes.size, want.path)
            assertEquals(want.sha256, SetupFixtures.sha256(entry.bytes), want.path)
        }
    }

    @Test
    fun `AC-005 the real release archive has the global header 16 directories and 67 files`() {
        val entries = entriesOf(archive.read(SetupFixtures.archiveBytes(), 20L * 1024 * 1024))
        assertEquals("metadata", entries.first().kind)
        assertEquals("pax_global_header", entries.first().path)
        assertEquals(mapOf("metadata" to 1, "directory" to 16, "file" to 67), entries.groupingBy { it.kind }.eachCount())
        assertTrue(entries.filter { it.kind != "file" }.all { it.bytes.isEmpty() })
        assertTrue(entries.any { it.path == "featherspec-1.10.0/AGENTS.md" })
    }

    @Test
    fun `a file keeps its bytes and a directory and a symlink carry none`() {
        val data = tar(
            member("d/", ByteArray(0), '5'),
            member("d/a.txt", "hello".toByteArray()),
            member("d/link", ByteArray(0), '2'),
            member("d/b.bin", ByteArray(700) { it.toByte() }),
        )
        val entries = entriesOf(archive.read(gzip(data), 1_000_000))
        assertEquals(listOf("d/" to "directory", "d/a.txt" to "file", "d/link" to "other", "d/b.bin" to "file"), entries.map { it.path to it.kind })
        assertArrayEquals("hello".toByteArray(), entries[1].bytes)
        assertEquals(0, entries[2].bytes.size)
        assertArrayEquals(ByteArray(700) { it.toByte() }, entries[3].bytes)
    }

    @Test
    fun `a ustar prefix is joined to the name`() {
        val data = tar(member("b.txt", "x".toByteArray(), '0', "a/long/folder"))
        assertEquals(listOf("a/long/folder/b.txt"), entriesOf(archive.read(gzip(data), 10_000)).map { it.path })
    }

    @Test
    fun `an extended header names the path of the next entry only`() {
        val pax = record("path", "very/long/name/of/the/file.txt").toByteArray()
        val data = tar(
            member("pax", pax, 'x'),
            member("short", "one".toByteArray()),
            member("plain", "two".toByteArray()),
        )
        assertEquals(listOf("very/long/name/of/the/file.txt", "plain"), entriesOf(archive.read(gzip(data), 10_000)).map { it.path })
    }

    @Test
    fun `a global header becomes a metadata entry with no bytes`() {
        val data = tar(member("pax_global_header", record("comment", "abc").toByteArray(), 'g'), member("a", "1".toByteArray()))
        val entries = entriesOf(archive.read(gzip(data), 10_000))
        assertEquals(listOf("pax_global_header" to "metadata", "a" to "file"), entries.map { it.path to it.kind })
        assertEquals(0, entries[0].bytes.size)
    }

    @Test
    fun `an archive without the end blocks and an empty archive are read`() {
        val withoutEnd = tar(member("a", "1".toByteArray()), terminated = false)
        assertEquals(listOf("a"), entriesOf(archive.read(gzip(withoutEnd), 10_000)).map { it.path })
        assertEquals(emptyList<String>(), entriesOf(archive.read(gzip(ByteArray(1024)), 10_000)).map { it.path })
        assertEquals(emptyList<String>(), entriesOf(archive.read(gzip(ByteArray(0)), 10_000)).map { it.path })
    }

    @Test
    fun `AC-005 more unpacked bytes than the cap is too large and exactly the cap is read`() {
        val data = tar(member("big", ByteArray(20_000)))
        val packed = gzip(data)
        assertTrue(archive.read(packed, data.size - 1L) === ArchiveReadResult.TooLarge)
        assertTrue(archive.read(packed, 1_000L) === ArchiveReadResult.TooLarge)
        assertEquals(listOf("big"), entriesOf(archive.read(packed, data.size.toLong())).map { it.path })
    }

    @Test
    fun `AC-005 a truncated archive is unreadable`() {
        val whole = SetupFixtures.archiveBytes()
        val result = archive.read(whole.copyOf(whole.size / 2), 20L * 1024 * 1024)
        assertTrue(unreadable(result).isNotEmpty())
    }

    @Test
    fun `AC-005 bytes that are not gzip and no bytes at all are unreadable`() {
        assertTrue(unreadable(archive.read("this is not a gzip file".toByteArray(), 10_000)).isNotEmpty())
        assertTrue(unreadable(archive.read(ByteArray(0), 10_000)).isNotEmpty())
    }

    @Test
    fun `a tar that ends inside a header or a file or has a wrong checksum is unreadable with the Node detail`() {
        assertEquals("the archive ends inside a header", unreadable(archive.read(gzip(ByteArray(100) { 7 }), 10_000)))
        val cut = header("a", 1000, '0') + ByteArray(100)
        assertEquals("the archive ends inside a file", unreadable(archive.read(gzip(cut), 10_000)))
        val broken = member("a", "1".toByteArray())
        broken[0] = 'z'.code.toByte()
        assertEquals("a header checksum is wrong", unreadable(archive.read(gzip(tar(broken)), 10_000)))
        val letters = header("a", 0, '0', sizeField = "abc")
        assertEquals("a header field is not a number", unreadable(archive.read(gzip(tar(letters)), 10_000)))
    }

    @Test
    fun `a malformed extended header is unreadable`() {
        val data = tar(member("pax", "not a record".toByteArray(), 'x'), member("a", "1".toByteArray()))
        assertEquals("an extended header record is malformed", unreadable(archive.read(gzip(data), 10_000)))
    }

    @Test
    fun `a base-256 size is read`() {
        val block = header("a", 5, '0', sizeField = "")
        block[124] = 0x80.toByte()
        block[135] = 5
        for (index in 148 until 156) {
            block[index] = 32
        }
        val sum = block.sumOf { it.toInt() and 0xFF }
        put(block, 148, "%06o".format(sum))
        block[154] = 0
        block[155] = 32
        val data = tar(block + padded("12345".toByteArray()))
        val entries = entriesOf(archive.read(gzip(data), 10_000))
        assertArrayEquals("12345".toByteArray(), entries.single().bytes)
    }
}

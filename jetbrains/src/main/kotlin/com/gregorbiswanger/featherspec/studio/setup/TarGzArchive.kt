package com.gregorbiswanger.featherspec.studio.setup

import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.nio.charset.StandardCharsets
import java.util.zip.GZIPInputStream

class ArchiveEntry(val path: String, val kind: String, val bytes: ByteArray)

sealed interface ArchiveReadResult {
    class Entries(val entries: List<ArchiveEntry>) : ArchiveReadResult

    class Unreadable(val detail: String) : ArchiveReadResult

    object TooLarge : ArchiveReadResult
}

class TarGzArchive {
    fun read(bytes: ByteArray, maxUnpackedBytes: Long): ArchiveReadResult {
        val unpacked = when (val step = gunzip(bytes, maxUnpackedBytes)) {
            is Unpacked.Failed -> return step.result
            is Unpacked.Data -> step.bytes
        }
        return try {
            ArchiveReadResult.Entries(parse(unpacked))
        } catch (failure: TarFormatError) {
            ArchiveReadResult.Unreadable(failure.message ?: "the archive is malformed")
        }
    }

    private sealed interface Unpacked {
        class Data(val bytes: ByteArray) : Unpacked

        class Failed(val result: ArchiveReadResult) : Unpacked
    }

    private class TarFormatError(message: String) : Exception(message)

    private fun gunzip(bytes: ByteArray, maxUnpackedBytes: Long): Unpacked {
        return try {
            GZIPInputStream(ByteArrayInputStream(bytes)).use { input ->
                val output = ByteArrayOutputStream()
                val buffer = ByteArray(BUFFER)
                var total = 0L
                while (true) {
                    val count = input.read(buffer)
                    if (count < 0) {
                        break
                    }
                    total += count
                    if (total > maxUnpackedBytes) {
                        return Unpacked.Failed(ArchiveReadResult.TooLarge)
                    }
                    output.write(buffer, 0, count)
                }
                Unpacked.Data(output.toByteArray())
            }
        } catch (failure: IOException) {
            Unpacked.Failed(ArchiveReadResult.Unreadable(failure.message ?: failure.javaClass.simpleName))
        }
    }

    private fun text(block: ByteArray, start: Int, length: Int): String {
        var end = start
        while (end < start + length && block[end].toInt() != 0) {
            end++
        }
        return String(block, start, end - start, StandardCharsets.UTF_8)
    }

    private fun number(block: ByteArray, start: Int, length: Int): Long {
        val first = block[start].toInt() and 0xFF
        if ((first and 0x80) != 0) {
            var value = (first and 0x7F).toLong()
            for (index in 1 until length) {
                value = value * 256 + (block[start + index].toInt() and 0xFF)
                if (value > MAX_SAFE_INTEGER) {
                    throw TarFormatError("a size is out of range")
                }
            }
            return value
        }
        val digits = text(block, start, length).trim()
        if (digits.isEmpty()) {
            return 0
        }
        if (!OCTAL.matches(digits)) {
            throw TarFormatError("a header field is not a number")
        }
        return digits.toLong(8)
    }

    private fun isZero(data: ByteArray, offset: Int): Boolean {
        for (index in offset until offset + BLOCK) {
            if (data[index].toInt() != 0) {
                return false
            }
        }
        return true
    }

    private fun checksumOk(data: ByteArray, offset: Int): Boolean {
        var sum = 0L
        for (index in 0 until BLOCK) {
            sum += if (index in 148 until 156) 32 else (data[offset + index].toInt() and 0xFF)
        }
        return sum == number(data, offset + 148, 8)
    }

    private fun indexOfSpace(records: ByteArray, from: Int): Int {
        for (index in from until records.size) {
            if (records[index].toInt() == 32) {
                return index
            }
        }
        return -1
    }

    private fun paxPath(records: ByteArray): String? {
        var offset = 0
        var found: String? = null
        while (offset < records.size) {
            val space = indexOfSpace(records, offset)
            val length = if (space < 0) null else String(records, offset, space - offset, StandardCharsets.UTF_8).trim().toIntOrNull()
            if (length == null || length <= space - offset + 1 || offset + length > records.size) {
                throw TarFormatError("an extended header record is malformed")
            }
            val record = String(records, space + 1, offset + length - 1 - (space + 1), StandardCharsets.UTF_8)
            val equals = record.indexOf('=')
            val key = if (equals < 0) record.dropLast(1) else record.substring(0, equals)
            if (key == "path") {
                found = record.substring(equals + 1)
            }
            offset += length
        }
        return found
    }

    private fun kindOf(type: String): String = when (type) {
        "0", "" -> "file"
        "5" -> "directory"
        "g", "x" -> "metadata"
        else -> "other"
    }

    private fun parse(data: ByteArray): List<ArchiveEntry> {
        val entries = ArrayList<ArchiveEntry>()
        var offset = 0
        var nextPath: String? = null
        while (offset < data.size) {
            val header = offset
            if (data.size - offset < BLOCK) {
                throw TarFormatError("the archive ends inside a header")
            }
            if (isZero(data, offset)) {
                return entries
            }
            if (!checksumOk(data, offset)) {
                throw TarFormatError("a header checksum is wrong")
            }
            val type = text(data, header + 156, 1)
            val size = number(data, header + 124, 12)
            val start = header + BLOCK
            if (start + size > data.size) {
                throw TarFormatError("the archive ends inside a file")
            }
            val length = size.toInt()
            val content = data.copyOfRange(start, start + length)
            offset = start + (((size + BLOCK - 1) / BLOCK) * BLOCK).toInt()
            val prefix = if (text(data, header + 257, 5) == "ustar") text(data, header + 345, 155) else ""
            val headerName = text(data, header, 100)
            val name = if (prefix.isEmpty()) headerName else "$prefix/$headerName"
            if (type == "x") {
                nextPath = paxPath(content)
                continue
            }
            if (type == "g") {
                entries.add(ArchiveEntry(name, "metadata", ByteArray(0)))
                continue
            }
            val kind = kindOf(type)
            entries.add(ArchiveEntry(nextPath ?: name, kind, if (kind == "file") content else ByteArray(0)))
            nextPath = null
        }
        return entries
    }

    private companion object {
        const val BLOCK = 512
        const val BUFFER = 64 * 1024
        const val MAX_SAFE_INTEGER = 9007199254740991L
        val OCTAL = Regex("^[0-7]+$")
    }
}

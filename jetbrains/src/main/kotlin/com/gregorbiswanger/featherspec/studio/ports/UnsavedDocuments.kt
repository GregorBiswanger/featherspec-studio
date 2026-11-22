package com.gregorbiswanger.featherspec.studio.ports

import java.nio.charset.Charset
import java.nio.file.Path

class Unsaved(val bytes: ByteArray, val stamp: Long)

fun interface UnsavedDocuments {
    fun unsaved(path: Path): Unsaved?

    companion object {
        val NONE = UnsavedDocuments { null }
    }
}

object DocumentBytes {
    fun encode(text: String, charset: Charset, lineSeparator: String?, bom: ByteArray?): ByteArray {
        val separated = if (lineSeparator == null || lineSeparator == "\n") text else text.replace("\n", lineSeparator)
        val body = separated.toByteArray(charset)
        return if (bom == null || bom.isEmpty()) body else bom + body
    }
}

class OverlayMtimes {
    private class Seen(val stamp: Long, val issued: Long)

    private val seen = HashMap<String, Seen>()

    @Synchronized
    fun mtime(key: String, stamp: Long, diskMs: Long): Long {
        val previous = seen[key]
        val issued = when {
            previous == null -> diskMs + 1
            previous.stamp == stamp -> if (previous.issued > diskMs) previous.issued else diskMs + 1
            else -> maxOf(previous.issued, diskMs) + 1
        }
        seen[key] = Seen(stamp, issued)
        return issued
    }

    @Synchronized
    fun forget(key: String) {
        seen.remove(key)
    }
}

class PathCoalescer(
    private val delayMs: Long,
    private val schedule: (Long, () -> Unit) -> Unit,
    private val fire: (String) -> Unit,
) {
    private val pending = HashSet<String>()

    fun submit(key: String) {
        synchronized(pending) {
            if (!pending.add(key)) {
                return
            }
        }
        schedule(delayMs) {
            synchronized(pending) { pending.remove(key) }
            fire(key)
        }
    }
}

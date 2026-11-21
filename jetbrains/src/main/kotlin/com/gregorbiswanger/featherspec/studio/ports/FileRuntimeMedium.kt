package com.gregorbiswanger.featherspec.studio.ports

import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonNull
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.google.gson.JsonPrimitive
import java.io.IOException
import java.nio.charset.StandardCharsets
import java.nio.file.AccessDeniedException
import java.nio.file.FileAlreadyExistsException
import java.nio.file.FileSystemException
import java.nio.file.Files
import java.nio.file.NoSuchFileException
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import java.nio.file.StandardOpenOption
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

private const val TEMP_MARK = ".tmp-"

private val RETRY_DELAYS_MS = listOf(10L, 25L, 60L, 150L, 300L)

private fun isBusy(failure: FileSystemException): Boolean =
    failure is AccessDeniedException || failure.javaClass == FileSystemException::class.java

internal fun <T> withRetry(delaysMs: List<Long> = RETRY_DELAYS_MS, action: () -> T): T {
    var attempt = 0
    while (true) {
        try {
            return action()
        } catch (failure: FileSystemException) {
            val delay = delaysMs.getOrNull(attempt)
            if (delay == null || !isBusy(failure)) {
                throw failure
            }
            Thread.sleep(delay)
            attempt += 1
        }
    }
}

class FileRuntimeMedium(baseDir: Path, private val delaysMs: List<Long> = RETRY_DELAYS_MS) {
    data class Line(val text: String, val terminated: Boolean)

    private val base: Path = baseDir.toAbsolutePath().normalize()
    private val locks = ConcurrentHashMap<String, Any>()
    private val counter = AtomicLong()

    fun open() {
        Files.createDirectories(base)
    }

    fun read(name: String): String? {
        val full = resolveInside(name)
        return try {
            String(withRetry(delaysMs) { Files.readAllBytes(full) }, StandardCharsets.UTF_8)
        } catch (failure: NoSuchFileException) {
            null
        }
    }

    fun lines(name: String): List<Line> {
        val text = read(name) ?: return emptyList()
        val result = ArrayList<Line>()
        var start = 0
        while (true) {
            val newline = text.indexOf('\n', start)
            if (newline < 0) {
                break
            }
            result.add(Line(text.substring(start, newline), true))
            start = newline + 1
        }
        if (start < text.length) {
            result.add(Line(text.substring(start), false))
        }
        return result
    }

    fun append(name: String, text: String) {
        val full = resolveInside(name)
        serial(name) {
            Files.createDirectories(full.parent)
            withRetry(delaysMs) {
                Files.writeString(full, text, StandardOpenOption.CREATE, StandardOpenOption.APPEND)
            }
        }
    }

    fun replace(name: String, text: String) {
        val full = resolveInside(name)
        serial(name) {
            Files.createDirectories(full.parent)
            val temporary = full.resolveSibling(
                full.fileName.toString() + TEMP_MARK + ProcessHandle.current().pid() + "-" + counter.incrementAndGet(),
            )
            Files.writeString(temporary, text)
            try {
                withRetry(delaysMs) { Files.move(temporary, full, StandardCopyOption.ATOMIC_MOVE) }
            } catch (failure: IOException) {
                Files.deleteIfExists(temporary)
                throw failure
            }
        }
    }

    fun createExclusive(name: String, text: String): Boolean {
        val full = resolveInside(name)
        return serial(name) {
            Files.createDirectories(full.parent)
            try {
                withRetry(delaysMs) {
                    Files.writeString(full, text, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE)
                }
                true
            } catch (failure: FileAlreadyExistsException) {
                false
            }
        }
    }

    fun remove(name: String) {
        val full = resolveInside(name)
        serial(name) { withRetry(delaysMs) { Files.deleteIfExists(full) } }
    }

    fun list(directory: String): List<String> {
        val full = resolveInside(directory)
        return try {
            Files.newDirectoryStream(full).use { stream ->
                stream
                    .filter { Files.isRegularFile(it) && !it.fileName.toString().contains(TEMP_MARK) }
                    .map { "$directory/${it.fileName}" }
                    .sorted()
            }
        } catch (failure: NoSuchFileException) {
            emptyList()
        }
    }

    private fun <T> serial(name: String, action: () -> T): T =
        synchronized(locks.computeIfAbsent(name) { Any() }) { action() }

    private fun resolveInside(name: String): Path {
        val segments = name.split('/')
        require(
            name.isNotEmpty() && !name.contains('\\') &&
                segments.none { it.isEmpty() || it == ".." || it == "." },
        ) { "Status history path $name is not allowed." }
        var full = base
        for (segment in segments) {
            full = full.resolve(segment)
        }
        val normalized = full.normalize()
        require(normalized != base && normalized.startsWith(base)) {
            "Status history path $name lies outside the store directory."
        }
        return normalized
    }
}

class MediumPorts(private val mediumOf: (String) -> FileRuntimeMedium) {
    fun answer(name: String, argsJson: String): String? {
        if (name !in NAMES) {
            return null
        }
        return try {
            val args = JsonParser.parseString(argsJson).asJsonObject
            ok(result(mediumOf(text(args, "root")), name, args))
        } catch (failure: IOException) {
            failed(failure)
        } catch (failure: RuntimeException) {
            failed(failure)
        }
    }

    private fun result(medium: FileRuntimeMedium, name: String, args: JsonObject): JsonElement = when (name) {
        "medium.open" -> {
            medium.open()
            JsonNull.INSTANCE
        }
        "medium.read" -> medium.read(text(args, "name"))?.let { JsonPrimitive(it) } ?: JsonNull.INSTANCE
        "medium.lines" -> JsonArray().apply {
            medium.lines(text(args, "name")).forEach { line ->
                add(JsonObject().apply {
                    addProperty("text", line.text)
                    addProperty("terminated", line.terminated)
                })
            }
        }
        "medium.append" -> {
            medium.append(text(args, "name"), text(args, "text"))
            JsonNull.INSTANCE
        }
        "medium.replace" -> {
            medium.replace(text(args, "name"), text(args, "text"))
            JsonNull.INSTANCE
        }
        "medium.createExclusive" -> JsonPrimitive(medium.createExclusive(text(args, "name"), text(args, "text")))
        "medium.remove" -> {
            medium.remove(text(args, "name"))
            JsonNull.INSTANCE
        }
        else -> JsonArray().apply { medium.list(text(args, "name")).forEach { add(it) } }
    }

    private fun text(args: JsonObject, key: String): String {
        val member = args.get(key)
        require(member != null && member.isJsonPrimitive) { "Missing argument: $key" }
        return member.asString
    }

    private fun ok(value: JsonElement): String = JsonObject().apply { add("ok", value) }.toString()

    private fun failed(failure: Exception): String = JsonObject().apply {
        addProperty("error", failure.message ?: failure.javaClass.simpleName)
    }.toString()

    companion object {
        private val NAMES = setOf(
            "medium.open", "medium.read", "medium.lines", "medium.append",
            "medium.replace", "medium.createExclusive", "medium.remove", "medium.list",
        )

        fun under(systemPath: Path, windows: Boolean): MediumPorts {
            val cache = ConcurrentHashMap<String, FileRuntimeMedium>()
            return MediumPorts { root ->
                cache.computeIfAbsent(root) { FileRuntimeMedium(StoreLocation.storeDir(systemPath, root, windows)) }
            }
        }
    }
}

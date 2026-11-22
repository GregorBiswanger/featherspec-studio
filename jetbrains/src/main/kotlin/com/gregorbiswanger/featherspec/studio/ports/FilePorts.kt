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
import java.nio.file.FileSystemException
import java.nio.file.Files
import java.nio.file.LinkOption
import java.nio.file.NoSuchFileException
import java.nio.file.NotDirectoryException
import java.nio.file.Path
import java.nio.file.attribute.BasicFileAttributes
import java.util.Base64

class FilePorts(
    private val rootOf: (String) -> Path = { FileUris.toPath(it) },
    private val unsaved: UnsavedDocuments = UnsavedDocuments.NONE,
) {
    private val mtimes = OverlayMtimes()

    data class Entry(val name: String, val kind: String)

    data class Stat(val kind: String, val mtimeMs: Long, val size: Long)

    data class ScanEntry(val stat: Stat, val children: List<Entry>?)

    fun list(root: String, relativePath: String): List<Entry>? {
        val directory = resolve(root, relativePath)
        return try {
            Files.newDirectoryStream(directory).use { stream ->
                stream.map { Entry(it.fileName.toString(), linkKind(it)) }
            }
        } catch (failure: IOException) {
            if (notADirectory(failure, directory)) null else throw failure
        }
    }

    fun stat(root: String, relativePath: String): Stat? {
        val path = resolve(root, relativePath)
        return try {
            val attributes = Files.readAttributes(path, BasicFileAttributes::class.java, LinkOption.NOFOLLOW_LINKS)
            overlaid(path, relativePath, Stat(kindOf(attributes), attributes.lastModifiedTime().toMillis(), attributes.size()))
        } catch (failure: IOException) {
            if (isAbsent(failure)) null else throw failure
        }
    }

    fun scan(root: String, dirs: List<String>): Map<String, ScanEntry> {
        val entries = LinkedHashMap<String, ScanEntry>()
        dirs.forEach { scanInto(root, it, entries, 0) }
        return entries
    }

    private fun scanInto(root: String, relativePath: String, entries: MutableMap<String, ScanEntry>, depth: Int) {
        if (depth > MAX_SCAN_DEPTH) {
            throw IOException("Scan is nested deeper than $MAX_SCAN_DEPTH levels: $relativePath")
        }
        val stat = stat(root, relativePath) ?: return
        if (stat.kind != "directory") {
            entries[relativePath] = ScanEntry(stat, null)
            return
        }
        val children = list(root, relativePath) ?: return
        entries[relativePath] = ScanEntry(stat, children)
        for (child in children) {
            scanInto(root, if (relativePath.isEmpty()) child.name else "$relativePath/${child.name}", entries, depth + 1)
        }
    }

    fun readBytes(root: String, relativePath: String): ByteArray {
        val path = resolve(root, relativePath)
        if (WatchedPaths.hasUnsavedOverlay(relativePath)) {
            unsaved.unsaved(path)?.let { return it.bytes }
        }
        return Files.readAllBytes(path)
    }

    private fun overlaid(path: Path, relativePath: String, disk: Stat): Stat {
        if (disk.kind != "file" || !WatchedPaths.hasUnsavedOverlay(relativePath)) {
            return disk
        }
        val key = path.toString()
        val document = unsaved.unsaved(path)
        if (document == null) {
            mtimes.forget(key)
            return disk
        }
        return Stat("file", mtimes.mtime(key, document.stamp, disk.mtimeMs), document.bytes.size.toLong())
    }

    fun readText(root: String, relativePath: String): String =
        String(readBytes(root, relativePath), StandardCharsets.UTF_8)

    fun readDirectory(root: String, relativePath: String): List<String>? {
        val directory = resolve(root, relativePath)
        return try {
            Files.newDirectoryStream(directory).use { stream -> stream.map { it.fileName.toString() } }
        } catch (failure: IOException) {
            if (notADirectory(failure, directory)) null else throw failure
        }
    }

    fun fsStat(root: String, relativePath: String): String? {
        val path = resolve(root, relativePath)
        return try {
            val attributes = Files.readAttributes(path, BasicFileAttributes::class.java)
            when {
                attributes.isRegularFile -> "file"
                attributes.isDirectory -> "directory"
                else -> "other"
            }
        } catch (failure: IOException) {
            if (isAbsent(failure)) null else throw failure
        }
    }

    fun answer(name: String, argsJson: String): String? {
        if (name !in NAMES) {
            return null
        }
        return try {
            val args = JsonParser.parseString(argsJson).asJsonObject
            val root = text(args, "root")
            if (name == "source.scan") {
                return ok(scanResult(root, texts(args, "dirs")))
            }
            val relativePath = text(args, "relativePath")
            ok(result(name, root, relativePath))
        } catch (failure: IOException) {
            failed(failure)
        } catch (failure: RuntimeException) {
            failed(failure)
        }
    }

    private fun result(name: String, root: String, relativePath: String): JsonElement = when (name) {
        "source.list" -> list(root, relativePath)?.let { entries -> entriesJson(entries) } ?: JsonNull.INSTANCE
        "source.stat" -> stat(root, relativePath)?.let { stat -> statJson(stat) } ?: JsonNull.INSTANCE
        "source.readBytes" -> JsonPrimitive(Base64.getEncoder().encodeToString(readBytes(root, relativePath)))
        "fs.stat" -> fsStat(root, relativePath)?.let { JsonPrimitive(it) } ?: JsonNull.INSTANCE
        "fs.readText" -> JsonPrimitive(readText(root, relativePath))
        else -> readDirectory(root, relativePath)?.let { names ->
            JsonArray().apply { names.forEach { add(it) } }
        } ?: JsonNull.INSTANCE
    }

    private fun entriesJson(entries: List<Entry>): JsonArray = JsonArray().apply {
        entries.forEach { entry ->
            add(JsonObject().apply {
                addProperty("name", entry.name)
                addProperty("kind", entry.kind)
            })
        }
    }

    private fun statJson(stat: Stat): JsonObject = JsonObject().apply {
        addProperty("kind", stat.kind)
        addProperty("mtimeMs", stat.mtimeMs)
        addProperty("size", stat.size)
    }

    private fun scanResult(root: String, dirs: List<String>): JsonElement {
        val entries = JsonObject()
        scan(root, dirs).forEach { (path, entry) ->
            entries.add(path, statJson(entry.stat).apply {
                entry.children?.let { add("children", entriesJson(it)) }
            })
        }
        return JsonObject().apply { add("entries", entries) }
    }

    private fun resolve(root: String, relativePath: String): Path {
        var path = rootOf(root)
        for (part in relativePath.split('/')) {
            if (part.isEmpty() || part == ".") {
                continue
            }
            require(part != "..") { "Path escapes the root: $relativePath" }
            path = path.resolve(part)
        }
        return path
    }

    private fun linkKind(path: Path): String = try {
        kindOf(Files.readAttributes(path, BasicFileAttributes::class.java, LinkOption.NOFOLLOW_LINKS))
    } catch (failure: IOException) {
        "other"
    }

    private fun kindOf(attributes: BasicFileAttributes): String = when {
        attributes.isSymbolicLink -> "symlink"
        attributes.isRegularFile -> "file"
        attributes.isDirectory -> "directory"
        else -> "other"
    }

    private fun isAbsent(failure: IOException): Boolean =
        failure is NoSuchFileException ||
            failure is NotDirectoryException ||
            (failure is FileSystemException && failure.reason?.contains("Not a directory", ignoreCase = true) == true)

    private fun notADirectory(failure: IOException, directory: Path): Boolean =
        isAbsent(failure) || (failure !is AccessDeniedException && !Files.isDirectory(directory))

    private fun text(args: JsonObject, key: String): String {
        val member = args.get(key)
        require(member != null && member.isJsonPrimitive) { "Missing argument: $key" }
        return member.asString
    }

    private fun texts(args: JsonObject, key: String): List<String> {
        val member = args.get(key)
        require(member != null && member.isJsonArray) { "Missing argument: $key" }
        return member.asJsonArray.map {
            require(it.isJsonPrimitive) { "Invalid argument: $key" }
            it.asString
        }
    }

    private fun ok(value: JsonElement): String = JsonObject().apply { add("ok", value) }.toString()

    private fun failed(failure: Exception): String = JsonObject().apply {
        addProperty("error", failure.message ?: failure.javaClass.simpleName)
    }.toString()

    private companion object {
        const val MAX_SCAN_DEPTH = 32

        val NAMES = setOf("source.list", "source.stat", "source.readBytes", "source.scan", "fs.stat", "fs.readText", "fs.readDirectory")
    }
}

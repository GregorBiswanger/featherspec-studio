package com.gregorbiswanger.featherspec.studio.probe

import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import java.nio.file.Files
import java.nio.file.Path
import java.util.Base64
import kotlin.math.ceil

data class ProbeProject(val version: String, val specPath: String)

data class Traffic(val calls: Long, val frames: Long)

object ProbeJson {
    fun unquote(raw: String): String = JsonParser.parseString(raw).asString

    fun heapBytes(okJson: String): Long? {
        val root = JsonParser.parseString(okJson)
        if (!root.isJsonObject) {
            return null
        }
        val member = root.asJsonObject.get("jsHeapBytes") ?: return null
        return if (member.isJsonPrimitive && member.asJsonPrimitive.isNumber) member.asLong else null
    }

    fun elapsedMs(okJson: String): Long {
        val root = JsonParser.parseString(okJson)
        require(root.isJsonObject) { "the core answered no object: $okJson" }
        val member = root.asJsonObject.get("ms")
        require(member != null && member.isJsonPrimitive && member.asJsonPrimitive.isNumber) { "the core answered no ms: $okJson" }
        return ceil(member.asDouble).toLong()
    }

    fun traffic(okJson: String): Traffic? {
        val root = try {
            JsonParser.parseString(okJson)
        } catch (failure: RuntimeException) {
            return null
        }
        if (!root.isJsonObject) {
            return null
        }
        val calls = count(root.asJsonObject, "calls") ?: return null
        val frames = count(root.asJsonObject, "frames") ?: return null
        return Traffic(calls, frames)
    }

    private fun count(root: JsonObject, key: String): Long? {
        val member = root.get(key) ?: return null
        return if (member.isJsonPrimitive && member.asJsonPrimitive.isNumber) member.asLong else null
    }

    fun readArgs(root: String, version: String): String =
        JsonObject().apply {
            addProperty("root", root)
            addProperty("version", version)
        }.toString()

    fun discoverArgs(roots: List<String>): String =
        JsonObject().apply {
            add("roots", JsonArray().also { array -> roots.forEach { array.add(it) } })
        }.toString()

    fun updateArgs(path: String): String = JsonObject().apply { addProperty("path", path) }.toString()

    fun specKey(keys: Collection<String>): String? {
        val specs = keys.filter { it.startsWith(".specs/") && it.endsWith(".md") && !it.endsWith(".plan.md") }
        return specs.firstOrNull { it == PREFERRED_SPEC }
            ?: specs.firstOrNull { it.startsWith(".specs/active/") }
            ?: specs.firstOrNull()
    }

    fun materializeFiles(inputJson: String, directory: Path): Set<String> {
        val root = JsonParser.parseString(inputJson).asJsonObject
        val files = root.getAsJsonObject("files")
        val base = directory.toAbsolutePath().normalize()
        for (key in files.keySet()) {
            val target = base.resolve(key).normalize()
            require(target.startsWith(base) && target != base) { "the input file escapes the directory: $key" }
            Files.createDirectories(target.parent)
            Files.write(target, Base64.getDecoder().decode(files.get(key).asString))
        }
        return files.keySet()
    }

    fun materialize(inputJson: String, directory: Path): ProbeProject {
        val keys = materializeFiles(inputJson, directory)
        val spec = requireNotNull(specKey(keys)) { "the input has no spec file" }
        return ProbeProject(JsonParser.parseString(inputJson).asJsonObject.get("version").asString, spec)
    }

    private const val PREFERRED_SPEC = ".specs/active/0001-generated-spec.md"
}

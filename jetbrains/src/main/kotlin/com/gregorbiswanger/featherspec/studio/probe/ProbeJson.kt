package com.gregorbiswanger.featherspec.studio.probe

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import java.nio.file.Files
import java.nio.file.Path
import java.util.Base64
import kotlin.math.ceil

data class ProbeProject(val version: String, val specPath: String)

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

    fun readArgs(root: String, version: String): String =
        JsonObject().apply {
            addProperty("root", root)
            addProperty("version", version)
        }.toString()

    fun updateArgs(path: String): String = JsonObject().apply { addProperty("path", path) }.toString()

    fun specKey(keys: Collection<String>): String? {
        val specs = keys.filter { it.startsWith(".specs/") && it.endsWith(".md") && !it.endsWith(".plan.md") }
        return specs.firstOrNull { it == PREFERRED_SPEC }
            ?: specs.firstOrNull { it.startsWith(".specs/active/") }
            ?: specs.firstOrNull()
    }

    fun materialize(inputJson: String, directory: Path): ProbeProject {
        val root = JsonParser.parseString(inputJson).asJsonObject
        val files = root.getAsJsonObject("files")
        val base = directory.toAbsolutePath().normalize()
        for (key in files.keySet()) {
            val target = base.resolve(key).normalize()
            require(target.startsWith(base) && target != base) { "the input file escapes the directory: $key" }
            Files.createDirectories(target.parent)
            Files.write(target, Base64.getDecoder().decode(files.get(key).asString))
        }
        val spec = requireNotNull(specKey(files.keySet())) { "the input has no spec file" }
        return ProbeProject(root.get("version").asString, spec)
    }

    private const val PREFERRED_SPEC = ".specs/active/0001-generated-spec.md"
}

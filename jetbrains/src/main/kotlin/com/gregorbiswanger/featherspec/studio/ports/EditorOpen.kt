package com.gregorbiswanger.featherspec.studio.ports

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import java.nio.file.Files
import java.nio.file.InvalidPathException
import java.nio.file.Path

enum class Place { BESIDE, ACTIVE_GROUP }

enum class Placement { BESIDE, ACTIVE }

data class OpenRequest(val root: String, val key: String, val line: Int?, val place: Place)

object EditorOpen {
    const val OPENED = "opened"
    const val NOT_FOUND = "not-found"

    fun parse(argsJson: String): OpenRequest? {
        val args = objectOf(argsJson) ?: return null
        val root = text(args, "root") ?: return null
        val key = text(args, "key") ?: return null
        val place = if (text(args, "place") == "activeGroup") Place.ACTIVE_GROUP else Place.BESIDE
        return OpenRequest(root, key, lineOf(args), place)
    }

    fun resolve(request: OpenRequest): Path? {
        val segments = request.key.split('/').filter { it.isNotEmpty() && it != "." }
        if (segments.isEmpty() || segments.any { it == ".." }) {
            return null
        }
        return try {
            val base = FileUris.toPath(request.root).normalize()
            val path = segments.fold(base) { current, segment -> current.resolve(segment) }.normalize()
            if (path.startsWith(base) && Files.isRegularFile(path)) path else null
        } catch (failure: InvalidPathException) {
            null
        } catch (failure: IllegalArgumentException) {
            null
        }
    }

    fun zeroBasedLine(line: Int?): Int = if (line == null) 0 else maxOf(0, line - 1)

    fun placement(place: Place, activeShowsStudio: Boolean): Placement =
        if (place == Place.ACTIVE_GROUP && !activeShowsStudio) Placement.ACTIVE else Placement.BESIDE

    fun reply(outcome: String): String = JsonObject().apply { addProperty("ok", outcome) }.toString()

    fun clipboardText(argsJson: String): String? = objectOf(argsJson)?.let { text(it, "text") }

    private fun objectOf(json: String): JsonObject? = try {
        val parsed = JsonParser.parseString(json)
        if (parsed.isJsonObject) parsed.asJsonObject else null
    } catch (failure: RuntimeException) {
        null
    }

    private fun text(args: JsonObject, name: String): String? {
        val member = args.get(name)
        return if (member != null && member.isJsonPrimitive && member.asJsonPrimitive.isString) member.asString else null
    }

    private fun lineOf(args: JsonObject): Int? {
        val member = args.get("line")
        return if (member != null && member.isJsonPrimitive && member.asJsonPrimitive.isNumber) member.asDouble.toInt() else null
    }
}

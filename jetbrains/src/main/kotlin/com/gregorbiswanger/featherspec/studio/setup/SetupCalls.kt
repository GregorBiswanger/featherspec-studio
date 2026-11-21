package com.gregorbiswanger.featherspec.studio.setup

import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonNull
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.google.gson.JsonPrimitive
import java.util.Base64

class SetupCalls(
    private val target: SetupTarget = SetupTarget(),
    private val http: ReleaseHttp = ReleaseHttp(),
    private val archive: TarGzArchive = TarGzArchive(),
) {
    fun answer(name: String, argsJson: String): String? {
        if (name !in NAMES) {
            return null
        }
        val args = JsonParser.parseString(argsJson).asJsonObject
        return JsonObject().apply { add("ok", result(name, args)) }.toString()
    }

    private fun result(name: String, args: JsonObject): JsonElement = when (name) {
        "http.get" -> httpResult(args)
        "archive.read" -> archiveResult(args)
        else -> targetResult(name, args)
    }

    private fun targetResult(name: String, args: JsonObject): JsonElement {
        val root = text(args, "root")
        val relativePath = if (name == "target.clearSetupFolder") "" else text(args, "relativePath")
        return when (name) {
            "target.kind" -> target.kind(root, relativePath)?.let { JsonPrimitive(it) } ?: JsonNull.INSTANCE
            "target.readBytes" -> JsonPrimitive(encode(target.readBytes(root, relativePath)))
            "target.listDirectory" -> target.listDirectory(root, relativePath)?.let { names ->
                JsonArray().apply { names.forEach { add(it) } }
            } ?: JsonNull.INSTANCE
            "target.createExclusive" -> JsonPrimitive(target.createExclusive(root, relativePath, bytes(args, "bytes")))
            "target.replaceIfUnchanged" ->
                JsonPrimitive(target.replaceIfUnchanged(root, relativePath, bytes(args, "expected"), bytes(args, "next")))
            "target.clearSetupFolder" -> {
                target.clearSetupFolder(root)
                JsonNull.INSTANCE
            }
            else -> throw IllegalArgumentException("unknown $name")
        }
    }

    private fun httpResult(args: JsonObject): JsonElement {
        val headers = LinkedHashMap<String, String>()
        val given = args.get("headers")
        if (given != null && given.isJsonObject) {
            given.asJsonObject.entrySet().forEach { entry -> headers[entry.key] = entry.value.asString }
        }
        val reply = http.get(text(args, "url"), headers)
        return JsonObject().apply {
            addProperty("status", reply.status)
            add("headers", JsonObject().apply { reply.headers.forEach { (name, value) -> addProperty(name, value) } })
            addProperty("body", encode(reply.body))
        }
    }

    private fun archiveResult(args: JsonObject): JsonElement {
        val limit = args.get("maxUnpackedBytes")
        require(limit != null && limit.isJsonPrimitive) { "Missing argument: maxUnpackedBytes" }
        return when (val result = archive.read(bytes(args, "bytes"), limit.asLong)) {
            is ArchiveReadResult.Entries -> JsonObject().apply {
                addProperty("ok", true)
                add("entries", JsonArray().apply {
                    result.entries.forEach { entry ->
                        add(JsonObject().apply {
                            addProperty("path", entry.path)
                            addProperty("kind", entry.kind)
                            addProperty("bytes", encode(entry.bytes))
                        })
                    }
                })
            }
            is ArchiveReadResult.Unreadable -> JsonObject().apply {
                addProperty("ok", false)
                addProperty("failure", "unreadable")
                addProperty("detail", result.detail)
            }
            ArchiveReadResult.TooLarge -> JsonObject().apply {
                addProperty("ok", false)
                addProperty("failure", "too-large")
            }
        }
    }

    private fun text(args: JsonObject, key: String): String {
        val member = args.get(key)
        require(member != null && member.isJsonPrimitive) { "Missing argument: $key" }
        return member.asString
    }

    private fun bytes(args: JsonObject, key: String): ByteArray = Base64.getDecoder().decode(text(args, key))

    private fun encode(bytes: ByteArray): String = Base64.getEncoder().encodeToString(bytes)

    private companion object {
        val NAMES = setOf(
            "target.kind", "target.readBytes", "target.listDirectory", "target.createExclusive",
            "target.replaceIfUnchanged", "target.clearSetupFolder", "http.get", "archive.read",
        )
    }
}

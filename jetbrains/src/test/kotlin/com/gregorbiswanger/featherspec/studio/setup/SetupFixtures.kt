package com.gregorbiswanger.featherspec.studio.setup

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import java.nio.file.Files
import java.nio.file.Path
import java.security.MessageDigest

object SetupFixtures {
    class Expected(val path: String, val kind: String, val size: Int, val sha256: String)

    fun archivePath(): Path {
        val candidates = listOf(
            Path.of("..", "test", "fixtures", "setup", "featherspec-1.10.0.tar.gz"),
            Path.of("test", "fixtures", "setup", "featherspec-1.10.0.tar.gz"),
        )
        return candidates.firstOrNull { Files.exists(it) }
            ?: error("featherspec-1.10.0.tar.gz not found from ${Path.of("").toAbsolutePath()}")
    }

    fun archiveBytes(): ByteArray = Files.readAllBytes(archivePath())

    fun expectedEntries(): List<Expected> {
        val candidates = listOf(
            Path.of("build", "conformance", "archive-expected.json"),
            Path.of("jetbrains", "build", "conformance", "archive-expected.json"),
        )
        val file = candidates.firstOrNull { Files.exists(it) }
            ?: error("archive-expected.json not found from ${Path.of("").toAbsolutePath()}; run node jetbrains/scripts/conformanceExpected.mjs first")
        val root: JsonObject = JsonParser.parseString(Files.readString(file)).asJsonObject
        return root.getAsJsonArray("entries").map { element ->
            val entry = element.asJsonObject
            Expected(entry.get("path").asString, entry.get("kind").asString, entry.get("size").asInt, entry.get("sha256").asString)
        }
    }

    fun expectedLimit(): Long {
        val candidates = listOf(
            Path.of("build", "conformance", "archive-expected.json"),
            Path.of("jetbrains", "build", "conformance", "archive-expected.json"),
        )
        val file = candidates.first { Files.exists(it) }
        return JsonParser.parseString(Files.readString(file)).asJsonObject.get("maxUnpackedBytes").asLong
    }

    fun sha256(bytes: ByteArray): String =
        MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it.toInt() and 0xFF) }
}

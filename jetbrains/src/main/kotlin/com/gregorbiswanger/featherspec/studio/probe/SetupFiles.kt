package com.gregorbiswanger.featherspec.studio.probe

import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import java.nio.file.Files
import java.nio.file.Path
import java.util.Base64

object SetupFiles {
    private const val IDEA = ".idea"

    fun collect(root: Path): String {
        val found = ArrayList<Pair<String, ByteArray>>()
        Files.walk(root).use { paths ->
            paths.forEach { path ->
                if (Files.isRegularFile(path)) {
                    val parts = root.relativize(path).map { it.toString() }
                    if (parts.first() != IDEA) {
                        found.add(parts.joinToString("/") to Files.readAllBytes(path))
                    }
                }
            }
        }
        val files = JsonArray()
        found.sortedBy { it.first }.forEach { (path, bytes) ->
            files.add(JsonObject().apply {
                addProperty("path", path)
                addProperty("base64", Base64.getEncoder().encodeToString(bytes))
            })
        }
        return JsonObject().apply { add("files", files) }.toString()
    }
}

object SetupCompare {
    fun differences(expectedJson: String, actualJson: String): List<String> {
        val expected = expectedFiles(expectedJson)
        val actual = actualFiles(actualJson)
        val problems = ArrayList<String>()
        expected.keys.filter { it !in actual }.sorted().forEach { problems.add("missing file: $it") }
        actual.keys.filter { it !in expected }.sorted().forEach { problems.add("unexpected file: $it") }
        for (path in expected.keys.filter { it in actual }.sorted()) {
            val want = expected.getValue(path)
            val got = actual.getValue(path)
            val at = ConformanceCompare.firstDifference(want, got)
            if (at >= 0) {
                problems.add("bytes differ: $path at byte $at (expected ${want.size} bytes, actual ${got.size})")
            }
        }
        return problems
    }

    fun requests(requestsJson: String): List<String> {
        val root = JsonParser.parseString(requestsJson).asJsonObject
        val served = strings(root, "served")
        val refused = strings(root, "refused")
        val problems = ArrayList<String>()
        if (served != FakeReleaseRoutes.EXPECTED_SERVED) {
            problems.add("the fake served $served, expected ${FakeReleaseRoutes.EXPECTED_SERVED}")
        }
        if (refused.isNotEmpty()) {
            problems.add("requests without a canned answer: $refused")
        }
        return problems
    }

    private fun strings(root: JsonObject, name: String): List<String> =
        root.getAsJsonArray(name).map { it.asString }

    private fun expectedFiles(json: String): Map<String, ByteArray> {
        val files = JsonParser.parseString(json).asJsonObject.getAsJsonObject("writes").getAsJsonArray("files")
        return files.associate { element ->
            val entry = element.asJsonObject
            entry.get("path").asString to entry.get("text").asString.toByteArray(Charsets.UTF_8)
        }
    }

    private fun actualFiles(json: String): Map<String, ByteArray> =
        JsonParser.parseString(json).asJsonObject.getAsJsonArray("files").associate { element ->
            val entry = element.asJsonObject
            entry.get("path").asString to Base64.getDecoder().decode(entry.get("base64").asString)
        }
}

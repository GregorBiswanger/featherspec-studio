package com.gregorbiswanger.featherspec.studio.probe

import java.nio.file.Files
import java.nio.file.Path

object ConformanceCompare {
    fun names(directory: Path, skip: Set<String>): List<String> {
        if (!Files.isDirectory(directory)) {
            return emptyList()
        }
        return Files.newDirectoryStream(directory, "*.json").use { stream ->
            stream.map { it.fileName.toString().removeSuffix(".json") }
        }.filter { it !in skip }.sorted()
    }

    fun firstDifference(expected: ByteArray, actual: ByteArray): Int {
        val shared = minOf(expected.size, actual.size)
        for (index in 0 until shared) {
            if (expected[index] != actual[index]) {
                return index
            }
        }
        return if (expected.size == actual.size) -1 else shared
    }

    fun compareFiles(label: String, expected: Path, actual: Path): String? {
        if (!Files.exists(actual)) {
            return "$label: no actual output"
        }
        val expectedBytes = Files.readAllBytes(expected)
        val actualBytes = Files.readAllBytes(actual)
        val at = firstDifference(expectedBytes, actualBytes)
        if (at < 0) {
            return null
        }
        val from = maxOf(0, at - 40)
        val expectedContext = String(expectedBytes, from, minOf(80, expectedBytes.size - from), Charsets.UTF_8)
        val actualContext = String(actualBytes, from, minOf(80, actualBytes.size - from), Charsets.UTF_8)
        return "$label: differs at byte $at (expected ${expectedBytes.size} bytes, actual ${actualBytes.size}); " +
            "expected ...$expectedContext... actual ...$actualContext..."
    }

    fun differences(expectedDirectory: Path, actualDirectory: Path, names: List<String>): List<String> =
        names.mapNotNull { name ->
            compareFiles(name, expectedDirectory.resolve("$name.json"), actualDirectory.resolve("$name.json"))
        }
}

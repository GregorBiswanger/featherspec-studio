package com.gregorbiswanger.featherspec.studio.runtime

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.nio.file.Files
import java.nio.file.Path

class HostContractTest {
    private val source: String = readContract()

    private val mirrored: Map<String, List<String>> = mapOf(
        "ASYNC_CALLS" to ASYNC_CALLS,
        "EMIT_CHANNELS" to EMIT_CHANNELS,
        "DISPATCH_EVENTS" to DISPATCH_EVENTS,
        "INVOKE_COMMANDS" to INVOKE_COMMANDS,
        "FRAME_KINDS" to FRAME_KINDS,
    )

    @Test
    fun `R-3 every name of an as-const array of contract ts exists in HostContract and vice versa`() {
        for ((array, kotlinNames) in mirrored) {
            val fromTs = tsNames(array)
            assertTrue(fromTs.isNotEmpty(), "$array has no names in contract.ts")
            assertEquals(fromTs.toSet(), kotlinNames.toSet(), "$array differs between contract.ts and HostContract.kt")
            assertEquals(kotlinNames.size, kotlinNames.toSet().size, "$array has a duplicate in HostContract.kt")
        }
    }

    @Test
    fun `R-3 contract ts declares exactly the five mirrored arrays`() {
        val declared = Regex("export const (\\w+) = \\[").findAll(source).map { it.groupValues[1] }.toSet()
        assertEquals(mirrored.keys, declared)
    }

    private fun tsNames(array: String): List<String> {
        val block = Regex("export const $array = \\[(.*?)\\] as const;", RegexOption.DOT_MATCHES_ALL).find(source)
            ?: error("$array not found in contract.ts")
        return Regex("'([^']+)'").findAll(block.groupValues[1]).map { it.groupValues[1] }.toList()
    }

    private fun readContract(): String {
        val candidates = listOf(
            Path.of("..", "src", "hosts", "embedded", "contract.ts"),
            Path.of("src", "hosts", "embedded", "contract.ts"),
        )
        val path = candidates.firstOrNull { Files.exists(it) }
            ?: error("contract.ts not found from ${Path.of("").toAbsolutePath()}")
        return Files.readString(path)
    }
}

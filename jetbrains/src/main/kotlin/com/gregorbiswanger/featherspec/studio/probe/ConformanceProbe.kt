package com.gregorbiswanger.featherspec.studio.probe

import com.gregorbiswanger.featherspec.studio.runtime.CoreRuntime
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.TimeUnit

const val GEN_200 = "gen-200"
const val SETUP_INPUT = "setup-input"

class ConformanceProbe(
    private val runtime: CoreRuntime,
    private val inputs: Path,
    private val out: Path,
    private val warmReadyMs: () -> Long,
) {
    private val notes = ArrayList<String>()

    fun run() {
        val actual = out.resolve("actual")
        Files.createDirectories(actual)
        ConformanceCompare.names(inputs, setOf(SETUP_INPUT)).forEach { name -> fixture(name, actual) }
        setup()
        val budgets = measure()
        if (notes.isNotEmpty()) {
            Files.writeString(out.resolve("probe-notes.txt"), notes.joinToString("\n", postfix = "\n"))
        }
        Files.writeString(out.resolve("budgets.json"), budgets.toJson())
    }

    private fun fixture(name: String, actual: Path) {
        try {
            val reply = conformance(Files.readString(inputs.resolve("$name.json")))
            Files.write(actual.resolve("$name.json"), reply.toByteArray(Charsets.UTF_8))
        } catch (failure: Throwable) {
            notes.add("conformance $name failed: $failure")
        }
    }

    private fun setup() {
        try {
            val archive = Files.readString(inputs.resolve("$SETUP_INPUT.json"))
            val reply = ProbeJson.unquote(runtime.setupConformance(archive).get(CALL_MINUTES, TimeUnit.MINUTES))
            Files.write(out.resolve("setup-actual.json"), reply.toByteArray(Charsets.UTF_8))
        } catch (failure: Throwable) {
            Files.writeString(out.resolve("setup-error.txt"), failure.toString())
        }
    }

    private fun measure(): Budgets {
        val readyMs = (runtime.readyAtNanos - runtime.startedAtNanos) / NANOS_PER_MS
        val input = readGen200()
        return Budgets(
            coreReadyMs = readyMs,
            gen200ReadMs = guarded("gen200ReadMs") { bestOfThree { conformance(requireNotNull(input)) } },
            gen200UpdateMs = guarded("gen200UpdateMs") { bestOfThree { conformance(ProbeJson.touch(requireNotNull(input), it + 1)) } },
            coreReadyWarmMs = guarded("coreReadyWarmMs") { warmReadyMs() },
            jsHeapBytes = heap(),
        )
    }

    private fun readGen200(): String? {
        val path = inputs.resolve("$GEN_200.json")
        return if (Files.exists(path)) Files.readString(path) else null
    }

    private fun bestOfThree(attempt: (Int) -> Unit): Long =
        (0 until 3).minOf { index ->
            val started = System.nanoTime()
            attempt(index)
            (System.nanoTime() - started) / NANOS_PER_MS
        }

    private fun guarded(label: String, block: () -> Long): Long =
        try {
            block()
        } catch (failure: Throwable) {
            notes.add("$label failed: $failure")
            -1L
        }

    private fun heap(): Long? =
        try {
            ProbeJson.heapBytes(runtime.invoke("diagnostics", "{}").get(CALL_MINUTES, TimeUnit.MINUTES))
        } catch (failure: Throwable) {
            notes.add("diagnostics failed: $failure")
            null
        }

    private fun conformance(inputJson: String): String =
        ProbeJson.unquote(runtime.conformance(inputJson).get(CALL_MINUTES, TimeUnit.MINUTES))

    private companion object {
        const val CALL_MINUTES = 3L
        const val NANOS_PER_MS = 1_000_000L
    }
}

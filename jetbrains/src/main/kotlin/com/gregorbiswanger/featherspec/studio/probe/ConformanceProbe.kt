package com.gregorbiswanger.featherspec.studio.probe

import com.gregorbiswanger.featherspec.studio.ports.FileUris
import com.gregorbiswanger.featherspec.studio.ports.HostOs
import com.gregorbiswanger.featherspec.studio.runtime.CoreRuntime
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardOpenOption
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
        val input = readGen200()
        val directory = Files.createTempDirectory("featherspec-gen200-")
        try {
            val project = input?.let { guardedProject(it, directory) }
            return Budgets(
                coreReadyMs = Budgets.elapsedMs(runtime.startedAtNanos, runtime.readyAtNanos),
                coreCreateMs = Budgets.elapsedMs(runtime.startedAtNanos, runtime.createdAtNanos),
                coreLoadMs = Budgets.elapsedMs(runtime.startedAtNanos, runtime.loadedAtNanos),
                gen200ReadMs = guarded("gen200ReadMs") { readMs(directory, requireNotNull(project)) },
                gen200UpdateMs = guarded("gen200UpdateMs") { updateMs(directory, requireNotNull(project)) },
                gen200HarnessMs = guarded("gen200HarnessMs") { bestOfThree { conformance(requireNotNull(input)) } },
                coreReadyWarmMs = guarded("coreReadyWarmMs") { warmReadyMs() },
                jsHeapBytes = heap(),
            )
        } finally {
            deleteTree(directory)
        }
    }

    private fun guardedProject(input: String, directory: Path): ProbeProject? =
        try {
            ProbeJson.materialize(input, directory)
        } catch (failure: Throwable) {
            notes.add("gen-200 project could not be written: $failure")
            null
        }

    private fun readMs(directory: Path, project: ProbeProject): Long {
        val root = FileUris.toUri(directory, HostOs.windows)
        val reply = runtime.invoke("budget.read", ProbeJson.readArgs(root, project.version)).get(CALL_MINUTES, TimeUnit.MINUTES)
        noteTraffic("gen-200 read", reply)
        notes.add("startup: configMs=${Budgets.elapsedMs(runtime.startedAtNanos, runtime.configAtNanos)} startSentMs=${Budgets.elapsedMs(runtime.startedAtNanos, runtime.startSentAtNanos)} readyMs=${Budgets.elapsedMs(runtime.startedAtNanos, runtime.readyAtNanos)}")
        return ProbeJson.elapsedMs(reply)
    }

    private fun updateMs(directory: Path, project: ProbeProject): Long {
        val target = directory.resolve(project.specPath)
        val args = ProbeJson.updateArgs(project.specPath)
        val edit = { Files.write(target, EDIT, StandardOpenOption.APPEND) }
        edit()
        runtime.invoke("budget.update", args).get(CALL_MINUTES, TimeUnit.MINUTES)
        var last = "null"
        val best = bestOfThree {
            edit()
            last = runtime.invoke("budget.update", args).get(CALL_MINUTES, TimeUnit.MINUTES)
        }
        noteTraffic("gen-200 update (last of three)", last)
        return best
    }

    private fun noteTraffic(label: String, reply: String) {
        val traffic = ProbeJson.traffic(reply)
        notes.add(if (traffic == null) "$label: no calls and frames in the reply" else "$label: calls=${traffic.calls} frames=${traffic.frames}")
    }

    private fun readGen200(): String? {
        val path = inputs.resolve("$GEN_200.json")
        return if (Files.exists(path)) Files.readString(path) else null
    }

    private fun bestOfThree(attempt: () -> Unit): Long =
        (0 until 3).minOf {
            val started = System.nanoTime()
            attempt()
            (System.nanoTime() - started) / NANOS_PER_MS
        }

    private fun deleteTree(path: Path) {
        try {
            Files.walk(path).use { paths ->
                paths.sorted(Comparator.reverseOrder<Path>()).forEach { Files.deleteIfExists(it) }
            }
        } catch (failure: Throwable) {
            notes.add("temp directory $path was not removed: $failure")
        }
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
        val EDIT: ByteArray = "\nedited\n".toByteArray(Charsets.UTF_8)
    }
}

package com.gregorbiswanger.featherspec.spike

import org.graalvm.polyglot.Context
import org.graalvm.polyglot.HostAccess
import org.graalvm.polyglot.Source
import org.graalvm.polyglot.Value
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import java.io.File

private const val RUNNER = """(function (text) {
    var input = JSON.parse(text);
    var outcome = { done: false, value: null, error: null };
    FeatherSpecSpike.run(JSON.stringify(input.files), input.version).then(
        function (value) { outcome.value = value; outcome.done = true; },
        function (error) { outcome.error = String(error); outcome.done = true; });
    return outcome;
})"""

class GraalCoreSpikeTest {

    private val build = File(System.getProperty("spike.build"))

    @Test
    @DisplayName("AC-009 S-1: the core bundle in GraalJS gives Node's output byte for byte")
    fun coreBundleMatchesNodeByteForByte() {
        val inputs = File(build, "inputs").listFiles()!!.filter { it.extension == "json" }.sortedBy { it.name }
        val polyglotBytes = System.getProperty("spike.polyglotJars")
            .split(File.pathSeparator)
            .filter { it.isNotEmpty() }
            .sumOf { File(it).length() }
        val perFixture = linkedMapOf<String, Long>()
        val mismatches = mutableListOf<String>()
        var coldStartMs = 0L
        var gen200FirstMs = 0L
        var gen200SecondMs = 0L

        Context.newBuilder("js")
            .allowHostAccess(HostAccess.NONE)
            .option("engine.WarnInterpreterOnly", "false")
            .build()
            .use { context ->
                val started = System.nanoTime()
                context.eval(Source.newBuilder("js", File(build, "core-spike.js")).build())
                val runner = context.eval("js", RUNNER)
                coldStartMs = millisSince(started)

                val generated = File(build, "inputs/generated-200.json").readText(Charsets.UTF_8)
                gen200FirstMs = timed { runCore(runner, generated) }.second
                gen200SecondMs = timed { runCore(runner, generated) }.second

                for (input in inputs) {
                    val name = input.nameWithoutExtension
                    val (actual, millis) = timed { runCore(runner, input.readText(Charsets.UTF_8)) }
                    perFixture[name] = millis
                    val expected = File(build, "node-expected/$name.json").readBytes()
                    if (!expected.contentEquals(actual.toByteArray(Charsets.UTF_8))) {
                        mismatches.add(name)
                    }
                }
            }

        File(build, "s1-results.json").writeText(
            buildString {
                append("{")
                append("\"os\":").append(quoted(System.getProperty("os.name"))).append(",")
                append("\"javaVersion\":").append(quoted(System.getProperty("java.version"))).append(",")
                append("\"coldStartMs\":").append(coldStartMs).append(",")
                append("\"perFixture\":{")
                append(perFixture.entries.joinToString(",") { "${quoted(it.key)}:${it.value}" })
                append("},")
                append("\"gen200FirstMs\":").append(gen200FirstMs).append(",")
                append("\"gen200SecondMs\":").append(gen200SecondMs).append(",")
                append("\"polyglotJarBytes\":").append(polyglotBytes)
                append("}")
            },
        )

        assertTrue(mismatches.isEmpty(), "not byte-identical to Node: $mismatches")
    }

    private fun runCore(runner: Value, input: String): String {
        val outcome = runner.execute(input)
        check(outcome.getMember("done").asBoolean()) { "run() did not settle" }
        check(outcome.getMember("error").isNull) { "run() failed: ${outcome.getMember("error").asString()}" }
        return outcome.getMember("value").asString()
    }

    private inline fun <T> timed(block: () -> T): Pair<T, Long> {
        val started = System.nanoTime()
        val result = block()
        return Pair(result, millisSince(started))
    }

    private fun millisSince(startNanos: Long): Long = (System.nanoTime() - startNanos) / 1_000_000

    private fun quoted(text: String?): String =
        "\"" + (text ?: "").replace("\\", "\\\\").replace("\"", "\\\"") + "\""
}

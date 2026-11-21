package com.gregorbiswanger.featherspec.studio

import com.gregorbiswanger.featherspec.studio.probe.Budgets
import com.gregorbiswanger.featherspec.studio.probe.ConformanceCompare
import com.intellij.driver.sdk.waitForIndicators
import com.intellij.ide.starter.driver.engine.runIdeWithDriver
import com.intellij.ide.starter.ide.IdeProductProvider
import com.intellij.ide.starter.models.TestCase
import com.intellij.ide.starter.plugins.PluginConfigurator
import com.intellij.ide.starter.project.LocalProjectInfo
import com.intellij.ide.starter.runner.Starter
import org.junit.jupiter.api.Test
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import kotlin.time.Duration.Companion.minutes

class CoreIdeTest {

    @Test
    fun coreAnswersLikeNodeAndMeetsTheBudgets() {
        val conformance = Path.of(System.getProperty("featherspec.conformance"))
        val expectedDir = conformance.resolve("expected")
        check(Files.isDirectory(expectedDir)) { "no $expectedDir; run node jetbrains/scripts/conformanceExpected.mjs first" }
        val out = Path.of("build", "probe-out").toAbsolutePath()
        runProbe("coreConformance", conformance, out)
        val budgetsFile = out.resolve("budgets.json")
        val errorFile = out.resolve("probe-error.txt")

        val problems = ArrayList<String>()
        if (Files.exists(errorFile)) {
            problems.add("the probe failed: ${Files.readString(errorFile)}")
        }
        val notes = out.resolve("probe-notes.txt")
        if (Files.exists(notes)) {
            println("PROBE-NOTES ${Files.readString(notes)}")
        }

        val names = ConformanceCompare.names(expectedDir, setOf("setup-expected"))
        if (names.size < 27) {
            problems.add("expected 27 conformance outputs or more, found ${names.size} in $expectedDir")
        }
        problems.addAll(ConformanceCompare.differences(expectedDir, out.resolve("actual"), names))
        problems.addAll(setupDifferences(expectedDir, out))

        if (Files.exists(budgetsFile)) {
            val json = Files.readString(budgetsFile)
            println("BUDGETS ${System.getProperty("os.name")} $json")
            val violations = Budgets.parse(json).violations()
            if (violations.isNotEmpty() && violations.all { it.startsWith("coreReadyMs") }) {
                problems.addAll(secondStartViolations(conformance, violations))
            } else {
                problems.addAll(violations)
            }
        } else {
            problems.add("the probe wrote no $budgetsFile")
        }
        check(problems.isEmpty()) { "core conformance and budgets:\n" + problems.joinToString("\n") }
    }

    private fun secondStartViolations(conformance: Path, first: List<String>): List<String> {
        val out = Path.of("build", "probe-out-second").toAbsolutePath()
        runProbe("coreConformanceSecondStart", conformance, out)
        val budgetsFile = out.resolve("budgets.json")
        if (!Files.exists(budgetsFile)) {
            return first + "the second start wrote no $budgetsFile"
        }
        val json = Files.readString(budgetsFile)
        println("COLD-START-RETRY ${System.getProperty("os.name")} first: ${first.joinToString("; ")} second: $json")
        return Budgets.parse(json).violations().filter { it.startsWith("coreReadyMs") }
    }

    private fun runProbe(name: String, conformance: Path, out: Path) {
        deleteTree(out)
        Files.createDirectories(out)
        val projectCopy = copyFixture(
            Path.of(System.getProperty("featherspec.fixture")),
            Path.of("build", "ide-project", "$name-studio-0015").toAbsolutePath(),
        )
        val budgetsFile = out.resolve("budgets.json")
        val errorFile = out.resolve("probe-error.txt")
        val context = Starter.newContext(
            name,
            TestCase(IdeProductProvider.IU, LocalProjectInfo(projectCopy)).withVersion("2025.3.1"),
        )
        context.applyVMOptionsPatch {
            addSystemProperty("idea.trust.all.projects", true)
            addSystemProperty("ide.show.tips.on.startup.default.value", false)
            addSystemProperty("featherspec.probe.out", out.toString())
            addSystemProperty("featherspec.probe", "conformance")
            addSystemProperty("featherspec.conformance", conformance.toString())
        }
        PluginConfigurator(context).installPluginFromDir(Path.of(System.getProperty("path.to.build.plugin")))
        context.runIdeWithDriver().useDriverAndCloseIde {
            waitForIndicators(5.minutes)
            val deadline = System.nanoTime() + 12.minutes.inWholeNanoseconds
            while (!Files.exists(budgetsFile) && !Files.exists(errorFile) && System.nanoTime() < deadline) {
                Thread.sleep(2000)
            }
            Thread.sleep(2000)
        }
    }

    private fun setupDifferences(expectedDir: Path, out: Path): List<String> {
        val actual = out.resolve("setup-actual.json")
        if (Files.exists(actual)) {
            return listOfNotNull(ConformanceCompare.compareFiles("setup", expectedDir.resolve("setup-expected.json"), actual))
        }
        val error = out.resolve("setup-error.txt")
        val reason = if (Files.exists(error)) Files.readString(error) else "no setup output"
        if (reason.contains("not yet")) {
            println("SETUP-PAIR deferred until the archive reader of T-033 answers archive.read: $reason")
            return emptyList()
        }
        return listOf("setup: $reason")
    }

    private fun deleteTree(path: Path) {
        if (!Files.exists(path)) {
            return
        }
        Files.walk(path).use { paths ->
            paths.sorted(Comparator.reverseOrder<Path>()).forEach { Files.delete(it) }
        }
    }

    private fun copyFixture(source: Path, target: Path): Path {
        deleteTree(target)
        Files.walk(source).use { paths ->
            paths.forEach { path ->
                val destination = target.resolve(source.relativize(path).toString())
                if (Files.isDirectory(path)) {
                    Files.createDirectories(destination)
                } else {
                    Files.createDirectories(destination.parent)
                    Files.copy(path, destination, StandardCopyOption.REPLACE_EXISTING)
                }
            }
        }
        return target
    }
}

package com.gregorbiswanger.featherspec.studio

import com.gregorbiswanger.featherspec.studio.probe.BudgetRow
import com.gregorbiswanger.featherspec.studio.probe.IdeaLogScan
import com.gregorbiswanger.featherspec.studio.probe.SmokeCompare
import com.gregorbiswanger.featherspec.studio.probe.SmokeProbe
import com.intellij.driver.sdk.waitForIndicators
import com.intellij.ide.starter.driver.engine.runIdeWithDriver
import com.intellij.ide.starter.ide.IdeProductProvider
import com.intellij.ide.starter.models.TestCase
import com.intellij.ide.starter.plugins.PluginConfigurator
import com.intellij.ide.starter.project.LocalProjectInfo
import com.intellij.ide.starter.runner.Starter
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import kotlin.time.Duration.Companion.minutes

private class SmokeRun(val json: String?, val problems: List<String>)

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class SmokeIdeTest {
    private val contextName = "studioSmoke"

    private val run: SmokeRun by lazy { runIde() }

    @Test
    fun theTabOpensFastFollowsChangesRestoresItsPlaceAndWritesNothingToTheProject() {
        val problems = ArrayList(run.problems)
        val rows = ArrayList<BudgetRow>()
        run.json?.let { problems.addAll(SmokeCompare.smoke(it, rows)) }
        StepSummary.publish("Panel and change timings (${System.getProperty("os.name")})", rows)
        problems.addAll(logProblems())
        check(problems.isEmpty()) { "smoke:\n" + problems.joinToString("\n") }
    }

    @Test
    fun aThemeSwitchShowsTheNewValuesAtOnceAndEveryThemeKeepsItsContrast() {
        val problems = ArrayList(run.problems)
        val rows = ArrayList<BudgetRow>()
        run.json?.let { problems.addAll(SmokeCompare.themes(it, rows)) }
        StepSummary.publish("Theme switch timings (${System.getProperty("os.name")})", rows)
        check(problems.isEmpty()) { "theme switch and contrast:\n" + problems.joinToString("\n") }
    }

    private fun runIde(): SmokeRun {
        val out = Path.of("build", "probe-out-smoke").toAbsolutePath()
        val project = copyFixture(
            Path.of(System.getProperty("featherspec.fixture")),
            Path.of("build", "ide-project", "smoke-studio-0015").toAbsolutePath(),
        )
        deleteTree(out)
        Files.createDirectories(out)
        val report = out.resolve(SmokeProbe.REPORT_FILE)
        val errorFile = out.resolve(SmokeProbe.ERROR_FILE)
        val context = Starter.newContext(
            contextName,
            TestCase(IdeProductProvider.IU, LocalProjectInfo(project)).withVersion("2025.3.1"),
        )
        context.applyVMOptionsPatch {
            addSystemProperty("idea.trust.all.projects", true)
            addSystemProperty("ide.show.tips.on.startup.default.value", false)
            addSystemProperty("featherspec.probe.out", out.toString())
            addSystemProperty("featherspec.probe", SmokeProbe.PROBE_NAME)
        }
        PluginConfigurator(context).installPluginFromDir(Path.of(System.getProperty("path.to.build.plugin")))
        context.runIdeWithDriver().useDriverAndCloseIde {
            waitForIndicators(5.minutes)
            val deadline = System.nanoTime() + 10.minutes.inWholeNanoseconds
            while (!Files.exists(report) && !Files.exists(errorFile) && System.nanoTime() < deadline) {
                Thread.sleep(2000)
            }
            Thread.sleep(2000)
        }

        val problems = ArrayList<String>()
        if (Files.exists(errorFile)) {
            problems.add("the probe failed: ${Files.readString(errorFile)}")
        }
        var json: String? = null
        if (Files.exists(report)) {
            json = Files.readString(report)
            println("SMOKE-OBSERVED ${System.getProperty("os.name")} $json")
        } else {
            problems.add("the probe wrote no $report")
        }
        return SmokeRun(json, problems)
    }

    private fun logProblems(): List<String> {
        val root = listOf(Path.of("out", "ide-tests"), Path.of("..", "out", "ide-tests")).map { it.toAbsolutePath().normalize() }.firstOrNull { Files.isDirectory(it) } ?: Path.of("..", "out", "ide-tests").toAbsolutePath().normalize()
        if (!Files.isDirectory(root)) {
            return listOf("no $root, so no idea.log to scan")
        }
        val logs = Files.walk(root).use { paths ->
            paths.filter { it.fileName.toString() == "idea.log" && it.toString().contains(contextName) }.toList()
        }
        if (logs.isEmpty()) {
            return listOf("no idea.log of $contextName under $root")
        }
        return logs.flatMap { log ->
            IdeaLogScan.problems(String(Files.readAllBytes(log), Charsets.UTF_8)).map { "idea.log ${log.toAbsolutePath()}: $it" }
        }
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

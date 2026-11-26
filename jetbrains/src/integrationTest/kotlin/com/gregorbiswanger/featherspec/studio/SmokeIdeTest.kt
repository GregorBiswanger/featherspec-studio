package com.gregorbiswanger.featherspec.studio

import com.gregorbiswanger.featherspec.studio.probe.BudgetRow
import com.gregorbiswanger.featherspec.studio.probe.IdeaLogScan
import com.gregorbiswanger.featherspec.studio.probe.RetryDecision
import com.gregorbiswanger.featherspec.studio.probe.SmokeCompare
import com.gregorbiswanger.featherspec.studio.probe.SmokeProbe
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

/** One start of the IDE with everything judged: the functional problems and the rows of the time budgets. */
private class Attempt(
    val number: Int,
    val run: SmokeRun,
    val smokeProblems: List<String>,
    val smokeRows: List<BudgetRow>,
    val themeProblems: List<String>,
    val themeRows: List<BudgetRow>,
    val logProblems: List<String>,
) {
    val rows: List<BudgetRow> get() = smokeRows + themeRows
    val problems: List<String> get() = run.problems + smokeProblems + themeProblems + logProblems
}

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class SmokeIdeTest {
    private val os = System.getProperty("os.name").orEmpty()

    private val attempts: List<Attempt> by lazy { runAttempts() }

    @Test
    fun theTabOpensFastFollowsChangesRestoresItsPlaceAndWritesNothingToTheProject() {
        publish("Panel and change timings ($os)") { it.smokeRows }
        val last = attempts.last()
        val problems = last.run.problems + last.smokeProblems + last.logProblems
        check(problems.isEmpty()) { "smoke:\n" + problems.joinToString("\n") + earlierRuns() }
    }

    @Test
    fun aThemeSwitchShowsTheNewValuesAtOnceAndEveryThemeKeepsItsContrast() {
        publish("Theme switch timings ($os)") { it.themeRows }
        val last = attempts.last()
        val problems = last.run.problems + last.themeProblems
        check(problems.isEmpty()) { "theme switch and contrast:\n" + problems.joinToString("\n") + earlierRuns() }
    }

    // PD-111, amended: on Linux a run that missed only time budgets is repeated once and the repeat decides.
    // The decision is RetryDecision (plain Kotlin, unit-tested); it lives here, not in the workflow, because only
    // here the rows of the budgets tell a time miss from a functional problem.
    private fun runAttempts(): List<Attempt> {
        val done = ArrayList<Attempt>()
        var number = 1
        while (true) {
            val attempt = judge(number, runIde(number))
            done.add(attempt)
            if (!RetryDecision.shouldRepeat(os, number, attempt.problems, attempt.rows)) {
                return done
            }
            println("SMOKE-REPEAT run $number missed only time budgets: ${RetryDecision.timeProblems(attempt.rows)}")
            number += 1
        }
    }

    private fun judge(number: Int, run: SmokeRun): Attempt {
        val smokeRows = ArrayList<BudgetRow>()
        val themeRows = ArrayList<BudgetRow>()
        val smokeProblems = run.json?.let { SmokeCompare.smoke(it, smokeRows) } ?: emptyList()
        val themeProblems = run.json?.let { SmokeCompare.themes(it, themeRows) } ?: emptyList()
        return Attempt(number, run, smokeProblems, smokeRows, themeProblems, themeRows, logProblems(nameOf(number)))
    }

    private fun publish(title: String, rows: (Attempt) -> List<BudgetRow>) {
        attempts.forEach { attempt ->
            StepSummary.publish(RetryDecision.title(title, attempt.number, attempt.number < attempts.last().number), rows(attempt))
        }
    }

    private fun earlierRuns(): String {
        val earlier = attempts.dropLast(1)
        if (earlier.isEmpty()) {
            return ""
        }
        return "\nrun ${earlier.last().number} of ${RetryDecision.MAX_RUNS} had missed only time budgets: " + RetryDecision.timeProblems(earlier.last().rows).joinToString("; ")
    }

    private fun nameOf(number: Int): String = if (number == 1) "studioSmoke" else "studioSmoke-run$number"

    private fun keepEarlierReport(out: Path, previous: Int) {
        listOf(SmokeProbe.REPORT_FILE to "smoke-run$previous.json", SmokeProbe.ERROR_FILE to "probe-error-run$previous.txt").forEach { (name, kept) ->
            if (Files.exists(out.resolve(name))) {
                Files.move(out.resolve(name), out.resolve(kept), StandardCopyOption.REPLACE_EXISTING)
            }
        }
    }

    private fun runIde(number: Int): SmokeRun {
        val contextName = nameOf(number)
        val out = Path.of("build", "probe-out-smoke").toAbsolutePath()
        val project = copyFixture(
            Path.of(System.getProperty("featherspec.fixture")),
            Path.of("build", "ide-project", "smoke-studio-0015").toAbsolutePath(),
        )
        if (number > 1) {
            keepEarlierReport(out, number - 1)
        } else {
            deleteTree(out)
        }
        Files.createDirectories(out)
        val report = out.resolve(SmokeProbe.REPORT_FILE)
        val errorFile = out.resolve(SmokeProbe.ERROR_FILE)
        val context = Starter.newContext(
            contextName,
            TestCase(IdeProductProvider.IU, LocalProjectInfo(project)).withVersion(IdeUnderTest.version),
        )
        context.applyVMOptionsPatch {
            addSystemProperty("idea.trust.all.projects", true)
            addSystemProperty("ide.show.tips.on.startup.default.value", false)
            addSystemProperty("ide.browser.jcef.jsQueryPoolSize", 0)
            addSystemProperty("featherspec.probe.out", out.toString())
            addSystemProperty("featherspec.probe", SmokeProbe.PROBE_NAME)
        }
        PluginConfigurator(context).installPluginFromDir(Path.of(System.getProperty("path.to.build.plugin")))
        context.runIdeWithDriver().useDriverAndCloseIde {
            settleAfterStartup()
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
            println("SMOKE-OBSERVED $os run $number $json")
        } else {
            problems.add("the probe wrote no $report")
        }
        return SmokeRun(json, problems)
    }

    private fun logProblems(contextName: String): List<String> {
        val root = listOf(Path.of("out", "ide-tests"), Path.of("..", "out", "ide-tests")).map { it.toAbsolutePath().normalize() }.firstOrNull { Files.isDirectory(it) } ?: Path.of("..", "out", "ide-tests").toAbsolutePath().normalize()
        if (!Files.isDirectory(root)) {
            return listOf("no $root, so no idea.log to scan")
        }
        val logs = Files.walk(root).use { paths ->
            paths.filter { path -> path.fileName.toString() == "idea.log" && path.any { it.toString() == contextName } }.toList()
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

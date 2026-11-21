package com.gregorbiswanger.featherspec.studio

import com.gregorbiswanger.featherspec.studio.probe.IdeaLogScan
import com.gregorbiswanger.featherspec.studio.probe.NoJcefCompare
import com.gregorbiswanger.featherspec.studio.probe.NoJcefProbe
import com.intellij.driver.sdk.waitForIndicators
import com.intellij.ide.starter.driver.engine.runIdeWithDriver
import com.intellij.ide.starter.ide.IdeProductProvider
import com.intellij.ide.starter.models.TestCase
import com.intellij.ide.starter.plugins.PluginConfigurator
import com.intellij.ide.starter.project.LocalProjectInfo
import com.intellij.ide.starter.runner.Starter
import org.junit.jupiter.api.Assumptions
import org.junit.jupiter.api.Test
import java.nio.file.Files
import java.nio.file.Path
import kotlin.time.Duration.Companion.minutes

class NoJcefIdeTest {

    @Test
    fun withoutJcefTheNoticeReplacesTheTreeAndEverySurfaceSaysWhy() {
        val kind = System.getProperty("featherspec.nojcef").orEmpty()
        Assumptions.assumeTrue(kind == "unsupported" || kind == "suspended", "featherspec.nojcef is '$kind'; set it to unsupported or suspended")
        val out = Path.of("build", "probe-out-nojcef-$kind").toAbsolutePath()
        val project = Path.of("build", "ide-project", "nojcef-$kind").toAbsolutePath()
        deleteTree(out)
        deleteTree(project)
        Files.createDirectories(out)
        Files.createDirectories(project)

        val report = out.resolve(NoJcefProbe.REPORT_FILE)
        val errorFile = out.resolve(NoJcefProbe.ERROR_FILE)
        val contextName = "noJcef${kind.replaceFirstChar { it.uppercase() }}"
        val context = Starter.newContext(
            contextName,
            TestCase(IdeProductProvider.IU, LocalProjectInfo(project)).withVersion("2025.3.1"),
        )
        context.applyVMOptionsPatch {
            addSystemProperty("idea.trust.all.projects", true)
            addSystemProperty("ide.show.tips.on.startup.default.value", false)
            addSystemProperty("featherspec.probe.out", out.toString())
            addSystemProperty("featherspec.probe", NoJcefProbe.PROBE_NAME)
            if (kind == "unsupported") {
                addSystemProperty("ide.browser.jcef.enabled", false)
            }
        }
        PluginConfigurator(context).installPluginFromDir(Path.of(System.getProperty("path.to.build.plugin")))
        context.runIdeWithDriver().useDriverAndCloseIde {
            waitForIndicators(5.minutes)
            val deadline = System.nanoTime() + 6.minutes.inWholeNanoseconds
            while (!Files.exists(report) && !Files.exists(errorFile) && System.nanoTime() < deadline) {
                Thread.sleep(2000)
            }
            Thread.sleep(2000)
        }

        val problems = ArrayList<String>()
        if (Files.exists(errorFile)) {
            problems.add("the probe failed: ${Files.readString(errorFile)}")
        }
        if (Files.exists(report)) {
            val json = Files.readString(report)
            println("NOJCEF-OBSERVED $kind $json")
            val unreachable = NoJcefCompare.unreachable(kind, json)
            if (unreachable) {
                println("NOJCEF-${kind.uppercase()}-NOT-REACHABLE JCEF kept working in this run; observed: $json")
            }
            Assumptions.assumeFalse(unreachable, "JCEF kept working, so the $kind branch is not reachable here; JcefAvailabilityTest and AC-042 decide")
            problems.addAll(NoJcefCompare.differences(kind, json))
        } else {
            problems.add("the probe wrote no $report")
        }
        problems.addAll(logProblems(contextName))
        check(problems.isEmpty()) { "no JCEF ($kind):\n" + problems.joinToString("\n") }
    }

    private fun logProblems(contextName: String): List<String> {
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
}

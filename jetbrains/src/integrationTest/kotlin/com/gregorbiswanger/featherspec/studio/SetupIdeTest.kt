package com.gregorbiswanger.featherspec.studio

import com.gregorbiswanger.featherspec.studio.probe.SetupCompare
import com.gregorbiswanger.featherspec.studio.probe.SetupProbe
import com.intellij.ide.starter.driver.engine.runIdeWithDriver
import com.intellij.ide.starter.ide.IdeProductProvider
import com.intellij.ide.starter.models.TestCase
import com.intellij.ide.starter.plugins.PluginConfigurator
import com.intellij.ide.starter.project.LocalProjectInfo
import com.intellij.ide.starter.runner.Starter
import org.junit.jupiter.api.Test
import java.nio.file.Files
import java.nio.file.Path
import kotlin.time.Duration.Companion.minutes

class SetupIdeTest {

    @Test
    fun setupWritesTheFilesOfNodeAndNoRequestLeavesTheIde() {
        val expectedFile = Path.of(System.getProperty("featherspec.conformance")).resolve("expected").resolve("setup-expected.json")
        check(Files.exists(expectedFile)) { "no $expectedFile; run node jetbrains/scripts/conformanceExpected.mjs first" }
        val out = Path.of("build", "probe-out-setup").toAbsolutePath()
        val project = Path.of("build", "ide-project", "setup-empty").toAbsolutePath()
        val archive = Path.of("..", "test", "fixtures", "setup", "featherspec-1.10.0.tar.gz").toAbsolutePath().normalize()
        check(Files.exists(archive)) { "no $archive" }
        deleteTree(out)
        deleteTree(project)
        Files.createDirectories(out)
        Files.createDirectories(project)

        val done = out.resolve(SetupProbe.DONE_FILE)
        val errorFile = out.resolve("probe-error.txt")
        val context = Starter.newContext(
            "setupEndToEnd",
            TestCase(IdeProductProvider.IU, LocalProjectInfo(project)).withVersion(IdeUnderTest.version),
        )
        context.applyVMOptionsPatch {
            addSystemProperty("idea.trust.all.projects", true)
            addSystemProperty("ide.show.tips.on.startup.default.value", false)
            addSystemProperty("ide.browser.jcef.jsQueryPoolSize", 0)
            addSystemProperty("featherspec.probe.out", out.toString())
            addSystemProperty("featherspec.probe", "setup")
            addSystemProperty("featherspec.probe.releaseArchive", archive.toString())
        }
        PluginConfigurator(context).installPluginFromDir(Path.of(System.getProperty("path.to.build.plugin")))
        context.runIdeWithDriver().useDriverAndCloseIde {
            settleAfterStartup()
            val deadline = System.nanoTime() + 12.minutes.inWholeNanoseconds
            while (!Files.exists(done) && !Files.exists(errorFile) && System.nanoTime() < deadline) {
                Thread.sleep(2000)
            }
            Thread.sleep(2000)
        }

        val problems = ArrayList<String>()
        if (Files.exists(errorFile)) {
            problems.add("the probe failed: ${Files.readString(errorFile)}")
        }
        if (Files.exists(done)) {
            println("SETUP-DONE ${Files.readString(done)}")
            if (!Files.readString(done).contains("\"ok\":true")) {
                problems.add("the setup command failed: ${Files.readString(done)}")
            }
        } else {
            problems.add("the probe wrote no $done")
        }
        val filesJson = out.resolve(SetupProbe.FILES_FILE)
        if (Files.exists(filesJson)) {
            problems.addAll(SetupCompare.differences(Files.readString(expectedFile), Files.readString(filesJson)))
        } else {
            problems.add("the probe wrote no $filesJson")
        }
        val requestsJson = out.resolve(SetupProbe.REQUESTS_FILE)
        if (Files.exists(requestsJson)) {
            println("SETUP-REQUESTS ${Files.readString(requestsJson)}")
            problems.addAll(SetupCompare.requests(Files.readString(requestsJson)))
        } else {
            problems.add("the probe wrote no $requestsJson")
        }
        check(problems.isEmpty()) { "setup end to end:\n" + problems.joinToString("\n") }
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

package com.gregorbiswanger.featherspec.spike

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
import kotlin.time.Duration.Companion.minutes

class SpikeVfsTest {

    @Test
    fun vfsEventDelaysAreMeasured() {
        val out = Path.of("build", "spike-out").toAbsolutePath()
        Files.createDirectories(out)
        val projectCopy = copyFixture(
            Path.of(System.getProperty("spike.fixture")),
            Path.of("build", "ide-project", "vfs-studio-0015").toAbsolutePath(),
        )
        val resultsFile = out.resolve("s4-results.json")

        val context = Starter.newContext(
            "spikeVfs",
            TestCase(IdeProductProvider.IU, LocalProjectInfo(projectCopy)).withVersion("2025.3.1"),
        )
        context.applyVMOptionsPatch {
            addSystemProperty("idea.trust.all.projects", true)
            addSystemProperty("ide.show.tips.on.startup.default.value", false)
            addSystemProperty("spike.out", out.toString())
            addSystemProperty("spike.vfs", true)
            addSystemProperty("spike.probe", false)
        }
        PluginConfigurator(context).installPluginFromDir(Path.of(System.getProperty("path.to.build.plugin")))

        context.runIdeWithDriver().useDriverAndCloseIde {
            waitForIndicators(5.minutes)
            val deadline = System.nanoTime() + 5.minutes.inWholeNanoseconds
            while (!Files.exists(resultsFile) && System.nanoTime() < deadline) {
                Thread.sleep(2000)
            }
        }

        check(Files.exists(resultsFile)) { "the VFS probe wrote no $resultsFile" }
        val results = Files.readString(resultsFile)
        println("S4-RESULTS $results")
        check(Regex("\"n\":[0-9]+").findAll(results).count() == 10) { results }
    }

    private fun copyFixture(source: Path, target: Path): Path {
        Files.walk(source).use { paths ->
            paths.forEach { path ->
                val destination = target.resolve(source.relativize(path).toString())
                if (Files.isDirectory(path)) {
                    Files.createDirectories(destination)
                } else {
                    Files.createDirectories(destination.parent)
                    Files.copy(path, destination, java.nio.file.StandardCopyOption.REPLACE_EXISTING)
                }
            }
        }
        return target
    }
}

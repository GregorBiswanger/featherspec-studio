package com.gregorbiswanger.featherspec.spike

import com.intellij.driver.sdk.ui.components.ideFrame
import com.intellij.driver.sdk.waitForIndicators
import com.intellij.ide.starter.driver.engine.runIdeWithDriver
import com.intellij.ide.starter.ide.IdeInfo
import com.intellij.ide.starter.models.TestCase
import com.intellij.ide.starter.plugins.PluginConfigurator
import com.intellij.ide.starter.project.LocalProjectInfo
import com.intellij.ide.starter.runner.Starter
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import kotlin.time.Duration
import kotlin.time.Duration.Companion.minutes

class SpikeIdeTest {

    @Test
    fun probeRunsGraalAndRendersThreeThemes() {
        val out = Path.of("build", "spike-out").toAbsolutePath()
        Files.createDirectories(out)
        val project = copyFixture(
            Path.of(System.getProperty("spike.fixture")),
            Path.of("build", "ide-project", "studio-0015").toAbsolutePath(),
        )

        Starter.newContext(
            "spikeIdeProbe",
            TestCase(IdeInfo.IdeaUltimate, LocalProjectInfo(project)).withVersion("2025.3.1"),
        ).apply {
            PluginConfigurator(this).installPluginFromDir(Path.of(System.getProperty("path.to.build.plugin")))
            addVMOptionsPatch {
                addSystemProperty("idea.trust.all.projects", true)
                addSystemProperty("ide.show.tips.on.startup.default.value", false)
                addSystemProperty("spike.out", out.toString())
            }
        }.runIdeWithDriver().useDriverAndCloseIde {
            waitForIndicators(5.minutes)
            ideFrame {
                invokeAction("FeatherSpecSpike.Probe")
            }
            awaitResults(out.resolve("s2-results.json"), 5.minutes)
        }

        val results = Files.readString(out.resolve("s2-results.json"))
        assertTrue(results.contains("\"graal\":\"ok\""), results)
        listOf("s2-light.png", "s2-darcula.png", "s2-high-contrast.png").forEach { name ->
            assertTrue(Files.size(out.resolve(name)) > 10_000, "$name is too small")
        }
    }

    private fun copyFixture(source: Path, target: Path): Path {
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

    private fun awaitResults(file: Path, timeout: Duration) {
        val deadline = System.nanoTime() + timeout.inWholeNanoseconds
        while (!Files.exists(file) && System.nanoTime() < deadline) {
            Thread.sleep(500)
        }
        check(Files.exists(file)) { "the probe wrote no $file" }
    }
}

package com.gregorbiswanger.featherspec.spike

import com.intellij.ide.ui.LafManager
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import org.graalvm.polyglot.Context
import org.graalvm.polyglot.HostAccess
import org.graalvm.polyglot.Source
import java.awt.Frame
import java.awt.Robot
import java.nio.file.Files
import java.nio.file.Path
import javax.imageio.ImageIO

private const val PROBE_RUNNER = """(function (text) {
    var input = JSON.parse(text);
    var outcome = { done: false, value: null, error: null };
    FeatherSpecSpike.run(JSON.stringify(input.files), input.version).then(
        function (value) { outcome.value = value; outcome.done = true; },
        function (error) { outcome.error = String(error); outcome.done = true; });
    return outcome;
})"""

class SpikeProbeAction : AnAction() {
    override fun actionPerformed(event: AnActionEvent) {
        val project = event.project ?: return
        ApplicationManager.getApplication().executeOnPooledThread { runSpikeProbe(project) }
    }

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT
}

fun runSpikeProbe(project: Project) {
    val out = Path.of(System.getProperty("spike.out"))
    Files.createDirectories(out)
    val graal = runGraal()
    val themes = listOf("Light" to "light", "Darcula" to "darcula", "Contrast" to "high-contrast")
    var opened: VirtualFile? = null
    for ((fragment, slug) in themes) {
        ApplicationManager.getApplication().invokeAndWait {
            val theme = LafManager.getInstance().installedThemes.first { it.name.contains(fragment, ignoreCase = true) }
            LafManager.getInstance().setCurrentLookAndFeel(theme, false)
            LafManager.getInstance().updateUI()
            opened?.let { FileEditorManager.getInstance(project).closeFile(it) }
            val file = SpikeEditorProvider.newFile()
            FileEditorManager.getInstance(project).openFile(file, true)
            opened = file
        }
        Thread.sleep(2000)
        ApplicationManager.getApplication().invokeAndWait {
            val bounds = Frame.getFrames().filter { it.isShowing }.maxBy { it.width * it.height }.bounds
            ImageIO.write(Robot().createScreenCapture(bounds), "png", out.resolve("s2-$slug.png").toFile())
        }
    }
    val json = "{\"graal\":\"${escape(graal)}\",\"themes\":[\"light\",\"darcula\",\"high-contrast\"]}"
    Files.writeString(out.resolve("s2-results.json"), json)
}

private fun runGraal(): String {
    val loader = Thread.currentThread().contextClassLoader
    Thread.currentThread().contextClassLoader = SpikeProbeAction::class.java.classLoader
    return try {
        val core = readText("graal/core-spike.js")
        val input = readText("graal/studio-0015.json")
        val expected = readText("graal/studio-0015.expected.json")
        Context.newBuilder("js")
            .allowHostAccess(HostAccess.NONE)
            .option("engine.WarnInterpreterOnly", "false")
            .build()
            .use { context ->
                context.eval(Source.newBuilder("js", core, "core-spike.js").build())
                val outcome = context.eval("js", PROBE_RUNNER).execute(input)
                check(outcome.getMember("done").asBoolean()) { "run() did not settle" }
                check(outcome.getMember("error").isNull) { "run() failed: ${outcome.getMember("error").asString()}" }
                if (outcome.getMember("value").asString() == expected) "ok" else "error: output differs from Node"
            }
    } catch (error: Throwable) {
        "error: ${error.message}"
    } finally {
        Thread.currentThread().contextClassLoader = loader
    }
}

private fun readText(name: String): String {
    return SpikeResources.readResource(name)?.toString(Charsets.UTF_8) ?: error("missing resource $name")
}

private fun escape(text: String): String = text.replace("\\", "\\\\").replace("\"", "\\\"")

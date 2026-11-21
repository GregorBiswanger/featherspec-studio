package com.gregorbiswanger.featherspec.spike

import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.ApplicationActivationListener
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.VfsUtil
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.openapi.vfs.VirtualFileManager
import com.intellij.openapi.vfs.newvfs.BulkFileListener
import com.intellij.openapi.vfs.newvfs.events.VFileEvent
import com.intellij.openapi.wm.IdeFrame
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.atomic.AtomicReference

class SpikeVfsAction : AnAction() {
    override fun actionPerformed(event: AnActionEvent) {
        val project = event.project ?: return
        ApplicationManager.getApplication().executeOnPooledThread { runSpikeVfs(project) }
    }

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT
}

fun runSpikeVfs(project: Project) {
    val out = Path.of(System.getProperty("spike.out"))
    Files.createDirectories(out)
    val specs = Path.of(project.basePath ?: error("the project has no base path")).resolve(".specs")
    val backlog = specs.resolve("backlog")
    Files.createDirectories(backlog)
    LocalFileSystem.getInstance().addRootToWatch(specs.toString(), true)
    val specsDir = LocalFileSystem.getInstance().refreshAndFindFileByPath(specs.toString())
        ?: error("no VFS entry for $specs")
    val json = try {
        VfsRun(backlog, specsDir).run()
    } catch (failure: Throwable) {
        "{\"error\":\"${escapeJson(failure.toString())}\"}"
    }
    Files.writeString(out.resolve("s4-results.json"), json)
}

private class Arrival(val suffix: String) {
    val latch = CountDownLatch(1)
    val at = AtomicLong(0L)
    @Volatile var active = false
}

private class Trial(val ms: Long, val active: Boolean)

private class VfsRun(private val backlog: Path, private val specsDir: VirtualFile) {
    private val arrival = AtomicReference<Arrival?>(null)
    private val activations = AtomicInteger(0)

    private val changes: BulkFileListener = object : BulkFileListener {
        override fun after(events: List<VFileEvent>) {
            val current = arrival.get() ?: return
            if (events.none { it.path.endsWith(current.suffix) }) return
            if (current.at.compareAndSet(0L, System.nanoTime())) {
                current.active = ApplicationManager.getApplication().isActive
                current.latch.countDown()
            }
        }
    }

    private val activation: ApplicationActivationListener = object : ApplicationActivationListener {
        override fun applicationActivated(ideFrame: IdeFrame) {
            activations.incrementAndGet()
            VfsUtil.markDirtyAndRefresh(true, true, true, specsDir)
        }
    }

    fun run(): String {
        val bus = ApplicationManager.getApplication().messageBus
        bus.connect().subscribe(VirtualFileManager.VFS_CHANGES, changes)
        bus.connect().subscribe(ApplicationActivationListener.TOPIC, activation)
        val timed = (1..10).map { timeWrite("s4-${it}.md") }
        val repeat = timeWrite("s4-11.md") { VfsUtil.markDirtyAndRefresh(true, true, true, specsDir) }
        return json(timed, repeat)
    }

    private fun timeWrite(name: String, afterWrite: () -> Unit = {}): Trial {
        val waiter = Arrival("/backlog/$name")
        arrival.set(waiter)
        val start = System.nanoTime()
        Files.writeString(backlog.resolve(name), "# $name\n")
        afterWrite()
        waiter.latch.await(30, TimeUnit.SECONDS)
        arrival.set(null)
        val at = waiter.at.get()
        return Trial(if (at == 0L) -1L else (at - start) / 1_000_000L, waiter.active)
    }

    private fun json(timed: List<Trial>, repeat: Trial): String {
        val events = timed.mapIndexed { index, trial ->
            """{"n":${index + 1},"ms":${trial.ms},"active":${trial.active}}"""
        }
        val unfocused = if (timed.any { !it.active }) "measured" else "not measurable on this runner"
        return """{"os":"${System.getProperty("os.name")}","events":[${events.joinToString(",")}],"afterRefresh":{"ms":${repeat.ms},"active":${repeat.active}},"activations":${activations.get()},"unfocused":"$unfocused"}"""
    }
}

private fun escapeJson(text: String): String = text.replace("\\", "\\\\").replace("\"", "\\\"")

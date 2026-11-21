package com.gregorbiswanger.featherspec.studio.probe

import com.gregorbiswanger.featherspec.studio.StudioProjectService
import com.gregorbiswanger.featherspec.studio.runtime.CoreState
import com.gregorbiswanger.featherspec.studio.theme.Contrast
import com.gregorbiswanger.featherspec.studio.theme.ContrastReport
import com.gregorbiswanger.featherspec.studio.theme.ThemeMapping
import com.gregorbiswanger.featherspec.studio.tree.SpecNode
import com.gregorbiswanger.featherspec.studio.tree.SpecTreeMapping
import com.intellij.ide.ui.LafManager
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.VfsUtil
import com.intellij.ui.components.JBLoadingPanel
import java.awt.Component
import java.awt.Container
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

private class Events<T> {
    private val items = CopyOnWriteArrayList<Pair<Long, T>>()

    fun add(value: T) {
        items.add(System.nanoTime() to value)
    }

    fun mark(): Int = items.size

    fun after(mark: Int): List<Pair<Long, T>> = items.drop(mark)
}

class SmokeProbe(private val project: Project, private val out: Path) {
    private val service = project.getService(StudioProjectService::class.java)
    private val frames = Events<String>()
    private val trees = Events<String?>()
    private val statuses = Events<String?>()
    private val scripts = Events<String?>()
    private val notes = ArrayList<String>()

    fun run() {
        val removers = ArrayList<() -> Unit>()
        try {
            Files.createDirectories(out)
            removers.add(service.host.subscribe("panel") { frames.add(it) })
            removers.add(service.host.tree.onChange { trees.add(it) })
            removers.add(service.host.status.onChange { statuses.add(it) })
            removers.add(service.themeScripts.onChange { scripts.add(it) })
            Files.writeString(out.resolve(REPORT_FILE), measure().toJson())
        } catch (failure: Throwable) {
            Files.writeString(out.resolve(ERROR_FILE), failure.toString())
        } finally {
            removers.forEach { it() }
        }
    }

    private fun measure(): SmokeReport {
        val base = requireNotNull(project.basePath) { "the project has no base path" }
        val before = SmokeFiles.snapshot(Path.of(base))

        val firstMark = frames.mark()
        val stateAtOpen = NoJcefState.of(service.state.value)
        val firstStart = System.nanoTime()
        openTab()
        val loadingMs = pollMs(firstStart, LOADING_WAIT_MS) { onEdt { loadingShown() } }
        awaitReady()
        val firstFrameMs = frameMs(firstMark, firstStart, READY_WAIT_MS)
        check(firstFrameMs >= 0) { "no panel frame arrived after the core was ready" }
        settle()

        closeTab()
        val reopenMark = frames.mark()
        val reopenStart = System.nanoTime()
        openTab()
        val reopenFrameMs = frameMs(reopenMark, reopenStart, FRAME_WAIT_MS)
        check(reopenFrameMs >= 0) { "no panel frame arrived after reopening the tab" }

        closeTab()
        val externalTreeMark = trees.mark()
        val externalStatusMark = statuses.mark()
        val externalStart = System.nanoTime()
        Files.writeString(Path.of(base, ".specs", "backlog", "0099-smoke-ext.md"), SmokeFiles.EXTERNAL_TEXT)
        val externalTreeMs = eventMs(trees, externalTreeMark, externalStart, EXTERNAL_WAIT_MS)
        val externalStatusMs = eventMs(statuses, externalStatusMark, externalStart, EXTRA_WAIT_MS)

        val editMark = frames.mark()
        val editOpenStart = System.nanoTime()
        openTab()
        check(frameMs(editMark, editOpenStart, FRAME_WAIT_MS) >= 0) { "no panel frame arrived before the in-IDE change" }
        settle()
        val file = LocalFileSystem.getInstance().refreshAndFindFileByPath("$base/${SmokeFiles.EDITED}")
        checkNotNull(file) { "the IDE cannot find ${SmokeFiles.EDITED}" }
        val edited = SmokeFiles.appendToTitle(VfsUtil.loadText(file))
        val inIdeTreeMark = trees.mark()
        val inIdeStatusMark = statuses.mark()
        val inIdeFrameMark = frames.mark()
        val inIdeStart = System.nanoTime()
        onEdt { ApplicationManager.getApplication().runWriteAction { VfsUtil.saveText(file, edited) } }
        val inIdeTreeMs = eventMs(trees, inIdeTreeMark, inIdeStart, EXTERNAL_WAIT_MS)
        val inIdePanelMs = frameMs(inIdeFrameMark, inIdeStart, EXTERNAL_WAIT_MS, PANEL_UPDATES)
        val inIdeStatusMs = eventMs(statuses, inIdeStatusMark, inIdeStart, EXTRA_WAIT_MS)

        val expectedArea = "board"
        val node = specNode()
        val expectedSelection = node.stem
        invoke("open", "{\"via\":\"area\",\"area\":\"$expectedArea\"}")
        invoke("tree.select", node.rowArgs())
        awaitShell(expectedArea, expectedSelection, SELECT_WAIT_MS)
        settle()
        closeTab()
        val restoreMark = frames.mark()
        val restoreStart = System.nanoTime()
        openTab()
        val restoreFrameMs = frameMs(restoreMark, restoreStart, FRAME_WAIT_MS)
        val restored = frames.after(restoreMark).firstNotNullOfOrNull { PanelFrames.shell(it.second) }
        settle()

        val themes = themes()

        val changes = SmokeFiles.diff(before, SmokeFiles.snapshot(Path.of(base)))
        return SmokeReport(
            os = System.getProperty("os.name").orEmpty(),
            stateAtOpen = stateAtOpen,
            loadingMs = loadingMs,
            firstFrameMs = firstFrameMs,
            reopenFrameMs = reopenFrameMs,
            externalTreeMs = externalTreeMs,
            externalStatusMs = externalStatusMs,
            inIdeTreeMs = inIdeTreeMs,
            inIdeStatusMs = inIdeStatusMs,
            inIdePanelMs = inIdePanelMs,
            expectedArea = expectedArea,
            expectedSelection = expectedSelection,
            restoredArea = restored?.area.orEmpty(),
            restoredSelection = restored?.selection.orEmpty(),
            restoreFrameMs = restoreFrameMs,
            themes = themes,
            files = changes,
            notes = notes,
        )
    }

    private fun themes(): List<ThemeRecord> {
        val manager = LafManager.getInstance()
        val infos = onEdt { manager.installedThemes.toList() }
        val names = infos.map { it.name }
        notes.add("installed themes: $names")
        val current = onEdt { manager.currentUIThemeLookAndFeel.name }
        return SmokeThemes.order(current).map { wanted ->
            val index = SmokeThemes.pick(names, wanted.name)
            if (index < 0) {
                return@map missingTheme(wanted)
            }
            val mark = scripts.mark()
            val start = System.nanoTime()
            onEdt {
                manager.setCurrentLookAndFeel(infos[index], false)
                manager.updateUI()
            }
            val ms = eventMs(scripts, mark, start, THEME_WAIT_MS)
            Thread.sleep(SETTLE_MILLISECONDS)
            val observed = scripts.after(mark).mapNotNull { it.second }.map { ThemeScriptReader.read(it) }
            val last = observed.lastOrNull()
            ThemeRecord(
                wanted = wanted.name,
                found = names[index],
                expectedBodyClass = wanted.bodyClass,
                bodyClass = last?.bodyClass.orEmpty(),
                ms = ms,
                scripts = observed.size,
                incompleteScripts = observed.count { !it.complete(ThemeMapping.names) },
                missingVariables = last?.missing(ThemeMapping.names) ?: ThemeMapping.names.sorted(),
                contrast = Contrast.check(last?.variables ?: emptyMap()),
            )
        }
    }

    private fun missingTheme(wanted: ThemeWant): ThemeRecord =
        ThemeRecord(
            wanted = wanted.name,
            found = "",
            expectedBodyClass = wanted.bodyClass,
            bodyClass = "",
            ms = -1L,
            scripts = 0,
            incompleteScripts = 0,
            missingVariables = emptyList(),
            contrast = ContrastReport(0, emptyList(), emptyList()),
        )

    private fun specNode(): SpecNode {
        val view = checkNotNull(SpecTreeMapping.parse(service.host.tree.value.orEmpty())) { "the tree payload is not readable" }
        val specs = view.groups.flatMap { it.children }.filter { !it.step && !it.plan && !it.map }
        return specs.firstOrNull { it.stem.startsWith("0015-") } ?: checkNotNull(specs.firstOrNull()) { "the tree has no spec row" }
    }

    private fun invoke(command: String, args: String) {
        val runtime = checkNotNull(service.runtime) { "the project service has no runtime" }
        runtime.invoke(command, args).get(INVOKE_WAIT_SECONDS, TimeUnit.SECONDS)
    }

    private fun awaitShell(area: String, selection: String, timeoutMs: Long) {
        val deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(timeoutMs)
        while (System.nanoTime() < deadline) {
            val facts = frames.after(0).mapNotNull { PanelFrames.shell(it.second) }.lastOrNull()
            if (facts != null && facts.area == area && facts.selection == selection) {
                return
            }
            Thread.sleep(POLL_MILLISECONDS)
        }
        notes.add("no shell frame with area $area and selection $selection within $timeoutMs ms")
    }

    private fun awaitReady() {
        val ready = CountDownLatch(1)
        val remove = service.state.onChange { if (it != CoreState.Loading) ready.countDown() }
        try {
            if (service.state.value != CoreState.Loading) {
                ready.countDown()
            }
            check(ready.await(READY_WAIT_MS, TimeUnit.MILLISECONDS)) { "the core was not ready within $READY_WAIT_MS ms" }
            check(service.state.value == CoreState.Ready) { "the core state is ${service.state.value}" }
        } finally {
            remove()
        }
    }

    private fun frameMs(mark: Int, start: Long, timeoutMs: Long, types: Set<String> = SHELL): Long {
        val deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(timeoutMs)
        while (true) {
            val hit = frames.after(mark).firstOrNull { PanelFrames.type(it.second) in types }
            if (hit != null) {
                return Budgets.elapsedMs(start, hit.first)
            }
            if (System.nanoTime() >= deadline) {
                return -1L
            }
            Thread.sleep(POLL_MILLISECONDS)
        }
    }

    private fun eventMs(events: Events<String?>, mark: Int, start: Long, timeoutMs: Long): Long {
        val deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(timeoutMs)
        while (true) {
            val hit = events.after(mark).firstOrNull()
            if (hit != null) {
                return Budgets.elapsedMs(start, hit.first)
            }
            if (System.nanoTime() >= deadline) {
                return -1L
            }
            Thread.sleep(POLL_MILLISECONDS)
        }
    }

    private fun pollMs(start: Long, timeoutMs: Long, condition: () -> Boolean): Long {
        val deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(timeoutMs)
        while (true) {
            if (condition()) {
                return Budgets.elapsedMs(start, System.nanoTime())
            }
            if (System.nanoTime() >= deadline) {
                return -1L
            }
            Thread.sleep(POLL_MILLISECONDS)
        }
    }

    private fun openTab() {
        onEdt { FileEditorManager.getInstance(project).openFile(service.studioFile, true) }
    }

    private fun closeTab() {
        onEdt { FileEditorManager.getInstance(project).closeFile(service.studioFile) }
        val closed = pollMs(System.nanoTime(), CLOSE_WAIT_MS) { onEdt { !FileEditorManager.getInstance(project).isFileOpen(service.studioFile) } }
        check(closed >= 0) { "the Studio tab did not close" }
        settle()
    }

    private fun loadingShown(): Boolean =
        FileEditorManager.getInstance(project).getEditors(service.studioFile).any { containsLoading(it.component) }

    private fun containsLoading(component: Component): Boolean =
        component is JBLoadingPanel || (component is Container && component.components.any { containsLoading(it) })

    private fun settle() {
        Thread.sleep(SETTLE_MILLISECONDS)
    }

    private fun <T> onEdt(block: () -> T): T {
        val holder = AtomicReference<Result<T>>()
        ApplicationManager.getApplication().invokeAndWait { holder.set(runCatching(block)) }
        return holder.get().getOrThrow()
    }

    companion object {
        const val PROBE_NAME = "smoke"
        const val REPORT_FILE = "smoke.json"
        const val ERROR_FILE = "probe-error.txt"
        private val SHELL = setOf("shell")
        private val PANEL_UPDATES = setOf("shell", "board", "overview", "detail")
        private const val LOADING_WAIT_MS = 10_000L
        private const val READY_WAIT_MS = 120_000L
        private const val FRAME_WAIT_MS = 30_000L
        private const val EXTERNAL_WAIT_MS = 20_000L
        private const val EXTRA_WAIT_MS = 3_000L
        private const val SELECT_WAIT_MS = 10_000L
        private const val THEME_WAIT_MS = 10_000L
        private const val CLOSE_WAIT_MS = 10_000L
        private const val INVOKE_WAIT_SECONDS = 30L
        private const val POLL_MILLISECONDS = 10L
        private const val SETTLE_MILLISECONDS = 700L
    }
}

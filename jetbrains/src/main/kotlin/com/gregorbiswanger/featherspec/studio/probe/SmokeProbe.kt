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
import com.gregorbiswanger.featherspec.studio.panel.LoadingPlaceholder
import java.awt.Component
import java.awt.Container
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.atomic.AtomicReference

private class Events<T> {
    private val items = CopyOnWriteArrayList<Pair<Long, T>>()

    fun add(value: T) {
        items.add(System.nanoTime() to value)
    }

    fun mark(): Int = items.size

    fun after(mark: Int): List<Pair<Long, T>> = items.drop(mark)
}

/** Asks the event thread for an answer again and again and keeps how long each answer took, from the open on. */
private class EdtSampler(private val stalls: EdtStalls) {
    private val origin = AtomicLong(0L)
    private val running = AtomicBoolean(true)
    private val thread = Thread({ loop() }, "FeatherSpec smoke EDT sampler")

    fun start() {
        thread.isDaemon = true
        thread.start()
    }

    fun opened(nanos: Long) {
        origin.set(nanos)
    }

    fun stop() {
        running.set(false)
        thread.join(STOP_WAIT_MS)
    }

    private fun loop() {
        while (running.get()) {
            val asked = System.nanoTime()
            val answeredAt = AtomicLong(0L)
            val answered = CountDownLatch(1)
            ApplicationManager.getApplication().invokeLater {
                answeredAt.set(System.nanoTime())
                answered.countDown()
            }
            val arrived = answered.await(ANSWER_WAIT_MS, TimeUnit.MILLISECONDS)
            val start = origin.get()
            if (start != 0L && asked >= start) {
                val stall = if (arrived) Budgets.elapsedMs(asked, answeredAt.get()) else ANSWER_WAIT_MS
                stalls.record(Budgets.elapsedMs(start, asked), stall)
            }
            Thread.sleep(SAMPLE_PAUSE_MS)
        }
    }

    private companion object {
        const val ANSWER_WAIT_MS = 60_000L
        const val STOP_WAIT_MS = 5_000L
        const val SAMPLE_PAUSE_MS = 5L
    }
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
        val firstStart = System.nanoTime()
        val stalls = EdtStalls()
        val sampler = EdtSampler(stalls)
        SmokeTrace.arm()
        sampler.start()
        val (opened, loadingMs) = try {
            val shown = onEdt {
                val start = System.nanoTime()
                sampler.opened(start)
                FileEditorManager.getInstance(project).openFile(service.studioFile, true)
                val state = NoJcefState.of(service.state.value)
                Triple(state, start, loadingShown())
            }
            val ms = if (shown.third) {
                Budgets.elapsedMs(shown.second, System.nanoTime())
            } else {
                pollMs(shown.second, LOADING_WAIT_MS) { onEdt { loadingShown() } }
            }
            awaitReady()
            shown to ms
        } finally {
            sampler.stop()
            SmokeTrace.disarm()
        }
        val stateAtOpen = opened.first
        val trace = OpenTrace.of(opened.second, SmokeTrace.editorNanos(), SmokeTrace.placeholderNanos(), stalls)
        val firstFrameMs = frameMs(firstMark, firstStart, READY_WAIT_MS)
        check(firstFrameMs >= 0) { "no panel frame arrived after the core was ready" }
        settle()

        val reopenFrameSamples = (0 until SmokeBudgets.FRAME_SAMPLES).map {
            closeTab()
            val reopenMark = frames.mark()
            val reopenStart = openTab()
            frameMs(reopenMark, reopenStart, FRAME_WAIT_MS).also { settle() }
        }
        check(SmokeReport.best(reopenFrameSamples) >= 0) { "no panel frame arrived after reopening the tab: $reopenFrameSamples" }

        closeTab()
        val externalStatusBefore = service.host.status.value
        val externalTreeMark = trees.mark()
        val externalStatusMark = statuses.mark()
        val externalStart = System.nanoTime()
        Files.writeString(Path.of(base, ".specs", "backlog", "0099-smoke-ext.md"), SmokeFiles.EXTERNAL_TEXT)
        val externalSpec = Path.of(base, SmokeFiles.EDITED)
        Files.writeString(externalSpec, SmokeFiles.parkStatus(Files.readString(externalSpec)))
        val externalTreeMs = eventMs(trees, externalTreeMark, externalStart, EXTERNAL_WAIT_MS)
        val externalStatusMs = eventMs(statuses, externalStatusMark, externalStart, EXTERNAL_WAIT_MS) { it != externalStatusBefore }

        val editMark = frames.mark()
        val editOpenStart = System.nanoTime()
        openTab()
        check(frameMs(editMark, editOpenStart, FRAME_WAIT_MS) >= 0) { "no panel frame arrived before the in-IDE change" }
        settle()
        val file = LocalFileSystem.getInstance().refreshAndFindFileByPath("$base/${SmokeFiles.EDITED}")
        checkNotNull(file) { "the IDE cannot find ${SmokeFiles.EDITED}" }
        // The external write above can still be missing from the VFS cache (seen on Windows): read the disk, then
        // refresh the file synchronously so the in-IDE save below starts from what is on disk.
        val edited = SmokeFiles.appendToTitle(SmokeFiles.resumeStatus(Files.readString(Path.of(base, SmokeFiles.EDITED))))
        onEdt { file.refresh(false, false) }
        val inIdeStatusBefore = service.host.status.value
        val inIdeTreeMark = trees.mark()
        val inIdeStatusMark = statuses.mark()
        val inIdeFrameMark = frames.mark()
        val inIdeStart = System.nanoTime()
        onEdt { ApplicationManager.getApplication().runWriteAction { VfsUtil.saveText(file, edited) } }
        val inIdeTreeMs = eventMs(trees, inIdeTreeMark, inIdeStart, EXTERNAL_WAIT_MS)
        val inIdePanelMs = frameMs(inIdeFrameMark, inIdeStart, EXTERNAL_WAIT_MS, PANEL_UPDATES)
        val inIdeStatusMs = eventMs(statuses, inIdeStatusMark, inIdeStart, EXTRA_WAIT_MS) { it != inIdeStatusBefore }

        val expectedArea = "board"
        val node = specNode()
        val expectedSelection = node.stem
        invoke("open", "{\"via\":\"area\",\"area\":\"$expectedArea\"}")
        invoke("tree.select", node.rowArgs())
        awaitShell(expectedArea, expectedSelection, SELECT_WAIT_MS)
        settle()
        val restoreFrameSamples = ArrayList<Long>()
        val restoredFacts = ArrayList<ShellFacts?>()
        repeat(SmokeBudgets.FRAME_SAMPLES) {
            closeTab()
            val restoreMark = frames.mark()
            val restoreStart = openTab()
            restoreFrameSamples.add(frameMs(restoreMark, restoreStart, FRAME_WAIT_MS))
            restoredFacts.add(frames.after(restoreMark).firstNotNullOfOrNull { PanelFrames.shell(it.second) })
            settle()
        }
        val restored = restoredFacts.firstOrNull { it == null || it.area != expectedArea || it.selection != expectedSelection } ?: restoredFacts.last()

        val themes = themes()

        val changes = SmokeFiles.diff(before, SmokeFiles.snapshot(Path.of(base)))
        return SmokeReport(
            os = System.getProperty("os.name").orEmpty(),
            stateAtOpen = stateAtOpen,
            loadingMs = loadingMs,
            firstFrameMs = firstFrameMs,
            reopenFrameSamples = reopenFrameSamples,
            externalTreeMs = externalTreeMs,
            externalStatusMs = externalStatusMs,
            inIdeTreeMs = inIdeTreeMs,
            inIdeStatusMs = inIdeStatusMs,
            inIdePanelMs = inIdePanelMs,
            expectedArea = expectedArea,
            expectedSelection = expectedSelection,
            restoredArea = restored?.area.orEmpty(),
            restoredSelection = restored?.selection.orEmpty(),
            restoreFrameSamples = restoreFrameSamples,
            themes = themes,
            files = changes,
            notes = notes,
            trace = trace,
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
            val ms = eventMs(scripts, mark, start, THEME_WAIT_MS) { script ->
                script != null && ThemeScriptReader.read(script).bodyClass == wanted.bodyClass
            }
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
        val payload = service.host.tree.value.orEmpty()
        val view = checkNotNull(SpecTreeMapping.parse(payload)) { "the tree payload is not readable: ${payload.take(300)}" }
        val specs = view.groups.flatMap { it.children }
        return specs.firstOrNull { it.stem.startsWith("0015-") } ?: checkNotNull(specs.firstOrNull()) {
            "the tree has no spec row: groups=${view.groups.map { it.label + "/" + it.children.size }} payload=${payload.take(300)}"
        }
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

    private fun eventMs(events: Events<String?>, mark: Int, start: Long, timeoutMs: Long, accept: (String?) -> Boolean = { true }): Long {
        val deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(timeoutMs)
        while (true) {
            val hit = events.after(mark).firstOrNull { accept(it.second) }
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

    private fun openTab(): Long = onEdt {
        val start = System.nanoTime()
        FileEditorManager.getInstance(project).openFile(service.studioFile, true)
        start
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
        component is LoadingPlaceholder || (component is Container && component.components.any { containsLoading(it) })

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

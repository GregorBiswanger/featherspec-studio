package com.gregorbiswanger.featherspec.studio.panel

import com.gregorbiswanger.featherspec.studio.HostTexts
import com.gregorbiswanger.featherspec.studio.StudioProjectService
import com.gregorbiswanger.featherspec.studio.runtime.CORE_ORIGIN
import com.gregorbiswanger.featherspec.studio.runtime.CoreState
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorState
import com.intellij.openapi.fileEditor.FileEditorStateLevel
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.util.UserDataHolderBase
import com.intellij.ui.components.JBPanelWithEmptyText
import com.intellij.ui.SimpleTextAttributes
import com.gregorbiswanger.featherspec.studio.probe.OpenMeasure
import com.gregorbiswanger.featherspec.studio.probe.OpenTimingProbe
import com.gregorbiswanger.featherspec.studio.probe.PanelFrames
import java.awt.BorderLayout
import java.awt.event.ActionListener
import java.beans.PropertyChangeListener
import java.util.UUID
import com.intellij.openapi.vfs.VirtualFile
import javax.swing.JComponent
import javax.swing.JPanel
import javax.swing.OverlayLayout

class StudioEditor(private val service: StudioProjectService) : UserDataHolderBase(), FileEditor {
    private val measure: OpenMeasure? = OpenTimingProbe.begin(service)
    private val holder: JPanel = if (measure == null) JPanel(BorderLayout()) else FirstPaintPanel { contentPainted() }
    private val lifecycle = PanelLifecycle()
    private val removers = ArrayList<() -> Unit>()
    private var shown: PanelView? = null
    private var localFailure: PanelView.Failed? = null
    private val cover = LoadingCover()
    private val browserStart = DeferredStart { ApplicationManager.getApplication().invokeLater(it) }
    private var stack: JPanel? = null
    private var placeholder: LoadingPlaceholder? = null
    private var panel: PanelBrowser? = null
    private var resumed = false
    private var disposed = false

    init {
        removers.add(service.state.onChange { runLater { render() } })
        removers.add(service.reloadRequests.onChange { runLater { reload() } })
        render()
    }

    private fun runLater(block: () -> Unit) {
        ApplicationManager.getApplication().invokeLater { block() }
    }

    private fun render() {
        if (disposed) {
            return
        }
        val state = service.state.value
        val view = localFailure ?: PanelViews.of(state)
        if (view != shown) {
            shown = view
            show(view)
        }
        if (lifecycle.stateChanged(state) == PanelStep.OPENED) {
            service.runtime?.dispatch("panelOpened", PanelMessages.openedPayload(resumed))
        }
    }

    private fun show(view: PanelView) {
        browserStart.cancel()
        cover.lift()
        stack = null
        holder.removeAll()
        when (view) {
            PanelView.Loading -> holder.add(LoadingPlaceholder(), BorderLayout.CENTER)
            PanelView.Browser -> showBrowser()
            is PanelView.Failed -> holder.add(failedPanel(view), BorderLayout.CENTER)
            is PanelView.Unavailable -> holder.add(textPanel(PanelViews.text(view).orEmpty()), BorderLayout.CENTER)
        }
        holder.revalidate()
        holder.repaint()
    }

    private fun contentPainted() {
        val timed = measure ?: return
        if (timed.done) {
            return
        }
        val current = shown ?: return
        val visible = PanelViews.contentVisible(current, cover.covering)
        if (visible) {
            OpenTimingProbe.contentShown(timed)
        }
    }

    private fun frameShown(payload: String) {
        val timed = measure ?: return
        if (!timed.done && PanelFrames.type(payload) == "shell") {
            OpenTimingProbe.contentShown(timed)
        }
    }

    private fun liftCover(payload: String) {
        if (cover.frame(PanelFrames.type(payload))) {
            runLater { removePlaceholder() }
        }
    }

    private fun removePlaceholder() {
        val covered = stack ?: return
        placeholder?.let { covered.remove(it) }
        placeholder = null
        stack = null
        covered.revalidate()
        covered.repaint()
    }

    private fun textPanel(text: String): JBPanelWithEmptyText = JBPanelWithEmptyText().withEmptyText(text)

    private fun failedPanel(view: PanelView.Failed): JBPanelWithEmptyText {
        val panel = textPanel(PanelViews.text(view).orEmpty())
        panel.emptyText.appendLine(
            HostTexts.SHOW_OUTPUT,
            SimpleTextAttributes.LINK_ATTRIBUTES,
            ActionListener { service.host.emit("showOutput", "null") },
        )
        return panel
    }

    private fun showBrowser() {
        val existing = panel
        if (existing != null) {
            holder.add(existing.browser.component, BorderLayout.CENTER)
            return
        }
        val parked = service.panelParking.take()
        if (parked != null) {
            adopt(parked)
            holder.add(parked.browser.component, BorderLayout.CENTER)
            return
        }
        val covered = JPanel()
        covered.layout = OverlayLayout(covered)
        val cap = LoadingPlaceholder()
        covered.add(cap)
        stack = covered
        placeholder = cap
        cover.put()
        holder.add(covered, BorderLayout.CENTER)
        browserStart.request { startBrowser(covered) }
    }

    private fun startBrowser(covered: JPanel) {
        if (disposed || stack !== covered) {
            return
        }
        val created = createBrowser()
        if (created == null) {
            val failure = PanelView.Failed("The FeatherSpec panel browser could not be created")
            localFailure = failure
            render()
            return
        }
        covered.add(created.browser.component)
        covered.revalidate()
        covered.repaint()
        loadPage()
    }

    private fun adopt(parked: PanelBrowser) {
        panel = parked
        resumed = true
        lifecycle.adopted()
        parked.attach()
        subscribe(parked)
    }

    private fun createBrowser(): PanelBrowser? {
        val client = service.client ?: return null
        val created = PanelBrowser.create(service, client) ?: return null
        panel = created
        subscribe(created)
        return created
    }

    private fun subscribe(shown: PanelBrowser) {
        removers.add(
            service.host.subscribe("panel") { payload ->
                shown.post(payload)
                frameShown(payload)
                liftCover(payload)
            },
        )
    }

    private fun loadPage() {
        val runtime = service.runtime ?: return
        val loading = panel ?: return
        loading.pageLoading()
        val nonce = UUID.randomUUID().toString().replace("-", "")
        val reloaded = lifecycle.nextLoadIsReload()
        val bodyClass = loading.bodyClass()
        val request = PanelMessages.htmlArgs(nonce, CORE_ORIGIN, reloaded)
        runtime.invoke("panelHtml", request).whenComplete { reply: String?, failure: Throwable? ->
            try {
                if (failure != null || reply == null) {
                    throw IllegalStateException(failure?.message ?: "panelHtml gave no answer")
                }
                val page = PanelShim.insert(PanelMessages.htmlFromReply(reply), nonce, bodyClass, loading.postRequest)
                loading.html = page
                runLater { navigate() }
            } catch (problem: Exception) {
                thisLogger().warn("The FeatherSpec panel page could not be built", problem)
                runLater { fail(problem) }
            }
        }
    }

    private fun navigate() {
        if (!disposed) {
            panel?.navigate()
        }
    }

    private fun fail(problem: Exception) {
        if (disposed) {
            return
        }
        localFailure = PanelView.Failed(problem.message ?: problem.javaClass.simpleName)
        render()
    }

    private fun reload() {
        if (disposed || panel == null) {
            return
        }
        localFailure = null
        render()
        loadPage()
    }

    private fun release() {
        val current = panel ?: return
        panel = null
        val ready = service.state.value == CoreState.Ready
        if (ParkRule.parkable(ready, localFailure != null, current.shellSeen, !current.alive)) {
            current.detach()
            if (service.panelParking.park(current)) {
                return
            }
        }
        if (!Disposer.isDisposed(current)) {
            Disposer.dispose(current)
        }
    }

    override fun getComponent(): JComponent = holder

    override fun getPreferredFocusedComponent(): JComponent? = holder

    override fun getName(): String = StudioFile.NAME

    override fun getFile(): VirtualFile = service.studioFile

    override fun getState(level: FileEditorStateLevel): FileEditorState = FileEditorState.INSTANCE

    override fun setState(state: FileEditorState) {
    }

    override fun isModified(): Boolean = false

    override fun isValid(): Boolean = true

    override fun addPropertyChangeListener(listener: PropertyChangeListener) {
    }

    override fun removePropertyChangeListener(listener: PropertyChangeListener) {
    }

    override fun dispose() {
        disposed = true
        browserStart.cancel()
        OpenTimingProbe.closed(service, measure)
        removers.forEach { it() }
        removers.clear()
        release()
        if (lifecycle.dispose() == PanelStep.CLOSED) {
            service.runtime?.dispatch("panelClosed", "null")
        }
    }
}

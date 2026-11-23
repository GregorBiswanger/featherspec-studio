package com.gregorbiswanger.featherspec.studio.panel

import com.gregorbiswanger.featherspec.studio.HostTexts
import com.gregorbiswanger.featherspec.studio.StudioProjectService
import com.gregorbiswanger.featherspec.studio.runtime.CORE_ORIGIN
import com.gregorbiswanger.featherspec.studio.theme.ThemeBridge
import com.gregorbiswanger.featherspec.studio.theme.ThemeKind
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorState
import com.intellij.openapi.fileEditor.FileEditorStateLevel
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.util.UserDataHolderBase
import com.intellij.ui.components.JBLoadingPanel
import com.intellij.ui.components.JBPanelWithEmptyText
import com.intellij.ui.SimpleTextAttributes
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefJSQuery
import com.gregorbiswanger.featherspec.studio.jcef.PluginRequestHandler
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

private const val PANEL_URL = "$CORE_ORIGIN/index.html"

class StudioEditor(private val service: StudioProjectService) : UserDataHolderBase(), FileEditor {
    private val measure: OpenMeasure? = OpenTimingProbe.begin(service)
    private val holder: JPanel = if (measure == null) JPanel(BorderLayout()) else FirstPaintPanel { contentPainted() }
    private val lifecycle = PanelLifecycle()
    private val removers = ArrayList<() -> Unit>()
    private var shown: PanelView? = null
    private var localFailure: PanelView.Failed? = null
    private var loading: JBLoadingPanel? = null
    private var browser: JBCefBrowser? = null
    private var query: JBCefJSQuery? = null
    private var theme: ThemeBridge? = null
    @Volatile
    private var postRequest = ""
    private var disposed = false

    @Volatile
    private var html = ""

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
            service.runtime?.dispatch("panelOpened", "null")
        }
    }

    private fun show(view: PanelView) {
        loading?.stopLoading()
        holder.removeAll()
        when (view) {
            PanelView.Loading -> holder.add(loadingPanel(), BorderLayout.CENTER)
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
        val visible = when (shown) {
            PanelView.Loading -> loading?.isLoading == true
            PanelView.Browser, null -> false
            else -> true
        }
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

    private fun loadingPanel(): JComponent {
        val panel = JBLoadingPanel(BorderLayout(), this)
        panel.setLoadingText(HostTexts.LOADING)
        panel.startLoading()
        loading = panel
        return panel
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
        val existing = browser
        if (existing != null) {
            holder.add(existing.component, BorderLayout.CENTER)
            return
        }
        val created = createBrowser()
        if (created == null) {
            val failure = PanelView.Failed("The FeatherSpec panel browser could not be created")
            localFailure = failure
            shown = failure
            holder.add(failedPanel(failure), BorderLayout.CENTER)
            return
        }
        holder.add(created.component, BorderLayout.CENTER)
        loadPage()
    }

    private fun createBrowser(): JBCefBrowser? {
        val client = service.client ?: return null
        return try {
            val created = JBCefBrowser.createBuilder().setClient(client).build()
            val jsQuery = JBCefJSQuery.create(created)
            jsQuery.addHandler { raw ->
                PanelMessages.fromPanel(raw)?.let { service.runtime?.dispatch("panelMessage", it) }
                null
            }
            postRequest = jsQuery.inject("request")
            val bridge = ThemeBridge(this) { script ->
                runLater {
                    val current = browser
                    if (current != null) {
                        current.cefBrowser.executeJavaScript(script, CORE_ORIGIN, 0)
                        service.themeScripts.set(script)
                    }
                }
            }
            theme = bridge
            val documents = mapOf<String, () -> String>(
                "index.html" to { html },
                "theme.css" to { bridge.css() },
            )
            client.addRequestHandler(PluginRequestHandler(documents), created.cefBrowser)
            val nudge = RepaintNudge(created).also { it.attach() }
            removers.add(
                service.host.subscribe("panel") { payload ->
                    created.cefBrowser.executeJavaScript(PanelMessages.postScript(payload), CORE_ORIGIN, 0)
                    nudge.nudge()
                    frameShown(payload)
                },
            )
            browser = created
            query = jsQuery
            created
        } catch (failure: Exception) {
            thisLogger().warn("The FeatherSpec panel browser could not be created", failure)
            null
        }
    }

    private fun loadPage() {
        val runtime = service.runtime ?: return
        val nonce = UUID.randomUUID().toString().replace("-", "")
        val reloaded = lifecycle.nextLoadIsReload()
        val bodyClass = currentBodyClass()
        val request = PanelMessages.htmlArgs(nonce, CORE_ORIGIN, reloaded)
        runtime.invoke("panelHtml", request).whenComplete { reply: String?, failure: Throwable? ->
            try {
                if (failure != null || reply == null) {
                    throw IllegalStateException(failure?.message ?: "panelHtml gave no answer")
                }
                val page = PanelShim.insert(PanelMessages.htmlFromReply(reply), nonce, bodyClass, postRequest)
                html = page
                runLater { navigate() }
            } catch (problem: Exception) {
                thisLogger().warn("The FeatherSpec panel page could not be built", problem)
                runLater { fail(problem) }
            }
        }
    }

    private fun navigate() {
        if (!disposed) {
            browser?.loadURL(PANEL_URL)
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
        if (disposed || browser == null) {
            return
        }
        localFailure = null
        render()
        loadPage()
    }

    private fun currentBodyClass(): String = theme?.bodyClass() ?: ThemeKind.LIGHT.bodyClass

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
        OpenTimingProbe.closed(service, measure)
        theme?.dispose()
        theme = null
        removers.forEach { it() }
        removers.clear()
        if (lifecycle.dispose() == PanelStep.CLOSED) {
            service.runtime?.dispatch("panelClosed", "null")
        }
        query?.let { Disposer.dispose(it) }
        browser?.dispose()
        query = null
        browser = null
    }
}

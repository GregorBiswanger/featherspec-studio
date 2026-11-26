package com.gregorbiswanger.featherspec.studio.panel

import com.gregorbiswanger.featherspec.studio.StudioProjectService
import com.gregorbiswanger.featherspec.studio.jcef.JsQueries
import com.gregorbiswanger.featherspec.studio.jcef.PluginRequestHandler
import com.gregorbiswanger.featherspec.studio.probe.PanelFrames
import com.gregorbiswanger.featherspec.studio.runtime.CORE_ORIGIN
import com.gregorbiswanger.featherspec.studio.theme.ThemeBridge
import com.gregorbiswanger.featherspec.studio.theme.ThemeKind
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.util.Disposer
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefClient
import com.intellij.ui.jcef.JBCefJSQuery
import java.util.concurrent.atomic.AtomicBoolean

private const val PANEL_URL = "$CORE_ORIGIN/index.html"

/**
 * The browser of the Studio panel with everything that belongs to its page. It outlives the editor: a closed tab parks it in
 * the project service ([PanelParking]) and the next tab takes it. It is registered under the service, so closing the
 * project or unloading the plugin disposes it wherever it is.
 */
class PanelBrowser private constructor(private val service: StudioProjectService, client: JBCefClient) : Disposable {
    val browser: JBCefBrowser = JBCefBrowser.createBuilder().setClient(client).setCreateImmediately(false).build()
    private lateinit var query: JBCefJSQuery
    private lateinit var theme: ThemeBridge
    private lateinit var nudge: RepaintNudge
    private val disposing = AtomicBoolean(false)

    lateinit var postRequest: String
        private set

    @Volatile
    var html = ""

    @Volatile
    private var attached = true

    @Volatile
    var shellSeen = false
        private set

    @Volatile
    var dead = false
        private set

    init {
        Disposer.register(service, this)
    }

    val alive: Boolean
        get() = !dead && !disposing.get() && !Disposer.isDisposed(browser)

    fun bodyClass(): String = if (::theme.isInitialized) theme.bodyClass() else ThemeKind.LIGHT.bodyClass

    fun attach() {
        attached = true
    }

    fun detach() {
        attached = false
        browser.component.parent?.remove(browser.component)
    }

    fun post(payload: String) {
        if (!alive) {
            return
        }
        browser.cefBrowser.executeJavaScript(PanelMessages.postScript(payload), CORE_ORIGIN, 0)
        nudge.nudge()
        if (PanelFrames.type(payload) == "shell") {
            shellSeen = true
        }
    }

    fun pageLoading() {
        shellSeen = false
    }

    fun navigate() {
        if (alive) {
            browser.loadURL(PANEL_URL)
        }
    }

    override fun dispose() {
        if (!disposing.compareAndSet(false, true)) {
            return
        }
        dead = true
        if (::theme.isInitialized) {
            theme.dispose()
        }
        val release = Runnable {
            if (::query.isInitialized && !Disposer.isDisposed(query)) {
                Disposer.dispose(query)
            }
            if (!Disposer.isDisposed(browser)) {
                browser.dispose()
            }
        }
        val app = ApplicationManager.getApplication()
        if (app.isDispatchThread) {
            release.run()
        } else {
            app.invokeLater(release)
        }
    }

    private fun wire(client: JBCefClient) {
        query = JsQueries.create(browser)
        query.addHandler { raw ->
            if (attached) {
                PanelMessages.fromPanel(raw)?.let { service.runtime?.dispatch("panelMessage", it) }
            }
            null
        }
        postRequest = query.inject("request")
        theme = ThemeBridge(this) { script ->
            val apply = Runnable {
                if (alive) {
                    browser.cefBrowser.executeJavaScript(script, CORE_ORIGIN, 0)
                    service.themeScripts.set(script)
                }
            }
            // On the EDT already (the theme listener): run now, not behind the IDE's follow-up work of the switch.
            val app = ApplicationManager.getApplication()
            if (app.isDispatchThread) apply.run() else app.invokeLater(apply)
        }
        val documents = mapOf<String, () -> String>(
            "index.html" to { html },
            "theme.css" to { theme.css() },
        )
        client.addRequestHandler(PluginRequestHandler(documents) { dead = true }, browser.cefBrowser)
        nudge = RepaintNudge(browser).also { it.attach() }
    }

    companion object {
        fun create(service: StudioProjectService, client: JBCefClient): PanelBrowser? {
            val panel = try {
                PanelBrowser(service, client)
            } catch (failure: Exception) {
                thisLogger().warn("The FeatherSpec panel browser could not be created", failure)
                return null
            }
            return try {
                panel.wire(client)
                panel
            } catch (failure: Exception) {
                thisLogger().warn("The FeatherSpec panel browser could not be created", failure)
                Disposer.dispose(panel)
                null
            }
        }
    }
}

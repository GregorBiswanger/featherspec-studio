package com.gregorbiswanger.featherspec.studio.panel

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.gregorbiswanger.featherspec.studio.HostTexts
import com.gregorbiswanger.featherspec.studio.runtime.CoreState
import com.gregorbiswanger.featherspec.studio.runtime.UnavailableKind

sealed interface PanelView {
    data object Loading : PanelView
    data object Browser : PanelView
    data class Failed(val reason: String) : PanelView
    data class Unavailable(val kind: UnavailableKind) : PanelView
}

object PanelViews {
    fun of(state: CoreState): PanelView = when (state) {
        CoreState.Loading -> PanelView.Loading
        CoreState.Ready -> PanelView.Browser
        is CoreState.Failed -> PanelView.Failed(state.reason)
        is CoreState.Unavailable -> PanelView.Unavailable(state.kind)
    }

    fun contentVisible(view: PanelView, covering: Boolean): Boolean = when (view) {
        PanelView.Loading -> true
        PanelView.Browser -> covering
        else -> true
    }

    fun text(view: PanelView): String? = when (view) {
        PanelView.Loading -> HostTexts.LOADING
        PanelView.Browser -> null
        is PanelView.Failed -> HostTexts.S5
        is PanelView.Unavailable -> when (view.kind) {
            UnavailableKind.UNSUPPORTED -> HostTexts.JCEF_UNSUPPORTED
            UnavailableKind.SUSPENDED -> HostTexts.JCEF_SUSPENDED
        }
    }
}

enum class PanelStep { OPENED, CLOSED }

class PanelLifecycle {
    private var opened = false
    private var disposed = false
    private var loads = 0

    fun stateChanged(state: CoreState): PanelStep? {
        if (disposed || opened || state != CoreState.Ready) {
            return null
        }
        opened = true
        return PanelStep.OPENED
    }

    fun nextLoadIsReload(): Boolean {
        val reload = loads > 0
        loads += 1
        return reload
    }

    fun adopted() {
        loads += 1
    }

    fun dispose(): PanelStep? {
        if (disposed) {
            return null
        }
        disposed = true
        return if (opened) PanelStep.CLOSED else null
    }
}

object PanelMessages {
    fun fromPanel(raw: String): String? {
        val parsed = try {
            JsonParser.parseString(raw)
        } catch (failure: RuntimeException) {
            return null
        }
        return if (parsed.isJsonObject) raw else null
    }

    fun openedPayload(resumed: Boolean): String {
        if (!resumed) {
            return "null"
        }
        val args = JsonObject()
        args.addProperty("resumed", true)
        return args.toString()
    }

    fun postScript(envelopeJson: String): String = "window.postMessage($envelopeJson,'*');"

    fun htmlArgs(nonce: String, origin: String, reloaded: Boolean): String {
        val args = JsonObject()
        args.addProperty("nonce", nonce)
        args.addProperty("cspSource", origin)
        args.addProperty("scriptUri", "$origin/main.js")
        args.addProperty("styleUri", "$origin/main.css")
        args.addProperty("reloaded", reloaded)
        return args.toString()
    }

    fun htmlFromReply(ok: String): String {
        val parsed = JsonParser.parseString(ok)
        require(parsed.isJsonPrimitive && parsed.asJsonPrimitive.isString) { "panelHtml did not answer a string" }
        return parsed.asString
    }
}

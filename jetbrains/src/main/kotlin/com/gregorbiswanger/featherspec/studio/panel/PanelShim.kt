package com.gregorbiswanger.featherspec.studio.panel

import com.gregorbiswanger.featherspec.studio.runtime.BridgeFrames
import com.gregorbiswanger.featherspec.studio.runtime.CORE_ORIGIN

object PanelShim {
    const val ROOT = "<div id=\"root\"></div>"

    private const val STYLE_LINK = "<link rel=\"stylesheet\""

    fun themeLink(): String = "<link rel=\"stylesheet\" href=\"$CORE_ORIGIN/theme.css\">"

    fun script(nonce: String, bodyClass: String, postRequest: String): String =
        "<script nonce=\"$nonce\">(function () { " +
            "var post = function (request) { $postRequest }; " +
            "window.acquireVsCodeApi = function () { return { postMessage: function (message) { post(JSON.stringify(message)); } }; }; " +
            "document.body.className = ${BridgeFrames.jsString(bodyClass)}; " +
            "})();</script>"

    fun bodyClass(themeId: String, themeName: String, isDark: Boolean): String = when {
        themeId.contains("HighContrast", ignoreCase = true) || themeName.contains("contrast", ignoreCase = true) -> "vscode-high-contrast"
        isDark -> "vscode-dark"
        else -> "vscode-light"
    }

    fun insert(html: String, nonce: String, bodyClass: String, postRequest: String): String {
        val withTheme = insertThemeLink(html)
        val rootAt = withTheme.indexOf(ROOT)
        require(rootAt >= 0) { "The panel html has no root element" }
        val afterRoot = rootAt + ROOT.length
        return withTheme.substring(0, afterRoot) + "\n" + script(nonce, bodyClass, postRequest) + withTheme.substring(afterRoot)
    }

    private fun insertThemeLink(html: String): String {
        val rootAt = html.indexOf(ROOT)
        val styleAt = html.indexOf(STYLE_LINK)
        val headEnd = html.indexOf("</head>")
        val at = if (styleAt in 0 until rootAt) styleAt else headEnd
        require(at >= 0) { "The panel html has no head" }
        return html.substring(0, at) + themeLink() + "\n" + html.substring(at)
    }
}

package com.gregorbiswanger.featherspec.studio.jcef

import com.intellij.ui.jcef.JBCefBrowserBase
import com.intellij.ui.jcef.JBCefJSQuery

object JsQueries {
    fun create(browser: JBCefBrowserBase): JBCefJSQuery = JBCefJSQuery.create(browser)
}

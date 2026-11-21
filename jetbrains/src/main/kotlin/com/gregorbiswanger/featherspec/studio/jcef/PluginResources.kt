package com.gregorbiswanger.featherspec.studio.jcef

import com.gregorbiswanger.featherspec.studio.runtime.CORE_ORIGIN

data class Resource(val path: String, val mimeType: String)

object PluginResources {
    private val allowed: Map<String, Resource> = mapOf(
        "core.html" to Resource("core.html", "text/html"),
        "core.js" to Resource("embedded/core.js", "text/javascript"),
        "index.html" to Resource("index.html", "text/html"),
        "main.js" to Resource("webview/main.js", "text/javascript"),
        "main.css" to Resource("webview/main.css", "text/css"),
        "theme.css" to Resource("theme.css", "text/css"),
    )

    val documentPaths: Set<String> = setOf("core.html", "index.html", "theme.css")

    fun resolve(url: String): Resource? {
        val prefix = "$CORE_ORIGIN/"
        if (!url.startsWith(prefix)) {
            return null
        }
        return allowed[url.substring(prefix.length)]
    }
}

package com.gregorbiswanger.featherspec.studio.jcef

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class PluginResourcesTest {
    @Test
    fun `AC-015 the core page resolves to core html`() {
        assertEquals(Resource("core.html", "text/html"), PluginResources.resolve("https://studio.featherspec.invalid/core.html"))
    }

    @Test
    fun `AC-015 the core script resolves to the embedded bundle`() {
        assertEquals(Resource("embedded/core.js", "text/javascript"), PluginResources.resolve("https://studio.featherspec.invalid/core.js"))
    }

    @Test
    fun `AC-015 the panel page and its bundle resolve`() {
        val origin = "https://studio.featherspec.invalid"
        assertEquals(Resource("index.html", "text/html"), PluginResources.resolve("$origin/index.html"))
        assertEquals(Resource("webview/main.js", "text/javascript"), PluginResources.resolve("$origin/main.js"))
        assertEquals(Resource("webview/main.css", "text/css"), PluginResources.resolve("$origin/main.css"))
        assertEquals(Resource("theme.css", "text/css"), PluginResources.resolve("$origin/theme.css"))
    }

    @Test
    fun `AC-015 exactly the generated pages are documents`() {
        assertEquals(setOf("core.html", "index.html", "theme.css"), PluginResources.documentPaths)
    }

    @Test
    fun `AC-015 every other url is refused`() {
        val refused = listOf(
            "",
            "core.js",
            "/core.js",
            "file:///c%3A/projects/test/core.js",
            "http://studio.featherspec.invalid/core.js",
            "HTTPS://studio.featherspec.invalid/core.js",
            "https://studio.featherspec.invalid/../core.js",
            "https://studio.featherspec.invalid/embedded/../core.js",
            "https://studio.featherspec.invalid/%2e%2e/core.js",
            "https://studio.featherspec.invalid/embedded/core.js",
            "https://studio.featherspec.invalid/core.js?x",
            "https://studio.featherspec.invalid/core.js?",
            "https://studio.featherspec.invalid/core.html#a",
            "https://studio.featherspec.invalid/core.js#",
            "https://studio.featherspec.invalid/",
            "https://studio.featherspec.invalid",
            "https://studio.featherspec.invalid//core.js",
            "https://studio.featherspec.invalid/core.jsx",
            "https://studio.featherspec.invalid/CORE.JS",
            "https://other.invalid/core.js",
            "https://studio.featherspec.invalid.evil.example/core.js",
            "https://studio.featherspec.invalid@evil.example/core.js",
            "https://studio.featherspec.invalid:8443/core.js",
            "data:text/html,<script>1</script>",
            "about:blank",
            "https://studio.featherspec.invalid/webview/main.js",
            "https://studio.featherspec.invalid/webview/main.css",
            "https://studio.featherspec.invalid/main.js?x",
            "https://studio.featherspec.invalid/main.js#x",
            "https://studio.featherspec.invalid/main.js/",
            "https://studio.featherspec.invalid/main.js.map",
            "https://studio.featherspec.invalid/main.css?",
            "https://studio.featherspec.invalid/index.html?x",
            "https://studio.featherspec.invalid/index.html#x",
            "https://studio.featherspec.invalid/INDEX.HTML",
            "https://studio.featherspec.invalid/theme.css/../core.js",
            "https://studio.featherspec.invalid/theme.css?v=1",
            "https://studio.featherspec.invalid/embedded/../main.js",
            "https://studio.featherspec.invalid/%2e%2e/main.js",
            "https://studio.featherspec.invalid/main.js%00",
            "http://studio.featherspec.invalid/index.html",
            "https://other.invalid/main.js",
            "https://example.com/main.css",
            "file:///c%3A/projects/test/main.js",
            "file:///c%3A/projects/test/index.html",
            "https://studio.featherspec.invalid@evil.example/index.html",
            "https://studio.featherspec.invalid:8443/main.css",
        )
        for (url in refused) {
            assertNull(PluginResources.resolve(url), url)
        }
    }
}

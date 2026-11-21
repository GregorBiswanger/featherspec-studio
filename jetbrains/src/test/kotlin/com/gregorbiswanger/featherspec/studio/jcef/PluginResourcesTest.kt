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
        )
        for (url in refused) {
            assertNull(PluginResources.resolve(url), url)
        }
    }
}

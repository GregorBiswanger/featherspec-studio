package com.gregorbiswanger.featherspec.studio.panel

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

class PanelShimTest {
    private val origin = "https://studio.featherspec.invalid"
    private val nonce = "n0nce"
    private val policy = "default-src 'none'; style-src $origin; script-src 'nonce-$nonce'; img-src $origin data:; font-src $origin"
    private val csp = "<meta http-equiv=\"Content-Security-Policy\" content=\"$policy\">"
    private val html = listOf(
        "<!DOCTYPE html>",
        "<html lang=\"en\">",
        "<head>",
        "<meta charset=\"UTF-8\">",
        csp,
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">",
        "<title>FeatherSpec Studio</title>",
        "<link rel=\"stylesheet\" href=\"$origin/main.css\">",
        "</head>",
        "<body data-reloaded=\"false\" data-test=\"false\" data-host=\"jetbrains\">",
        "<div id=\"root\"></div>",
        "<script nonce=\"$nonce\" src=\"$origin/main.js\"></script>",
        "</body>",
        "</html>",
        "",
    ).joinToString("\n")
    private val post = "window.__post(request);"
    private val result = PanelShim.insert(html, nonce, "vscode-dark", post)

    @Test
    fun `AC-015 the content security policy stays byte identical`() {
        assertTrue(result.contains(csp), result)
        assertEquals(1, Regex("Content-Security-Policy").findAll(result).count())
    }

    @Test
    fun `AC-015 the shim comes right after the root and before the bundle`() {
        val root = result.indexOf("<div id=\"root\"></div>")
        val shim = result.indexOf("<script nonce=\"$nonce\">(function () {")
        val bundle = result.indexOf("<script nonce=\"$nonce\" src=\"$origin/main.js\"></script>")
        assertTrue(root in 0 until shim, result)
        assertTrue(shim < bundle, result)
        assertEquals(root + "<div id=\"root\"></div>".length + 1, shim)
    }

    @Test
    fun `AC-015 the theme link comes before the main style sheet`() {
        val theme = result.indexOf("<link rel=\"stylesheet\" href=\"$origin/theme.css\">")
        val main = result.indexOf("<link rel=\"stylesheet\" href=\"$origin/main.css\">")
        assertTrue(theme in 0 until main, result)
        assertEquals(1, Regex("theme\\.css").findAll(result).count())
    }

    @Test
    fun `AC-014 removing the inserted pieces gives back the original html`() {
        val restored = result
            .replace(PanelShim.themeLink() + "\n", "")
            .replace("\n" + PanelShim.script(nonce, "vscode-dark", post), "")
        assertEquals(html, restored)
    }

    @Test
    fun `AC-014 the shim defines the vscode api over the query and sets the body class`() {
        val script = PanelShim.script(nonce, "vscode-high-contrast", post)
        assertTrue(script.startsWith("<script nonce=\"$nonce\">"), script)
        assertTrue(script.endsWith("</script>"), script)
        assertTrue(script.contains("var post = function (request) { $post };"), script)
        assertTrue(script.contains("window.acquireVsCodeApi = function ()"), script)
        assertTrue(script.contains("post(JSON.stringify(message))"), script)
        assertTrue(script.contains("document.body.className = \"vscode-high-contrast\";"), script)
    }

    @Test
    fun `AC-014 html without a root or a head is refused`() {
        assertThrows<IllegalArgumentException> { PanelShim.insert("<html><head></head><body></body></html>", nonce, "vscode-dark", post) }
        assertThrows<IllegalArgumentException> { PanelShim.insert("<div id=\"root\"></div>", nonce, "vscode-dark", post) }
    }

    @Test
    fun `AC-014 a page without a style sheet gets the theme link at the end of the head`() {
        val bare = "<html><head><title>x</title></head><body><div id=\"root\"></div></body></html>"
        val inserted = PanelShim.insert(bare, nonce, "vscode-light", post)
        assertTrue(inserted.contains("<title>x</title>${PanelShim.themeLink()}\n</head>"), inserted)
    }

    @Test
    fun `AC-027 the body class follows the theme`() {
        assertEquals("vscode-dark", PanelShim.bodyClass("Darcula", "Darcula", true))
        assertEquals("vscode-light", PanelShim.bodyClass("Light", "Light", false))
        assertEquals("vscode-high-contrast", PanelShim.bodyClass("ExperimentalDark HighContrast", "High contrast", true))
        assertEquals("vscode-high-contrast", PanelShim.bodyClass("x", "High Contrast", false))
        assertEquals("vscode-dark", PanelShim.bodyClass("Islands Dark", "Islands Dark", true))
        assertEquals("vscode-light", PanelShim.bodyClass("Islands Light", "Islands Light", false))
    }
}

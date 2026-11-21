package com.gregorbiswanger.featherspec.studio.theme

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.awt.Color
import java.nio.file.Files
import java.nio.file.Path

class ThemeMappingTest {
    private val stylesheet: String = read("webview", "main.css")
    private val used: Set<String> = Regex("--vscode-[A-Za-z0-9-]+").findAll(stylesheet).map { it.value }.toSet()
    private val none: (String) -> Color? = { null }

    @Test
    fun `AC-026 the table covers exactly the variables the stylesheet uses`() {
        assertTrue(used.size >= 59, used.toString())
        assertEquals(emptySet<String>(), used - ThemeMapping.names, "variables without a row")
        assertEquals(emptySet<String>(), ThemeMapping.names - used, "rows without a variable in the stylesheet")
    }

    @Test
    fun `AC-026 a variable has one row only`() {
        val names = ThemeMapping.rows.map { it.cssVar }
        assertEquals(names.size, names.toSet().size)
    }

    @Test
    fun `AC-026 every variable has a non-empty value for an all-null lookup in every kind`() {
        for (kind in ThemeKind.values()) {
            val values = ThemeMapping.variables(none, kind)
            assertEquals(ThemeMapping.names, values.keys, kind.name)
            for ((name, value) in values) {
                assertTrue(value.isNotBlank(), "$name is empty for $kind")
            }
        }
    }

    @Test
    fun `AC-026 every fallback is a hex colour or a keyword`() {
        for (row in ThemeMapping.rows) {
            for (kind in ThemeKind.values()) {
                val text = row.fallback(kind)
                assertTrue(ThemeMapping.parseHex(text) != null || text == "transparent" || text == ThemeMapping.UNSET, "${row.cssVar}: $text")
            }
        }
    }

    @Test
    fun `AC-026 a colour from the IDE wins over the fallback`() {
        val values = ThemeMapping.variables({ key -> if (key == "Label.foreground") Color(0x12, 0x34, 0x56) else null }, ThemeKind.LIGHT)
        assertEquals("#123456", values["--vscode-foreground"])
    }

    @Test
    fun `AC-026 the first key with a colour is used and a fully transparent colour is skipped`() {
        val lookup: (String) -> Color? = { key ->
            when (key) {
                "Link.activeForeground" -> Color(0, 0, 0, 0)
                else -> null
            }
        }
        val values = ThemeMapping.variables(lookup, ThemeKind.DARK)
        assertEquals("#3794ff", values["--vscode-textLink-foreground"])
        val second = ThemeMapping.variables({ key -> if (key == "Button.default.background") Color(0x0a, 0x0b, 0x0c) else null }, ThemeKind.DARK)
        assertEquals("#0a0b0c", second["--vscode-button-background"])
    }

    @Test
    fun `AC-026 a colour with alpha is written as rgba`() {
        assertEquals("rgba(10, 20, 30, 0.502)", ThemeMapping.toCss(Color(10, 20, 30, 128)))
        assertEquals("#0a141e", ThemeMapping.toCss(Color(10, 20, 30)))
    }

    @Test
    fun `AC-026 the contrast variables stay unset outside high contrast and follow the IDE inside it`() {
        val lookup: (String) -> Color? = { Color(1, 2, 3) }
        for (kind in listOf(ThemeKind.LIGHT, ThemeKind.DARK)) {
            val values = ThemeMapping.variables(lookup, kind)
            assertEquals("initial", values["--vscode-contrastBorder"], kind.name)
            assertEquals("initial", values["--vscode-contrastActiveBorder"], kind.name)
            assertEquals("transparent", values["--vscode-button-border"], kind.name)
        }
        val contrast = ThemeMapping.variables(lookup, ThemeKind.HIGH_CONTRAST)
        assertEquals("#010203", contrast["--vscode-contrastBorder"])
        assertEquals("#010203", contrast["--vscode-contrastActiveBorder"])
        val bare = ThemeMapping.variables(none, ThemeKind.HIGH_CONTRAST)
        assertEquals("#6fc3df", bare["--vscode-contrastBorder"])
        assertEquals("#f38518", bare["--vscode-contrastActiveBorder"])
    }

    @Test
    fun `AC-026 fonts come from the IDE and are made safe`() {
        val values = ThemeMapping.variables(none, ThemeKind.DARK, ThemeFonts("Segoe UI", 12, "JetBrains Mono"))
        assertEquals("\"Segoe UI\", system-ui, sans-serif", values[ThemeMapping.FONT_FAMILY])
        assertEquals("12px", values[ThemeMapping.FONT_SIZE])
        assertEquals("\"JetBrains Mono\", monospace", values[ThemeMapping.EDITOR_FONT_FAMILY])
        assertEquals("\"Evilbodyxy\", monospace", ThemeMapping.fontStack("Evil\";}body{x:y", "monospace"))
        assertEquals("monospace", ThemeMapping.fontStack("", "monospace"))
        assertEquals("32px", ThemeMapping.variables(none, ThemeKind.DARK, ThemeFonts("", 99, ""))[ThemeMapping.FONT_SIZE])
        assertEquals("8px", ThemeMapping.variables(none, ThemeKind.DARK, ThemeFonts("", 1, ""))[ThemeMapping.FONT_SIZE])
    }

    @Test
    fun `AC-027 the kind follows the theme`() {
        assertEquals(ThemeKind.LIGHT, ThemeKind.of(false, "ExperimentalLight Light"))
        assertEquals(ThemeKind.DARK, ThemeKind.of(true, "Darcula Darcula"))
        assertEquals(ThemeKind.HIGH_CONTRAST, ThemeKind.of(true, "JetBrainsHighContrastTheme High contrast"))
        assertEquals(ThemeKind.HIGH_CONTRAST, ThemeKind.of(false, "x High Contrast"))
        assertEquals(ThemeKind.LIGHT, ThemeKind.of(false, "Islands Light Islands Light"))
        assertEquals(ThemeKind.DARK, ThemeKind.of(true, "Islands Dark Islands Dark"))
    }

    @Test
    fun `AC-027 the body class names are the three of the webview`() {
        assertEquals("vscode-light", ThemeKind.LIGHT.bodyClass)
        assertEquals("vscode-dark", ThemeKind.DARK.bodyClass)
        assertEquals("vscode-high-contrast", ThemeKind.HIGH_CONTRAST.bodyClass)
        for (kind in ThemeKind.values()) {
            assertTrue(stylesheet.contains(".${kind.bodyClass}"), kind.bodyClass)
        }
    }

    @Test
    fun `AC-029 text pairs reach their contrast for every kind with an all-null lookup`() {
        for (kind in ThemeKind.values()) {
            val values = ThemeMapping.variables(none, kind)
            for (pair in ThemeMapping.contrastPairs) {
                val foreground = ThemeMapping.parseHex(values.getValue(pair.foreground)) ?: parseRgba(values.getValue(pair.foreground))
                val background = ThemeMapping.parseHex(values.getValue(pair.background)) ?: parseRgba(values.getValue(pair.background))
                assertNotNull(foreground, pair.foreground)
                assertNotNull(background, pair.background)
                if (background!!.alpha == 255) {
                    assertTrue(
                        ThemeMapping.contrastRatio(foreground!!, background) >= pair.minimum,
                        "${pair.foreground} on ${pair.background} for $kind",
                    )
                }
            }
        }
    }

    @Test
    fun `AC-029 a low contrast IDE colour is moved until the ratio holds`() {
        val lookup: (String) -> Color? = { key ->
            when (key) {
                "EditorPane.background" -> Color(0x3c, 0x3f, 0x41)
                "Label.foreground" -> Color(0x4a, 0x4d, 0x4f)
                else -> null
            }
        }
        val values = ThemeMapping.variables(lookup, ThemeKind.DARK)
        val foreground = ThemeMapping.parseHex(values.getValue("--vscode-foreground"))!!
        assertTrue(ThemeMapping.contrastRatio(foreground, Color(0x3c, 0x3f, 0x41)) >= 4.5)
        assertEquals("#3c3f41", values["--vscode-editor-background"])
    }

    @Test
    fun `AC-029 a colour that already holds the ratio is not changed`() {
        val white = Color(255, 255, 255)
        val black = Color(0, 0, 0)
        assertEquals(black, ThemeMapping.ensureContrast(black, white, 4.5))
        assertEquals(white, ThemeMapping.ensureContrast(Color(250, 250, 250), black, 4.5))
        assertTrue(ThemeMapping.contrastRatio(black, white) > 20.0)
        assertEquals(1.0, ThemeMapping.contrastRatio(white, white), 0.0001)
    }

    @Test
    fun `AC-026 the css defines every variable in one root block and appends clean scrollbar rules`() {
        val values = ThemeMapping.variables(none, ThemeKind.DARK)
        val css = ThemeMapping.css(values, "<style>::-webkit-scrollbar { width: 8px; }</style>")
        assertTrue(css.startsWith(":root {\n"), css)
        for (name in ThemeMapping.names) {
            assertTrue(css.contains("    $name: "), name)
        }
        assertTrue(css.contains("::-webkit-scrollbar { width: 8px; }"), css)
        assertFalse(css.contains("<style"), css)
        assertEquals(":root {\n    --a: b;\n}\n", ThemeMapping.css(mapOf("--a" to "b"), ""))
    }

    @Test
    fun `AC-028 the update script sets every variable and the body class in one script`() {
        val values = ThemeMapping.variables(none, ThemeKind.HIGH_CONTRAST)
        val script = ThemeMapping.updateScript(values, ThemeKind.HIGH_CONTRAST, "")
        assertEquals(ThemeMapping.names.size, Regex("root\\.setProperty\\(").findAll(script).count())
        assertTrue(script.contains("document.body.className = \"vscode-high-contrast\";"), script)
        assertTrue(script.startsWith("(function () {") && script.endsWith("})();"), script)
        assertFalse(script.contains("adoptedStyleSheets"), script)
        val withScrollbars = ThemeMapping.updateScript(values, ThemeKind.DARK, "::-webkit-scrollbar { width: 8px; }")
        assertTrue(withScrollbars.contains("adoptedStyleSheets"), withScrollbars)
        assertTrue(withScrollbars.contains("replaceSync(\"::-webkit-scrollbar { width: 8px; }\")"), withScrollbars)
        assertTrue(withScrollbars.indexOf("document.body.className") < withScrollbars.indexOf("adoptedStyleSheets"))
    }

    private fun parseRgba(text: String): Color? {
        val match = Regex("rgba\\((\\d+), (\\d+), (\\d+), ([0-9.]+)\\)").matchEntire(text) ?: return null
        val (red, green, blue, alpha) = match.destructured
        return Color(red.toInt(), green.toInt(), blue.toInt(), Math.round(alpha.toDouble() * 255).toInt())
    }

    private fun read(vararg parts: String): String {
        val relative = Path.of("src", *parts)
        val candidates = listOf(Path.of("..").resolve(relative), relative)
        val path = candidates.firstOrNull { Files.exists(it) }
            ?: error("$relative not found from ${Path.of("").toAbsolutePath()}")
        return Files.readString(path)
    }
}

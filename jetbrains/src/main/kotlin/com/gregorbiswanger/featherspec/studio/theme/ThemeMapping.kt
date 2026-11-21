package com.gregorbiswanger.featherspec.studio.theme

import com.gregorbiswanger.featherspec.studio.runtime.BridgeFrames
import java.awt.Color
import java.util.Locale

enum class ThemeKind(val bodyClass: String) {
    LIGHT("vscode-light"),
    DARK("vscode-dark"),
    HIGH_CONTRAST("vscode-high-contrast");

    companion object {
        fun of(isDark: Boolean, idOrName: String): ThemeKind = when {
            idOrName.contains("contrast", ignoreCase = true) -> HIGH_CONTRAST
            isDark -> DARK
            else -> LIGHT
        }
    }
}

data class ThemeFonts(val uiFamily: String, val uiSizePx: Int, val editorFamily: String) {
    companion object {
        val DEFAULT = ThemeFonts("", 13, "")
    }
}

class ThemeRow(
    val cssVar: String,
    val ideKeys: List<String>,
    val light: String,
    val dark: String,
    val highContrast: String,
    val onlyInHighContrast: Boolean = false,
) {
    fun fallback(kind: ThemeKind): String = when (kind) {
        ThemeKind.LIGHT -> light
        ThemeKind.DARK -> dark
        ThemeKind.HIGH_CONTRAST -> highContrast
    }
}

class ContrastPair(val foreground: String, val background: String, val minimum: Double)

object ThemeMapping {
    const val FONT_FAMILY = "--vscode-font-family"
    const val FONT_SIZE = "--vscode-font-size"
    const val EDITOR_FONT_FAMILY = "--vscode-editor-font-family"
    const val UNSET = "initial"

    private const val TEXT = 4.5
    private const val OUTLINE = 3.0

    private fun row(cssVar: String, keys: List<String>, light: String, dark: String, highContrast: String) =
        ThemeRow(cssVar, keys, light, dark, highContrast)

    private fun contrastRow(cssVar: String, keys: List<String>, highContrast: String) =
        ThemeRow(cssVar, keys, UNSET, UNSET, highContrast, onlyInHighContrast = true)

    val rows: List<ThemeRow> = listOf(
        row("--vscode-badge-background", listOf("Counter.background"), "#c4c4c4", "#4d4d4d", "#000000"),
        row("--vscode-badge-foreground", listOf("Counter.foreground"), "#333333", "#ffffff", "#ffffff"),
        row("--vscode-button-background", listOf("Button.default.startBackground", "Button.default.background"), "#007acc", "#0e639c", "#0f4a85"),
        ThemeRow("--vscode-button-border", listOf("Button.default.borderColor"), "transparent", "transparent", "#6fc3df", onlyInHighContrast = true),
        row("--vscode-button-foreground", listOf("Button.default.foreground"), "#ffffff", "#ffffff", "#ffffff"),
        row("--vscode-button-hoverBackground", listOf("Button.default.hoverBackground"), "#006bb3", "#1177bb", "#0f4a85"),
        row("--vscode-button-secondaryBackground", listOf("Button.startBackground", "Button.background"), "#5f6a79", "#3a3d41", "#000000"),
        row("--vscode-button-secondaryForeground", listOf("Button.foreground"), "#ffffff", "#ffffff", "#ffffff"),
        row("--vscode-button-secondaryHoverBackground", listOf("Button.hoverBackground"), "#4c5561", "#45494e", "#000000"),
        row("--vscode-button-separator", emptyList(), "#ffffff66", "#ffffff66", "#ffffff"),
        row("--vscode-charts-blue", emptyList(), "#0b6fcc", "#3794ff", "#3794ff"),
        row("--vscode-charts-green", emptyList(), "#2d7a2a", "#89d185", "#89d185"),
        row("--vscode-charts-orange", emptyList(), "#946800", "#d18616", "#ffcc00"),
        row("--vscode-charts-red", emptyList(), "#c72e0f", "#f14c4c", "#f48771"),
        contrastRow("--vscode-contrastActiveBorder", listOf("Component.focusedBorderColor", "Component.focusColor"), "#f38518"),
        contrastRow("--vscode-contrastBorder", listOf("Component.borderColor"), "#6fc3df"),
        row("--vscode-descriptionForeground", listOf("Label.infoForeground", "Label.disabledForeground"), "#6e6e6e", "#a0a0a0", "#d0d0d0"),
        row("--vscode-dropdown-background", listOf("ComboBox.background", "ComboBox.nonEditableBackground"), "#ffffff", "#3c3c3c", "#000000"),
        row("--vscode-dropdown-border", listOf("ComboBox.borderColor", "Component.borderColor"), "#cecece", "#3c3c3c", "#6fc3df"),
        row("--vscode-dropdown-foreground", listOf("ComboBox.foreground"), "#3b3b3b", "#f0f0f0", "#ffffff"),
        row("--vscode-editor-background", listOf("EditorPane.background", "Panel.background"), "#ffffff", "#1e1e1e", "#000000"),
        row("--vscode-focusBorder", listOf("Component.focusColor"), "#0090f1", "#007fd4", "#f38518"),
        row("--vscode-foreground", listOf("Label.foreground"), "#3b3b3b", "#cccccc", "#ffffff"),
        row("--vscode-input-background", listOf("TextField.background"), "#ffffff", "#3c3c3c", "#000000"),
        row("--vscode-input-foreground", listOf("TextField.foreground"), "#3b3b3b", "#cccccc", "#ffffff"),
        row("--vscode-inputValidation-infoBackground", emptyList(), "#d6ecf2", "#063b49", "#000000"),
        row("--vscode-inputValidation-infoBorder", emptyList(), "#007acc", "#007acc", "#6fc3df"),
        row("--vscode-inputValidation-warningBackground", listOf("ValidationTooltip.warningBackground"), "#f6f5d2", "#352a05", "#000000"),
        row("--vscode-inputValidation-warningBorder", listOf("ValidationTooltip.warningBorderColor"), "#b89500", "#b89500", "#ffd700"),
        row("--vscode-list-activeSelectionBackground", listOf("List.selectionBackground"), "#0060c0", "#04395e", "#000000"),
        row("--vscode-list-activeSelectionForeground", listOf("List.selectionForeground"), "#ffffff", "#ffffff", "#ffffff"),
        row("--vscode-list-hoverBackground", listOf("List.hoverBackground", "Tree.hoverBackground"), "#f2f2f2", "#2a2d2e", "#1a1a1a"),
        row("--vscode-menu-background", listOf("PopupMenu.background", "Menu.background"), "#ffffff", "#2b2b2b", "#000000"),
        row("--vscode-menu-border", listOf("Popup.borderColor", "Component.borderColor"), "#cecece", "#454545", "#6fc3df"),
        row("--vscode-menu-foreground", listOf("PopupMenu.foreground", "Menu.foreground"), "#3b3b3b", "#cccccc", "#ffffff"),
        row("--vscode-menu-selectionBackground", listOf("MenuItem.selectionBackground", "Menu.selectionBackground", "PopupMenu.selectionBackground"), "#0060c0", "#04395e", "#000000"),
        row("--vscode-menu-selectionForeground", listOf("MenuItem.selectionForeground", "Menu.selectionForeground"), "#ffffff", "#ffffff", "#ffffff"),
        row("--vscode-panel-border", listOf("Borders.color", "Component.borderColor"), "#d0d0d0", "#454545", "#6fc3df"),
        row("--vscode-panelTitle-activeBorder", listOf("TabbedPane.underlineColor", "Component.focusColor"), "#005fb8", "#007fd4", "#f38518"),
        row("--vscode-panelTitle-activeForeground", listOf("Label.foreground"), "#3b3b3b", "#e7e7e7", "#ffffff"),
        row("--vscode-panelTitle-inactiveForeground", listOf("Label.infoForeground", "Label.disabledForeground"), "#606060", "#a0a0a0", "#ffffff"),
        row("--vscode-progressBar-background", listOf("ProgressBar.progressColor"), "#0e70c0", "#0e70c0", "#6fc3df"),
        row("--vscode-radio-activeBackground", listOf("Component.focusColor"), "#005fb8", "#007fd4", "#f38518"),
        row("--vscode-sash-hoverBorder", listOf("Component.focusColor"), "#0090f1", "#007fd4", "#f38518"),
        row("--vscode-scrollbarSlider-background", listOf("ScrollBar.thumbColor"), "#64646466", "#79797966", "#6fc3df80"),
        row("--vscode-sideBar-background", listOf("SidePanel.background", "Panel.background"), "#f8f8f8", "#252526", "#000000"),
        row("--vscode-textBlockQuote-background", emptyList(), "#7f7f7f1a", "#7f7f7f1a", "#00000000"),
        row("--vscode-textBlockQuote-border", emptyList(), "#007acc80", "#007acc80", "#ffffff"),
        row("--vscode-textCodeBlock-background", emptyList(), "#dcdcdc66", "#0a0a0a66", "#000000"),
        row("--vscode-textLink-activeForeground", listOf("Link.hoverForeground", "Link.pressedForeground"), "#005a96", "#6cb3ff", "#7cc8ff"),
        row("--vscode-textLink-foreground", listOf("Link.activeForeground"), "#006ab1", "#3794ff", "#21a6ff"),
        row("--vscode-textPreformat-background", emptyList(), "#0000001a", "#ffffff1a", "#ffffff1a"),
        row("--vscode-textPreformat-foreground", emptyList(), "#a31515", "#d7ba7d", "#d7ba7d"),
        row("--vscode-toolbar-hoverBackground", listOf("ActionButton.hoverBackground"), "#b8b8b850", "#5a5d5e50", "#ffffff1f"),
        row("--vscode-widget-border", listOf("Popup.borderColor", "Component.borderColor"), "#c8c8c8", "#454545", "#6fc3df"),
        row("--vscode-widget-shadow", emptyList(), "#00000029", "#0000005c", "#00000000"),
    )

    val contrastPairs: List<ContrastPair> = listOf(
        ContrastPair("--vscode-foreground", "--vscode-editor-background", TEXT),
        ContrastPair("--vscode-descriptionForeground", "--vscode-editor-background", TEXT),
        ContrastPair("--vscode-textLink-foreground", "--vscode-editor-background", TEXT),
        ContrastPair("--vscode-textLink-activeForeground", "--vscode-editor-background", TEXT),
        ContrastPair("--vscode-panelTitle-activeForeground", "--vscode-editor-background", TEXT),
        ContrastPair("--vscode-panelTitle-inactiveForeground", "--vscode-editor-background", TEXT),
        ContrastPair("--vscode-charts-blue", "--vscode-editor-background", TEXT),
        ContrastPair("--vscode-charts-green", "--vscode-editor-background", TEXT),
        ContrastPair("--vscode-charts-orange", "--vscode-editor-background", TEXT),
        ContrastPair("--vscode-charts-red", "--vscode-editor-background", TEXT),
        ContrastPair("--vscode-button-foreground", "--vscode-button-background", TEXT),
        ContrastPair("--vscode-button-secondaryForeground", "--vscode-button-secondaryBackground", TEXT),
        ContrastPair("--vscode-badge-foreground", "--vscode-badge-background", TEXT),
        ContrastPair("--vscode-input-foreground", "--vscode-input-background", TEXT),
        ContrastPair("--vscode-dropdown-foreground", "--vscode-dropdown-background", TEXT),
        ContrastPair("--vscode-menu-foreground", "--vscode-menu-background", TEXT),
        ContrastPair("--vscode-menu-selectionForeground", "--vscode-menu-selectionBackground", TEXT),
        ContrastPair("--vscode-list-activeSelectionForeground", "--vscode-list-activeSelectionBackground", TEXT),
        ContrastPair("--vscode-foreground", "--vscode-sideBar-background", TEXT),
        ContrastPair("--vscode-focusBorder", "--vscode-editor-background", OUTLINE),
    )

    val names: Set<String> = rows.map { it.cssVar }.toSet() + setOf(FONT_FAMILY, FONT_SIZE, EDITOR_FONT_FAMILY)

    fun variables(lookup: (String) -> Color?, kind: ThemeKind, fonts: ThemeFonts = ThemeFonts.DEFAULT): Map<String, String> {
        val values = LinkedHashMap<String, String>()
        val colors = HashMap<String, Color>()
        for (row in rows) {
            val fromIde = if (row.onlyInHighContrast && kind != ThemeKind.HIGH_CONTRAST) {
                null
            } else {
                row.ideKeys.firstNotNullOfOrNull { key -> lookup(key)?.takeIf { it.alpha > 0 } }
            }
            val color = fromIde ?: parseHex(row.fallback(kind))
            if (color != null) {
                colors[row.cssVar] = color
            }
            values[row.cssVar] = if (fromIde != null) toCss(fromIde) else row.fallback(kind)
        }
        for (pair in contrastPairs) {
            val foreground = colors[pair.foreground] ?: continue
            val background = colors[pair.background] ?: continue
            if (background.alpha < 255) {
                continue
            }
            val adjusted = ensureContrast(foreground, background, pair.minimum)
            if (adjusted != foreground) {
                colors[pair.foreground] = adjusted
                values[pair.foreground] = toCss(adjusted)
            }
        }
        values[FONT_FAMILY] = fontStack(fonts.uiFamily, "system-ui, sans-serif")
        values[FONT_SIZE] = "${fonts.uiSizePx.coerceIn(8, 32)}px"
        values[EDITOR_FONT_FAMILY] = fontStack(fonts.editorFamily, "monospace")
        return values
    }

    fun fontStack(name: String, generic: String): String {
        val clean = name.filter { it.isLetterOrDigit() || it == ' ' || it == '-' || it == '_' || it == '.' }.trim()
        return if (clean.isEmpty()) generic else "\"$clean\", $generic"
    }

    fun toCss(color: Color): String =
        if (color.alpha == 255) {
            String.format(Locale.ROOT, "#%02x%02x%02x", color.red, color.green, color.blue)
        } else {
            String.format(Locale.ROOT, "rgba(%d, %d, %d, %.3f)", color.red, color.green, color.blue, color.alpha / 255.0)
        }

    fun parseHex(text: String): Color? {
        if (!text.startsWith("#") || (text.length != 7 && text.length != 9)) {
            return null
        }
        return try {
            val red = Integer.parseInt(text.substring(1, 3), 16)
            val green = Integer.parseInt(text.substring(3, 5), 16)
            val blue = Integer.parseInt(text.substring(5, 7), 16)
            val alpha = if (text.length == 9) Integer.parseInt(text.substring(7, 9), 16) else 255
            Color(red, green, blue, alpha)
        } catch (failure: NumberFormatException) {
            null
        }
    }

    fun luminance(color: Color): Double {
        fun channel(value: Int): Double {
            val scaled = value / 255.0
            return if (scaled <= 0.03928) scaled / 12.92 else Math.pow((scaled + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * channel(color.red) + 0.7152 * channel(color.green) + 0.0722 * channel(color.blue)
    }

    fun contrastRatio(first: Color, second: Color): Double {
        val a = luminance(first)
        val b = luminance(second)
        return (maxOf(a, b) + 0.05) / (minOf(a, b) + 0.05)
    }

    fun ensureContrast(foreground: Color, background: Color, minimum: Double): Color {
        if (contrastRatio(foreground, background) >= minimum) {
            return foreground
        }
        val target = if (luminance(background) < 0.179) Color.WHITE else Color.BLACK
        for (step in 1..20) {
            val mixed = mix(foreground, target, step / 20.0)
            if (contrastRatio(mixed, background) >= minimum) {
                return mixed
            }
        }
        return target
    }

    private fun mix(from: Color, to: Color, share: Double): Color {
        fun part(a: Int, b: Int): Int = Math.round(a + (b - a) * share).toInt().coerceIn(0, 255)
        return Color(part(from.red, to.red), part(from.green, to.green), part(from.blue, to.blue))
    }

    fun cleanStyle(text: String): String = text.replace(Regex("</?style[^>]*>", RegexOption.IGNORE_CASE), "").trim()

    fun css(variables: Map<String, String>, scrollbars: String): String {
        val declarations = variables.entries.joinToString("\n") { "    ${it.key}: ${it.value};" }
        val extra = cleanStyle(scrollbars)
        return ":root {\n$declarations\n}\n" + if (extra.isEmpty()) "" else "$extra\n"
    }

    fun updateScript(variables: Map<String, String>, kind: ThemeKind, scrollbars: String): String {
        val out = StringBuilder("(function () { var root = document.documentElement.style; ")
        for ((name, value) in variables) {
            out.append("root.setProperty(${BridgeFrames.jsString(name)}, ${BridgeFrames.jsString(value)}); ")
        }
        out.append("document.body.className = ${BridgeFrames.jsString(kind.bodyClass)}; ")
        val extra = cleanStyle(scrollbars)
        if (extra.isNotEmpty()) {
            out.append(
                "try { var previous = window.featherspecScrollbars; " +
                    "var kept = Array.prototype.filter.call(document.adoptedStyleSheets, function (sheet) { return sheet !== previous; }); " +
                    "var sheet = new CSSStyleSheet(); sheet.replaceSync(${BridgeFrames.jsString(extra)}); " +
                    "window.featherspecScrollbars = sheet; document.adoptedStyleSheets = kept.concat([sheet]); } catch (failure) { } ",
            )
        }
        out.append("})();")
        return out.toString()
    }
}

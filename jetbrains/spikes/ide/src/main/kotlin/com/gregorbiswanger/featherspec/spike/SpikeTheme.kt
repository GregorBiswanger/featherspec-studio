package com.gregorbiswanger.featherspec.spike

import com.intellij.ide.ui.LafManager
import java.awt.Color
import javax.swing.UIManager

object SpikeTheme {
    private val variable = Regex("--vscode-[A-Za-z0-9-]+")
    private val fallback = Color(0x80, 0x80, 0x80)
    private val fixed = mapOf(
        "--vscode-font-family" to "system-ui",
        "--vscode-editor-font-family" to "monospace",
        "--vscode-font-size" to "13px",
    )
    private val uiKeys = mapOf(
        "--vscode-editor-background" to "EditorPane.background",
        "--vscode-foreground" to "Label.foreground",
        "--vscode-descriptionForeground" to "Label.disabledForeground",
        "--vscode-focusBorder" to "Component.focusColor",
        "--vscode-contrastActiveBorder" to "Component.focusedBorderColor",
        "--vscode-contrastBorder" to "Component.borderColor",
        "--vscode-panel-border" to "Borders.color",
        "--vscode-sideBar-background" to "SidePanel.background",
        "--vscode-button-background" to "Button.default.background",
        "--vscode-button-foreground" to "Button.default.foreground",
        "--vscode-button-secondaryBackground" to "Button.background",
        "--vscode-button-secondaryForeground" to "Button.foreground",
        "--vscode-textLink-foreground" to "Link.foreground",
        "--vscode-textLink-activeForeground" to "Link.activeForeground",
        "--vscode-list-activeSelectionBackground" to "List.selectionBackground",
        "--vscode-list-activeSelectionForeground" to "List.selectionForeground",
        "--vscode-list-hoverBackground" to "List.hoverBackground",
        "--vscode-input-background" to "TextField.background",
        "--vscode-input-foreground" to "TextField.foreground",
        "--vscode-toolbar-hoverBackground" to "ActionButton.hoverBackground",
        "--vscode-menu-background" to "Menu.background",
        "--vscode-menu-foreground" to "Menu.foreground",
    )

    fun css(): String {
        val source = SpikeResources.readResource("main.css")?.toString(Charsets.UTF_8).orEmpty()
        val names = variable.findAll(source).map { it.value }.distinct().toList()
        val declarations = names.joinToString("\n") { "    $it: ${valueOf(it)};" }
        return ":root {\n$declarations\n}\n"
    }

    fun bodyClass(): String {
        val theme = LafManager.getInstance().currentUIThemeLookAndFeel
        return when {
            theme.id.contains("HighContrast", ignoreCase = true) || theme.name.contains("contrast", ignoreCase = true) -> "vscode-high-contrast"
            theme.isDark -> "vscode-dark"
            else -> "vscode-light"
        }
    }

    private fun valueOf(name: String): String {
        fixed[name]?.let { return it }
        val color = uiKeys[name]?.let { UIManager.getColor(it) } ?: fallback
        return if (color.alpha == 255) {
            "#%02x%02x%02x".format(color.red, color.green, color.blue)
        } else {
            "rgba(${color.red}, ${color.green}, ${color.blue}, ${color.alpha / 255.0})"
        }
    }
}

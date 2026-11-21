package com.gregorbiswanger.featherspec.studio.theme

import com.intellij.ide.ui.LafManager
import com.intellij.ide.ui.LafManagerListener
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.editor.colors.EditorColorsManager
import com.intellij.openapi.Disposable
import com.intellij.ui.jcef.JBCefScrollbarsHelper
import com.intellij.util.ui.UIUtil
import javax.swing.UIManager

private class ThemeSnapshot(val kind: ThemeKind, val css: String, val updateScript: String)

class ThemeBridge(parent: Disposable, private val onChange: (String) -> Unit) {
    @Volatile
    private var snapshot: ThemeSnapshot = capture()

    @Volatile
    private var disposed = false

    init {
        ApplicationManager.getApplication().messageBus.connect(parent).subscribe(
            LafManagerListener.TOPIC,
            object : LafManagerListener {
                override fun lookAndFeelChanged(source: LafManager) {
                    ApplicationManager.getApplication().invokeLater { refresh() }
                }
            },
        )
    }

    fun css(): String = snapshot.css

    fun bodyClass(): String = snapshot.kind.bodyClass

    private fun refresh() {
        if (disposed) {
            return
        }
        val next = capture()
        snapshot = next
        onChange(next.updateScript)
    }

    fun dispose() {
        disposed = true
    }

    private fun capture(): ThemeSnapshot {
        val theme = LafManager.getInstance().currentUIThemeLookAndFeel
        val kind = ThemeKind.of(theme.isDark, "${theme.id} ${theme.name}")
        val label = UIUtil.getLabelFont()
        val fonts = ThemeFonts(label.family, label.size, EditorColorsManager.getInstance().globalScheme.editorFontName)
        val variables = ThemeMapping.variables({ key -> UIManager.getColor(key) }, kind, fonts)
        val scrollbars = JBCefScrollbarsHelper.buildScrollbarsStyle()
        return ThemeSnapshot(kind, ThemeMapping.css(variables, scrollbars), ThemeMapping.updateScript(variables, kind, scrollbars))
    }
}

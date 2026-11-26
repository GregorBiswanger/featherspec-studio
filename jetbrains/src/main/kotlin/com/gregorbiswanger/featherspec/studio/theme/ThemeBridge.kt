package com.gregorbiswanger.featherspec.studio.theme

import com.gregorbiswanger.featherspec.studio.probe.SmokeTrace
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
                    SmokeTrace.themeNotified()
                    // The IDE's own follow-up work of a switch queues ahead of an invokeLater (up to 560 ms on macOS CI),
                    // so the new values go out now; the later pass catches what the IDE updates afterwards.
                    if (ApplicationManager.getApplication().isDispatchThread) {
                        refresh()
                    }
                    ApplicationManager.getApplication().invokeLater { refresh() }
                }
            },
        )
    }

    fun css(): String = snapshot.css

    fun bodyClass(): String = snapshot.kind.bodyClass

    private fun refresh() {
        SmokeTrace.themeRefreshStarted()
        if (disposed) {
            return
        }
        val next = capture()
        if (next.updateScript == snapshot.updateScript) {
            return
        }
        snapshot = next
        onChange(next.updateScript)
        SmokeTrace.themeSent()
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

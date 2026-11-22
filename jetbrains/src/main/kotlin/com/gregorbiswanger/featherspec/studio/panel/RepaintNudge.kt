package com.gregorbiswanger.featherspec.studio.panel

import com.intellij.openapi.application.ApplicationManager
import com.intellij.ui.jcef.JBCefBrowser
import java.awt.event.KeyAdapter
import java.awt.event.KeyEvent
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
import javax.swing.Timer

class RepaintNudge(private val browser: JBCefBrowser) {
    private val invalidate = runCatching { browser.cefBrowser.javaClass.getMethod("invalidate") }.getOrNull()

    fun attach() {
        val component = browser.component
        component.addMouseListener(object : MouseAdapter() {
            override fun mouseReleased(event: MouseEvent) = nudge()
        })
        component.addKeyListener(object : KeyAdapter() {
            override fun keyReleased(event: KeyEvent) = nudge()
        })
    }

    fun nudge() {
        ApplicationManager.getApplication().invokeLater {
            DELAYS_MS.forEach { delay ->
                Timer(delay) { refresh() }.apply { isRepeats = false }.start()
            }
        }
    }

    private fun refresh() {
        runCatching { invalidate?.invoke(browser.cefBrowser) }
        browser.component.repaint()
    }

    private companion object {
        val DELAYS_MS = listOf(40, 160, 400)
    }
}

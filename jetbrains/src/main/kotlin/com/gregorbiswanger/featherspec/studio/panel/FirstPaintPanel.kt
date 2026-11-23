package com.gregorbiswanger.featherspec.studio.panel

import java.awt.BorderLayout
import java.awt.Graphics
import javax.swing.JPanel

/** The tab's holder while the open is being timed: reports each paint of its children once it is on screen. */
class FirstPaintPanel(private val painted: () -> Unit) : JPanel(BorderLayout()) {
    override fun paintChildren(g: Graphics) {
        super.paintChildren(g)
        if (isShowing && width > 0 && height > 0) {
            painted()
        }
    }
}

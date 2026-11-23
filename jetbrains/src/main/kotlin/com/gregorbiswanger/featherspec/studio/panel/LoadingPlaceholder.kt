package com.gregorbiswanger.featherspec.studio.panel

import com.intellij.ui.components.JBLabel
import com.intellij.util.ui.UIUtil
import java.awt.GridBagLayout
import javax.accessibility.AccessibleContext
import javax.swing.JPanel
import javax.swing.SwingConstants

class LoadingPlaceholder : JPanel(GridBagLayout()) {
    private val label = JBLabel(LoadingPlaceholderText.shown, SwingConstants.CENTER)

    init {
        isOpaque = true
        background = UIUtil.getPanelBackground()
        label.foreground = UIUtil.getLabelForeground()
        label.accessibleContext.accessibleName = LoadingPlaceholderText.accessibleName
        add(label)
    }

    override fun updateUI() {
        super.updateUI()
        background = UIUtil.getPanelBackground()
    }

    override fun getAccessibleContext(): AccessibleContext {
        val context = super.getAccessibleContext()
        context.accessibleName = LoadingPlaceholderText.accessibleName
        return context
    }
}

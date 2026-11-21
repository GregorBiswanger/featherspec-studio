package com.gregorbiswanger.featherspec.studio.tree

import com.gregorbiswanger.featherspec.studio.actions.NoticeContent
import com.intellij.ide.BrowserUtil
import com.intellij.ui.SimpleTextAttributes
import com.intellij.ui.components.JBPanelWithEmptyText
import java.awt.event.ActionListener

class UnavailableNotice(content: NoticeContent) : JBPanelWithEmptyText() {
    init {
        withEmptyText(content.text)
        emptyText.appendLine(
            content.helpLabel,
            SimpleTextAttributes.LINK_ATTRIBUTES,
            ActionListener { BrowserUtil.browse(content.helpUrl) },
        )
    }
}

package com.gregorbiswanger.featherspec.studio.actions

import com.gregorbiswanger.featherspec.studio.HostTexts
import com.gregorbiswanger.featherspec.studio.runtime.UnavailableKind

data class NoticeContent(val text: String, val helpLabel: String, val helpUrl: String) {
    companion object {
        fun of(kind: UnavailableKind): NoticeContent = NoticeContent(
            text = if (kind == UnavailableKind.SUSPENDED) HostTexts.JCEF_SUSPENDED else HostTexts.JCEF_UNSUPPORTED,
            helpLabel = HostTexts.OPEN_HELP,
            helpUrl = HostTexts.HELP_URL,
        )
    }
}

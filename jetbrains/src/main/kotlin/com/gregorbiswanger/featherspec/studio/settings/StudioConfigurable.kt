package com.gregorbiswanger.featherspec.studio.settings

import com.intellij.openapi.options.BoundConfigurable
import com.intellij.openapi.ui.DialogPanel
import com.intellij.ui.dsl.builder.bindSelected
import com.intellij.ui.dsl.builder.bindText
import com.intellij.ui.dsl.builder.panel

class StudioConfigurable : BoundConfigurable(DISPLAY_NAME) {
    private var draft: SettingsModel? = null

    private fun stored(): SettingsModel = StudioSettings.getInstance().model()

    private fun edit(change: (SettingsModel) -> SettingsModel) {
        draft = change(draft ?: stored())
    }

    override fun createPanel(): DialogPanel = panel {
        row {
            checkBox(SettingsTable.SHOW_STEP_TIPS_LABEL)
                .bindSelected({ stored().showStepTips }, { value -> edit { it.copy(showStepTips = value) } })
                .comment(SettingsTable.SHOW_STEP_TIPS_DESCRIPTION)
        }
        group(MODEL_GROUP) {
            row {
                comment(SettingsTable.MODEL_HINTS_DESCRIPTION)
            }
            row(SettingsTable.STRONG_MODEL_LABEL) {
                textField()
                    .bindText({ stored().strongModel }, { value -> edit { it.copy(strongModel = value) } })
                    .comment(SettingsTable.STRONG_MODEL_DESCRIPTION)
            }
            row(SettingsTable.FAST_MODEL_LABEL) {
                textField()
                    .bindText({ stored().fastModel }, { value -> edit { it.copy(fastModel = value) } })
                    .comment(SettingsTable.FAST_MODEL_DESCRIPTION)
            }
        }
    }

    override fun apply() {
        draft = null
        super.apply()
        draft?.let { StudioSettings.getInstance().apply(it) }
        draft = null
    }

    override fun reset() {
        draft = null
        super.reset()
    }

    companion object {
        const val ID = "featherspec.studio.settings"
        const val DISPLAY_NAME = "FeatherSpec Studio"
        const val MODEL_GROUP = "Model hints"
    }
}

package com.gregorbiswanger.featherspec.studio.settings

import com.gregorbiswanger.featherspec.studio.ports.IdePlugins
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.options.BoundConfigurable
import com.intellij.openapi.ui.ComboBox
import com.intellij.openapi.ui.DialogPanel
import com.intellij.ui.components.JBLabel
import com.intellij.ui.dsl.builder.bindItem
import com.intellij.ui.dsl.builder.bindSelected
import com.intellij.ui.dsl.builder.bindText
import com.intellij.ui.dsl.builder.panel
import com.intellij.util.ui.UIUtil
import javax.swing.DefaultComboBoxModel

class StudioConfigurable : BoundConfigurable(DISPLAY_NAME) {
    private var draft: SettingsModel? = null
    private var assistantCombo: ComboBox<AssistantOption>? = null
    private var assistantDescription: JBLabel? = null
    private var assistantHint: JBLabel? = null
    private var unsubscribe: (() -> Unit)? = null

    private fun plugins(): List<String> = PluginOptionsBus.shared.last

    private fun recompute() {
        ApplicationManager.getApplication().executeOnPooledThread(
            Runnable {
                try {
                    PluginOptionsBus.shared.publish(IdePlugins().snapshot())
                } catch (failure: Exception) {
                    thisLogger().warn("The FeatherSpec agent availability could not be read for the settings page", failure)
                } catch (failure: LinkageError) {
                    thisLogger().warn("The FeatherSpec agent availability could not be read for the settings page", failure)
                }
            },
        )
    }

    private fun showAssistantHint(available: List<String>) {
        val hint = SettingsTable.assistantHint(available)
        assistantHint?.text = if (hint == null) "" else "<html>$hint</html>"
        assistantHint?.isVisible = hint != null
    }

    private fun showAssistantDescription() {
        val option = assistantCombo?.selectedItem as? AssistantOption ?: SettingsTable.ASSISTANT_OPTIONS.first()
        assistantDescription?.text = "<html>" + option.description + "</html>"
    }

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
        row(SettingsTable.ASSISTANT_LABEL) {
            val combo = comboBox(SettingsTable.options(plugins()))
                .bindItem(
                    { SettingsTable.displayed(stored().assistant, plugins()) },
                    { option ->
                        if (option != null) {
                            edit { it.copy(assistant = SettingsTable.storedAfterApply(it.assistant, option, plugins())) }
                        }
                    },
                )
                .comment(SettingsTable.ASSISTANT_DESCRIPTION)
            assistantCombo = combo.component
            combo.component.addActionListener { showAssistantDescription() }
            unsubscribe?.invoke()
            unsubscribe = PluginOptionsBus.shared.subscribe { available ->
                ApplicationManager.getApplication().invokeLater { refreshOptions(available) }
            }
        }
        row {
            val label = JBLabel("", UIUtil.ComponentStyle.SMALL, UIUtil.FontColor.BRIGHTER)
            label.setAllowAutoWrapping(true)
            assistantDescription = label
            cell(label)
        }
        row {
            val label = JBLabel("", UIUtil.ComponentStyle.SMALL, UIUtil.FontColor.BRIGHTER)
            label.setAllowAutoWrapping(true)
            assistantHint = label
            cell(label)
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
        assistantCombo?.model = DefaultComboBoxModel(SettingsTable.options(plugins()).toTypedArray())
        super.reset()
        showAssistantDescription()
        showAssistantHint(plugins())
        recompute()
    }

    override fun disposeUIResources() {
        unsubscribe?.invoke()
        unsubscribe = null
        super.disposeUIResources()
    }

    private fun refreshOptions(available: List<String>) {
        val combo = assistantCombo ?: return
        val chosen = combo.selectedItem as? AssistantOption
        val options = SettingsTable.options(available)
        combo.model = DefaultComboBoxModel(options.toTypedArray())
        combo.selectedItem = options.firstOrNull { it == chosen } ?: SettingsTable.displayed((draft ?: stored()).assistant, available)
        showAssistantDescription()
        showAssistantHint(available)
    }

    companion object {
        const val ID = "featherspec.studio.settings"
        const val DISPLAY_NAME = "FeatherSpec Studio"
        const val MODEL_GROUP = "Model hints"
    }
}

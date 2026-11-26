package com.gregorbiswanger.featherspec.studio.settings

import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonPrimitive
import com.gregorbiswanger.featherspec.studio.assistant.CliAgents
import com.gregorbiswanger.featherspec.studio.ports.PluginIds

data class SettingsModel(
    val showStepTips: Boolean = SettingsTable.SHOW_STEP_TIPS_DEFAULT,
    val strongModel: String = "",
    val fastModel: String = "",
    val assistant: String = SettingsTable.ASSISTANT_DEFAULT,
)

data class AssistantOption(val value: String, val label: String, val description: String) {
    override fun toString(): String = label
}

object SettingsTable {
    const val PREFIX = "featherspec-studio."

    const val SHOW_STEP_TIPS_KEY = "showStepTips"
    const val MODEL_HINTS_KEY = "modelHints"
    const val ASSISTANT_KEY = "assistant"

    const val SHOW_STEP_TIPS_ID = PREFIX + SHOW_STEP_TIPS_KEY
    const val MODEL_HINTS_ID = PREFIX + MODEL_HINTS_KEY
    const val ASSISTANT_ID = PREFIX + ASSISTANT_KEY

    const val SHOW_STEP_TIPS_DEFAULT = true
    const val ASSISTANT_UNSET = ""
    const val ASSISTANT_DEFAULT = ASSISTANT_UNSET
    const val ASSISTANT_NONE = "none"
    const val ASSISTANT_COPILOT = "copilot"
    const val ASSISTANT_CLAUDE_CODE = "claudeCode"
    const val ASSISTANT_JUNIE = "junie"

    const val SHOW_STEP_TIPS_LABEL = "Show step tips"
    const val ASSISTANT_LABEL = "Assistant:"
    const val STRONG_MODEL_LABEL = "Strong model:"
    const val FAST_MODEL_LABEL = "Fast model:"

    const val SHOW_STEP_TIPS_DESCRIPTION = "Show the session and model tip under the next step and the ? button that explains it."
    const val MODEL_HINTS_DESCRIPTION = "Names of your own models, shown in the tip. The Studio names no model itself."
    const val STRONG_MODEL_DESCRIPTION = "Your strong model: for specify, clarify, writing a plan, compile and finding a block."
    const val FAST_MODEL_DESCRIPTION = "Your fast model: for one plan step, a plan report, lifecycle moves and the workflow overview."

    const val ASSISTANT_DESCRIPTION = "The assistant your next step goes to. Studio sends nothing; Copy prompt stays in the button's menu."

    const val ASSISTANT_HINT =
        "Assistants that are not available are greyed out with the reason. Installed one just now? Restart the IDE."

    const val REASON_SEPARATOR = " \u2014 "
    const val REASON_TERMINAL_DISABLED = "Terminal plugin is disabled"
    const val REASON_JUNIE_NOT_FOUND = "not found (install the Junie CLI or the Junie agent in AI Assistant)"

    val ASSISTANT_OPTIONS: List<AssistantOption> = listOf(
        AssistantOption(
            ASSISTANT_JUNIE,
            "Junie",
            "Send to Junie types the prompt into the Junie CLI in the IDE terminal and sends nothing. Needs the junie command or the Junie agent of AI Assistant, and the Terminal plugin.",
        ),
        AssistantOption(
            ASSISTANT_CLAUDE_CODE,
            "Claude Code",
            "Send to Claude Code types the prompt into Claude Code in the IDE terminal and sends nothing. Needs the claude command and the Terminal plugin.",
        ),
        AssistantOption(
            ASSISTANT_COPILOT,
            "GitHub Copilot",
            "Send to Copilot types the prompt into the GitHub Copilot CLI in the IDE terminal and sends nothing. Needs the copilot command and the Terminal plugin.",
        ),
        AssistantOption(ASSISTANT_NONE, "None: Copy prompt", "Copy the prompt and paste it into any assistant."),
    )

    const val STRONG_HINT_KEY = "strong"
    const val FAST_HINT_KEY = "fast"

    val ids: List<String> = listOf(SHOW_STEP_TIPS_ID, ASSISTANT_ID, MODEL_HINTS_ID)

    fun assistantAvailable(value: String, plugins: List<String>): Boolean =
        value == ASSISTANT_NONE || EffectiveAssistant.available(value, plugins)

    fun options(plugins: List<String>): List<AssistantOption> =
        ASSISTANT_OPTIONS.filter { assistantAvailable(it.value, plugins) }

    // Why an agent cannot be selected, or null when it can (and for "None" and unknown values).
    fun unavailableReason(value: String, plugins: List<String>): String? {
        val agent = CliAgents.byId(value)
        return when {
            agent == null || EffectiveAssistant.available(value, plugins) -> null
            PluginIds.TERMINAL !in plugins -> REASON_TERMINAL_DISABLED
            agent.id == CliAgents.JUNIE.id -> REASON_JUNIE_NOT_FOUND
            else -> "`${agent.command}` not on the PATH"
        }
    }

    fun rowLabel(option: AssistantOption, plugins: List<String>): String =
        unavailableReason(option.value, plugins)?.let { option.label + REASON_SEPARATOR + it } ?: option.label

    fun assistantHint(plugins: List<String>): String? =
        if (ASSISTANT_OPTIONS.any { !assistantAvailable(it.value, plugins) }) ASSISTANT_HINT else null

    fun displayed(stored: String, plugins: List<String>): AssistantOption {
        val shown = EffectiveAssistant.of(cleanAssistant(stored), plugins)
        return ASSISTANT_OPTIONS.first { it.value == shown }
    }

    fun storedAfterApply(stored: String, selected: AssistantOption, plugins: List<String>): String {
        val kept = cleanAssistant(stored)
        return if (selected == displayed(kept, plugins)) kept else selected.value
    }

    fun fromState(showStepTips: Boolean?, strongModel: String?, fastModel: String?, assistant: String? = null): SettingsModel =
        sanitize(
            SettingsModel(
                showStepTips ?: SHOW_STEP_TIPS_DEFAULT,
                strongModel.orEmpty(),
                fastModel.orEmpty(),
                assistant ?: ASSISTANT_DEFAULT,
            ),
        )

    fun sanitize(model: SettingsModel): SettingsModel =
        model.copy(strongModel = model.strongModel.trim(), fastModel = model.fastModel.trim(), assistant = cleanAssistant(model.assistant))

    fun values(model: SettingsModel): Map<String, JsonElement> {
        val clean = sanitize(model)
        return linkedMapOf(
            SHOW_STEP_TIPS_KEY to JsonPrimitive(clean.showStepTips),
            ASSISTANT_KEY to JsonPrimitive(clean.assistant),
            MODEL_HINTS_KEY to hints(clean),
        )
    }

    fun changeEvents(before: SettingsModel, after: SettingsModel): List<String> {
        val old = values(before)
        val next = values(after)
        return next.filter { (key, value) -> old[key] != value }.map { (key, value) -> payload(key, value) }
    }

    fun payload(key: String, value: JsonElement): String = JsonObject().apply {
        addProperty("key", key)
        add("value", value)
    }.toString()

    private fun cleanAssistant(value: String): String =
        if (ASSISTANT_OPTIONS.any { it.value == value }) value else ASSISTANT_UNSET

    private fun hints(model: SettingsModel): JsonObject = JsonObject().apply {
        if (model.strongModel.isNotEmpty()) {
            addProperty(STRONG_HINT_KEY, model.strongModel)
        }
        if (model.fastModel.isNotEmpty()) {
            addProperty(FAST_HINT_KEY, model.fastModel)
        }
    }
}

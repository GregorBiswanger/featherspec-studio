package com.gregorbiswanger.featherspec.studio.settings

import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonPrimitive

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
    const val ASSISTANT_DEFAULT = "none"
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

    const val ASSISTANT_DESCRIPTION =
        "Your AI assistant for the next step. Send to Claude Code types the prompt into Claude Code in the terminal; " +
            "Copy for Copilot or Junie copies it with file references and opens the chat. " +
            "Nothing is sent; Copy prompt stays in the button's menu."

    val ASSISTANT_OPTIONS: List<AssistantOption> = listOf(
        AssistantOption(ASSISTANT_NONE, "None: Copy prompt", "Copy the prompt and paste it into any assistant."),
        AssistantOption(
            ASSISTANT_COPILOT,
            "GitHub Copilot",
            "Copy for Copilot copies the prompt with #file references. Paste it into GitHub Copilot Chat. Needs the GitHub Copilot plugin.",
        ),
        AssistantOption(
            ASSISTANT_CLAUDE_CODE,
            "Claude Code",
            "Send to Claude Code types the prompt into Claude Code in the IDE terminal and sends nothing. Needs the claude command and the Terminal plugin.",
        ),
        AssistantOption(
            ASSISTANT_JUNIE,
            "Junie",
            "Copy for Junie copies the prompt with @ file references. Paste it into Junie in AI Chat.",
        ),
    )

    const val STRONG_HINT_KEY = "strong"
    const val FAST_HINT_KEY = "fast"

    val ids: List<String> = listOf(SHOW_STEP_TIPS_ID, ASSISTANT_ID, MODEL_HINTS_ID)

    fun options(junieAvailable: Boolean): List<AssistantOption> =
        ASSISTANT_OPTIONS.filter { it.value != ASSISTANT_JUNIE || junieAvailable }

    fun displayed(stored: String, junieAvailable: Boolean): AssistantOption {
        val wanted = cleanAssistant(stored)
        return options(junieAvailable).firstOrNull { it.value == wanted } ?: ASSISTANT_OPTIONS.first()
    }

    fun storedAfterApply(stored: String, selected: AssistantOption, junieAvailable: Boolean): String {
        val kept = cleanAssistant(stored)
        return if (selected == displayed(kept, junieAvailable)) kept else selected.value
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
        if (ASSISTANT_OPTIONS.any { it.value == value }) value else ASSISTANT_DEFAULT

    private fun hints(model: SettingsModel): JsonObject = JsonObject().apply {
        if (model.strongModel.isNotEmpty()) {
            addProperty(STRONG_HINT_KEY, model.strongModel)
        }
        if (model.fastModel.isNotEmpty()) {
            addProperty(FAST_HINT_KEY, model.fastModel)
        }
    }
}

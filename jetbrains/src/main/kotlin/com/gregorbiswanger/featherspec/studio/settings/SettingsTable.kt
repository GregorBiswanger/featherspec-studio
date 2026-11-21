package com.gregorbiswanger.featherspec.studio.settings

import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonPrimitive

data class SettingsModel(
    val showStepTips: Boolean = SettingsTable.SHOW_STEP_TIPS_DEFAULT,
    val strongModel: String = "",
    val fastModel: String = "",
)

object SettingsTable {
    const val PREFIX = "featherspec-studio."

    const val SHOW_STEP_TIPS_KEY = "showStepTips"
    const val MODEL_HINTS_KEY = "modelHints"

    const val SHOW_STEP_TIPS_ID = PREFIX + SHOW_STEP_TIPS_KEY
    const val MODEL_HINTS_ID = PREFIX + MODEL_HINTS_KEY

    const val SHOW_STEP_TIPS_DEFAULT = true

    const val SHOW_STEP_TIPS_LABEL = "Show step tips"
    const val STRONG_MODEL_LABEL = "Strong model:"
    const val FAST_MODEL_LABEL = "Fast model:"

    const val SHOW_STEP_TIPS_DESCRIPTION = "Show the session and model tip under the next step and the ? button that explains it."
    const val MODEL_HINTS_DESCRIPTION = "Names of your own models, shown in the tip. The Studio names no model itself."
    const val STRONG_MODEL_DESCRIPTION = "Your strong model: for specify, clarify, writing a plan, compile and finding a block."
    const val FAST_MODEL_DESCRIPTION = "Your fast model: for one plan step, a plan report, lifecycle moves and the workflow overview."

    const val STRONG_HINT_KEY = "strong"
    const val FAST_HINT_KEY = "fast"

    val ids: List<String> = listOf(SHOW_STEP_TIPS_ID, MODEL_HINTS_ID)

    fun fromState(showStepTips: Boolean?, strongModel: String?, fastModel: String?): SettingsModel =
        sanitize(SettingsModel(showStepTips ?: SHOW_STEP_TIPS_DEFAULT, strongModel.orEmpty(), fastModel.orEmpty()))

    fun sanitize(model: SettingsModel): SettingsModel =
        model.copy(strongModel = model.strongModel.trim(), fastModel = model.fastModel.trim())

    fun values(model: SettingsModel): Map<String, JsonElement> {
        val clean = sanitize(model)
        return linkedMapOf(
            SHOW_STEP_TIPS_KEY to JsonPrimitive(clean.showStepTips),
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

    private fun hints(model: SettingsModel): JsonObject = JsonObject().apply {
        if (model.strongModel.isNotEmpty()) {
            addProperty(STRONG_HINT_KEY, model.strongModel)
        }
        if (model.fastModel.isNotEmpty()) {
            addProperty(FAST_HINT_KEY, model.fastModel)
        }
    }
}

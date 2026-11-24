package com.gregorbiswanger.featherspec.studio.settings

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.google.gson.JsonPrimitive
import com.gregorbiswanger.featherspec.studio.assistant.CliAgents
import com.gregorbiswanger.featherspec.studio.ports.CliAvailability
import com.gregorbiswanger.featherspec.studio.ports.PluginIds
import com.gregorbiswanger.featherspec.studio.ports.PluginsWatch

object EffectiveAssistant {
    const val UNSET = ""
    const val NONE = "none"

    fun of(stored: String?, plugins: List<String>): String {
        val agent = CliAgents.byId(stored)
        return when {
            stored == NONE -> NONE
            agent != null -> if (available(agent.id, plugins)) agent.id else NONE
            else -> if (available(CliAgents.JUNIE.id, plugins)) CliAgents.JUNIE.id else NONE
        }
    }

    fun available(id: String, plugins: List<String>): Boolean {
        val agent = CliAgents.byId(id) ?: return false
        return PluginIds.TERMINAL in plugins && CliAvailability.presenceId(agent) in plugins
    }

    fun event(payload: String, plugins: List<String>): String {
        val parsed = objectOf(payload) ?: return payload
        val key = parsed.get("key")
        val value = parsed.get("value")
        if (key == null || !key.isJsonPrimitive || key.asString != SettingsTable.ASSISTANT_KEY || value == null || !value.isJsonPrimitive || !value.asJsonPrimitive.isString) {
            return payload
        }
        return SettingsTable.payload(SettingsTable.ASSISTANT_KEY, JsonPrimitive(of(value.asString, plugins)))
    }

    fun assistantValue(payload: String): String? {
        val parsed = objectOf(payload) ?: return null
        val key = parsed.get("key")
        val value = parsed.get("value")
        if (key == null || !key.isJsonPrimitive || key.asString != SettingsTable.ASSISTANT_KEY || value == null || !value.isJsonPrimitive) {
            return null
        }
        return value.asString
    }

    private fun objectOf(json: String): JsonObject? = try {
        val parsed = JsonParser.parseString(json)
        if (parsed.isJsonObject) parsed.asJsonObject else null
    } catch (failure: RuntimeException) {
        null
    }
}

class AssistantWatch(initial: String) {
    private var last: String = initial

    @Synchronized
    fun changed(next: String): Boolean {
        if (next == last) {
            return false
        }
        last = next
        return true
    }
}

class AvailabilityRecompute(
    private val pluginsWatch: PluginsWatch,
    private val assistantWatch: AssistantWatch,
    private val pushPlugins: (List<String>) -> Unit,
    private val pushAssistant: (String) -> Unit,
) {
    fun run(stored: String?, plugins: List<String>) {
        if (pluginsWatch.changed(plugins)) {
            pushPlugins(plugins)
        }
        val effective = EffectiveAssistant.of(stored, plugins)
        if (assistantWatch.changed(effective)) {
            pushAssistant(effective)
        }
    }
}

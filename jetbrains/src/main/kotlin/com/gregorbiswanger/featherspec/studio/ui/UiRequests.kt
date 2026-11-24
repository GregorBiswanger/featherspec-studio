package com.gregorbiswanger.featherspec.studio.ui

import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import java.net.URI
import java.net.URISyntaxException

data class NotifyRequest(val message: String, val actions: List<String>)

data class PickEntry(val index: Int, val display: String)

data class PickRequest(val entries: List<PickEntry>, val placeholder: String?)

data class ConfirmRequest(val message: String, val detail: String, val confirmLabel: String) {
    val text: String
        get() = if (detail.isBlank()) message else "$message\n\n$detail"
}

object UiRequests {
    const val OK_NULL = "{\"ok\":null}"

    fun notify(argsJson: String): NotifyRequest? {
        val args = objectOf(argsJson) ?: return null
        val message = text(args, "message") ?: return null
        val member = args.get("actions")
        if (member == null || !member.isJsonArray) {
            return null
        }
        val actions = ArrayList<String>()
        for (item in member.asJsonArray) {
            if (!item.isJsonPrimitive || !item.asJsonPrimitive.isString) {
                return null
            }
            actions.add(item.asString)
        }
        return NotifyRequest(message, actions)
    }

    fun pick(argsJson: String): PickRequest? {
        val args = objectOf(argsJson) ?: return null
        val member = args.get("items")
        if (member == null || !member.isJsonArray) {
            return null
        }
        val entries = ArrayList<PickEntry>()
        for ((index, item) in member.asJsonArray.withIndex()) {
            if (!item.isJsonObject) {
                return null
            }
            val label = text(item.asJsonObject, "label") ?: return null
            val parts = listOf(label) + listOfNotNull(text(item.asJsonObject, "description"), text(item.asJsonObject, "detail")).filter { it.isNotBlank() }
            entries.add(PickEntry(index, parts.joinToString(" - ")))
        }
        return PickRequest(entries, text(args, "placeholder"))
    }

    fun confirm(argsJson: String): ConfirmRequest? {
        val args = objectOf(argsJson) ?: return null
        val message = text(args, "message") ?: return null
        val confirmLabel = text(args, "confirmLabel") ?: return null
        return ConfirmRequest(message, text(args, "detail").orEmpty(), confirmLabel)
    }

    fun progressTitle(argsJson: String): String? = objectOf(argsJson)?.let { text(it, "title") }

    fun externalUrl(argsJson: String): String? {
        val url = objectOf(argsJson)?.let { text(it, "url") }?.trim() ?: return null
        return try {
            val uri = URI(url)
            val scheme = uri.scheme?.lowercase()
            if ((scheme == "http" || scheme == "https") && !uri.host.isNullOrEmpty()) url else null
        } catch (failure: URISyntaxException) {
            null
        }
    }

    fun progressId(payloadJson: String): String? = try {
        val parsed = JsonParser.parseString(payloadJson)
        if (parsed.isJsonPrimitive && parsed.asJsonPrimitive.isString) parsed.asString else null
    } catch (failure: RuntimeException) {
        null
    }

    fun cancelPayload(id: String): String = JsonObject().apply { addProperty("id", id) }.toString()

    fun chosen(label: String?): String = if (label == null) OK_NULL else JsonObject().apply { addProperty("ok", label) }.toString()

    fun index(index: Int?): String = if (index == null) OK_NULL else JsonObject().apply { addProperty("ok", index) }.toString()

    fun confirmed(value: Boolean): String = JsonObject().apply { addProperty("ok", value) }.toString()

    fun started(id: String): String = chosen(id)

    private fun objectOf(json: String): JsonObject? = try {
        val parsed = JsonParser.parseString(json)
        if (parsed.isJsonObject) parsed.asJsonObject else null
    } catch (failure: RuntimeException) {
        null
    }

    private fun text(args: JsonObject, name: String): String? {
        val member = args.get(name)
        return if (member != null && member.isJsonPrimitive && member.asJsonPrimitive.isString) member.asString else null
    }
}

class ProgressBook {
    private val active = LinkedHashMap<String, Boolean>()
    private var counter = 0

    @Synchronized
    fun begin(): String {
        counter += 1
        val id = "progress-$counter"
        active[id] = false
        return id
    }

    @Synchronized
    fun isActive(id: String): Boolean = active.containsKey(id)

    @Synchronized
    fun requestCancel(id: String): Boolean {
        if (active[id] != false) {
            return false
        }
        active[id] = true
        return true
    }

    @Synchronized
    fun finish(id: String): Boolean = active.remove(id) != null

    @Synchronized
    fun finishAll(): List<String> {
        val ids = active.keys.toList()
        active.clear()
        return ids
    }
}

object LogLines {
    fun parse(payload: String): List<String> = try {
        val parsed = JsonParser.parseString(payload)
        if (parsed.isJsonArray) parsed.asJsonArray.map { it.asString } else listOf(parsed.asString)
    } catch (failure: RuntimeException) {
        listOf(payload)
    }

    fun payload(line: String): String = JsonArray().apply { add(line) }.toString()

    fun text(lines: List<String>): String = lines.joinToString("") { it + "\n" }
}

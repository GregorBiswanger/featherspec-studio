package com.gregorbiswanger.featherspec.studio.probe

import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.gregorbiswanger.featherspec.studio.HostTexts
import com.gregorbiswanger.featherspec.studio.runtime.CoreState
import com.gregorbiswanger.featherspec.studio.runtime.UnavailableKind

data class BalloonRecord(val action: String, val content: String, val actions: List<String>)

data class NoJcefReport(
    val state: String,
    val jcefSupported: Boolean,
    val toolWindowContent: String,
    val emptyText: String,
    val status: String,
    val balloons: List<BalloonRecord>,
    val settings: Boolean,
) {
    fun toJson(): String {
        val root = JsonObject()
        root.addProperty("state", state)
        root.addProperty("jcefSupported", jcefSupported)
        root.addProperty("toolWindowContent", toolWindowContent)
        root.addProperty("emptyText", emptyText)
        root.addProperty("status", status)
        val list = JsonArray()
        balloons.forEach { balloon ->
            val entry = JsonObject()
            entry.addProperty("action", balloon.action)
            entry.addProperty("content", balloon.content)
            val labels = JsonArray()
            balloon.actions.forEach { labels.add(it) }
            entry.add("actions", labels)
            list.add(entry)
        }
        root.add("balloons", list)
        root.addProperty("settings", settings)
        return root.toString()
    }
}

object NoJcefState {
    const val UNSUPPORTED = "unsupported"
    const val SUSPENDED = "suspended"

    fun of(state: CoreState): String = when (state) {
        CoreState.Loading -> "loading"
        CoreState.Ready -> "ready"
        is CoreState.Failed -> "failed"
        is CoreState.Unavailable -> if (state.kind == UnavailableKind.SUSPENDED) SUSPENDED else UNSUPPORTED
    }
}

object NoJcefCompare {
    val ACTIONS = listOf("open", "copyNextStep", "setup")
    const val NOTICE_CLASS = "UnavailableNotice"

    fun differences(expectedKind: String, json: String): List<String> {
        require(expectedKind == NoJcefState.UNSUPPORTED || expectedKind == NoJcefState.SUSPENDED) { "unknown kind '$expectedKind'" }
        val root = parse(json) ?: return listOf("the probe wrote no JSON object")
        val reason = if (expectedKind == NoJcefState.SUSPENDED) HostTexts.JCEF_SUSPENDED else HostTexts.JCEF_UNSUPPORTED
        val problems = ArrayList<String>()
        val state = text(root, "state")
        if (state != expectedKind) {
            problems.add("state: expected $expectedKind, observed $state")
        }
        val content = text(root, "toolWindowContent")
        if (content != NOTICE_CLASS) {
            problems.add("tool window content: expected $NOTICE_CLASS, observed '$content'")
        }
        val empty = text(root, "emptyText")
        if (!empty.contains(reason)) {
            problems.add("tool window notice lacks the reason: '$empty'")
        }
        if (!empty.contains(HostTexts.OPEN_HELP)) {
            problems.add("tool window notice lacks '${HostTexts.OPEN_HELP}': '$empty'")
        }
        val status = text(root, "status")
        if (status != HostTexts.STATUS_UNAVAILABLE) {
            problems.add("status text: expected '${HostTexts.STATUS_UNAVAILABLE}', observed '$status'")
        }
        val balloons = root.get("balloons")?.takeIf { it.isJsonArray }?.asJsonArray ?: JsonArray()
        if (balloons.size() != ACTIONS.size) {
            problems.add("balloons: expected ${ACTIONS.size}, observed ${balloons.size()}")
        }
        ACTIONS.forEachIndexed { index, name ->
            val balloon = if (index < balloons.size()) asObject(balloons[index]) else null
            if (balloon == null) {
                problems.add("balloon for $name: missing")
                return@forEachIndexed
            }
            if (text(balloon, "action") != name) {
                problems.add("balloon $index: expected action $name, observed '${text(balloon, "action")}'")
            }
            if (!text(balloon, "content").contains(reason)) {
                problems.add("balloon for $name lacks the reason: '${text(balloon, "content")}'")
            }
            val labels = balloon.get("actions")?.takeIf { it.isJsonArray }?.asJsonArray?.map { it.asString } ?: emptyList()
            if (HostTexts.OPEN_HELP !in labels) {
                problems.add("balloon for $name lacks '${HostTexts.OPEN_HELP}': $labels")
            }
        }
        if (root.get("settings")?.takeIf { it.isJsonPrimitive }?.asBoolean != true) {
            problems.add("the settings page returned no component")
        }
        return problems
    }

    fun unreachable(expectedKind: String, json: String): Boolean {
        val root = parse(json) ?: return false
        val supported = root.get("jcefSupported")?.takeIf { it.isJsonPrimitive }?.asBoolean == true
        val state = root.get("state")?.takeIf { it.isJsonPrimitive }?.asString
        return when (expectedKind) {
            NoJcefState.UNSUPPORTED -> supported
            NoJcefState.SUSPENDED -> supported && (state == "ready" || state == "loading")
            else -> false
        }
    }

    private fun parse(json: String): JsonObject? = try {
        asObject(JsonParser.parseString(json))
    } catch (failure: RuntimeException) {
        null
    }

    private fun asObject(element: JsonElement): JsonObject? = if (element.isJsonObject) element.asJsonObject else null

    private fun text(root: JsonObject, name: String): String =
        root.get(name)?.takeIf { it.isJsonPrimitive }?.asString.orEmpty()
}

object IdeaLogScan {
    private val ENTRY_START = Regex("""^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}""")
    private val LEVEL = Regex("""\s(ERROR|SEVERE)\s+-\s""")
    private const val SHORT_CATEGORY = "#c.g.f."
    private const val MAX_LENGTH = 300

    fun problems(log: String): List<String> {
        val result = ArrayList<String>()
        entries(log).forEach { entry ->
            val header = entry.first()
            if (LEVEL.containsMatchIn(header) && names(entry)) {
                result.add(header.take(MAX_LENGTH))
            }
        }
        return result
    }

    private fun names(entry: List<String>): Boolean =
        entry.filterNot { it.contains("Last Action:") }.any {
            it.contains("com.gregorbiswanger", ignoreCase = true) ||
                it.contains(SHORT_CATEGORY) ||
                it.contains("Plugin to blame: FeatherSpec", ignoreCase = true)
        }

    private fun entries(log: String): List<List<String>> {
        val result = ArrayList<MutableList<String>>()
        log.lineSequence().forEach { line ->
            if (ENTRY_START.containsMatchIn(line) || result.isEmpty()) {
                result.add(mutableListOf(line))
            } else {
                result.last().add(line)
            }
        }
        return result
    }
}

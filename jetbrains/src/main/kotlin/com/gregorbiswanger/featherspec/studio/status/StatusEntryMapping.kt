package com.gregorbiswanger.featherspec.studio.status

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.gregorbiswanger.featherspec.studio.HostTexts
import com.gregorbiswanger.featherspec.studio.actions.NoticeContent
import com.gregorbiswanger.featherspec.studio.runtime.CoreState
import com.gregorbiswanger.featherspec.studio.runtime.UnavailableKind

data class StatusView(val iconId: String?, val text: String, val tooltipLines: List<String>, val accessibleName: String)

sealed interface StatusClick {
    data object None : StatusClick
    data class Invoke(val command: String) : StatusClick
    data class Notice(val kind: UnavailableKind) : StatusClick
}

sealed interface StatusDisplay {
    data object Hidden : StatusDisplay
    data class Shown(val view: StatusView, val click: StatusClick) : StatusDisplay
}

object StatusEntryMapping {
    const val LOADING_ICON = "loading"
    const val WARNING_ICON = "warning"

    private val COMMANDS = setOf("copyNextStep", "selectProject")
    private val ICON_PREFIX = Regex("""^\$\(([a-z-]+)\)\s*""")
    private val COMMAND_LINKS = Regex("""^\[[^\]]*\]\(command:[^)]*\)( · \[[^\]]*\]\(command:[^)]*\))*$""")
    private const val PUNCTUATION = "!\"#\$%&'()*+,-./:;<=>?@[\\]^_`{|}~"

    fun display(state: CoreState, statusJson: String?): StatusDisplay = when (state) {
        CoreState.Loading -> StatusDisplay.Shown(
            StatusView(LOADING_ICON, "", listOf(HostTexts.LOADING), HostTexts.LOADING),
            StatusClick.None,
        )
        is CoreState.Unavailable -> {
            val reason = NoticeContent.of(state.kind).text
            StatusDisplay.Shown(
                StatusView(WARNING_ICON, HostTexts.STATUS_UNAVAILABLE, listOf(reason), "${HostTexts.STATUS_UNAVAILABLE}. $reason"),
                StatusClick.Notice(state.kind),
            )
        }
        is CoreState.Failed -> StatusDisplay.Hidden
        CoreState.Ready -> entry(statusJson)
    }

    fun tooltipHtml(lines: List<String>): String? =
        if (lines.isEmpty()) null else lines.joinToString(separator = "<br>", prefix = "<html>", postfix = "</html>") { escape(it) }

    private fun entry(statusJson: String?): StatusDisplay {
        val parsed = parse(statusJson) ?: return StatusDisplay.Hidden
        return StatusDisplay.Shown(parsed.first, StatusClick.Invoke(parsed.second))
    }

    private fun parse(statusJson: String?): Pair<StatusView, String>? {
        if (statusJson == null) {
            return null
        }
        val view = objectOf(statusJson) ?: return null
        val raw = text(view, "text") ?: return null
        val command = text(view, "command")?.takeIf { it in COMMANDS } ?: return null
        val match = ICON_PREFIX.find(raw)
        val label = if (match == null) raw else raw.substring(match.range.last + 1)
        val accessible = text(view, "accessibleLabel") ?: label
        return StatusView(match?.groupValues?.get(1), label, tooltipLines(view.get("tooltip")), accessible) to command
    }

    private fun objectOf(json: String): JsonObject? = try {
        val parsed = JsonParser.parseString(json)
        if (parsed.isJsonObject) parsed.asJsonObject else null
    } catch (failure: RuntimeException) {
        null
    }

    private fun tooltipLines(tooltip: com.google.gson.JsonElement?): List<String> {
        if (tooltip == null || !tooltip.isJsonObject) {
            return emptyList()
        }
        val holder = tooltip.asJsonObject
        text(holder, "plain")?.let { plain -> return plain.split('\n').filter { it.isNotBlank() } }
        val markdown = text(holder, "markdown") ?: return emptyList()
        return markdown.split("\n\n")
            .map { it.trim() }
            .filter { it.isNotEmpty() && !COMMAND_LINKS.matches(it) }
            .map { unmark(it) }
    }

    private fun unmark(markdown: String): String {
        val out = StringBuilder()
        var index = 0
        while (index < markdown.length) {
            val char = markdown[index]
            if (char == '\\' && index + 1 < markdown.length && markdown[index + 1] in PUNCTUATION) {
                out.append(markdown[index + 1])
                index += 2
            } else if (char == '*' && index + 1 < markdown.length && markdown[index + 1] == '*') {
                index += 2
            } else {
                out.append(char)
                index++
            }
        }
        return out.toString()
    }

    private fun escape(text: String): String {
        val out = StringBuilder()
        text.forEach { char ->
            when (char) {
                '&' -> out.append("&amp;")
                '<' -> out.append("&lt;")
                '>' -> out.append("&gt;")
                '"' -> out.append("&quot;")
                else -> out.append(char)
            }
        }
        return out.toString()
    }

    private fun text(source: JsonObject, name: String): String? {
        val member = source.get(name)
        return if (member != null && member.isJsonPrimitive && member.asJsonPrimitive.isString) member.asString else null
    }
}

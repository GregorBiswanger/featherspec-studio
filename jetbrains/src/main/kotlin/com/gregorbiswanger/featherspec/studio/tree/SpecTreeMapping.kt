package com.gregorbiswanger.featherspec.studio.tree

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.gregorbiswanger.featherspec.studio.HostTexts
import com.gregorbiswanger.featherspec.studio.runtime.CoreState
import com.gregorbiswanger.featherspec.studio.runtime.UnavailableKind

enum class NodeIcon {
    PLAY, EYE, CIRCLE_SLASH, LIST_FLAT, PASS, CHECK, WARNING, NONE;

    companion object {
        fun fromCodicon(name: String?): NodeIcon = when (name) {
            "play" -> PLAY
            "eye" -> EYE
            "circle-slash" -> CIRCLE_SLASH
            "list-flat" -> LIST_FLAT
            "pass" -> PASS
            "check" -> CHECK
            "warning" -> WARNING
            else -> NONE
        }
    }
}

data class Tone(val light: Int, val dark: Int)

data class SpecNode(
    val id: String,
    val label: String,
    val description: String,
    val icon: NodeIcon,
    val tone: Tone?,
    val accessibleLabel: String,
    val tooltip: String,
    val step: Boolean,
    val plan: Boolean,
    val map: Boolean,
    val stem: String,
    val path: String?,
    val line: String?,
    val planKey: String?,
    val mapStep: String?,
    val specKey: String,
    val state: String,
) {
    val tooltipHtml: String
        get() = TooltipText.html(tooltip)

    val waiting: Boolean
        get() = state == "Review" || state == "Blocked"

    fun rowArgs(): String {
        val row = JsonObject()
        row.addProperty("specKey", specKey)
        row.addProperty("stem", stem)
        if (path != null) {
            row.addProperty("path", path)
        }
        if (planKey != null) {
            row.addProperty("planKey", planKey)
        }
        if (line != null) {
            row.addProperty("line", line)
        }
        if (mapStep != null) {
            row.addProperty("mapStep", mapStep)
        }
        val args = JsonObject()
        args.add("row", row)
        return args.toString()
    }
}

data class GroupNode(
    val id: String,
    val label: String,
    val description: String,
    val collapsed: Boolean,
    val icon: NodeIcon,
    val tone: Tone?,
    val tooltip: String?,
    val accessibleLabel: String?,
    val children: List<SpecNode>,
) {
    val tooltipHtml: String?
        get() = tooltip?.let { TooltipText.html(it) }
}

data class ActionNode(val label: String, val action: String, val icon: NodeIcon)

data class SpecTreeView(
    val message: String?,
    val groups: List<GroupNode>,
    val actions: List<ActionNode>,
    val welcome: Boolean,
    val badgeTooltip: String?,
    val description: String?,
) {
    val waiting: Int
        get() = groups.sumOf { group -> group.children.count { it.waiting } }
}

data class EmptyAction(val label: String, val command: String, val args: String)

data class EmptyContent(val lines: List<String>, val actions: List<EmptyAction>)

object SpecTreeMapping {
    const val TITLE = "FeatherSpec Studio"

    private const val WELCOME_LINE = "No FeatherSpec project found."
    private const val WELCOME_SENTENCE =
        "Set up FeatherSpec downloads the latest FeatherSpec release from GitHub and adds its files; existing files are never overwritten."

    private val TONES: Map<String, Tone> = mapOf(
        "charts.blue" to Tone(0x3574F0, 0x548AF7),
        "charts.green" to Tone(0x208A3C, 0x5FB865),
        "charts.orange" to Tone(0xB86E00, 0xE0A030),
        "charts.red" to Tone(0xDB3B4B, 0xE55765),
        "problemsWarningIcon.foreground" to Tone(0xB86E00, 0xF2C55C),
    )

    fun title(waiting: Int): String = if (waiting >= 1) "$TITLE ($waiting)" else TITLE

    fun toneOf(color: String?): Tone? = if (color == null) null else TONES[color]

    fun actionArgs(action: String): String {
        val args = JsonObject()
        args.addProperty("action", action)
        return args.toString()
    }

    fun parse(json: String): SpecTreeView? {
        val root = try {
            JsonParser.parseString(json)
        } catch (failure: RuntimeException) {
            return null
        }
        if (!root.isJsonObject) {
            return null
        }
        val tree = root.asJsonObject
        val groups = ArrayList<GroupNode>()
        val actions = ArrayList<ActionNode>()
        val items = tree.get("items")
        if (items != null && items.isJsonArray) {
            for (item in items.asJsonArray) {
                if (!item.isJsonObject) {
                    continue
                }
                val entry = item.asJsonObject
                when (entry.text("kind")) {
                    "group" -> group(entry)?.let { groups.add(it) }
                    "action" -> action(entry)?.let { actions.add(it) }
                }
            }
        }
        val badge = tree.get("badge")
        return SpecTreeView(
            message = tree.text("message"),
            groups = groups,
            actions = actions,
            welcome = tree.text("welcome") != null,
            badgeTooltip = if (badge != null && badge.isJsonObject) badge.asJsonObject.text("tooltip") else null,
            description = tree.text("description"),
        )
    }

    fun emptyContent(view: SpecTreeView?, state: CoreState): EmptyContent {
        if (state is CoreState.Unavailable) {
            val line = if (state.kind == UnavailableKind.SUSPENDED) HostTexts.JCEF_SUSPENDED else HostTexts.JCEF_UNSUPPORTED
            return EmptyContent(listOf(line), emptyList())
        }
        if (state is CoreState.Failed) {
            return EmptyContent(
                listOf(HostTexts.S5),
                listOf(EmptyAction(HostTexts.SHOW_OUTPUT, "shellAction", actionArgs("showOutput"))),
            )
        }
        if (view == null) {
            return EmptyContent(listOf(HostTexts.LOADING), emptyList())
        }
        if (view.welcome) {
            return EmptyContent(
                listOf(WELCOME_LINE, WELCOME_SENTENCE),
                listOf(
                    EmptyAction("Set up FeatherSpec", "setup", "{}"),
                    EmptyAction("Open setup guide", "shellAction", actionArgs("openSetupGuide")),
                    EmptyAction("Refresh", "shellAction", actionArgs("refresh")),
                ),
            )
        }
        if (view.groups.isNotEmpty()) {
            return EmptyContent(emptyList(), emptyList())
        }
        return EmptyContent(
            listOfNotNull(view.message),
            view.actions.map { EmptyAction(it.label, "shellAction", actionArgs(it.action)) },
        )
    }

    private fun group(entry: JsonObject): GroupNode? {
        val id = entry.text("id") ?: return null
        val label = entry.text("label") ?: return null
        val children = ArrayList<SpecNode>()
        val rows = entry.get("children")
        if (rows != null && rows.isJsonArray) {
            for (row in rows.asJsonArray) {
                if (row.isJsonObject) {
                    spec(row.asJsonObject)?.let { children.add(it) }
                }
            }
        }
        return GroupNode(
            id = id,
            label = label,
            description = entry.text("description").orEmpty(),
            collapsed = entry.flag("collapsed"),
            icon = NodeIcon.fromCodicon(entry.text("icon")),
            tone = toneOf(entry.text("color")),
            tooltip = entry.text("tooltip"),
            accessibleLabel = entry.text("accessibleLabel"),
            children = children,
        )
    }

    private fun spec(entry: JsonObject): SpecNode? {
        val id = entry.text("id") ?: return null
        val label = entry.text("label") ?: return null
        val specKey = entry.text("specKey") ?: return null
        val stem = entry.text("stem") ?: return null
        val flags = entry.text("contextValue").orEmpty().split(' ').toSet()
        return SpecNode(
            id = id,
            label = label,
            description = entry.text("description").orEmpty(),
            icon = NodeIcon.fromCodicon(entry.text("icon")),
            tone = toneOf(entry.text("color")),
            accessibleLabel = entry.text("accessibleLabel") ?: label,
            tooltip = entry.text("tooltip").orEmpty(),
            step = "step" in flags,
            plan = "plan" in flags,
            map = "map" in flags,
            stem = stem,
            path = entry.text("path"),
            line = entry.text("line"),
            planKey = entry.text("planKey"),
            mapStep = entry.text("mapStep"),
            specKey = specKey,
            state = entry.text("state").orEmpty(),
        )
    }

    private fun action(entry: JsonObject): ActionNode? {
        val label = entry.text("label") ?: return null
        val action = entry.text("action") ?: return null
        return ActionNode(label, action, NodeIcon.fromCodicon(entry.text("icon")))
    }

    private fun JsonObject.text(key: String): String? {
        val member = get(key)
        return if (member != null && member.isJsonPrimitive && member.asJsonPrimitive.isString) member.asString else null
    }

    private fun JsonObject.flag(key: String): Boolean {
        val member = get(key)
        return member != null && member.isJsonPrimitive && member.asJsonPrimitive.isBoolean && member.asBoolean
    }
}

object TooltipText {
    private const val PUNCTUATION = "!\"#\$%&'()*+,-./:;<=>?@[\\]^_`{|}~"

    fun html(markdown: String): String {
        val out = StringBuilder("<html>")
        var bold = false
        var index = 0
        while (index < markdown.length) {
            val char = markdown[index]
            if (char == '\\' && index + 1 < markdown.length && markdown[index + 1] in PUNCTUATION) {
                out.append(escape(markdown[index + 1]))
                index += 2
            } else if (char == '`') {
                var fenceEnd = index
                while (fenceEnd < markdown.length && markdown[fenceEnd] == '`') {
                    fenceEnd++
                }
                val fence = markdown.substring(index, fenceEnd)
                val close = markdown.indexOf(fence, fenceEnd)
                if (close < 0) {
                    out.append(fence)
                    index = fenceEnd
                } else {
                    var code = markdown.substring(fenceEnd, close)
                    if (code.length >= 2 && code.startsWith(' ') && code.endsWith(' ') && code.isNotBlank()) {
                        code = code.substring(1, code.length - 1)
                    }
                    out.append("<code>").append(escapeAll(code)).append("</code>")
                    index = close + fence.length
                }
            } else if (char == '*' && index + 1 < markdown.length && markdown[index + 1] == '*') {
                out.append(if (bold) "</b>" else "<b>")
                bold = !bold
                index += 2
            } else if (char == '\n') {
                out.append("<br>")
                index++
            } else {
                out.append(escape(char))
                index++
            }
        }
        if (bold) {
            out.append("</b>")
        }
        return out.append("</html>").toString()
    }

    private fun escapeAll(text: String): String {
        val out = StringBuilder()
        text.forEach { out.append(escape(it)) }
        return out.toString()
    }

    private fun escape(char: Char): String = when (char) {
        '&' -> "&amp;"
        '<' -> "&lt;"
        '>' -> "&gt;"
        '"' -> "&quot;"
        else -> char.toString()
    }
}

package com.gregorbiswanger.featherspec.studio.probe

import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonNull
import com.google.gson.JsonObject
import com.google.gson.JsonPrimitive
import com.gregorbiswanger.featherspec.studio.assistant.CliAgent
import com.gregorbiswanger.featherspec.studio.assistant.CliAgents
import com.gregorbiswanger.featherspec.studio.assistant.Screen
import com.gregorbiswanger.featherspec.studio.assistant.TerminalTab

object Redaction {
    const val TAIL_CHARS = 1_500
    const val EMAIL = "<email>"
    const val TOKEN = "<token>"
    const val HOME = "~"

    private val EMAIL_PATTERN = Regex("[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}")
    private val TOKEN_PATTERN = Regex("[A-Za-z0-9_\\-]{24,}")

    fun redact(text: String, home: String?): String {
        var result = EMAIL_PATTERN.replace(text, EMAIL)
        val homePattern = homePattern(home)
        if (homePattern != null) {
            result = homePattern.replace(result, HOME)
        }
        return TOKEN_PATTERN.replace(result, TOKEN)
    }

    fun tail(text: String, home: String?, limit: Int = TAIL_CHARS): String = redact(text.trimEnd(), home).takeLast(limit)

    private fun homePattern(home: String?): Regex? {
        val trimmed = home?.trim()?.trimEnd('/', '\\') ?: return null
        if (trimmed.length < 2) {
            return null
        }
        val body = trimmed.map { if (it == '/' || it == '\\') "[\\\\/]" else Regex.escape(it.toString()) }.joinToString("")
        return Regex("$body(?![A-Za-z0-9_\\-])", RegexOption.IGNORE_CASE)
    }
}

data class MarkerHit(val group: String, val marker: String, val hit: Boolean, val line: Int?)

object HandoverScreen {
    const val LAST_LINES = 12
    const val LINE_LIMIT = 300
    const val READY = "ready"
    const val WAITING = "waiting"
    const val UNKNOWN = "unknown"
    private val ESCAPE_SIGNS = listOf("\u001b", "^[", "[200~", "[201~")

    fun verdict(agent: CliAgent, running: Boolean, text: String): String {
        val inputBox = agent.hasInputBox(text)
        if (running && inputBox) {
            return READY
        }
        val waiting = !inputBox && agent.waitingMarkers.any { text.contains(it) }
        return if (waiting) WAITING else UNKNOWN
    }

    fun markers(text: String): List<MarkerHit> = CliAgents.ALL.flatMap { agent ->
        agent.inputMarkers.map { hit("${agent.id}.input", it, text) } + agent.waitingMarkers.map { hit("${agent.id}.waiting", it, text) }
    }

    fun escapeVisible(text: String): Boolean = ESCAPE_SIGNS.any { text.contains(it) }

    fun submitted(blocksBefore: Int, blocksAfter: Int): Boolean = blocksAfter > blocksBefore

    fun tab(tab: TerminalTab, name: String?, screen: Screen?, screenError: String?, home: String?): JsonObject {
        val text = screen?.text ?: ""
        val lines = text.split('\n').map { it.trimEnd('\r') }
        val json = JsonObject()
        json.add("name", masked(name, home))
        json.add("workingDirectory", masked(tab.workingDirectory, home))
        json.add("command", masked(tab.command, home))
        json.addProperty("shellReady", tab.shellReady)
        json.addProperty("executing", tab.executing)
        val agent = CliAgents.agentOf(tab.command)
        val running = agent != null && tab.executing
        json.add("agent", if (agent == null) JsonNull.INSTANCE else JsonPrimitive(agent.id))
        json.addProperty("agentRunning", running)
        json.addProperty("verdict", if (screen == null || agent == null) UNKNOWN else verdict(agent, running, text))
        if (screenError != null) {
            json.addProperty("screenError", Redaction.redact(screenError, home))
        }
        json.add("markers", markersJson(text))
        json.addProperty("textLength", text.length)
        json.addProperty("lineCount", if (text.isEmpty()) 0 else lines.size)
        json.addProperty("trailingBlankLines", if (text.isEmpty()) 0 else lines.reversed().takeWhile { it.isBlank() }.size)
        val last = JsonArray()
        lines.dropLastWhile { it.isBlank() }.takeLast(LAST_LINES).forEach { last.add(Redaction.redact(it, home).take(LINE_LIMIT)) }
        json.add("lastLines", last)
        return json
    }

    private fun hit(group: String, marker: String, text: String): MarkerHit {
        val index = text.lastIndexOf(marker)
        if (index < 0) {
            return MarkerHit(group, marker, false, null)
        }
        return MarkerHit(group, marker, true, text.substring(0, index).count { it == '\n' } + 1)
    }

    private fun markersJson(text: String): JsonArray {
        val array = JsonArray()
        for (found in markers(text)) {
            val item = JsonObject()
            item.addProperty("group", found.group)
            item.addProperty("marker", found.marker)
            item.addProperty("hit", found.hit)
            item.add("line", if (found.line == null) JsonNull.INSTANCE else JsonPrimitive(found.line))
            array.add(item)
        }
        return array
    }

    private fun masked(value: String?, home: String?): JsonElement =
        if (value == null) JsonNull.INSTANCE else JsonPrimitive(Redaction.redact(value, home))
}

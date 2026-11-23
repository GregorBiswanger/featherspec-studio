package com.gregorbiswanger.featherspec.studio.probe

import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonNull
import com.google.gson.JsonObject
import com.google.gson.JsonPrimitive
import com.gregorbiswanger.featherspec.studio.assistant.ClaudeReadiness
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

    fun verdict(claudeRunning: Boolean, text: String): String {
        val inputBox = ClaudeReadiness.hasInputBox(text)
        if (claudeRunning && inputBox) {
            return READY
        }
        val waiting = !inputBox && ClaudeReadiness.WAITING_MARKERS.any { text.contains(it) }
        return if (waiting) WAITING else UNKNOWN
    }

    fun markers(text: String): List<MarkerHit> =
        ClaudeReadiness.INPUT_MARKERS.map { hit("input", it, text) } + ClaudeReadiness.WAITING_MARKERS.map { hit("waiting", it, text) }

    fun tab(tab: TerminalTab, name: String?, screen: Screen?, screenError: String?, home: String?): JsonObject {
        val text = screen?.text ?: ""
        val lines = text.split('\n').map { it.trimEnd('\r') }
        val json = JsonObject()
        json.add("name", masked(name, home))
        json.add("workingDirectory", masked(tab.workingDirectory, home))
        json.add("command", masked(tab.command, home))
        json.addProperty("shellReady", tab.shellReady)
        json.addProperty("executing", tab.executing)
        json.addProperty("claudeRunning", screen?.claudeRunning ?: false)
        json.addProperty("verdict", if (screen == null) UNKNOWN else verdict(screen.claudeRunning, text))
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

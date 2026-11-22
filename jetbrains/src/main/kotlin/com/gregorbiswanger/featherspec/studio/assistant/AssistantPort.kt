package com.gregorbiswanger.featherspec.studio.assistant

import com.google.gson.JsonNull
import com.google.gson.JsonObject
import com.google.gson.JsonParser

enum class ClaudeTarget { CURRENT, NEW }

data class ClaudeRequest(val target: ClaudeTarget, val text: String)

enum class ChatAssistant(val id: String) {
    COPILOT("copilot"),
    JUNIE("junie"),
}

interface AssistantCalls {
    fun claudeTerminal(request: ClaudeRequest)

    fun openChat(assistant: ChatAssistant): Boolean
}

object UnavailableAssistantCalls : AssistantCalls {
    override fun claudeTerminal(request: ClaudeRequest) {
        throw IllegalStateException("the assistant calls are not available")
    }

    override fun openChat(assistant: ChatAssistant): Boolean = false
}

object AssistantRequests {
    const val CLAUDE_TERMINAL = "assistant.claudeTerminal"
    const val OPEN_CHAT = "assistant.openChat"
    const val OPENED = "opened"
    const val NOT_FOUND = "notFound"

    fun hasControlCharacter(text: String): Boolean =
        text.any { Character.isISOControl(it) || it == LINE_SEPARATOR || it == PARAGRAPH_SEPARATOR }

    fun claudeRequest(argsJson: String): ClaudeRequest {
        val args = objectOf(argsJson) ?: throw IllegalArgumentException("$CLAUDE_TERMINAL needs target and text")
        val target = when (text(args, "target")) {
            "current" -> ClaudeTarget.CURRENT
            "new" -> ClaudeTarget.NEW
            else -> throw IllegalArgumentException("$CLAUDE_TERMINAL needs the target current or new")
        }
        val line = text(args, "text")
        require(!line.isNullOrEmpty()) { "$CLAUDE_TERMINAL needs text" }
        require(!hasControlCharacter(line)) { "the text holds a control character" }
        return ClaudeRequest(target, line)
    }

    fun chatAssistant(argsJson: String): ChatAssistant {
        val id = objectOf(argsJson)?.let { text(it, "assistant") }
        return ChatAssistant.values().firstOrNull { it.id == id }
            ?: throw IllegalArgumentException("$OPEN_CHAT needs the assistant copilot or junie")
    }

    fun ok(value: String?): String = JsonObject().apply {
        if (value == null) add("ok", JsonNull.INSTANCE) else addProperty("ok", value)
    }.toString()

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

    private const val LINE_SEPARATOR = ' '
    private const val PARAGRAPH_SEPARATOR = ' '
}

class AssistantPort(private val calls: AssistantCalls) {
    fun answer(name: String, argsJson: String): String? = when (name) {
        AssistantRequests.CLAUDE_TERMINAL -> {
            calls.claudeTerminal(AssistantRequests.claudeRequest(argsJson))
            AssistantRequests.ok(null)
        }
        AssistantRequests.OPEN_CHAT -> {
            val opened = calls.openChat(AssistantRequests.chatAssistant(argsJson))
            AssistantRequests.ok(if (opened) AssistantRequests.OPENED else AssistantRequests.NOT_FOUND)
        }
        else -> null
    }
}

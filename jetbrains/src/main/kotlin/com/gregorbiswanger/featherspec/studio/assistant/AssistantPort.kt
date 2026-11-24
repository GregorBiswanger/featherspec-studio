package com.gregorbiswanger.featherspec.studio.assistant

import com.google.gson.JsonNull
import com.google.gson.JsonObject
import com.google.gson.JsonParser

enum class ChatAssistant(val id: String) {
    COPILOT("copilot"),
    JUNIE("junie"),
}

enum class AgentTarget { CURRENT, NEW }

data class AgentRequest(val agent: CliAgent, val target: AgentTarget, val text: String)

interface AssistantCalls {
    fun terminal(request: AgentRequest)

    fun openChat(assistant: ChatAssistant): Boolean
}

object UnavailableAssistantCalls : AssistantCalls {
    override fun terminal(request: AgentRequest) {
        throw IllegalStateException("the assistant calls are not available")
    }

    override fun openChat(assistant: ChatAssistant): Boolean = false
}

object AssistantRequests {
    const val TERMINAL = "assistant.terminal"
    const val OPEN_CHAT = "assistant.openChat"
    const val OPENED = "opened"
    const val NOT_FOUND = "notFound"

    fun hasControlCharacter(text: String): Boolean =
        text.any { Character.isISOControl(it) || it == LINE_SEPARATOR || it == PARAGRAPH_SEPARATOR }

    fun agentRequest(argsJson: String): AgentRequest {
        val args = objectOf(argsJson) ?: throw IllegalArgumentException("$TERMINAL needs assistant, target and text")
        val agent = CliAgents.byId(text(args, "assistant"))
            ?: throw IllegalArgumentException("$TERMINAL needs the assistant junie, claudeCode or copilot")
        val target = when (text(args, "target")) {
            "current" -> AgentTarget.CURRENT
            "new" -> AgentTarget.NEW
            else -> throw IllegalArgumentException("$TERMINAL needs the target current or new")
        }
        val line = text(args, "text")
        require(!line.isNullOrEmpty()) { "$TERMINAL needs text" }
        require(!hasControlCharacter(line)) { "the text holds a control character" }
        return AgentRequest(agent, target, line)
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
        AssistantRequests.TERMINAL -> {
            calls.terminal(AssistantRequests.agentRequest(argsJson))
            AssistantRequests.ok(null)
        }
        AssistantRequests.OPEN_CHAT -> {
            val opened = calls.openChat(AssistantRequests.chatAssistant(argsJson))
            AssistantRequests.ok(if (opened) AssistantRequests.OPENED else AssistantRequests.NOT_FOUND)
        }
        else -> null
    }
}

package com.gregorbiswanger.featherspec.studio.assistant

interface ChatWindow {
    val available: Boolean

    fun open()
}

object ChatWindows {
    val COPILOT_IDS: List<String> = listOf("GitHub Copilot Chat", "GitHub Copilot")
    val AI_CHAT_IDS: List<String> = listOf("AIAssistant", "AI Assistant")
    val JUNIE_IDS: List<String> = listOf("Junie")

    fun candidates(assistant: ChatAssistant, aiAssistantAvailable: Boolean): List<String> = when (assistant) {
        ChatAssistant.COPILOT -> COPILOT_IDS
        ChatAssistant.JUNIE -> if (aiAssistantAvailable) AI_CHAT_IDS else JUNIE_IDS
    }

    fun open(candidates: List<String>, find: (String) -> ChatWindow?): Boolean {
        for (id in candidates) {
            val window = try {
                find(id)
            } catch (failure: RuntimeException) {
                return false
            }
            if (window == null || !window.available) {
                continue
            }
            return try {
                window.open()
                true
            } catch (failure: RuntimeException) {
                false
            }
        }
        return false
    }
}

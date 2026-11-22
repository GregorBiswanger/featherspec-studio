package com.gregorbiswanger.featherspec.studio.assistant

import com.google.gson.JsonParser
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class AssistantPortTest {
    private class Recording(var chat: Boolean = true, var failure: RuntimeException? = null) : AssistantCalls {
        val terminal = ArrayList<ClaudeRequest>()
        val chats = ArrayList<ChatAssistant>()

        override fun claudeTerminal(request: ClaudeRequest) {
            terminal.add(request)
            failure?.let { throw it }
        }

        override fun openChat(assistant: ChatAssistant): Boolean {
            chats.add(assistant)
            return chat
        }
    }

    private fun reply(json: String?) = JsonParser.parseString(json).asJsonObject

    private fun refusal(port: AssistantPort, name: String, args: String): String =
        assertThrows(IllegalArgumentException::class.java) { port.answer(name, args) }.message.orEmpty()

    @Test
    fun `AC-023 only the two assistant calls are answered`() {
        val port = AssistantPort(Recording())
        assertEquals(null, port.answer("clipboard.write", """{"text":"x"}"""))
        assertEquals(null, port.answer("assistant.other", "{}"))
        assertEquals(null, port.answer("actions.openStudio", "{}"))
    }

    @Test
    fun `AC-011 a send reaches the terminal call with its target and its text untouched and answers ok null`() {
        val calls = Recording()
        val port = AssistantPort(calls)
        val current = reply(port.answer("assistant.claudeTerminal", """{"target":"current","text":"/sdd-plan .specs/active/0035-x.md @a"}"""))
        assertTrue(current.has("ok") && current.get("ok").isJsonNull)
        assertEquals(setOf("ok"), current.keySet())
        port.answer("assistant.claudeTerminal", """{"target":"new","text":"Implement T-003 of .specs/a.plan.md @b @c"}""")
        assertEquals(
            listOf(
                ClaudeRequest(ClaudeTarget.CURRENT, "/sdd-plan .specs/active/0035-x.md @a"),
                ClaudeRequest(ClaudeTarget.NEW, "Implement T-003 of .specs/a.plan.md @b @c"),
            ),
            calls.terminal,
        )
    }

    @Test
    fun `AC-014 a text with a control character is refused with a fixed message before any terminal call`() {
        val calls = Recording()
        val port = AssistantPort(calls)
        val texts = listOf("a\\nb", "a\\rb", "a\\tb", "a\\u001bb", "a\\u0000b", "a\\u007fb", "a\\u0085b", "a\\u2028b", "a\\u2029b", "\\n", "a\\u001b[201~b")
        for (text in texts) {
            assertEquals("the text holds a control character", refusal(port, "assistant.claudeTerminal", """{"target":"current","text":"$text"}"""), text)
        }
        assertEquals(emptyList<ClaudeRequest>(), calls.terminal)
    }

    @Test
    fun `AC-014 the control character check`() {
        for (text in listOf("a\nb", "a\rb", "a\tb", "\u001b", "\u0000", "\u007f", "\u0085", " ", " ")) {
            assertTrue(AssistantRequests.hasControlCharacter(text), text.length.toString())
        }
        for (text in listOf("", "plain line", "/sdd-plan .specs/active/0035-x.md @.specs/x.md", "Umlaut ä and 中", "tilde ~ and bracket [201~")) {
            assertFalse(AssistantRequests.hasControlCharacter(text), text)
        }
    }

    @Test
    fun `AC-013 a refused text never echoes the prompt in its message`() {
        val message = refusal(AssistantPort(Recording()), "assistant.claudeTerminal", """{"target":"current","text":"secret\nprompt"}""")
        assertFalse(message.contains("secret"))
        assertFalse(message.contains("prompt"))
    }

    @Test
    fun `AC-023 bad arguments of the terminal call fail with a message and reach no terminal`() {
        val calls = Recording()
        val port = AssistantPort(calls)
        val bad = listOf(
            "{}",
            """{"target":"current"}""",
            """{"text":"x"}""",
            """{"target":"other","text":"x"}""",
            """{"target":"Current","text":"x"}""",
            """{"target":1,"text":"x"}""",
            """{"target":"current","text":1}""",
            """{"target":"current","text":""}""",
            """{"target":"current","text":null}""",
            "[]",
            "not json",
            "",
        )
        for (args in bad) {
            assertTrue(refusal(port, "assistant.claudeTerminal", args).startsWith("assistant.claudeTerminal needs"), args)
        }
        assertEquals(emptyList<ClaudeRequest>(), calls.terminal)
    }

    @Test
    fun `AC-013 a failing terminal call is not caught here so that the router answers its message`() {
        val port = AssistantPort(Recording(failure = IllegalStateException("tab closed")))
        val thrown = assertThrows(IllegalStateException::class.java) { port.answer("assistant.claudeTerminal", """{"target":"current","text":"x"}""") }
        assertEquals("tab closed", thrown.message)
    }

    @Test
    fun `AC-016 the chat call answers opened or notFound for Copilot and Junie`() {
        val calls = Recording()
        val port = AssistantPort(calls)
        assertEquals("opened", reply(port.answer("assistant.openChat", """{"assistant":"copilot"}""")).get("ok").asString)
        calls.chat = false
        assertEquals("notFound", reply(port.answer("assistant.openChat", """{"assistant":"junie"}""")).get("ok").asString)
        assertEquals(listOf(ChatAssistant.COPILOT, ChatAssistant.JUNIE), calls.chats)
    }

    @Test
    fun `AC-023 the chat call refuses every other assistant and bad arguments`() {
        val calls = Recording()
        val port = AssistantPort(calls)
        for (args in listOf("{}", """{"assistant":"claudeCode"}""", """{"assistant":"none"}""", """{"assistant":1}""", """{"assistant":"Copilot"}""", "[]", "x", "")) {
            assertEquals("assistant.openChat needs the assistant copilot or junie", refusal(port, "assistant.openChat", args), args)
        }
        assertEquals(emptyList<ChatAssistant>(), calls.chats)
    }

    @Test
    fun `AC-023 the chat ids are the core ids`() {
        assertEquals(listOf("copilot", "junie"), ChatAssistant.values().map { it.id })
    }
}

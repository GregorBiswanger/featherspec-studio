package com.gregorbiswanger.featherspec.studio.assistant

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class ChatWindowsTest {
    private class Window(override val available: Boolean = true, private val failure: RuntimeException? = null) : ChatWindow {
        var opened = 0

        override fun open() {
            opened++
            failure?.let { throw it }
        }
    }

    private class Windows(val byId: Map<String, Window>) {
        val asked = ArrayList<String>()

        fun find(id: String): ChatWindow? {
            asked.add(id)
            return byId[id]
        }
    }

    @Test
    fun `AC-016 Copilot opens GitHub Copilot Chat`() {
        assertEquals(listOf("GitHub Copilot Chat"), ChatWindows.candidates(ChatAssistant.COPILOT, false).take(1))
        assertEquals(ChatWindows.candidates(ChatAssistant.COPILOT, true), ChatWindows.candidates(ChatAssistant.COPILOT, false))
    }

    @Test
    fun `AC-017 Junie opens AI Chat while AI Assistant is available and else the Junie tool window`() {
        assertEquals(listOf("AIAssistant"), ChatWindows.candidates(ChatAssistant.JUNIE, true).take(1))
        assertEquals(listOf("Junie"), ChatWindows.candidates(ChatAssistant.JUNIE, false))
        assertTrue(ChatWindows.candidates(ChatAssistant.JUNIE, true).none { it in ChatWindows.JUNIE_IDS })
        assertTrue(ChatWindows.candidates(ChatAssistant.JUNIE, false).none { it in ChatWindows.AI_CHAT_IDS })
    }

    @Test
    fun `AC-017 the candidate lists are never empty and hold no duplicate`() {
        for (assistant in ChatAssistant.values()) {
            for (ai in listOf(true, false)) {
                val ids = ChatWindows.candidates(assistant, ai)
                assertTrue(ids.isNotEmpty())
                assertEquals(ids.size, ids.toSet().size)
            }
        }
    }

    @Test
    fun `AC-016 the first existing window opens once and later candidates are not asked`() {
        val first = Window()
        val second = Window()
        val windows = Windows(mapOf("a" to first, "b" to second))
        assertTrue(ChatWindows.open(listOf("x", "a", "b"), windows::find))
        assertEquals(1, first.opened)
        assertEquals(0, second.opened)
        assertEquals(listOf("x", "a"), windows.asked)
    }

    @Test
    fun `AC-019 no window at all opens nothing and answers not found`() {
        val windows = Windows(emptyMap())
        assertFalse(ChatWindows.open(listOf("x", "y"), windows::find))
        assertEquals(listOf("x", "y"), windows.asked)
        assertFalse(ChatWindows.open(emptyList(), windows::find))
    }

    @Test
    fun `AC-019 a window that is not available is skipped and does not open`() {
        val hidden = Window(available = false)
        val shown = Window()
        assertTrue(ChatWindows.open(listOf("a", "b"), Windows(mapOf("a" to hidden, "b" to shown))::find))
        assertEquals(0, hidden.opened)
        assertEquals(1, shown.opened)
        assertFalse(ChatWindows.open(listOf("a"), Windows(mapOf("a" to Window(available = false)))::find))
    }

    @Test
    fun `AC-019 a window that fails to open counts as not found and no other window opens`() {
        val broken = Window(failure = IllegalStateException("no"))
        val other = Window()
        assertFalse(ChatWindows.open(listOf("a", "b"), Windows(mapOf("a" to broken, "b" to other))::find))
        assertEquals(1, broken.opened)
        assertEquals(0, other.opened)
    }

    @Test
    fun `AC-019 a failing lookup counts as not found`() {
        assertFalse(ChatWindows.open(listOf("a")) { throw IllegalStateException("lookup") })
    }
}

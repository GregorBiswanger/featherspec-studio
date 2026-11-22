package com.gregorbiswanger.featherspec.studio.assistant

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

private const val box = "Welcome to Claude Code\n╭───╮\n│ > Try \"fix\"\n╰───╯\n  ? for shortcuts"

class ClaudeTerminalTest {
    private val root = "/work/app"
    private val line = "/sdd-plan .specs/active/0035-x.md @.specs/active/0035-x.md"

    private fun tab(key: String, command: String? = "claude", cwd: String? = root, ready: Boolean = true, executing: Boolean = true) =
        TerminalTab(key, ready, executing, command, cwd)

    private class Fake(var clock: Long = 0L) : TerminalAccess {
        var existing: MutableList<TerminalTab> = ArrayList()
        val calls = ArrayList<String>()
        val pasted = ArrayList<Pair<Any, String>>()
        val commands = ArrayList<Pair<Any, String>>()
        var opened: Any = "new-tab"
        var shellAtMs = 0L
        var claudeStartedAtMs = 0L
        var boxAtMs = 100L
        var churnUntilMs = 0L
        var failTabs: RuntimeException? = null
        var failPaste: RuntimeException? = null
        var failFocus = false
        var runClaudeAt = -1L
        val roots = ArrayList<String>()

        override fun tabs(): List<TerminalTab> {
            calls.add("tabs")
            failTabs?.let { throw it }
            return existing.toList()
        }

        override fun openTab(root: String): Any {
            calls.add("open")
            roots.add(root)
            return opened
        }

        override fun shellReady(key: Any): Boolean = clock >= shellAtMs

        override fun runClaude(key: Any) {
            calls.add("run")
            commands.add(key to "claude")
            runClaudeAt = clock
        }

        override fun screen(key: Any): Screen? {
            if (key != opened || runClaudeAt < 0) {
                return Screen(false, "")
            }
            val since = clock - runClaudeAt
            val running = since >= claudeStartedAtMs
            val text = if (since >= boxAtMs) box + (if (clock < churnUntilMs) "\n" + clock else "") else ""
            return Screen(running, text)
        }

        override fun paste(key: Any, text: String) {
            calls.add("paste")
            failPaste?.let { throw it }
            pasted.add(key to text)
        }

        override fun focus(key: Any) {
            calls.add("focus")
            if (failFocus) {
                throw IllegalStateException("focus")
            }
        }
    }

    private fun sender(fake: Fake, lastTyped: LastTyped = LastTyped(), caseInsensitive: Boolean = false, rootValue: String? = root) =
        ClaudeSender(fake, { rootValue }, caseInsensitive, lastTyped, { fake.clock }, { fake.clock += it })

    @Test
    fun `AC-015 a command is claude exactly or claude with arguments`() {
        for (command in listOf("claude", "claude --resume", "claude  -p x", " claude", "claude\t--model opus", "claude \"fix it\"")) {
            assertTrue(ClaudeTabs.isClaudeCommand(command), command)
        }
        for (command in listOf(null, "", "   ", "claudex", "claude-code", "vim claude", "npx claude", "cat claude", "Claude", "/usr/bin/claude", "echo claude", "claud")) {
            assertFalse(ClaudeTabs.isClaudeCommand(command), command.toString())
        }
    }

    @Test
    fun `AC-015 folders are compared as the file system compares names`() {
        assertTrue(ClaudeTabs.samePath("/work/app", "/work/app", false))
        assertTrue(ClaudeTabs.samePath("/work/app/", "/work/app", false))
        assertTrue(ClaudeTabs.samePath("C:\\projects\\test", "c:/projects/test", true))
        assertTrue(ClaudeTabs.samePath("C:\\projects\\test\\", "c:/projects/test", true))
        assertFalse(ClaudeTabs.samePath("/Work/App", "/work/app", false))
        assertTrue(ClaudeTabs.samePath("/Work/App", "/work/app", true))
        assertFalse(ClaudeTabs.samePath("/work/app/sub", "/work/app", false))
        assertFalse(ClaudeTabs.samePath("/work/application", "/work/app", false))
        assertFalse(ClaudeTabs.samePath(null, "/work/app", false))
        assertFalse(ClaudeTabs.samePath("/work/app", null, true))
        assertTrue(ClaudeTabs.samePath("/", "/", false))
    }

    @Test
    fun `AC-015 the Claude terminal is the tab whose shell integration reports claude running in the root`() {
        assertEquals("a", ClaudeTabs.choose(listOf(tab("a")), root, null, false)?.key)
        assertEquals("a", ClaudeTabs.choose(listOf(tab("a", command = "claude --resume")), root, null, false)?.key)
    }

    @Test
    fun `AC-015 a tab whose claude ended, without shell integration, running another command or in another folder is none`() {
        val none = listOf(
            tab("ended", executing = false),
            tab("noShell", ready = false),
            tab("other", command = "npm test"),
            tab("elsewhere", cwd = "/work/other"),
            tab("sub", cwd = "/work/app/sub"),
            tab("noCwd", cwd = null),
            tab("noCommand", command = null),
        )
        assertNull(ClaudeTabs.choose(none, root, null, false))
        assertNull(ClaudeTabs.choose(emptyList(), root, null, false))
        assertEquals("good", ClaudeTabs.choose(none + tab("good"), root, null, false)?.key)
    }

    @Test
    fun `AC-015 with two Claude terminals the one typed into last is chosen else the first in tab order`() {
        val tabs = listOf(tab("first"), tab("second"), tab("third", command = "ls"))
        assertEquals("first", ClaudeTabs.choose(tabs, root, null, false)?.key)
        assertEquals("second", ClaudeTabs.choose(tabs, root, "second", false)?.key)
        assertEquals("first", ClaudeTabs.choose(tabs, root, "third", false)?.key)
        assertEquals("first", ClaudeTabs.choose(tabs, root, "gone", false)?.key)
    }

    @Test
    fun `AC-015 on a case-insensitive file system the folder case does not matter`() {
        val tabs = listOf(tab("a", cwd = "C:\\Projects\\Test"))
        assertEquals("a", ClaudeTabs.choose(tabs, "c:/projects/test", null, true)?.key)
        assertNull(ClaudeTabs.choose(tabs, "c:/projects/test", null, false))
    }

    @Test
    fun `AC-012 the input box is recognised by its footer, its prompt line or its mode hint`() {
        assertTrue(ClaudeReadiness.hasInputBox("x\n  ? for shortcuts"))
        assertTrue(ClaudeReadiness.hasInputBox("│ > Try"))
        assertTrue(ClaudeReadiness.hasInputBox("⏵⏵ accept edits on (shift+tab to cycle)"))
        assertFalse(ClaudeReadiness.hasInputBox(""))
        assertFalse(ClaudeReadiness.hasInputBox("Do you trust the files in this folder?\n1. Yes, proceed\n2. No, exit"))
        assertFalse(ClaudeReadiness.hasInputBox("bash: claude: command not found"))
        assertFalse(ClaudeReadiness.hasInputBox("Welcome to Claude Code\nPlease log in"))
    }

    @Test
    fun `AC-013 the not-ready message is the text of the spec`() {
        assertEquals("Claude Code was not ready within 15000 ms", ClaudeReadiness.notReadyMessage())
        assertEquals("Claude Code was not ready within 15000 ms", ClaudeNotReady().message)
        assertEquals(15_000L, ClaudeReadiness.READY_BUDGET_MS)
    }

    @Test
    fun `AC-012 readiness needs claude running, the input box and a quiet second`() {
        var now = 0L
        val screens = listOf(
            0L to Screen(false, ""),
            500L to Screen(true, "Welcome to Claude Code"),
            1500L to Screen(true, box),
            1600L to Screen(true, box + "\n."),
        )
        val screen = { screens.last { it.first <= now }.second }
        assertTrue(ClaudeReadiness.await(15_000, { now }, { now += it }, screen))
        assertTrue(now >= 2_600L, now.toString())
        assertTrue(now < 3_000L, now.toString())
    }

    @Test
    fun `AC-012 a footer without a running claude is not ready and the wait ends at the budget`() {
        var now = 0L
        assertFalse(ClaudeReadiness.await(15_000, { now }, { now += it }) { Screen(false, box) })
        assertTrue(now >= 15_000L)
        assertTrue(now < 15_200L, now.toString())
    }

    @Test
    fun `AC-012 a screen that keeps changing is not ready, an unreadable screen is skipped`() {
        var now = 0L
        assertFalse(ClaudeReadiness.await(5_000, { now }, { now += it }) { Screen(true, box + now) })
        now = 0L
        var reads = 0
        assertTrue(ClaudeReadiness.await(15_000, { now }, { now += it }) { reads++; if (reads < 5) null else Screen(true, box) })
    }

    @Test
    fun `AC-011 with a Claude terminal the text is pasted into it, then its tab is focused, and nothing else is typed`() {
        val fake = Fake()
        fake.existing.add(tab("claude-tab"))
        sender(fake).send(ClaudeRequest(ClaudeTarget.CURRENT, line))
        assertEquals(listOf("claude-tab" to line), fake.pasted)
        assertEquals(listOf("tabs", "paste", "focus"), fake.calls)
        assertEquals(emptyList<Pair<Any, String>>(), fake.commands)
    }

    @Test
    fun `AC-014 no text typed into a terminal holds a line break, a carriage return or an Enter`() {
        val fake = Fake()
        fake.existing.add(tab("claude-tab"))
        sender(fake).send(ClaudeRequest(ClaudeTarget.CURRENT, line))
        val fresh = Fake()
        sender(fresh).send(ClaudeRequest(ClaudeTarget.NEW, line))
        for (typed in fake.pasted.map { it.second } + fresh.pasted.map { it.second } + fresh.commands.map { it.second }) {
            assertFalse(typed.contains('\n') || typed.contains('\r') || typed.contains('\u001b'), typed)
        }
        assertEquals(listOf("claude"), fresh.commands.map { it.second })
        assertEquals(listOf(line), fresh.pasted.map { it.second })
    }

    @Test
    fun `AC-012 without a Claude terminal a tab opens in the root, claude runs and the text follows only when claude is ready`() {
        val fake = Fake()
        fake.existing.add(tab("other", command = "npm test"))
        fake.shellAtMs = 400
        fake.claudeStartedAtMs = 300
        fake.boxAtMs = 2_000
        sender(fake).send(ClaudeRequest(ClaudeTarget.CURRENT, line))
        assertEquals(listOf("tabs", "open", "run", "paste", "focus"), fake.calls)
        assertEquals(listOf(root), fake.roots)
        assertEquals(listOf("new-tab" to line), fake.pasted)
        assertTrue(fake.clock >= 400 + 2_000 + 1_000, fake.clock.toString())
    }

    @Test
    fun `AC-012 the menu item new chat opens a new tab even while a Claude terminal exists`() {
        val fake = Fake()
        fake.existing.add(tab("claude-tab"))
        sender(fake).send(ClaudeRequest(ClaudeTarget.NEW, line))
        assertEquals(listOf("open", "run", "paste", "focus"), fake.calls)
        assertEquals(listOf("new-tab" to line), fake.pasted)
    }

    @Test
    fun `AC-013 claude not ready within 15000 ms throws the exact message and types nothing, also not later`() {
        val fake = Fake()
        fake.boxAtMs = 16_000
        val thrown = assertThrows(ClaudeNotReady::class.java) { sender(fake).send(ClaudeRequest(ClaudeTarget.NEW, line)) }
        assertEquals("Claude Code was not ready within 15000 ms", thrown.message)
        assertEquals(emptyList<Pair<Any, String>>(), fake.pasted)
        fake.clock += 60_000
        assertEquals(emptyList<Pair<Any, String>>(), fake.pasted)
        assertFalse(fake.calls.contains("paste"))
        assertFalse(fake.calls.contains("focus"))
    }

    @Test
    fun `AC-013 a login or trust prompt that never shows the input box ends as not ready`() {
        val fake = Fake()
        fake.boxAtMs = Long.MAX_VALUE / 4
        assertThrows(ClaudeNotReady::class.java) { sender(fake).send(ClaudeRequest(ClaudeTarget.NEW, line)) }
        assertEquals(emptyList<Pair<Any, String>>(), fake.pasted)
    }

    @Test
    fun `AC-013 a terminal without shell integration runs no claude and types nothing`() {
        val fake = Fake()
        fake.shellAtMs = Long.MAX_VALUE / 4
        val thrown = assertThrows(IllegalStateException::class.java) { sender(fake).send(ClaudeRequest(ClaudeTarget.NEW, line)) }
        assertEquals("the terminal has no shell integration", thrown.message)
        assertEquals(listOf("open"), fake.calls)
        assertTrue(fake.clock < 3_200L, fake.clock.toString())
    }

    @Test
    fun `AC-013 the whole send is bounded so that it types nothing after the budget of the core`() {
        val fake = Fake()
        fake.shellAtMs = 2_900
        fake.boxAtMs = 14_900
        fake.churnUntilMs = 30_000
        assertThrows(IllegalStateException::class.java) { sender(fake).send(ClaudeRequest(ClaudeTarget.NEW, line)) }
        assertEquals(emptyList<Pair<Any, String>>(), fake.pasted)
        assertTrue(fake.clock <= ClaudeSender.TOTAL_BUDGET_MS + 200, fake.clock.toString())
    }

    @Test
    fun `AC-013 a failing terminal call propagates and types nothing`() {
        val failing = Fake()
        failing.failTabs = IllegalStateException("tabs failed")
        assertEquals("tabs failed", assertThrows(IllegalStateException::class.java) { sender(failing).send(ClaudeRequest(ClaudeTarget.CURRENT, line)) }.message)
        assertEquals(emptyList<Pair<Any, String>>(), failing.pasted)

        val pasteFails = Fake()
        pasteFails.existing.add(tab("claude-tab"))
        pasteFails.failPaste = IllegalStateException("tab closed")
        assertEquals("tab closed", assertThrows(IllegalStateException::class.java) { sender(pasteFails).send(ClaudeRequest(ClaudeTarget.CURRENT, line)) }.message)
        assertFalse(pasteFails.calls.contains("focus"))
    }

    @Test
    fun `AC-011 a failing focus after the paste does not fail the send`() {
        val fake = Fake()
        fake.existing.add(tab("claude-tab"))
        fake.failFocus = true
        sender(fake).send(ClaudeRequest(ClaudeTarget.CURRENT, line))
        assertEquals(listOf("claude-tab" to line), fake.pasted)
    }

    @Test
    fun `AC-014 a line with a control character reaches no terminal call at all`() {
        for (text in listOf("a\nb", "a\rb", "a\u001bb", "a\tb", "\u0000")) {
            val fake = Fake()
            fake.existing.add(tab("claude-tab"))
            assertThrows(IllegalArgumentException::class.java) { sender(fake).send(ClaudeRequest(ClaudeTarget.CURRENT, text)) }
            assertEquals(emptyList<String>(), fake.calls)
        }
    }

    @Test
    fun `AC-015 the tab typed into last is remembered and chosen next time`() {
        val fake = Fake()
        fake.existing.addAll(listOf(tab("first"), tab("second")))
        val memory = LastTyped()
        sender(fake, memory).send(ClaudeRequest(ClaudeTarget.CURRENT, line))
        assertEquals("first", memory.get())
        fake.existing.reverse()
        fake.existing.clear()
        fake.existing.addAll(listOf(tab("second"), tab("first")))
        sender(fake, memory).send(ClaudeRequest(ClaudeTarget.CURRENT, line))
        assertEquals(listOf("first", "first"), fake.pasted.map { it.first })
        memory.set("second")
        sender(fake, memory).send(ClaudeRequest(ClaudeTarget.CURRENT, line))
        assertEquals("second", fake.pasted.last().first)
        assertEquals("second", memory.get())
    }

    @Test
    fun `AC-012 a new tab becomes the remembered tab`() {
        val fake = Fake()
        val memory = LastTyped()
        sender(fake, memory).send(ClaudeRequest(ClaudeTarget.NEW, line))
        assertEquals("new-tab", memory.get())
    }

    @Test
    fun `AC-012 without any folder the send fails before it touches a terminal`() {
        val fake = Fake()
        assertEquals("no project folder", assertThrows(IllegalStateException::class.java) { sender(fake, rootValue = null).send(ClaudeRequest(ClaudeTarget.CURRENT, line)) }.message)
        assertEquals(emptyList<String>(), fake.calls)
    }

    @Test
    fun `AC-012 the active FeatherSpec root comes from the core memory and falls back to the project base`() {
        assertEquals("/work/app/sub", ActiveRoot.of("\"file:///work/app/sub\"", "/work/app"))
        assertEquals("c:/projects/test", ActiveRoot.of("\"file:///c%3A/projects/test\"", "C:/other"))
        assertEquals("/work/app", ActiveRoot.of(null, "/work/app"))
        assertEquals("/work/app", ActiveRoot.of("", "/work/app"))
        assertEquals("/work/app", ActiveRoot.of("not json", "/work/app"))
        assertEquals("/work/app", ActiveRoot.of("42", "/work/app"))
        assertEquals("/work/app", ActiveRoot.of("\"not a uri\"", "/work/app"))
        assertNull(ActiveRoot.of(null, null))
        assertNull(ActiveRoot.of(null, ""))
        assertEquals("featherspec-studio.activeProject", ActiveRoot.MEMORY_KEY)
    }

    @Test
    fun `AC-012 the budgets are those of the spec`() {
        assertEquals(15_000L, ClaudeReadiness.READY_BUDGET_MS)
        assertTrue(ClaudeSender.TOTAL_BUDGET_MS < 20_000L)
        assertTrue(ClaudeSender.SHELL_WAIT_MS + ClaudeReadiness.READY_BUDGET_MS < ClaudeSender.TOTAL_BUDGET_MS)
    }
}

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
        val screens = HashMap<Any, Screen?>()

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
            if (screens.containsKey(key)) {
                return screens[key]
            }
            if (key != opened) {
                return Screen(true, box)
            }
            if (runClaudeAt < 0) {
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

    private val trustDialog = "Welcome to Claude Code\n\nDo you trust the files in this folder?\n  1. Yes, proceed\n  2. No, exit\n\nEnter to confirm \u00b7 Esc to cancel"
    private val loginDialog = "Welcome to Claude Code\nSelect login method:\n  1. Claude account\n  2. Anthropic Console"

    @Test
    fun `AC-032 the markers are named constants of one place, so that K-1 can replace them`() {
        assertTrue(ClaudeReadiness.INPUT_MARKERS.isNotEmpty())
        assertTrue(ClaudeReadiness.WAITING_MARKERS.isNotEmpty())
        for (marker in ClaudeReadiness.INPUT_MARKERS) {
            assertTrue(ClaudeReadiness.hasInputBox("x\n$marker"), marker)
            assertFalse(ClaudeReadiness.hasInputBox("$marker\n$trustDialog"), marker)
        }
        for (marker in ClaudeReadiness.WAITING_MARKERS) {
            assertFalse(ClaudeReadiness.hasInputBox("$box\n$marker"), marker)
            assertTrue(ClaudeReadiness.hasInputBox("$marker\n$box"), marker)
        }
        assertEquals("K-1 pending", ClaudeReadiness.MARKERS_STATUS)
    }

    @Test
    fun `AC-032 a trust dialog or a login prompt is not an input box, also when it holds the words Claude Code`() {
        assertFalse(ClaudeReadiness.hasInputBox(trustDialog))
        assertFalse(ClaudeReadiness.hasInputBox(loginDialog))
        assertFalse(ClaudeReadiness.hasInputBox("$box\n$trustDialog"))
    }

    @Test
    fun `AC-032 an answered dialog that stays in the scrollback does not hide the input box below it`() {
        assertTrue(ClaudeReadiness.hasInputBox("$trustDialog\n$box"))
        assertTrue(ClaudeReadiness.hasInputBox("$loginDialog\nLogged in\n$box"))
    }

    @Test
    fun `AC-032 the waiting message is the cause of the spec`() {
        assertEquals("Claude Code was not ready for input", ClaudeReadiness.waitingMessage())
        assertEquals("Claude Code was not ready for input", ClaudeNotReady(ClaudeReadiness.waitingMessage()).message)
    }

    @Test
    fun `AC-032 an existing Claude terminal that waits for an answer gets nothing pasted, is focused and the send fails as waiting`() {
        for (screen in listOf(Screen(true, trustDialog), Screen(true, loginDialog), Screen(true, ""), Screen(false, box), null)) {
            val fake = Fake()
            fake.existing.add(tab("claude-tab"))
            fake.screens["claude-tab"] = screen
            val thrown = assertThrows(ClaudeNotReady::class.java) { sender(fake).send(ClaudeRequest(ClaudeTarget.CURRENT, line)) }
            assertEquals("Claude Code was not ready for input", thrown.message)
            assertEquals(emptyList<Pair<Any, String>>(), fake.pasted)
            assertEquals(listOf("tabs", "focus"), fake.calls, screen.toString())
        }
    }

    @Test
    fun `AC-032 a failing focus does not change the waiting answer`() {
        val fake = Fake()
        fake.existing.add(tab("claude-tab"))
        fake.screens["claude-tab"] = Screen(true, trustDialog)
        fake.failFocus = true
        assertThrows(ClaudeNotReady::class.java) { sender(fake).send(ClaudeRequest(ClaudeTarget.CURRENT, line)) }
        assertEquals(emptyList<Pair<Any, String>>(), fake.pasted)
    }

    @Test
    fun `AC-032 an existing Claude terminal at the input box still gets the text, and the check does not wait for a quiet second`() {
        val fake = Fake()
        fake.existing.add(tab("claude-tab"))
        fake.screens["claude-tab"] = Screen(true, box)
        sender(fake).send(ClaudeRequest(ClaudeTarget.CURRENT, line))
        assertEquals(listOf("claude-tab" to line), fake.pasted)
        assertEquals(0L, fake.clock)
    }

    @Test
    fun `AC-032 a new tab that shows the trust dialog is focused and nothing is typed, not now and not later`() {
        val fake = Fake()
        fake.boxAtMs = Long.MAX_VALUE / 4
        fake.screens["new-tab"] = Screen(true, trustDialog)
        val thrown = assertThrows(ClaudeNotReady::class.java) { sender(fake).send(ClaudeRequest(ClaudeTarget.NEW, line)) }
        assertEquals("Claude Code was not ready within 15000 ms", thrown.message)
        assertEquals(emptyList<Pair<Any, String>>(), fake.pasted)
        assertEquals(listOf("open", "run", "focus"), fake.calls)
        fake.clock += 60_000
        assertFalse(fake.calls.contains("paste"))
    }

    @Test
    fun `AC-032 the next Send after the developer answered finds the input box and types`() {
        val fake = Fake()
        fake.existing.add(tab("claude-tab"))
        fake.screens["claude-tab"] = Screen(true, trustDialog)
        val memory = LastTyped()
        assertThrows(ClaudeNotReady::class.java) { sender(fake, memory).send(ClaudeRequest(ClaudeTarget.CURRENT, line)) }
        assertEquals(null, memory.get())
        fake.screens["claude-tab"] = Screen(true, trustDialog + "\n" + box)
        sender(fake, memory).send(ClaudeRequest(ClaudeTarget.CURRENT, line))
        assertEquals(listOf("claude-tab" to line), fake.pasted)
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
        assertEquals(listOf("open", "run", "focus"), fake.calls)
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
    fun `AC-031 a second Send while the first waits for Claude Code types nothing and opens no tab`() {
        val fake = Fake()
        fake.boxAtMs = 3_000
        val gate = SendGate()
        var second: Throwable? = null
        var reentered = false
        lateinit var first: ClaudeSender
        val sleep: (Long) -> Unit = {
            fake.clock += it
            if (!reentered) {
                reentered = true
                second = runCatching { first.send(ClaudeRequest(ClaudeTarget.CURRENT, "other line")) }.exceptionOrNull()
            }
        }
        first = ClaudeSender(fake, { root }, false, LastTyped(), { fake.clock }, sleep, gate)
        first.send(ClaudeRequest(ClaudeTarget.NEW, line))
        assertTrue(second is ClaudeBusy, second.toString())
        assertEquals("a Send to Claude Code is still starting", second?.message)
        assertEquals(listOf("new-tab" to line), fake.pasted)
        assertEquals(1, fake.calls.count { it == "open" })
        assertEquals(1, fake.calls.count { it == "run" })
        assertFalse(fake.calls.contains("tabs"))
    }

    @Test
    fun `AC-031 a second Send through another sender of the same gate types nothing while the first runs`() {
        val fake = Fake()
        fake.boxAtMs = 3_000
        val gate = SendGate()
        val other = ClaudeSender(fake, { root }, false, LastTyped(), { fake.clock }, { fake.clock += it }, gate)
        var second: Throwable? = null
        var reentered = false
        val first = ClaudeSender(fake, { root }, false, LastTyped(), { fake.clock }, {
            fake.clock += it
            if (!reentered) {
                reentered = true
                second = runCatching { other.send(ClaudeRequest(ClaudeTarget.NEW, line)) }.exceptionOrNull()
            }
        }, gate)
        first.send(ClaudeRequest(ClaudeTarget.NEW, line))
        assertTrue(second is ClaudeBusy)
        assertEquals(1, fake.pasted.size)
    }

    @Test
    fun `AC-031 the gate opens again after a Send, also after a failed one`() {
        val fake = Fake()
        fake.existing.add(tab("claude-tab"))
        val gate = SendGate()
        val sender = ClaudeSender(fake, { root }, false, LastTyped(), { fake.clock }, { fake.clock += it }, gate)
        sender.send(ClaudeRequest(ClaudeTarget.CURRENT, line))
        sender.send(ClaudeRequest(ClaudeTarget.CURRENT, line))
        assertEquals(2, fake.pasted.size)
        fake.failPaste = IllegalStateException("tab closed")
        assertThrows(IllegalStateException::class.java) { sender.send(ClaudeRequest(ClaudeTarget.CURRENT, line)) }
        fake.failPaste = null
        sender.send(ClaudeRequest(ClaudeTarget.CURRENT, line))
        assertEquals(3, fake.pasted.size)
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

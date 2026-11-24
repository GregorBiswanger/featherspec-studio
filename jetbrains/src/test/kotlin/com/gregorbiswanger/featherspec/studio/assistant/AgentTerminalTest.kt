package com.gregorbiswanger.featherspec.studio.assistant

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

private const val box = "Welcome to Claude Code\n╭───╮\n│ > Try \"fix\"\n╰───╯\n  ? for shortcuts"

class AgentTerminalTest {
    private val root = "/work/app"
    private val claude = CliAgents.CLAUDE_CODE
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

        override fun openTab(root: String, agent: CliAgent): Any {
            calls.add("open")
            roots.add(root)
            return opened
        }

        override fun shellReady(key: Any): Boolean = clock >= shellAtMs

        override fun runAgent(key: Any, agent: CliAgent) {
            calls.add("run")
            commands.add(key to agent.command)
            runClaudeAt = clock
        }

        override fun screen(key: Any, agent: CliAgent): Screen? {
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

        override fun paste(key: Any, text: String, agent: CliAgent) {
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
        AgentSender(fake, { rootValue }, caseInsensitive, lastTyped, { fake.clock }, { fake.clock += it })

    @Test
    fun `AC-015 a command is claude exactly or claude with arguments`() {
        for (command in listOf("claude", "claude --resume", "claude  -p x", " claude", "claude\t--model opus", "claude \"fix it\"")) {
            assertTrue(claude.isCommand(command), command)
        }
        for (command in listOf(null, "", "   ", "claudex", "claude-code", "vim claude", "npx claude", "cat claude", "Claude", "/usr/bin/claude", "echo claude", "claud")) {
            assertFalse(claude.isCommand(command), command.toString())
        }
    }

    @Test
    fun `AC-015 folders are compared as the file system compares names`() {
        assertTrue(AgentTabs.samePath("/work/app", "/work/app", false))
        assertTrue(AgentTabs.samePath("/work/app/", "/work/app", false))
        assertTrue(AgentTabs.samePath("C:\\projects\\test", "c:/projects/test", true))
        assertTrue(AgentTabs.samePath("C:\\projects\\test\\", "c:/projects/test", true))
        assertFalse(AgentTabs.samePath("/Work/App", "/work/app", false))
        assertTrue(AgentTabs.samePath("/Work/App", "/work/app", true))
        assertFalse(AgentTabs.samePath("/work/app/sub", "/work/app", false))
        assertFalse(AgentTabs.samePath("/work/application", "/work/app", false))
        assertFalse(AgentTabs.samePath(null, "/work/app", false))
        assertFalse(AgentTabs.samePath("/work/app", null, true))
        assertTrue(AgentTabs.samePath("/", "/", false))
    }

    @Test
    fun `AC-015 the Claude terminal is the tab whose shell integration reports claude running in the root`() {
        assertEquals("a", AgentTabs.choose(listOf(tab("a")), claude, root, null, false)?.key)
        assertEquals("a", AgentTabs.choose(listOf(tab("a", command = "claude --resume")), claude, root, null, false)?.key)
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
        assertNull(AgentTabs.choose(none, claude, root, null, false))
        assertNull(AgentTabs.choose(emptyList(), claude, root, null, false))
        assertEquals("good", AgentTabs.choose(none + tab("good"), claude, root, null, false)?.key)
    }

    @Test
    fun `AC-015 with two Claude terminals the one typed into last is chosen else the first in tab order`() {
        val tabs = listOf(tab("first"), tab("second"), tab("third", command = "ls"))
        assertEquals("first", AgentTabs.choose(tabs, claude, root, null, false)?.key)
        assertEquals("second", AgentTabs.choose(tabs, claude, root, "second", false)?.key)
        assertEquals("first", AgentTabs.choose(tabs, claude, root, "third", false)?.key)
        assertEquals("first", AgentTabs.choose(tabs, claude, root, "gone", false)?.key)
    }

    @Test
    fun `AC-015 on a case-insensitive file system the folder case does not matter`() {
        val tabs = listOf(tab("a", cwd = "C:\\Projects\\Test"))
        assertEquals("a", AgentTabs.choose(tabs, claude, "c:/projects/test", null, true)?.key)
        assertNull(AgentTabs.choose(tabs, claude, "c:/projects/test", null, false))
    }

    private val trustDialog = "Welcome to Claude Code\n\nDo you trust the files in this folder?\n  1. Yes, proceed\n  2. No, exit\n\nEnter to confirm \u00b7 Esc to cancel"
    private val loginDialog = "Welcome to Claude Code\nSelect login method:\n  1. Claude account\n  2. Anthropic Console"

    @Test
    fun `AC-032 the markers are named constants of one place, so that K-1 can replace them`() {
        assertTrue(ClaudeReadiness.INPUT_MARKERS.isNotEmpty())
        assertTrue(ClaudeReadiness.WAITING_MARKERS.isNotEmpty())
        for (marker in ClaudeReadiness.INPUT_MARKERS) {
            assertTrue(claude.hasInputBox("x\n$marker"), marker)
            assertFalse(claude.hasInputBox("$marker\n$trustDialog"), marker)
        }
        for (marker in ClaudeReadiness.WAITING_MARKERS) {
            assertFalse(claude.hasInputBox("$box\n$marker"), marker)
            assertTrue(claude.hasInputBox("$marker\n$box"), marker)
        }
        assertEquals("K-1 pending", ClaudeReadiness.MARKERS_STATUS)
    }

    @Test
    fun `AC-032 a trust dialog or a login prompt is not an input box, also when it holds the words Claude Code`() {
        assertFalse(claude.hasInputBox(trustDialog))
        assertFalse(claude.hasInputBox(loginDialog))
        assertFalse(claude.hasInputBox("$box\n$trustDialog"))
    }

    @Test
    fun `AC-032 an answered dialog that stays in the scrollback does not hide the input box below it`() {
        assertTrue(claude.hasInputBox("$trustDialog\n$box"))
        assertTrue(claude.hasInputBox("$loginDialog\nLogged in\n$box"))
    }

    @Test
    fun `AC-032 the waiting message is the cause of the spec`() {
        assertEquals("Claude Code was not ready for input", AgentReadiness.waitingMessage(claude))
        assertEquals("Claude Code was not ready for input", AgentNotReady(AgentReadiness.waitingMessage(claude)).message)
    }

    @Test
    fun `AC-032 an existing Claude terminal that waits for an answer gets nothing pasted, is focused and the send fails as waiting`() {
        for (screen in listOf(Screen(true, trustDialog), Screen(true, loginDialog), Screen(true, ""), Screen(false, box), null)) {
            val fake = Fake()
            fake.existing.add(tab("claude-tab"))
            fake.screens["claude-tab"] = screen
            val thrown = assertThrows(AgentNotReady::class.java) { sender(fake).send(AgentRequest(claude, AgentTarget.CURRENT, line)) }
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
        assertThrows(AgentNotReady::class.java) { sender(fake).send(AgentRequest(claude, AgentTarget.CURRENT, line)) }
        assertEquals(emptyList<Pair<Any, String>>(), fake.pasted)
    }

    @Test
    fun `AC-032 an existing Claude terminal at the input box still gets the text, and the check does not wait for a quiet second`() {
        val fake = Fake()
        fake.existing.add(tab("claude-tab"))
        fake.screens["claude-tab"] = Screen(true, box)
        sender(fake).send(AgentRequest(claude, AgentTarget.CURRENT, line))
        assertEquals(listOf("claude-tab" to line), fake.pasted)
        assertEquals(0L, fake.clock)
    }

    @Test
    fun `AC-032 a new tab that shows the trust dialog is focused and nothing is typed, not now and not later`() {
        val fake = Fake()
        fake.boxAtMs = Long.MAX_VALUE / 4
        fake.screens["new-tab"] = Screen(true, trustDialog)
        val thrown = assertThrows(AgentNotReady::class.java) { sender(fake).send(AgentRequest(claude, AgentTarget.NEW, line)) }
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
        assertThrows(AgentNotReady::class.java) { sender(fake, memory).send(AgentRequest(claude, AgentTarget.CURRENT, line)) }
        assertEquals(null, memory.get())
        fake.screens["claude-tab"] = Screen(true, trustDialog + "\n" + box)
        sender(fake, memory).send(AgentRequest(claude, AgentTarget.CURRENT, line))
        assertEquals(listOf("claude-tab" to line), fake.pasted)
    }

    @Test
    fun `AC-012 the input box is recognised by its footer, its prompt line or its mode hint`() {
        assertTrue(claude.hasInputBox("x\n  ? for shortcuts"))
        assertTrue(claude.hasInputBox("│ > Try"))
        assertTrue(claude.hasInputBox("⏵⏵ accept edits on (shift+tab to cycle)"))
        assertFalse(claude.hasInputBox(""))
        assertFalse(claude.hasInputBox("Do you trust the files in this folder?\n1. Yes, proceed\n2. No, exit"))
        assertFalse(claude.hasInputBox("bash: claude: command not found"))
        assertFalse(claude.hasInputBox("Welcome to Claude Code\nPlease log in"))
    }

    @Test
    fun `AC-013 the not-ready message is the text of the spec`() {
        assertEquals("Claude Code was not ready within 15000 ms", AgentReadiness.notReadyMessage(claude))
        assertEquals("Claude Code was not ready within 15000 ms", AgentNotReady(AgentReadiness.notReadyMessage(claude)).message)
        assertEquals(15_000L, AgentReadiness.READY_BUDGET_MS)
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
        assertTrue(AgentReadiness.await(claude, 15_000, { now }, { now += it }, screen))
        assertTrue(now >= 2_600L, now.toString())
        assertTrue(now < 3_000L, now.toString())
    }

    @Test
    fun `AC-012 a footer without a running claude is not ready and the wait ends at the budget`() {
        var now = 0L
        assertFalse(AgentReadiness.await(claude, 15_000, { now }, { now += it }) { Screen(false, box) })
        assertTrue(now >= 15_000L)
        assertTrue(now < 15_200L, now.toString())
    }

    @Test
    fun `AC-012 a screen that keeps changing is not ready, an unreadable screen is skipped`() {
        var now = 0L
        assertFalse(AgentReadiness.await(claude, 5_000, { now }, { now += it }) { Screen(true, box + now) })
        now = 0L
        var reads = 0
        assertTrue(AgentReadiness.await(claude, 15_000, { now }, { now += it }) { reads++; if (reads < 5) null else Screen(true, box) })
    }

    @Test
    fun `AC-011 with a Claude terminal the text is pasted into it, then its tab is focused, and nothing else is typed`() {
        val fake = Fake()
        fake.existing.add(tab("claude-tab"))
        sender(fake).send(AgentRequest(claude, AgentTarget.CURRENT, line))
        assertEquals(listOf("claude-tab" to line), fake.pasted)
        assertEquals(listOf("tabs", "paste", "focus"), fake.calls)
        assertEquals(emptyList<Pair<Any, String>>(), fake.commands)
    }

    @Test
    fun `AC-014 no text typed into a terminal holds a line break, a carriage return or an Enter`() {
        val fake = Fake()
        fake.existing.add(tab("claude-tab"))
        sender(fake).send(AgentRequest(claude, AgentTarget.CURRENT, line))
        val fresh = Fake()
        sender(fresh).send(AgentRequest(claude, AgentTarget.NEW, line))
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
        sender(fake).send(AgentRequest(claude, AgentTarget.CURRENT, line))
        assertEquals(listOf("tabs", "open", "run", "paste", "focus"), fake.calls)
        assertEquals(listOf(root), fake.roots)
        assertEquals(listOf("new-tab" to line), fake.pasted)
        assertTrue(fake.clock >= 400 + 2_000 + 1_000, fake.clock.toString())
    }

    @Test
    fun `AC-012 the menu item new chat opens a new tab even while a Claude terminal exists`() {
        val fake = Fake()
        fake.existing.add(tab("claude-tab"))
        sender(fake).send(AgentRequest(claude, AgentTarget.NEW, line))
        assertEquals(listOf("open", "run", "paste", "focus"), fake.calls)
        assertEquals(listOf("new-tab" to line), fake.pasted)
    }

    @Test
    fun `AC-013 claude not ready within 15000 ms throws the exact message and types nothing, also not later`() {
        val fake = Fake()
        fake.boxAtMs = 16_000
        val thrown = assertThrows(AgentNotReady::class.java) { sender(fake).send(AgentRequest(claude, AgentTarget.NEW, line)) }
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
        assertThrows(AgentNotReady::class.java) { sender(fake).send(AgentRequest(claude, AgentTarget.NEW, line)) }
        assertEquals(emptyList<Pair<Any, String>>(), fake.pasted)
    }

    @Test
    fun `AC-013 a terminal without shell integration runs no claude and types nothing`() {
        val fake = Fake()
        fake.shellAtMs = Long.MAX_VALUE / 4
        val thrown = assertThrows(IllegalStateException::class.java) { sender(fake).send(AgentRequest(claude, AgentTarget.NEW, line)) }
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
        assertThrows(IllegalStateException::class.java) { sender(fake).send(AgentRequest(claude, AgentTarget.NEW, line)) }
        assertEquals(emptyList<Pair<Any, String>>(), fake.pasted)
        assertTrue(fake.clock <= AgentSender.TOTAL_BUDGET_MS + 200, fake.clock.toString())
    }

    @Test
    fun `AC-013 a failing terminal call propagates and types nothing`() {
        val failing = Fake()
        failing.failTabs = IllegalStateException("tabs failed")
        assertEquals("tabs failed", assertThrows(IllegalStateException::class.java) { sender(failing).send(AgentRequest(claude, AgentTarget.CURRENT, line)) }.message)
        assertEquals(emptyList<Pair<Any, String>>(), failing.pasted)

        val pasteFails = Fake()
        pasteFails.existing.add(tab("claude-tab"))
        pasteFails.failPaste = IllegalStateException("tab closed")
        assertEquals("tab closed", assertThrows(IllegalStateException::class.java) { sender(pasteFails).send(AgentRequest(claude, AgentTarget.CURRENT, line)) }.message)
        assertFalse(pasteFails.calls.contains("focus"))
    }

    @Test
    fun `AC-011 a failing focus after the paste does not fail the send`() {
        val fake = Fake()
        fake.existing.add(tab("claude-tab"))
        fake.failFocus = true
        sender(fake).send(AgentRequest(claude, AgentTarget.CURRENT, line))
        assertEquals(listOf("claude-tab" to line), fake.pasted)
    }

    @Test
    fun `AC-014 a line with a control character reaches no terminal call at all`() {
        for (text in listOf("a\nb", "a\rb", "a\u001bb", "a\tb", "\u0000")) {
            val fake = Fake()
            fake.existing.add(tab("claude-tab"))
            assertThrows(IllegalArgumentException::class.java) { sender(fake).send(AgentRequest(claude, AgentTarget.CURRENT, text)) }
            assertEquals(emptyList<String>(), fake.calls)
        }
    }

    @Test
    fun `AC-015 the tab typed into last is remembered and chosen next time`() {
        val fake = Fake()
        fake.existing.addAll(listOf(tab("first"), tab("second")))
        val memory = LastTyped()
        sender(fake, memory).send(AgentRequest(claude, AgentTarget.CURRENT, line))
        assertEquals("first", memory.get())
        fake.existing.reverse()
        fake.existing.clear()
        fake.existing.addAll(listOf(tab("second"), tab("first")))
        sender(fake, memory).send(AgentRequest(claude, AgentTarget.CURRENT, line))
        assertEquals(listOf("first", "first"), fake.pasted.map { it.first })
        memory.set("second")
        sender(fake, memory).send(AgentRequest(claude, AgentTarget.CURRENT, line))
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
        lateinit var first: AgentSender
        val sleep: (Long) -> Unit = {
            fake.clock += it
            if (!reentered) {
                reentered = true
                second = runCatching { first.send(AgentRequest(claude, AgentTarget.CURRENT, "other line")) }.exceptionOrNull()
            }
        }
        first = AgentSender(fake, { root }, false, LastTyped(), { fake.clock }, sleep, gate)
        first.send(AgentRequest(claude, AgentTarget.NEW, line))
        assertTrue(second is AgentBusy, second.toString())
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
        val other = AgentSender(fake, { root }, false, LastTyped(), { fake.clock }, { fake.clock += it }, gate)
        var second: Throwable? = null
        var reentered = false
        val first = AgentSender(fake, { root }, false, LastTyped(), { fake.clock }, {
            fake.clock += it
            if (!reentered) {
                reentered = true
                second = runCatching { other.send(AgentRequest(claude, AgentTarget.NEW, line)) }.exceptionOrNull()
            }
        }, gate)
        first.send(AgentRequest(claude, AgentTarget.NEW, line))
        assertTrue(second is AgentBusy)
        assertEquals(1, fake.pasted.size)
    }

    @Test
    fun `AC-031 the gate opens again after a Send, also after a failed one`() {
        val fake = Fake()
        fake.existing.add(tab("claude-tab"))
        val gate = SendGate()
        val sender = AgentSender(fake, { root }, false, LastTyped(), { fake.clock }, { fake.clock += it }, gate)
        sender.send(AgentRequest(claude, AgentTarget.CURRENT, line))
        sender.send(AgentRequest(claude, AgentTarget.CURRENT, line))
        assertEquals(2, fake.pasted.size)
        fake.failPaste = IllegalStateException("tab closed")
        assertThrows(IllegalStateException::class.java) { sender.send(AgentRequest(claude, AgentTarget.CURRENT, line)) }
        fake.failPaste = null
        sender.send(AgentRequest(claude, AgentTarget.CURRENT, line))
        assertEquals(3, fake.pasted.size)
    }

    @Test
    fun `AC-012 a new tab becomes the remembered tab`() {
        val fake = Fake()
        val memory = LastTyped()
        sender(fake, memory).send(AgentRequest(claude, AgentTarget.NEW, line))
        assertEquals("new-tab", memory.get())
    }

    @Test
    fun `AC-012 without any folder the send fails before it touches a terminal`() {
        val fake = Fake()
        assertEquals("no project folder", assertThrows(IllegalStateException::class.java) { sender(fake, rootValue = null).send(AgentRequest(claude, AgentTarget.CURRENT, line)) }.message)
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
        assertEquals(15_000L, AgentReadiness.READY_BUDGET_MS)
        assertTrue(AgentSender.TOTAL_BUDGET_MS < 20_000L)
        assertTrue(AgentSender.SHELL_WAIT_MS + AgentReadiness.READY_BUDGET_MS < AgentSender.TOTAL_BUDGET_MS)
    }

    private fun senderWith(fake: Fake, onPath: (CliAgent) -> Boolean = { true }, lastTyped: LastTyped = LastTyped(), trusted: () -> Boolean = { true }) =
        AgentSender(fake, { root }, false, lastTyped, { fake.clock }, { fake.clock += it }, SendGate(), onPath, trusted)

    private fun fileSystem(vararg present: String): (String, String) -> Boolean = { directory, name -> "${directory.trimEnd('/')}/$name" in present }

    @Test
    fun `AC-036 the PATH of the IDE is searched for claude, claude exe and claude cmd, in every directory`() {
        assertEquals(listOf("claude", "claude.exe", "claude.cmd"), CliAgents.CLAUDE_CODE.pathNames)
        for (name in CliAgents.CLAUDE_CODE.pathNames) {
            assertTrue(CliOnPath.found(CliAgents.CLAUDE_CODE.pathNames, "/usr/bin:/opt/tools", ':', fileSystem("/opt/tools/$name")), name)
            assertTrue(CliOnPath.found(CliAgents.CLAUDE_CODE.pathNames, "C:\\Windows;C:\\Tools", ';', fileSystem("C:\\Tools/$name")), name)
        }
        assertTrue(CliOnPath.found(CliAgents.CLAUDE_CODE.pathNames, "/first:/second", ':', fileSystem("/first/claude", "/second/claude.cmd")))
    }

    @Test
    fun `AC-036 no claude on the PATH, an empty PATH, blank entries and a file of another name are not found`() {
        assertFalse(CliOnPath.found(CliAgents.CLAUDE_CODE.pathNames, "/usr/bin:/opt/tools", ':', fileSystem("/usr/bin/claudex", "/opt/tools/claude-code", "/opt/tools/Claude.txt")))
        assertFalse(CliOnPath.found(CliAgents.CLAUDE_CODE.pathNames, null, ':', fileSystem("/claude")))
        assertFalse(CliOnPath.found(CliAgents.CLAUDE_CODE.pathNames, "", ':', fileSystem("/claude")))
        assertFalse(CliOnPath.found(CliAgents.CLAUDE_CODE.pathNames, " : :: ", ':', fileSystem("/claude", "/ /claude")))
        assertFalse(CliOnPath.found(CliAgents.CLAUDE_CODE.pathNames, "/usr/bin", ':', fileSystem()))
    }

    @Test
    fun `AC-036 quoted Windows entries and a trailing separator are read as directories`() {
        assertTrue(CliOnPath.found(CliAgents.CLAUDE_CODE.pathNames, "\"C:\\Program Files\\Claude\";C:\\bin;", ';', fileSystem("C:\\Program Files\\Claude/claude.exe")))
        assertTrue(CliOnPath.found(CliAgents.CLAUDE_CODE.pathNames, "/usr/bin:/opt/tools/", ':', fileSystem("/opt/tools/claude")))
    }

    @Test
    fun `AC-036 the PATH check runs only after the timeout, never before, and the message is the cause of the spec`() {
        val fake = Fake()
        fake.boxAtMs = Long.MAX_VALUE / 4
        fake.claudeStartedAtMs = Long.MAX_VALUE / 4
        var asked = -1L
        val thrown = assertThrows(AgentNotInstalled::class.java) { senderWith(fake, onPath = { asked = fake.clock; false }).send(AgentRequest(claude, AgentTarget.NEW, line)) }
        assertEquals("the claude command was not found on the PATH", thrown.message)
        assertEquals("the claude command was not found on the PATH", AgentReadiness.notInstalledMessage(claude))
        assertTrue(asked >= AgentReadiness.READY_BUDGET_MS, asked.toString())
        assertEquals(emptyList<Pair<Any, String>>(), fake.pasted)
        assertEquals(listOf("open", "run", "focus"), fake.calls)
    }

    @Test
    fun `AC-036 no PATH check while Claude Code starts in time, in a new tab or in an existing one`() {
        var asked = 0
        val fresh = Fake()
        senderWith(fresh, onPath = { asked += 1; false }).send(AgentRequest(claude, AgentTarget.NEW, line))
        assertEquals(listOf("new-tab" to line), fresh.pasted)
        val existing = Fake()
        existing.existing.add(tab("claude-tab"))
        senderWith(existing, onPath = { asked += 1; false }).send(AgentRequest(claude, AgentTarget.CURRENT, line))
        existing.screens["claude-tab"] = Screen(true, trustDialog)
        assertThrows(AgentNotReady::class.java) { senderWith(existing, onPath = { asked += 1; false }).send(AgentRequest(claude, AgentTarget.CURRENT, line)) }
        assertEquals(0, asked)
    }

    @Test
    fun `AC-036 claude found on the PATH, or running although the PATH of the IDE lacks it, is not reported as not installed`() {
        val onPath = Fake()
        onPath.boxAtMs = Long.MAX_VALUE / 4
        val general = assertThrows(AgentNotReady::class.java) { senderWith(onPath, onPath = { true }).send(AgentRequest(claude, AgentTarget.NEW, line)) }
        assertEquals("Claude Code was not ready within 15000 ms", general.message)
        val running = Fake()
        running.boxAtMs = Long.MAX_VALUE / 4
        running.screens["new-tab"] = Screen(true, trustDialog)
        val waiting = assertThrows(AgentNotReady::class.java) { senderWith(running, onPath = { false }).send(AgentRequest(claude, AgentTarget.NEW, line)) }
        assertEquals("Claude Code was not ready within 15000 ms", waiting.message)
    }

    @Test
    fun `AC-036 the reason is not installed only when claude is not running and the PATH has none, after the whole timeout`() {
        val fake = Fake()
        fake.boxAtMs = Long.MAX_VALUE / 4
        fake.claudeStartedAtMs = Long.MAX_VALUE / 4
        assertThrows(AgentNotInstalled::class.java) { senderWith(fake, onPath = { false }).send(AgentRequest(claude, AgentTarget.NEW, line)) }
        assertTrue(fake.clock >= AgentReadiness.READY_BUDGET_MS, fake.clock.toString())
    }

    @Test
    fun `AC-037 in a project that is not trusted a running Claude terminal still gets the text, as in a trusted one`() {
        val fake = Fake()
        fake.existing.add(tab("claude-tab"))
        senderWith(fake, trusted = { false }).send(AgentRequest(claude, AgentTarget.CURRENT, line))
        assertEquals(listOf("claude-tab" to line), fake.pasted)
        assertEquals(listOf("tabs", "paste", "focus"), fake.calls)
        assertEquals(emptyList<Pair<Any, String>>(), fake.commands)
    }

    @Test
    fun `AC-037 in a project that is not trusted no claude is started when no Claude terminal runs, and the cause is the text of the spec`() {
        assertEquals("the project is not trusted", AgentReadiness.untrustedMessage())
        val none = Fake()
        none.existing.add(tab("other", command = "npm test"))
        val thrown = assertThrows(AgentUntrusted::class.java) { senderWith(none, trusted = { false }).send(AgentRequest(claude, AgentTarget.CURRENT, line)) }
        assertEquals("the project is not trusted", thrown.message)
        assertEquals(listOf("tabs"), none.calls)
        assertEquals(emptyList<Pair<Any, String>>(), none.commands)
        assertEquals(emptyList<Pair<Any, String>>(), none.pasted)
    }

    @Test
    fun `AC-037 in a project that is not trusted a new chat never opens a tab nor runs claude, even while a Claude terminal runs`() {
        val fake = Fake()
        fake.existing.add(tab("claude-tab"))
        assertThrows(AgentUntrusted::class.java) { senderWith(fake, trusted = { false }).send(AgentRequest(claude, AgentTarget.NEW, line)) }
        assertEquals(emptyList<String>(), fake.calls)
    }

    @Test
    fun `AC-037 in a project that is not trusted a running claude that waits for an answer is still waiting, not untrusted`() {
        val fake = Fake()
        fake.existing.add(tab("claude-tab"))
        fake.screens["claude-tab"] = Screen(true, trustDialog)
        val thrown = assertThrows(AgentNotReady::class.java) { senderWith(fake, trusted = { false }).send(AgentRequest(claude, AgentTarget.CURRENT, line)) }
        assertEquals("Claude Code was not ready for input", thrown.message)
        assertEquals(emptyList<Pair<Any, String>>(), fake.pasted)
    }

    @Test
    fun `AC-037 the trust is asked at every Send, so that a granted trust opens the way without a restart`() {
        val fake = Fake()
        var trusted = false
        val sender = senderWith(fake, trusted = { trusted })
        assertThrows(AgentUntrusted::class.java) { sender.send(AgentRequest(claude, AgentTarget.CURRENT, line)) }
        assertEquals(emptyList<Pair<Any, String>>(), fake.commands)
        trusted = true
        sender.send(AgentRequest(claude, AgentTarget.CURRENT, line))
        assertEquals(listOf("claude"), fake.commands.map { it.second })
        assertEquals(listOf("new-tab" to line), fake.pasted)
    }

    @Test
    fun `AC-037 a trusted project behaves as before, also for the default sender`() {
        val fake = Fake()
        sender(fake).send(AgentRequest(claude, AgentTarget.NEW, line))
        assertEquals(listOf("open", "run", "paste", "focus"), fake.calls)
    }
}

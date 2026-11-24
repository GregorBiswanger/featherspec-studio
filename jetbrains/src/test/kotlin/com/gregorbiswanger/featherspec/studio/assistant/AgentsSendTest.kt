package com.gregorbiswanger.featherspec.studio.assistant

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class AgentsSendTest {
    private val root = "/work/app"
    private val line = "Implement T-003 of .specs/a.plan.md @.specs/a.plan.md"

    private class Fake {
        var clock = 0L
        val existing = ArrayList<TerminalTab>()
        val calls = ArrayList<String>()
        val pasted = ArrayList<Triple<Any, String, String>>()
        val commands = ArrayList<String>()
        val opened = ArrayList<String>()
        val screens = HashMap<Any, Screen?>()
        var readyAtMs = 100L
        var startsAtMs = 0L
        var ranAt = -1L

        val access = object : TerminalAccess {
            override fun tabs(): List<TerminalTab> {
                calls.add("tabs")
                return existing.toList()
            }

            override fun openTab(root: String, agent: CliAgent): Any {
                calls.add("open")
                opened.add(agent.tabName)
                return "new-tab"
            }

            override fun shellReady(key: Any): Boolean = true

            override fun runAgent(key: Any, agent: CliAgent) {
                calls.add("run")
                commands.add(agent.command)
                ranAt = clock
            }

            override fun screen(key: Any, agent: CliAgent): Screen? {
                if (screens.containsKey(key)) {
                    return screens[key]
                }
                if (key != "new-tab") {
                    return Screen(true, agent.inputMarkers.first())
                }
                if (ranAt < 0) {
                    return Screen(false, "")
                }
                val since = clock - ranAt
                return Screen(since >= startsAtMs, if (since >= readyAtMs) agent.inputMarkers.first() else "")
            }

            override fun paste(key: Any, text: String, agent: CliAgent) {
                calls.add("paste")
                pasted.add(Triple(key, text, agent.id))
            }

            override fun focus(key: Any) {
                calls.add("focus")
            }
        }
    }

    private fun sender(fake: Fake, onPath: (CliAgent) -> Boolean = { true }, trusted: () -> Boolean = { true }, gate: SendGate = SendGate(), sleep: ((Long) -> Unit)? = null) =
        AgentSender(fake.access, { root }, false, LastTyped(), { fake.clock }, sleep ?: { fake.clock += it }, gate, onPath, trusted)

    private fun tab(agent: CliAgent, key: String = "tab-${agent.id}", command: String = agent.command) = TerminalTab(key, true, true, command, root)

    @Test
    fun `AC-045 each of the three agents gets the text pasted into its own running tab`() {
        for (agent in CliAgents.ALL) {
            val fake = Fake()
            fake.existing.add(tab(agent))
            sender(fake).send(AgentRequest(agent, AgentTarget.CURRENT, line))
            assertEquals(listOf(Triple<Any, String, String>("tab-${agent.id}", line, agent.id)), fake.pasted, agent.id)
            assertEquals(listOf("tabs", "paste", "focus"), fake.calls, agent.id)
        }
    }

    @Test
    fun `AC-045 a tab that runs another agent is never taken for this agent`() {
        for (agent in CliAgents.ALL) {
            for (other in CliAgents.ALL.filter { it != agent }) {
                val fake = Fake()
                fake.existing.add(tab(other))
                sender(fake).send(AgentRequest(agent, AgentTarget.CURRENT, line))
                assertEquals(listOf("tabs", "open", "run", "paste", "focus"), fake.calls, "${agent.id} beside ${other.id}")
                assertEquals(listOf(agent.command), fake.commands)
                assertEquals(listOf(Triple<Any, String, String>("new-tab", line, agent.id)), fake.pasted)
            }
        }
    }

    @Test
    fun `AC-048 a new tab is named for the agent and runs the bare command, no flag, no argument, no line break`() {
        for (agent in CliAgents.ALL) {
            val fake = Fake()
            sender(fake).send(AgentRequest(agent, AgentTarget.NEW, line))
            assertEquals(listOf(agent.tabName), fake.opened)
            assertEquals(listOf(agent.command), fake.commands)
            for (typed in fake.commands + fake.pasted.map { it.second }) {
                assertFalse(typed.contains('\n') || typed.contains('\r') || typed.contains('\u001b'), typed)
            }
            assertFalse(fake.commands.single().contains(' '))
        }
    }

    @Test
    fun `AC-045 the causes carry the name and the command of the agent, and Claude Code keeps its words`() {
        assertEquals("Junie was not ready within 15000 ms", AgentReadiness.notReadyMessage(CliAgents.JUNIE))
        assertEquals("Claude Code was not ready within 15000 ms", AgentReadiness.notReadyMessage(CliAgents.CLAUDE_CODE))
        assertEquals("Copilot was not ready within 15000 ms", AgentReadiness.notReadyMessage(CliAgents.COPILOT))
        assertEquals("Junie was not ready for input", AgentReadiness.waitingMessage(CliAgents.JUNIE))
        assertEquals("Claude Code was not ready for input", AgentReadiness.waitingMessage(CliAgents.CLAUDE_CODE))
        assertEquals("Copilot was not ready for input", AgentReadiness.waitingMessage(CliAgents.COPILOT))
        assertEquals("the junie command was not found on the PATH", AgentReadiness.notInstalledMessage(CliAgents.JUNIE))
        assertEquals("the claude command was not found on the PATH", AgentReadiness.notInstalledMessage(CliAgents.CLAUDE_CODE))
        assertEquals("the copilot command was not found on the PATH", AgentReadiness.notInstalledMessage(CliAgents.COPILOT))
        assertEquals("the project is not trusted", AgentReadiness.untrustedMessage())
    }

    @Test
    fun `AC-046 an agent that never shows its input box ends as not ready and nothing is typed, for each agent`() {
        for (agent in CliAgents.ALL) {
            val fake = Fake()
            fake.readyAtMs = Long.MAX_VALUE / 4
            val thrown = assertThrows(AgentNotReady::class.java) { sender(fake).send(AgentRequest(agent, AgentTarget.NEW, line)) }
            assertEquals("${agent.displayName} was not ready within 15000 ms", thrown.message)
            assertEquals(emptyList<Any>(), fake.pasted)
            assertEquals(listOf("open", "run", "focus"), fake.calls)
        }
    }

    @Test
    fun `AC-046 an agent that waits for an answer in an existing tab gets nothing pasted, for each agent`() {
        for (agent in CliAgents.ALL) {
            val fake = Fake()
            fake.existing.add(tab(agent))
            fake.screens["tab-${agent.id}"] = Screen(true, agent.waitingMarkers.first())
            val thrown = assertThrows(AgentNotReady::class.java) { sender(fake).send(AgentRequest(agent, AgentTarget.CURRENT, line)) }
            assertEquals("${agent.displayName} was not ready for input", thrown.message)
            assertEquals(emptyList<Any>(), fake.pasted)
            assertEquals(listOf("tabs", "focus"), fake.calls)
        }
    }

    @Test
    fun `AC-046 not installed is named only after the whole wait, with the command of this agent`() {
        for (agent in CliAgents.ALL) {
            val fake = Fake()
            fake.readyAtMs = Long.MAX_VALUE / 4
            fake.startsAtMs = Long.MAX_VALUE / 4
            var askedFor: CliAgent? = null
            val thrown = assertThrows(AgentNotInstalled::class.java) {
                sender(fake, onPath = { askedFor = it; false }).send(AgentRequest(agent, AgentTarget.NEW, line))
            }
            assertEquals("the ${agent.command} command was not found on the PATH", thrown.message)
            assertEquals(agent, askedFor)
            assertTrue(fake.clock >= AgentReadiness.READY_BUDGET_MS)
            assertEquals(emptyList<Any>(), fake.pasted)
        }
    }

    @Test
    fun `AC-046 in a project that is not trusted no agent is started, and a running tab still gets the text`() {
        for (agent in CliAgents.ALL) {
            val none = Fake()
            val thrown = assertThrows(AgentUntrusted::class.java) { sender(none, trusted = { false }).send(AgentRequest(agent, AgentTarget.CURRENT, line)) }
            assertEquals("the project is not trusted", thrown.message)
            assertEquals(emptyList<String>(), none.commands)
            val running = Fake()
            running.existing.add(tab(agent))
            sender(running, trusted = { false }).send(AgentRequest(agent, AgentTarget.CURRENT, line))
            assertEquals(1, running.pasted.size)
        }
    }

    @Test
    fun `OP-023 one gate serves all three agents, so a second Send of any agent types nothing while the first starts`() {
        for ((first, second) in CliAgents.ALL.flatMap { a -> CliAgents.ALL.map { b -> a to b } }) {
            val fake = Fake()
            fake.readyAtMs = 3_000
            val gate = SendGate()
            var failure: Throwable? = null
            var reentered = false
            lateinit var sender: AgentSender
            sender = sender(fake, gate = gate, sleep = {
                fake.clock += it
                if (!reentered) {
                    reentered = true
                    failure = runCatching { sender.send(AgentRequest(second, AgentTarget.NEW, "other")) }.exceptionOrNull()
                }
            })
            sender.send(AgentRequest(first, AgentTarget.NEW, line))
            assertTrue(failure is AgentBusy, "${first.id}/${second.id}: $failure")
            assertEquals("a Send to ${second.displayName} is still starting", failure?.message)
            assertEquals(1, fake.pasted.size)
        }
    }

    @Test
    fun `AC-045 the request names the agent, the target and the text`() {
        val junie = AssistantRequests.agentRequest("""{"assistant":"junie","target":"new","text":"x"}""")
        assertEquals(AgentRequest(CliAgents.JUNIE, AgentTarget.NEW, "x"), junie)
        assertEquals(CliAgents.CLAUDE_CODE, AssistantRequests.agentRequest("""{"assistant":"claudeCode","target":"current","text":"x"}""").agent)
        assertEquals(CliAgents.COPILOT, AssistantRequests.agentRequest("""{"assistant":"copilot","target":"current","text":"x"}""").agent)
    }

    @Test
    fun `AC-045 an unknown, a missing or an old assistant value is refused before any terminal call`() {
        for (args in listOf("""{"target":"new","text":"x"}""", """{"assistant":"none","target":"new","text":"x"}""", """{"assistant":"Junie","target":"new","text":"x"}""", """{"assistant":1,"target":"new","text":"x"}""", """{"assistant":"copyForJunie","target":"new","text":"x"}""")) {
            val thrown = assertThrows(IllegalArgumentException::class.java) { AssistantRequests.agentRequest(args) }
            assertEquals("assistant.terminal needs the assistant junie, claudeCode or copilot", thrown.message, args)
        }
    }

    @Test
    fun `AC-045 the old call name is no longer answered`() {
        val port = AssistantPort(UnavailableAssistantCalls)
        assertEquals(null, port.answer("assistant.claudeTerminal", """{"assistant":"claudeCode","target":"new","text":"x"}"""))
    }
}

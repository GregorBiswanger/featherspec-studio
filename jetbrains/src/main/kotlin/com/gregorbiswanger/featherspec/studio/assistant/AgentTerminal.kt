package com.gregorbiswanger.featherspec.studio.assistant

import com.google.gson.JsonParser
import com.gregorbiswanger.featherspec.studio.ports.FileUris
import java.lang.ref.WeakReference
import java.util.concurrent.atomic.AtomicBoolean

data class TerminalTab(
    val key: Any,
    val shellReady: Boolean,
    val executing: Boolean,
    val command: String?,
    val workingDirectory: String?,
)

data class Screen(val running: Boolean, val text: String)

interface TerminalAccess {
    fun tabs(): List<TerminalTab>

    fun openTab(root: String, agent: CliAgent): Any

    fun shellReady(key: Any): Boolean

    fun runAgent(key: Any, agent: CliAgent)

    fun screen(key: Any, agent: CliAgent): Screen?

    fun paste(key: Any, text: String, agent: CliAgent)

    fun focus(key: Any)
}

object AgentTabs {
    fun samePath(first: String?, second: String?, caseInsensitive: Boolean): Boolean {
        if (first == null || second == null) {
            return false
        }
        val left = normalize(first)
        val right = normalize(second)
        return if (caseInsensitive) left.equals(right, ignoreCase = true) else left == right
    }

    fun choose(tabs: List<TerminalTab>, agent: CliAgent, root: String, lastTyped: Any?, caseInsensitive: Boolean): TerminalTab? {
        val running = tabs.filter {
            it.shellReady && it.executing && agent.isCommand(it.command, caseInsensitive) && samePath(it.workingDirectory, root, caseInsensitive)
        }
        return running.firstOrNull { lastTyped != null && it.key == lastTyped } ?: running.firstOrNull()
    }

    private fun normalize(path: String): String {
        var text = path.trim().replace('\\', '/')
        while (text.length > 1 && text.endsWith("/") && !(text.length == 3 && text[1] == ':')) {
            text = text.substring(0, text.length - 1)
        }
        return text
    }
}

object ClaudeReadiness {
    // K-1 pending: both marker lists are provisional until the K-1 probe has seen the real screens; replace them here only.
    const val MARKERS_STATUS = "K-1 pending"

    val INPUT_MARKERS: List<String> = listOf("? for shortcuts", "\u2502 >", "shift+tab to cycle")

    val WAITING_MARKERS: List<String> = listOf(
        "Do you trust the files in this folder",
        "Yes, proceed",
        "Enter to confirm",
        "Select login method",
        "Press Enter to continue",
    )
}

object AgentReadiness {
    const val READY_BUDGET_MS = 15_000L
    const val QUIET_MS = 1_000L
    const val POLL_MS = 100L

    fun notReadyMessage(agent: CliAgent): String = "${agent.displayName} was not ready within $READY_BUDGET_MS ms"

    fun waitingMessage(agent: CliAgent): String = "${agent.displayName} was not ready for input"

    fun notInstalledMessage(agent: CliAgent): String = "the ${agent.command} command was not found on the PATH"

    fun untrustedMessage(): String = "the project is not trusted"

    fun await(agent: CliAgent, budgetMs: Long, clock: () -> Long, sleep: (Long) -> Unit, screen: () -> Screen?): Boolean {
        val start = clock()
        var lastText: String? = null
        var changedAt = start
        while (true) {
            val now = clock()
            val seen = screen()
            if (seen != null) {
                if (seen.text != lastText) {
                    lastText = seen.text
                    changedAt = now
                }
                if (seen.running && agent.hasInputBox(seen.text) && now - changedAt >= QUIET_MS) {
                    return true
                }
            }
            if (now - start >= budgetMs) {
                return false
            }
            sleep(POLL_MS)
        }
    }
}

class AgentNotReady(message: String) : IllegalStateException(message)

class AgentNotInstalled(agent: CliAgent) : IllegalStateException(AgentReadiness.notInstalledMessage(agent))

class AgentUntrusted : IllegalStateException(AgentReadiness.untrustedMessage())

object ActiveRoot {
    const val MEMORY_KEY = "featherspec-studio.activeProject"

    fun of(memoryJson: String?, projectBase: String?): String? {
        val remembered = memoryJson?.let { remembered(it) }
        if (remembered != null) {
            return remembered
        }
        return projectBase?.takeIf { it.isNotBlank() }
    }

    private fun remembered(json: String): String? = try {
        val parsed = JsonParser.parseString(json)
        if (parsed.isJsonPrimitive && parsed.asJsonPrimitive.isString) FileUris.toPathText(parsed.asString) else null
    } catch (failure: RuntimeException) {
        null
    }
}

class AgentBusy(name: String) : IllegalStateException("a Send to $name is still starting")

class SendGate {
    private val running = AtomicBoolean(false)

    fun enter(name: String) {
        if (!running.compareAndSet(false, true)) {
            throw AgentBusy(name)
        }
    }

    fun leave() {
        running.set(false)
    }
}

class LastTyped {
    @Volatile
    private var key: WeakReference<Any>? = null

    fun get(): Any? = key?.get()

    fun set(key: Any) {
        this.key = WeakReference(key)
    }
}

class AgentSender(
    private val access: TerminalAccess,
    private val root: () -> String?,
    private val caseInsensitive: Boolean,
    private val lastTyped: LastTyped,
    private val clock: () -> Long,
    private val sleep: (Long) -> Unit,
    private val gate: SendGate = SendGate(),
    private val onPath: (CliAgent) -> Boolean = { true },
    private val trusted: () -> Boolean = { true },
) {
    fun send(request: AgentRequest) {
        require(!AssistantRequests.hasControlCharacter(request.text)) { "the text holds a control character" }
        gate.enter(request.agent.displayName)
        try {
            typeInto(request)
        } finally {
            gate.leave()
        }
    }

    private fun typeInto(request: AgentRequest) {
        val agent = request.agent
        val deadline = clock() + TOTAL_BUDGET_MS
        val base = root() ?: throw IllegalStateException("no project folder")
        val safeMode = !trusted()
        if (safeMode && request.target == AgentTarget.NEW) {
            throw AgentUntrusted()
        }
        val existing = if (request.target == AgentTarget.CURRENT) {
            AgentTabs.choose(access.tabs(), agent, base, lastTyped.get(), caseInsensitive)?.key
        } else {
            null
        }
        if (safeMode && existing == null) {
            throw AgentUntrusted()
        }
        val key = existing?.also { requireInputBox(agent, it) } ?: openAgent(agent, base, deadline)
        if (clock() >= deadline) {
            throw IllegalStateException("the terminal was not ready in time")
        }
        access.paste(key, request.text, agent)
        lastTyped.set(key)
        focusQuietly(key)
    }

    private fun openAgent(agent: CliAgent, base: String, deadline: Long): Any {
        val key = access.openTab(base, agent)
        val shellDeadline = clock() + SHELL_WAIT_MS
        while (!access.shellReady(key)) {
            if (clock() >= shellDeadline) {
                throw IllegalStateException("the terminal has no shell integration")
            }
            sleep(AgentReadiness.POLL_MS)
        }
        access.runAgent(key, agent)
        val budget = minOf(AgentReadiness.READY_BUDGET_MS, deadline - clock())
        if (budget <= 0 || !AgentReadiness.await(agent, budget, clock, sleep) { access.screen(key, agent) }) {
            focusQuietly(key)
            if (!isRunning(key, agent) && !onPath(agent)) {
                throw AgentNotInstalled(agent)
            }
            throw AgentNotReady(AgentReadiness.notReadyMessage(agent))
        }
        return key
    }

    private fun isRunning(key: Any, agent: CliAgent): Boolean = try {
        access.screen(key, agent)?.running == true
    } catch (failure: RuntimeException) {
        false
    }

    private fun requireInputBox(agent: CliAgent, key: Any) {
        val seen = access.screen(key, agent)
        if (seen == null || !seen.running || !agent.hasInputBox(seen.text)) {
            focusQuietly(key)
            throw AgentNotReady(AgentReadiness.waitingMessage(agent))
        }
    }

    private fun focusQuietly(key: Any) {
        try {
            access.focus(key)
        } catch (failure: RuntimeException) {
            return
        }
    }

    companion object {
        const val TOTAL_BUDGET_MS = 19_000L
        const val SHELL_WAIT_MS = 3_000L
    }
}

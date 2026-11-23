package com.gregorbiswanger.featherspec.studio.assistant

import com.google.gson.JsonParser
import com.gregorbiswanger.featherspec.studio.ports.FileUris
import java.lang.ref.WeakReference
import java.nio.file.Files
import java.nio.file.InvalidPathException
import java.nio.file.Paths
import java.util.concurrent.atomic.AtomicBoolean

data class TerminalTab(
    val key: Any,
    val shellReady: Boolean,
    val executing: Boolean,
    val command: String?,
    val workingDirectory: String?,
)

data class Screen(val claudeRunning: Boolean, val text: String)

interface TerminalAccess {
    fun tabs(): List<TerminalTab>

    fun openTab(root: String): Any

    fun shellReady(key: Any): Boolean

    fun runClaude(key: Any)

    fun screen(key: Any): Screen?

    fun paste(key: Any, text: String)

    fun focus(key: Any)
}

object ClaudeTabs {
    private const val COMMAND = "claude"

    fun isClaudeCommand(command: String?): Boolean {
        val text = command?.trim() ?: return false
        return text == COMMAND || (text.startsWith(COMMAND) && text.length > COMMAND.length && text[COMMAND.length].isWhitespace())
    }

    fun samePath(first: String?, second: String?, caseInsensitive: Boolean): Boolean {
        if (first == null || second == null) {
            return false
        }
        val left = normalize(first)
        val right = normalize(second)
        return if (caseInsensitive) left.equals(right, ignoreCase = true) else left == right
    }

    fun choose(tabs: List<TerminalTab>, root: String, lastTyped: Any?, caseInsensitive: Boolean): TerminalTab? {
        val claude = tabs.filter {
            it.shellReady && it.executing && isClaudeCommand(it.command) && samePath(it.workingDirectory, root, caseInsensitive)
        }
        return claude.firstOrNull { lastTyped != null && it.key == lastTyped } ?: claude.firstOrNull()
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
    const val READY_BUDGET_MS = 15_000L
    const val QUIET_MS = 1_000L
    const val POLL_MS = 100L

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

    fun notReadyMessage(): String = "Claude Code was not ready within $READY_BUDGET_MS ms"

    fun waitingMessage(): String = "Claude Code was not ready for input"

    fun notInstalledMessage(): String = "the claude command was not found on the PATH"

    fun hasInputBox(text: String): Boolean {
        val input = lastIndexOfAny(text, INPUT_MARKERS)
        return input >= 0 && input > lastIndexOfAny(text, WAITING_MARKERS)
    }

    private fun lastIndexOfAny(text: String, markers: List<String>): Int = markers.maxOf { text.lastIndexOf(it) }

    fun await(budgetMs: Long, clock: () -> Long, sleep: (Long) -> Unit, screen: () -> Screen?): Boolean {
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
                if (seen.claudeRunning && hasInputBox(seen.text) && now - changedAt >= QUIET_MS) {
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

class ClaudeNotReady(message: String = ClaudeReadiness.notReadyMessage()) : IllegalStateException(message)

class ClaudeNotInstalled : IllegalStateException(ClaudeReadiness.notInstalledMessage())

object ClaudeOnPath {
    val NAMES: List<String> = listOf("claude", "claude.exe", "claude.cmd")

    fun found(path: String?, separator: Char, exists: (String, String) -> Boolean): Boolean {
        if (path.isNullOrBlank()) {
            return false
        }
        val directories = path.split(separator).map { it.trim().removeSurrounding("\"") }.filter { it.isNotBlank() }
        return directories.any { directory -> NAMES.any { name -> exists(directory, name) } }
    }

    fun existsOnDisk(directory: String, name: String): Boolean = try {
        Files.isRegularFile(Paths.get(directory, name))
    } catch (failure: InvalidPathException) {
        false
    } catch (failure: SecurityException) {
        false
    }
}

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

class ClaudeBusy : IllegalStateException("a Send to Claude Code is still starting")

class SendGate {
    private val running = AtomicBoolean(false)

    fun enter() {
        if (!running.compareAndSet(false, true)) {
            throw ClaudeBusy()
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

class ClaudeSender(
    private val access: TerminalAccess,
    private val root: () -> String?,
    private val caseInsensitive: Boolean,
    private val lastTyped: LastTyped,
    private val clock: () -> Long,
    private val sleep: (Long) -> Unit,
    private val gate: SendGate = SendGate(),
    private val onPath: () -> Boolean = { true },
) {
    fun send(request: ClaudeRequest) {
        require(!AssistantRequests.hasControlCharacter(request.text)) { "the text holds a control character" }
        gate.enter()
        try {
            typeInto(request)
        } finally {
            gate.leave()
        }
    }

    private fun typeInto(request: ClaudeRequest) {
        val deadline = clock() + TOTAL_BUDGET_MS
        val base = root() ?: throw IllegalStateException("no project folder")
        val existing = if (request.target == ClaudeTarget.CURRENT) {
            ClaudeTabs.choose(access.tabs(), base, lastTyped.get(), caseInsensitive)?.key
        } else {
            null
        }
        val key = existing?.also { requireInputBox(it) } ?: openClaude(base, deadline)
        if (clock() >= deadline) {
            throw IllegalStateException("the terminal was not ready in time")
        }
        access.paste(key, request.text)
        lastTyped.set(key)
        focusQuietly(key)
    }

    private fun openClaude(base: String, deadline: Long): Any {
        val key = access.openTab(base)
        val shellDeadline = clock() + SHELL_WAIT_MS
        while (!access.shellReady(key)) {
            if (clock() >= shellDeadline) {
                throw IllegalStateException("the terminal has no shell integration")
            }
            sleep(ClaudeReadiness.POLL_MS)
        }
        access.runClaude(key)
        val budget = minOf(ClaudeReadiness.READY_BUDGET_MS, deadline - clock())
        if (budget <= 0 || !ClaudeReadiness.await(budget, clock, sleep) { access.screen(key) }) {
            focusQuietly(key)
            if (!isRunning(key) && !onPath()) {
                throw ClaudeNotInstalled()
            }
            throw ClaudeNotReady()
        }
        return key
    }

    private fun isRunning(key: Any): Boolean = try {
        access.screen(key)?.claudeRunning == true
    } catch (failure: RuntimeException) {
        false
    }

    private fun requireInputBox(key: Any) {
        val seen = access.screen(key)
        if (seen == null || !seen.claudeRunning || !ClaudeReadiness.hasInputBox(seen.text)) {
            focusQuietly(key)
            throw ClaudeNotReady(ClaudeReadiness.waitingMessage())
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

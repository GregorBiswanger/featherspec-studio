package com.gregorbiswanger.featherspec.studio

import com.google.gson.JsonObject
import com.gregorbiswanger.featherspec.studio.runtime.ASYNC_CALLS
import com.gregorbiswanger.featherspec.studio.runtime.HostHandler
import com.gregorbiswanger.featherspec.studio.ui.LogLines
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

typealias CallPort = (String, String) -> String?

class Observable<T>(initial: T) {
    private val lock = Any()
    private val listeners = LinkedHashMap<Int, (T) -> Unit>()
    private var nextKey = 0
    private var current: T = initial

    val value: T
        get() = synchronized(lock) { current }

    fun set(next: T) {
        update { next }
    }

    fun update(transform: (T) -> T) {
        val (next, notified) = synchronized(lock) {
            val computed = transform(current)
            current = computed
            computed to listeners.values.toList()
        }
        notified.forEach { it(next) }
    }

    fun onChange(listener: (T) -> Unit): () -> Unit {
        val key = synchronized(lock) {
            val assigned = nextKey++
            listeners[assigned] = listener
            assigned
        }
        return {
            synchronized(lock) {
                listeners.remove(key)
            }
            Unit
        }
    }
}

class CallRouter(
    private val files: CallPort,
    private val medium: CallPort,
    private val memory: CallPort,
    private val watch: CallPort,
    private val panel: CallPort = { _, _ -> null },
    private val system: CallPort = { _, _ -> null },
    private val ui: CallPort = { _, _ -> null },
    private val setup: CallPort = { _, _ -> null },
    private val assistant: CallPort = { _, _ -> null },
) {
    enum class Group { FILES, MEDIUM, MEMORY, WATCH, PANEL, SYSTEM, UI, SETUP, ASSISTANT }

    fun answer(name: String, argsJson: String): String {
        val group = ROUTED[name]
        if (group == null) {
            return if (name in ASYNC_CALLS && DEFERRED_PREFIXES.any { name.startsWith(it) }) NOT_YET else failed("unknown $name")
        }
        return try {
            portOf(group)(name, argsJson) ?: failed("no answer for $name")
        } catch (failure: Exception) {
            failed(failure.message ?: failure.javaClass.simpleName)
        }
    }

    private fun portOf(group: Group): CallPort = when (group) {
        Group.FILES -> files
        Group.MEDIUM -> medium
        Group.MEMORY -> memory
        Group.WATCH -> watch
        Group.PANEL -> panel
        Group.SYSTEM -> system
        Group.UI -> ui
        Group.SETUP -> setup
        Group.ASSISTANT -> assistant
    }

    companion object {
        const val NOT_YET = "{\"error\":\"not yet\"}"

        val DEFERRED_PREFIXES: List<String> = listOf("actions.")

        val ROUTED: Map<String, Group> = buildMap {
            listOf("source.list", "source.stat", "source.readBytes", "source.scan", "fs.stat", "fs.readText", "fs.readDirectory")
                .forEach { put(it, Group.FILES) }
            listOf(
                "medium.open", "medium.read", "medium.lines", "medium.append",
                "medium.replace", "medium.createExclusive", "medium.remove", "medium.list",
            ).forEach { put(it, Group.MEDIUM) }
            put("memory.set", Group.MEMORY)
            put("watch.add", Group.WATCH)
            put("watch.remove", Group.WATCH)
            put("actions.openStudio", Group.PANEL)
            put("actions.reloadPanel", Group.PANEL)
            put("actions.manageTrust", Group.PANEL)
            put("clipboard.write", Group.SYSTEM)
            put("editor.open", Group.SYSTEM)
            listOf(
                "target.kind", "target.readBytes", "target.listDirectory", "target.createExclusive",
                "target.replaceIfUnchanged", "target.clearSetupFolder", "http.get", "archive.read",
            ).forEach { put(it, Group.SETUP) }
            listOf("assistant.claudeTerminal", "assistant.openChat").forEach { put(it, Group.ASSISTANT) }
            listOf("ui.pick", "ui.notify", "ui.confirm", "ui.progressStart", "ui.openExternal").forEach { put(it, Group.UI) }
        }

        fun failed(message: String): String = JsonObject().apply { addProperty("error", message) }.toString()
    }
}

class HostRouter(
    private val router: CallRouter,
    private val resolve: (String, String) -> Unit,
    private val execute: (() -> Unit) -> Unit,
) : HostHandler {
    val tree = Observable<String?>(null)
    val status = Observable<String?>(null)
    val log = Observable<List<String>>(emptyList())

    private val subscribers = ConcurrentHashMap<String, CopyOnWriteArrayList<(String) -> Unit>>()

    override fun call(id: String, name: String, args: String) {
        execute { resolve(id, router.answer(name, args)) }
    }

    override fun emit(channel: String, payload: String) {
        when (channel) {
            "tree" -> tree.set(payload)
            "status" -> status.set(payload)
            "log" -> appendLog(payload)
        }
        subscribers[channel]?.forEach { it(payload) }
    }

    fun subscribe(channel: String, listener: (String) -> Unit): () -> Unit {
        val list = subscribers.computeIfAbsent(channel) { CopyOnWriteArrayList() }
        list.add(listener)
        return {
            list.remove(listener)
            Unit
        }
    }

    private fun appendLog(payload: String) {
        val lines = LogLines.parse(payload)
        log.update { (it + lines).takeLast(MAX_LOG_LINES) }
    }

    private companion object {
        const val MAX_LOG_LINES = 5_000
    }
}

package com.gregorbiswanger.featherspec.studio.runtime

import com.gregorbiswanger.featherspec.studio.jcef.PluginRequestHandler
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.Disposable
import com.intellij.openapi.util.Disposer
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefClient
import com.intellij.ui.jcef.JBCefJSQuery
import com.intellij.util.concurrency.AppExecutorUtil
import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.handler.CefLoadHandlerAdapter
import java.util.UUID
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ExecutorService
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

const val READY_TIMEOUT_MS = 60_000L
const val REPLY_BATCH_DELAY_MS = 1L

class CoreRuntime(
    private val client: JBCefClient,
    private val handler: HostHandler,
    private val state: CoreStateHolder,
    parent: Disposable,
) {
    @Volatile
    var startedAtNanos: Long = 0L

    @Volatile
    var createdAtNanos: Long = 0L
        private set

    @Volatile
    var loadedAtNanos: Long = 0L
        private set

    @Volatile
    var readyAtNanos: Long = 0L
        private set

    private val lock = Any()
    private val pendingScripts = ArrayList<String>()
    private val replyLock = Any()
    private val queuedReplies = ArrayList<QueuedReply>()
    private val flushScheduled = AtomicBoolean(false)
    private val replies = ConcurrentHashMap<String, CompletableFuture<String>>()
    private val ids = AtomicLong(0)
    private val startRequested = AtomicBoolean(false)
    private val disposed = AtomicBoolean(false)
    private val queue: ExecutorService = AppExecutorUtil.createBoundedApplicationPoolExecutor("FeatherSpec core", 1)
    private var browser: JBCefBrowser? = null
    private var query: JBCefJSQuery? = null
    private var loaded = false
    @Volatile
    private var timeout: ScheduledFuture<*>? = null

    init {
        Disposer.register(parent, Disposable { dispose() })
    }

    fun start(configJson: String) {
        if (!startRequested.compareAndSet(false, true)) {
            return
        }
        timeout = AppExecutorUtil.getAppScheduledExecutorService().schedule(
            Runnable { onTimeout() },
            READY_TIMEOUT_MS,
            TimeUnit.MILLISECONDS,
        )
        ApplicationManager.getApplication().invokeLater {
            try {
                create(configJson)
            } catch (failure: Throwable) {
                thisLogger().warn("The FeatherSpec core browser could not be created", failure)
                state.set(CoreState.Failed(failure.message ?: failure.javaClass.simpleName))
            }
        }
    }

    fun resolve(id: String, resultJson: String) {
        synchronized(replyLock) { queuedReplies.add(QueuedReply(id, resultJson)) }
        if (flushScheduled.compareAndSet(false, true)) {
            AppExecutorUtil.getAppScheduledExecutorService().schedule(
                Runnable { flushReplies() },
                REPLY_BATCH_DELAY_MS,
                TimeUnit.MILLISECONDS,
            )
        }
    }

    fun dispatch(event: String, payloadJson: String) {
        flushReplies()
        send(BridgeFrames.script("dispatch", event, payloadJson))
    }

    fun invoke(command: String, argsJson: String): CompletableFuture<String> =
        request { id -> BridgeFrames.script("invoke", id, command, argsJson) }

    fun conformance(inputJson: String): CompletableFuture<String> =
        request { id -> BridgeFrames.script("conformance", id, inputJson) }

    fun setupConformance(archiveJson: String): CompletableFuture<String> =
        request { id -> BridgeFrames.script("setupConformance", id, archiveJson) }

    fun dispose() {
        if (!disposed.compareAndSet(false, true)) {
            return
        }
        timeout?.cancel(false)
        val failure = IllegalStateException("The FeatherSpec core was disposed")
        replies.values.forEach { it.completeExceptionally(failure) }
        replies.clear()
        ApplicationManager.getApplication().invokeLater {
            query?.let { Disposer.dispose(it) }
            browser?.dispose()
            query = null
            browser = null
        }
    }

    private fun request(script: (String) -> String): CompletableFuture<String> {
        val id = "r-${ids.incrementAndGet()}"
        val future = CompletableFuture<String>()
        if (disposed.get()) {
            future.completeExceptionally(IllegalStateException("The FeatherSpec core was disposed"))
            return future
        }
        replies[id] = future
        flushReplies()
        send(script(id))
        return future
    }

    private fun create(configJson: String) {
        if (disposed.get()) {
            return
        }
        createdAtNanos = System.nanoTime()
        val created = JBCefBrowser.createBuilder()
            .setClient(client)
            .setOffScreenRendering(true)
            .build()
        created.createImmediately()
        val jsQuery = JBCefJSQuery.create(created)
        jsQuery.addHandler { frame ->
            queue.execute { onFrame(frame) }
            null
        }
        browser = created
        query = jsQuery
        val inject = jsQuery.inject("frame")
        val page = PluginRequestHandler { CorePage.html(UUID.randomUUID().toString().replace("-", ""), inject) }
        client.addRequestHandler(page, created.cefBrowser)
        client.addLoadHandler(object : CefLoadHandlerAdapter() {
            override fun onLoadEnd(browser: CefBrowser?, frame: CefFrame?, httpStatusCode: Int) {
                if (frame?.url == CORE_URL) {
                    onCoreLoaded(configJson)
                }
            }
        }, created.cefBrowser)
        created.loadURL(CORE_URL)
    }

    private fun onCoreLoaded(configJson: String) {
        synchronized(lock) {
            if (loaded) {
                return
            }
            loadedAtNanos = System.nanoTime()
            loaded = true
            execute(BridgeFrames.script("start", configJson))
            pendingScripts.forEach { execute(it) }
            pendingScripts.clear()
        }
    }

    private fun flushReplies() {
        synchronized(replyLock) {
            flushScheduled.set(false)
            if (queuedReplies.isEmpty()) {
                return
            }
            val batch = ArrayList(queuedReplies)
            queuedReplies.clear()
            val only = batch.singleOrNull()
            if (only != null) {
                send(BridgeFrames.script("resolve", only.id, only.resultJson))
            } else {
                send(BridgeFrames.script("resolveMany", ReplyBatch.build(batch)))
            }
        }
    }

    private fun send(script: String) {
        synchronized(lock) {
            if (disposed.get()) {
                return
            }
            if (loaded) {
                execute(script)
            } else {
                pendingScripts.add(script)
            }
        }
    }

    private fun execute(script: String) {
        browser?.cefBrowser?.executeJavaScript(script, CORE_URL, 0)
    }

    private fun onFrame(text: String) {
        try {
            when (val frame = BridgeFrames.parse(text)) {
                is Frame.Call -> handler.call(frame.id, frame.name, frame.args)
                is Frame.Calls -> frame.calls.forEach { call ->
                    try {
                        handler.call(call.id, call.name, call.args)
                    } catch (failure: Throwable) {
                        thisLogger().warn("The FeatherSpec core call ${call.name} could not be handled", failure)
                    }
                }
                is Frame.Emit -> handler.emit(frame.channel, frame.payload)
                is Frame.Reply -> complete(frame)
                is Frame.Ready -> {
                    readyAtNanos = System.nanoTime()
                    timeout?.cancel(false)
                    state.set(CoreState.Ready)
                }
                is Frame.Failed -> {
                    timeout?.cancel(false)
                    state.set(CoreState.Failed(frame.error))
                }
                is Frame.Invalid -> thisLogger().warn("The FeatherSpec core sent an invalid frame: ${frame.text.take(200)}")
            }
        } catch (failure: Throwable) {
            thisLogger().warn("The FeatherSpec core frame could not be handled", failure)
        }
    }

    private fun complete(frame: Frame.Reply) {
        val future = replies.remove(frame.id) ?: return
        val error = frame.error
        if (error != null) {
            future.completeExceptionally(IllegalStateException(error))
        } else {
            future.complete(frame.ok ?: "null")
        }
    }

    private fun onTimeout() {
        if (state.value == CoreState.Loading) {
            state.set(CoreState.Failed("core not ready within 60 s"))
        }
    }
}

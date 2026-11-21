package com.gregorbiswanger.featherspec.studio.probe

import com.gregorbiswanger.featherspec.studio.CoreConfig
import com.gregorbiswanger.featherspec.studio.ports.HostOs
import com.gregorbiswanger.featherspec.studio.runtime.CoreRuntime
import com.gregorbiswanger.featherspec.studio.runtime.CoreState
import com.gregorbiswanger.featherspec.studio.runtime.CoreStateHolder
import com.gregorbiswanger.featherspec.studio.runtime.HostHandler
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.util.Disposer
import com.intellij.ui.jcef.JBCefApp
import com.intellij.ui.jcef.JBCefClient
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

object WarmStart {
    private const val WAIT_SECONDS = 90L
    private const val SETTLE_MS = 2_000L

    fun measureMs(): Long {
        val runtimeParent = Disposer.newDisposable("FeatherSpec warm core")
        val clientParent = Disposer.newDisposable("FeatherSpec warm client")
        try {
            val created = AtomicReference<JBCefClient>()
            ApplicationManager.getApplication().invokeAndWait(Runnable { created.set(JBCefApp.getInstance().createClient()) })
            Disposer.register(clientParent, created.get())
            val state = CoreStateHolder()
            val handler = AnsweringHandler()
            val runtime = CoreRuntime(created.get(), handler, state, runtimeParent)
            handler.runtime = runtime
            val settled = CountDownLatch(1)
            val remove = state.onChange { next ->
                if (next != CoreState.Loading) {
                    settled.countDown()
                }
            }
            try {
                runtime.startedAtNanos = System.nanoTime()
                runtime.start(CoreConfig.json(CoreConfig.platform(HostOs.windows, HostOs.mac), "0.0.0", emptyMap(), false, emptyList(), emptyMap()))
                check(settled.await(WAIT_SECONDS, TimeUnit.SECONDS)) { "the second core was not ready within $WAIT_SECONDS s" }
                check(state.value == CoreState.Ready) { "the second core ended in ${state.value}" }
                return (runtime.readyAtNanos - runtime.startedAtNanos) / 1_000_000L
            } finally {
                remove()
            }
        } finally {
            Disposer.dispose(runtimeParent)
            Thread.sleep(SETTLE_MS)
            Disposer.dispose(clientParent)
        }
    }

    private class AnsweringHandler : HostHandler {
        @Volatile
        var runtime: CoreRuntime? = null

        override fun call(id: String, name: String, args: String) {
            runtime?.resolve(id, "{\"error\":\"the warm start answers no calls\"}")
        }

        override fun emit(channel: String, payload: String) = Unit
    }
}

package com.gregorbiswanger.featherspec.studio.assistant

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.ModalityState
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ExecutionException
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException
import java.util.concurrent.atomic.AtomicBoolean

internal object Edt {
    private const val WAIT_MS = 5_000L

    fun <T> run(block: () -> T): T {
        val done = CompletableFuture<T>()
        val abandoned = AtomicBoolean(false)
        ApplicationManager.getApplication().invokeLater(
            {
                if (!abandoned.get()) {
                    try {
                        done.complete(block())
                    } catch (failure: Throwable) {
                        done.completeExceptionally(failure)
                    }
                }
            },
            ModalityState.nonModal(),
        )
        try {
            return done.get(WAIT_MS, TimeUnit.MILLISECONDS)
        } catch (timeout: TimeoutException) {
            abandoned.set(true)
            throw IllegalStateException("the IDE did not run the call in time")
        } catch (failure: ExecutionException) {
            throw failure.cause ?: failure
        }
    }
}

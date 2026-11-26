package com.gregorbiswanger.featherspec.studio.runtime

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class CoreStateTest {
    @Test
    fun startsLoading() {
        assertEquals(CoreState.Loading, CoreStateHolder().value)
    }

    @Test
    fun loadingMovesToReady() {
        val holder = CoreStateHolder()
        holder.set(CoreState.Ready)
        assertEquals(CoreState.Ready, holder.value)
    }

    @Test
    fun readyNeverReturnsToLoading() {
        val holder = CoreStateHolder()
        holder.set(CoreState.Ready)
        holder.set(CoreState.Loading)
        assertEquals(CoreState.Ready, holder.value)
    }

    @Test
    fun failedIsFinal() {
        val holder = CoreStateHolder()
        holder.set(CoreState.Failed("boom"))
        holder.set(CoreState.Ready)
        holder.set(CoreState.Loading)
        holder.set(CoreState.Failed("other"))
        assertEquals(CoreState.Failed("boom"), holder.value)
    }

    @Test
    fun unavailableIsFinal() {
        val holder = CoreStateHolder()
        holder.set(CoreState.Unavailable(UnavailableKind.SUSPENDED))
        holder.set(CoreState.Ready)
        holder.set(CoreState.Unavailable(UnavailableKind.UNSUPPORTED))
        assertEquals(CoreState.Unavailable(UnavailableKind.SUSPENDED), holder.value)
    }

    @Test
    fun suspendedResumesToLoadingAndThenReady() {
        val holder = CoreStateHolder()
        val seen = mutableListOf<CoreState>()
        holder.onChange { seen.add(it) }
        holder.set(CoreState.Unavailable(UnavailableKind.SUSPENDED))
        assertEquals(true, holder.resumeAfterSuspension())
        holder.set(CoreState.Ready)
        assertEquals(CoreState.Ready, holder.value)
        assertEquals(
            listOf(CoreState.Unavailable(UnavailableKind.SUSPENDED), CoreState.Loading, CoreState.Ready),
            seen,
        )
    }

    @Test
    fun onlySuspendedResumes() {
        val unsupported = CoreStateHolder()
        unsupported.set(CoreState.Unavailable(UnavailableKind.UNSUPPORTED))
        assertEquals(false, unsupported.resumeAfterSuspension())
        assertEquals(CoreState.Unavailable(UnavailableKind.UNSUPPORTED), unsupported.value)
        val loading = CoreStateHolder()
        assertEquals(false, loading.resumeAfterSuspension())
        val failed = CoreStateHolder()
        failed.set(CoreState.Failed("x"))
        assertEquals(false, failed.resumeAfterSuspension())
    }

    @Test
    fun readyCanFail() {
        val holder = CoreStateHolder()
        holder.set(CoreState.Ready)
        holder.set(CoreState.Failed("late"))
        assertEquals(CoreState.Failed("late"), holder.value)
    }

    @Test
    fun listenerIsCalledOncePerChange() {
        val holder = CoreStateHolder()
        val seen = mutableListOf<CoreState>()
        holder.onChange { seen.add(it) }
        holder.set(CoreState.Loading)
        holder.set(CoreState.Ready)
        holder.set(CoreState.Ready)
        holder.set(CoreState.Loading)
        holder.set(CoreState.Failed("x"))
        holder.set(CoreState.Failed("y"))
        assertEquals(listOf(CoreState.Ready, CoreState.Failed("x")), seen)
    }

    @Test
    fun everyListenerIsCalled() {
        val holder = CoreStateHolder()
        var first = 0
        var second = 0
        holder.onChange { first++ }
        holder.onChange { second++ }
        holder.set(CoreState.Ready)
        assertEquals(1, first)
        assertEquals(1, second)
    }

    @Test
    fun removedListenerIsNotCalled() {
        val holder = CoreStateHolder()
        var calls = 0
        val remove = holder.onChange { calls++ }
        remove()
        holder.set(CoreState.Ready)
        assertEquals(0, calls)
    }

    @Test
    fun removalLeavesOtherListeners() {
        val holder = CoreStateHolder()
        var kept = 0
        val remove = holder.onChange { }
        holder.onChange { kept++ }
        remove()
        holder.set(CoreState.Ready)
        assertEquals(1, kept)
    }
}

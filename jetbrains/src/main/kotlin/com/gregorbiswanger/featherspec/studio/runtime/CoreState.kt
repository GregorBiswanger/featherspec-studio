package com.gregorbiswanger.featherspec.studio.runtime

enum class UnavailableKind { UNSUPPORTED, SUSPENDED }

sealed interface CoreState {
    data object Loading : CoreState
    data object Ready : CoreState
    data class Failed(val reason: String) : CoreState
    data class Unavailable(val kind: UnavailableKind) : CoreState
}

class CoreStateHolder {
    private val lock = Any()
    private val listeners = LinkedHashMap<Int, (CoreState) -> Unit>()
    private var nextKey = 0
    private var current: CoreState = CoreState.Loading

    val value: CoreState
        get() = synchronized(lock) { current }

    fun set(next: CoreState) {
        val notified = synchronized(lock) {
            if (!accepts(next)) {
                return
            }
            current = next
            listeners.values.toList()
        }
        notified.forEach { it(next) }
    }

    fun onChange(listener: (CoreState) -> Unit): () -> Unit {
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

    private fun accepts(next: CoreState): Boolean {
        if (next == current) {
            return false
        }
        if (current is CoreState.Failed || current is CoreState.Unavailable) {
            return false
        }
        if (current == CoreState.Ready && next == CoreState.Loading) {
            return false
        }
        return true
    }
}
